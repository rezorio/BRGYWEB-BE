import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum UserRequestType {
  REGISTRATION = 'registration',
  PASSWORD_RESET = 'password_reset',
}

export enum UserRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
}

@Entity('user_requests')
export class UserRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: UserRequestType,
  })
  type: UserRequestType;

  @Column({
    type: 'enum',
    enum: UserRequestStatus,
    default: UserRequestStatus.PENDING,
  })
  status: UserRequestStatus;

  // For registration requests - store user data
  @Column({ type: 'json', nullable: true })
  userData: {
    email: string;
    password: string; // hashed
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
    phoneNumber: string;
    houseNumber?: string;
    street: string;
    barangay: string;
    city: string;
  };

  // For password reset requests - reference existing user
  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  // Email for both registration and password reset
  @Column()
  email: string;

  // Reason/message from user
  @Column({ type: 'text', nullable: true })
  message: string;

  // Admin who processed the request
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'processed_by_id' })
  processedBy: User;

  @Column({ name: 'processed_by_id', nullable: true })
  processedById: string;

  // Admin's reason for denial
  @Column({ type: 'text', nullable: true })
  denialReason: string;

  // IP address for security tracking
  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  // User agent for security tracking
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper method to check if request is pending
  isPending(): boolean {
    return this.status === UserRequestStatus.PENDING;
  }

  // Helper method to get display name
  getDisplayName(): string {
    if (this.type === UserRequestType.REGISTRATION && this.userData) {
      return `${this.userData.firstName} ${this.userData.lastName}`;
    }
    return this.email;
  }
}
