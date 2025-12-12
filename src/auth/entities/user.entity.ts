import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
  JoinTable,
} from 'typeorm';
import { Role } from './role.entity';
import { RefreshToken } from './refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ name: 'middle_name', nullable: true })
  middleName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  suffix: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ name: 'place_of_birth', nullable: true })
  placeOfBirth: string;

  @Column({ type: 'enum', enum: ['male', 'female', 'other'], nullable: true })
  gender: string;

  @Column({ 
    name: 'civil_status',
    type: 'enum', 
    enum: ['single', 'married', 'widowed', 'separated', 'divorced'], 
    nullable: true 
  })
  civilStatus: string;

  @Column({ default: 'Filipino', nullable: true })
  nationality: string;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  // Philippine Address Fields
  @Column({ name: 'house_number', nullable: true })
  houseNumber: string;

  @Column({ name: 'street_number', nullable: true })
  streetNumber: string;

  @Column({ name: 'street_name', nullable: true })
  streetName: string;

  @Column({ name: 'street', nullable: true })
  street: string;

  @Column({ nullable: true })
  barangay: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  province: string;

  @Column({ nullable: true })
  region: string;

  @Column({ name: 'zip_code', nullable: true })
  zipCode: string;

  // Additional Information
  @Column({ nullable: true })
  occupation: string;

  @Column({ name: 'monthly_income', nullable: true })
  monthlyIncome: string;

  @Column({ name: 'years_of_residency', type: 'int', nullable: true })
  yearsOfResidency: number;

  @Column({ name: 'voter_id', nullable: true })
  voterId: string;

  @Column({ name: 'precinct_number', nullable: true })
  precinctNumber: string;

  @Column({ name: 'is_registered_voter', default: false })
  isRegisteredVoter: boolean;

  @Column({ name: 'is_profile_complete', default: false })
  isProfileComplete: boolean;

  @Column({ default: true })
  isActive: boolean;

  // Login attempt tracking fields
  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'account_locked_until', type: 'timestamp', nullable: true })
  accountLockedUntil: Date | null;

  @Column({ name: 'last_failed_login', type: 'timestamp', nullable: true })
  lastFailedLogin: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'users_roles',
    joinColumn: {
      name: 'userId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'roleId',
      referencedColumnName: 'id',
    },
  })
  roles: Role[];

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  // Helper method to get full name
  getFullName(): string {
    const parts = [this.firstName];
    if (this.middleName) parts.push(this.middleName);
    parts.push(this.lastName);
    if (this.suffix) parts.push(this.suffix);
    return parts.filter(Boolean).join(' ');
  }

  // Helper method to get complete address
  getCompleteAddress(): string {
    const streetNumber = this.streetNumber || this.houseNumber;
    const streetName = this.streetName || this.street;

    const parts: string[] = [];
    if (streetNumber) parts.push(streetNumber);
    if (streetName) parts.push(streetName);
    if (this.barangay) parts.push(`Barangay ${this.barangay}`);
    if (this.city) parts.push(this.city);
    if (this.province) parts.push(this.province);
    if (this.zipCode) parts.push(this.zipCode);

    return parts.filter(Boolean).join(', ');
  }

  // Check if profile has minimum required fields for document generation
  checkProfileCompleteness(): boolean {
    // Required fields as per document generation requirements
    const hasFirstName = this.firstName && this.firstName.trim().length > 0;
    const hasLastName = this.lastName && this.lastName.trim().length > 0;
    const hasBirthday = this.dateOfBirth !== null && this.dateOfBirth !== undefined;

    const streetNumberValue = this.streetNumber || this.houseNumber;
    const streetNameValue = this.streetName || this.street;
    const hasStreetNumber = streetNumberValue && streetNumberValue.trim().length > 0;
    const hasStreetName = streetNameValue && streetNameValue.trim().length > 0;

    return Boolean(hasFirstName && hasLastName && hasBirthday && hasStreetNumber && hasStreetName);
  }

  // Check if account is currently locked
  isAccountLocked(): boolean {
    if (!this.accountLockedUntil) {
      return false;
    }
    return new Date() < this.accountLockedUntil;
  }

  // Get remaining lockout time in minutes
  getRemainingLockoutTime(): number {
    if (!this.isAccountLocked() || !this.accountLockedUntil) {
      return 0;
    }
    const now = new Date();
    const diff = this.accountLockedUntil!.getTime() - now.getTime();
    return Math.ceil(diff / 60000); // Convert to minutes
  }
}
