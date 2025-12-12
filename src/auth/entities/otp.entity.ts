import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum OTPType {
  REGISTRATION = 'registration',
  PASSWORD_RESET = 'password_reset',
}

export enum OTPStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

@Entity('otps')
export class OTP {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: OTPType,
  })
  type: OTPType;

  @Column({
    type: 'enum',
    enum: OTPStatus,
    default: OTPStatus.PENDING,
  })
  status: OTPStatus;

  @Column()
  @Index()
  phoneNumber: string;

  @Column()
  @Index()
  email: string;

  @Column()
  code: string; // 6-digit OTP code (hashed)

  // Store registration data temporarily until OTP is verified
  @Column({ type: 'json', nullable: true })
  registrationData: {
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

  // For password reset - store user ID
  @Column({ nullable: true })
  userId: string;

  @Column({ type: 'int', default: 0 })
  attempts: number; // Track verification attempts

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper method to check if OTP is expired
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // Helper method to check if OTP is still valid
  isValid(): boolean {
    return (
      this.status === OTPStatus.PENDING &&
      !this.isExpired() &&
      this.attempts < 5
    );
  }
}
