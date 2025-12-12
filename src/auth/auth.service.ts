import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { LoginAttemptService } from './services/login-attempt.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private loginAttemptService: LoginAttemptService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Always assign default Citizen role, ignoring any role selection from client
    const citizenRole = await this.roleRepository.findOne({
      where: { name: 'Citizen' },
    });
    
    if (!citizenRole) {
      throw new NotFoundException('Citizen role not found');
    }

    const user = this.userRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      middleName: registerDto.middleName,
      lastName: registerDto.lastName,
      suffix: registerDto.suffix,
      phoneNumber: registerDto.phoneNumber,
      houseNumber: registerDto.houseNumber,
      street: registerDto.street,
      barangay: registerDto.barangay,
      city: registerDto.city,
      province: registerDto.province,
      region: registerDto.region,
      zipCode: registerDto.zipCode,
      roles: [citizenRole],
    });

    const savedUser = await this.userRepository.save(user);

    // Update profile completeness status
    savedUser.isProfileComplete = savedUser.checkProfileCompleteness();
    await this.userRepository.save(savedUser);

    const tokens = await this.generateTokens(savedUser);
    await this.saveRefreshToken(savedUser.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        roles: savedUser.roles.map((role) => role.name),
      },
    };
  }

  async login(loginDto: LoginDto, ipAddress: string, userAgent: string): Promise<AuthResponseDto> {
    // Check if account is locked before attempting validation
    const lockStatus = await this.loginAttemptService.isAccountLocked(loginDto.email);
    if (lockStatus.locked) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${lockStatus.remainingMinutes} minutes.`,
          error: 'Account Locked',
          remainingMinutes: lockStatus.remainingMinutes,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    try {
      const user = await this.validateUser(loginDto.email, loginDto.password);
      
      // Record successful login attempt
      await this.loginAttemptService.recordAttempt(
        loginDto.email,
        ipAddress,
        userAgent,
        true,
      );

      // Reset failed attempts on successful login
      await this.loginAttemptService.resetFailedAttempts(loginDto.email);

      const tokens = await this.generateTokens(user);
      await this.saveRefreshToken(user.id, tokens.refreshToken);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles.map((role) => role.name),
        },
      };
    } catch (error) {
      // Record failed login attempt
      await this.loginAttemptService.recordAttempt(
        loginDto.email,
        ipAddress,
        userAgent,
        false,
        error.message,
      );

      // Check if account should be locked
      if (await this.loginAttemptService.shouldLockAccount(loginDto.email)) {
        await this.loginAttemptService.lockAccount(loginDto.email);
        
        const config = this.loginAttemptService.getConfiguration();
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            message: `Account locked due to ${config.maxFailedAttempts} failed login attempts. Please try again in ${config.lockoutDurationMinutes} minutes.`,
            error: 'Account Locked',
            remainingMinutes: config.lockoutDurationMinutes,
          },
          HttpStatus.FORBIDDEN,
        );
      }

      // Re-throw the original error
      throw error;
    }
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
      relations: ['roles'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret',
      });

      const token = await this.refreshTokenRepository.findOne({
        where: { 
          token: decoded.token, 
          isActive: true,
          userId: decoded.userId 
        },
        relations: ['user'],
      });

      if (!token || token.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const user = await this.userRepository.findOne({
        where: { id: decoded.userId, isActive: true },
        relations: ['roles'],
      });

      if (!user) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const accessToken = await this.generateAccessToken(user);
      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { token: refreshToken },
      { isActive: false },
    );
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId },
      { isActive: false },
    );
  }

  /**
   * Public method to hash password (used by OTP service)
   */
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  /**
   * Public method to generate tokens (used by OTP service)
   */
  async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return { accessToken, refreshToken };
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name),
    };

    return this.jwtService.sign(payload);
  }

  private async generateRefreshToken(user: User): Promise<string> {
    const token = this.generateRandomToken();
    const payload = {
      userId: user.id,
      token: token,
    };

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret',
      expiresIn: '7d',
    });

    return refreshToken;
  }

  private async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + 7,
    );

    const decodedToken = this.jwtService.decode(refreshToken) as any;
    const token = decodedToken?.token || refreshToken;

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: token,
      userId,
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);
  }

  private generateRandomToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  async findAllUsers(): Promise<User[]> {
    return await this.userRepository.find({
      relations: ['roles'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getUserProfile(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
      relations: ['roles'],
      cache: false // Disable cache to ensure fresh data
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    
    // Add role name for easier access
    const roleName = user.roles && user.roles.length > 0 ? user.roles[0].name : null;
    
    // Add profile completeness status
    const isProfileComplete = user.checkProfileCompleteness();
    
    return {
      ...userWithoutPassword,
      role: roleName,
      isProfileComplete,
    };
  }

  async updateUserProfile(userId: string, updateData: any): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
      relations: ['roles'],
      cache: false // Disable cache to ensure fresh data
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update only the fields that are provided
    // IMPORTANT: Never update email, password, or roles through this endpoint
    const allowedFields = [
      'firstName', 'middleName', 'lastName', 'suffix',
      'dateOfBirth', 'gender', 'civilStatus',
      'phoneNumber',
      'houseNumber', 'street'
    ];

    console.log('[AuthService] Updating profile for user:', user.email);
    console.log('[AuthService] Update data received:', updateData);

    // Only update allowed fields that are present in updateData
    allowedFields.forEach(field => {
      if (updateData.hasOwnProperty(field)) {
        console.log(`[AuthService] Updating ${field}: "${user[field]}" -> "${updateData[field]}"`);
        user[field] = updateData[field];
      }
    });

    // Check if profile is complete after update
    user.isProfileComplete = user.checkProfileCompleteness();
    console.log('[AuthService] Profile complete status:', user.isProfileComplete);

    // Save updated user
    const savedUser = await this.userRepository.save(user);
    console.log('[AuthService] User profile saved successfully:', savedUser.id);

    // Return updated user without password
    const { password, ...userWithoutPassword } = user;
    const roleName = user.roles && user.roles.length > 0 ? user.roles[0].name : null;
    
    // Include profile completeness status
    const isProfileComplete = user.checkProfileCompleteness();
    
    return {
      ...userWithoutPassword,
      role: roleName,
      isProfileComplete,
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    // Find user by ID first
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is the same as current password
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new UnauthorizedException('New password must be different from current password');
    }

    // Hash and update the new password
    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    
    await this.userRepository.update(userId, {
      password: hashedNewPassword,
    });
  }
}
