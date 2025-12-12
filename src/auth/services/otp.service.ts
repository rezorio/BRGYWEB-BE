import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { OTP, OTPType, OTPStatus } from '../entities/otp.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';

@Injectable()
export class OTPService {
  private readonly OTP_EXPIRY_MINUTES = 10; // OTP expires in 10 minutes
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    @InjectRepository(OTP)
    private otpRepository: Repository<OTP>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  /**
   * Generate a 6-digit OTP code
   */
  private generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create OTP for registration
   */
  async createRegistrationOTP(
    registrationData: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ otpId: string; code: string; expiresAt: Date }> {
    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registrationData.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Check if phone number already exists
    const existingPhone = await this.userRepository.findOne({
      where: { phoneNumber: registrationData.phoneNumber },
    });

    if (existingPhone) {
      throw new BadRequestException('Phone number already registered');
    }

    // Invalidate any existing pending OTPs for this phone/email
    await this.otpRepository.update(
      {
        phoneNumber: registrationData.phoneNumber,
        status: OTPStatus.PENDING,
      },
      { status: OTPStatus.EXPIRED },
    );

    await this.otpRepository.update(
      {
        email: registrationData.email,
        status: OTPStatus.PENDING,
      },
      { status: OTPStatus.EXPIRED },
    );

    // Generate OTP code
    const code = this.generateOTPCode();
    const hashedCode = await bcrypt.hash(code, 10);

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    // Create OTP record
    const otp = this.otpRepository.create({
      type: OTPType.REGISTRATION,
      phoneNumber: registrationData.phoneNumber,
      email: registrationData.email,
      code: hashedCode,
      registrationData,
      expiresAt,
      ipAddress,
      userAgent,
    });

    await this.otpRepository.save(otp);

    return {
      otpId: otp.id,
      code, // Return plain code for SMS sending
      expiresAt,
    };
  }

  /**
   * Create OTP for password reset
   */
  async createPasswordResetOTP(
    phoneNumber: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ otpId: string; code: string; expiresAt: Date; email: string }> {
    // Find user by phone number
    const user = await this.userRepository.findOne({
      where: { phoneNumber },
    });

    if (!user) {
      throw new NotFoundException('No account found with this phone number');
    }

    // Invalidate any existing pending OTPs for this phone
    await this.otpRepository.update(
      {
        phoneNumber,
        status: OTPStatus.PENDING,
      },
      { status: OTPStatus.EXPIRED },
    );

    // Generate OTP code
    const code = this.generateOTPCode();
    const hashedCode = await bcrypt.hash(code, 10);

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    // Create OTP record
    const otp = this.otpRepository.create({
      type: OTPType.PASSWORD_RESET,
      phoneNumber,
      email: user.email,
      userId: user.id,
      code: hashedCode,
      expiresAt,
      ipAddress,
      userAgent,
    });

    await this.otpRepository.save(otp);

    return {
      otpId: otp.id,
      code, // Return plain code for SMS sending
      expiresAt,
      email: user.email, // Return masked email for display
    };
  }

  /**
   * Verify OTP and complete registration
   */
  async verifyRegistrationOTP(
    otpId: string,
    code: string,
  ): Promise<User> {
    const otp = await this.otpRepository.findOne({
      where: { id: otpId, type: OTPType.REGISTRATION },
    });

    if (!otp) {
      throw new NotFoundException('OTP not found');
    }

    if (!otp.isValid()) {
      throw new BadRequestException('OTP is invalid or expired');
    }

    // Verify code
    const isValid = await bcrypt.compare(code, otp.code);
    if (!isValid) {
      // Increment attempts
      otp.attempts += 1;
      if (otp.attempts >= this.MAX_ATTEMPTS) {
        otp.status = OTPStatus.FAILED;
      }
      await this.otpRepository.save(otp);
      throw new UnauthorizedException('Invalid OTP code');
    }

    // Mark OTP as verified
    otp.status = OTPStatus.VERIFIED;
    await this.otpRepository.save(otp);

    // Create user account
    const citizenRole = await this.roleRepository.findOne({
      where: { name: 'Citizen' },
    });

    if (!citizenRole) {
      throw new BadRequestException('Citizen role not found');
    }

    const user = this.userRepository.create({
      ...otp.registrationData,
      roles: [citizenRole],
      isActive: true,
    });

    await this.userRepository.save(user);

    return user;
  }

  /**
   * Verify OTP for password reset
   */
  async verifyPasswordResetOTP(
    otpId: string,
    code: string,
  ): Promise<{ userId: string; email: string }> {
    const otp = await this.otpRepository.findOne({
      where: { id: otpId, type: OTPType.PASSWORD_RESET },
    });

    if (!otp) {
      throw new NotFoundException('OTP not found');
    }

    if (!otp.isValid()) {
      throw new BadRequestException('OTP is invalid or expired');
    }

    // Verify code
    const isValid = await bcrypt.compare(code, otp.code);
    if (!isValid) {
      // Increment attempts
      otp.attempts += 1;
      if (otp.attempts >= this.MAX_ATTEMPTS) {
        otp.status = OTPStatus.FAILED;
      }
      await this.otpRepository.save(otp);
      throw new UnauthorizedException('Invalid OTP code');
    }

    // Mark OTP as verified
    otp.status = OTPStatus.VERIFIED;
    await this.otpRepository.save(otp);

    return {
      userId: otp.userId,
      email: otp.email,
    };
  }

  /**
   * Reset password after OTP verification
   */
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await this.userRepository.save(user);
  }

  /**
   * Resend OTP
   */
  async resendOTP(
    otpId: string,
  ): Promise<{ code: string; expiresAt: Date }> {
    const otp = await this.otpRepository.findOne({ where: { id: otpId } });

    if (!otp) {
      throw new NotFoundException('OTP not found');
    }

    // Check if too many attempts
    if (otp.attempts >= this.MAX_ATTEMPTS) {
      throw new BadRequestException('Too many attempts. Please start over.');
    }

    // Generate new code
    const code = this.generateOTPCode();
    const hashedCode = await bcrypt.hash(code, 10);

    // Update expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    otp.code = hashedCode;
    otp.expiresAt = expiresAt;
    otp.attempts = 0; // Reset attempts on resend

    await this.otpRepository.save(otp);

    return { code, expiresAt };
  }

  /**
   * Clean up expired OTPs (should be run periodically)
   */
  async cleanupExpiredOTPs(): Promise<number> {
    const result = await this.otpRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    return result.affected || 0;
  }

  /**
   * Get OTP details (without code)
   */
  async getOTPDetails(otpId: string): Promise<Partial<OTP>> {
    const otp = await this.otpRepository.findOne({ where: { id: otpId } });

    if (!otp) {
      throw new NotFoundException('OTP not found');
    }

    return {
      id: otp.id,
      type: otp.type,
      status: otp.status,
      phoneNumber: otp.phoneNumber,
      email: otp.email,
      attempts: otp.attempts,
      expiresAt: otp.expiresAt,
      createdAt: otp.createdAt,
    };
  }
}
