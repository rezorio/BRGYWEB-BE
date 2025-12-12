import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  UserRequest,
  UserRequestType,
  UserRequestStatus,
} from '../entities/user-request.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';

@Injectable()
export class UserRequestService {
  constructor(
    @InjectRepository(UserRequest)
    private userRequestRepository: Repository<UserRequest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  /**
   * Create a registration request (instead of directly creating user)
   */
  async createRegistrationRequest(
    userData: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserRequest> {
    // Check if email already exists in users table
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if there's already a pending registration request for this email
    const existingRequest = await this.userRequestRepository.findOne({
      where: {
        email: userData.email,
        type: UserRequestType.REGISTRATION,
        status: UserRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new ConflictException(
        'A registration request for this email is already pending approval',
      );
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const request = this.userRequestRepository.create({
      type: UserRequestType.REGISTRATION,
      status: UserRequestStatus.PENDING,
      email: userData.email,
      userData: {
        ...userData,
        password: hashedPassword,
      },
      ipAddress,
      userAgent,
    });

    return await this.userRequestRepository.save(request);
  }

  /**
   * Create a password reset request
   */
  async createPasswordResetRequest(
    email: string,
    message: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserRequest> {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    // Check if there's already a pending password reset request
    const existingRequest = await this.userRequestRepository.findOne({
      where: {
        userId: user.id,
        type: UserRequestType.PASSWORD_RESET,
        status: UserRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new ConflictException(
        'A password reset request is already pending for this account',
      );
    }

    const request = this.userRequestRepository.create({
      type: UserRequestType.PASSWORD_RESET,
      status: UserRequestStatus.PENDING,
      email,
      userId: user.id,
      message,
      ipAddress,
      userAgent,
    });

    return await this.userRequestRepository.save(request);
  }

  /**
   * Get all user requests with pagination and filtering
   */
  async getAllRequests(
    page: number = 1,
    limit: number = 10,
    type?: UserRequestType,
    status?: UserRequestStatus,
  ): Promise<{ requests: UserRequest[]; total: number; pages: number }> {
    const query = this.userRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.processedBy', 'processedBy');

    if (type) {
      query.andWhere('request.type = :type', { type });
    }

    if (status) {
      query.andWhere('request.status = :status', { status });
    }

    query.orderBy('request.createdAt', 'DESC');

    const total = await query.getCount();
    const requests = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      requests,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get pending requests count
   */
  async getPendingCount(): Promise<number> {
    return await this.userRequestRepository.count({
      where: { status: UserRequestStatus.PENDING },
    });
  }

  /**
   * Get a single request by ID
   */
  async getRequestById(id: string): Promise<UserRequest> {
    const request = await this.userRequestRepository.findOne({
      where: { id },
      relations: ['user', 'processedBy'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return request;
  }

  /**
   * Approve a registration request - creates the user
   */
  async approveRegistrationRequest(
    requestId: string,
    adminId: string,
  ): Promise<User> {
    const request = await this.getRequestById(requestId);

    if (request.type !== UserRequestType.REGISTRATION) {
      throw new BadRequestException('This is not a registration request');
    }

    if (request.status !== UserRequestStatus.PENDING) {
      throw new BadRequestException('Request has already been processed');
    }

    // Check if email is still available
    const existingUser = await this.userRepository.findOne({
      where: { email: request.userData.email },
    });

    if (existingUser) {
      throw new ConflictException('Email is no longer available');
    }

    // Get Citizen role
    const citizenRole = await this.roleRepository.findOne({
      where: { name: 'Citizen' },
    });

    if (!citizenRole) {
      throw new NotFoundException('Citizen role not found');
    }

    // Create user from request data
    const user = this.userRepository.create({
      email: request.userData.email,
      password: request.userData.password, // Already hashed
      firstName: request.userData.firstName,
      middleName: request.userData.middleName,
      lastName: request.userData.lastName,
      suffix: request.userData.suffix,
      phoneNumber: request.userData.phoneNumber,
      houseNumber: request.userData.houseNumber,
      street: request.userData.street,
      barangay: request.userData.barangay,
      city: request.userData.city,
      isActive: true,
      roles: [citizenRole],
    });

    const savedUser = await this.userRepository.save(user);

    // Update request status
    request.status = UserRequestStatus.APPROVED;
    request.processedById = adminId;
    request.processedAt = new Date();
    await this.userRequestRepository.save(request);

    return savedUser;
  }

  /**
   * Approve a password reset request - generates temporary password
   */
  async approvePasswordResetRequest(
    requestId: string,
    adminId: string,
    newPassword: string,
  ): Promise<User> {
    const request = await this.getRequestById(requestId);

    if (request.type !== UserRequestType.PASSWORD_RESET) {
      throw new BadRequestException('This is not a password reset request');
    }

    if (request.status !== UserRequestStatus.PENDING) {
      throw new BadRequestException('Request has already been processed');
    }

    if (!request.user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    request.user.password = hashedPassword;
    request.user.failedLoginAttempts = 0;
    request.user.accountLockedUntil = null;
    await this.userRepository.save(request.user);

    // Update request status
    request.status = UserRequestStatus.APPROVED;
    request.processedById = adminId;
    request.processedAt = new Date();
    await this.userRequestRepository.save(request);

    return request.user;
  }

  /**
   * Deny a user request
   */
  async denyRequest(
    requestId: string,
    adminId: string,
    denialReason: string,
  ): Promise<UserRequest> {
    const request = await this.getRequestById(requestId);

    if (request.status !== UserRequestStatus.PENDING) {
      throw new BadRequestException('Request has already been processed');
    }

    request.status = UserRequestStatus.DENIED;
    request.processedById = adminId;
    request.denialReason = denialReason;
    request.processedAt = new Date();

    return await this.userRequestRepository.save(request);
  }

  /**
   * Delete a request (admin only)
   */
  async deleteRequest(requestId: string): Promise<void> {
    const request = await this.getRequestById(requestId);
    await this.userRequestRepository.remove(request);
  }
}
