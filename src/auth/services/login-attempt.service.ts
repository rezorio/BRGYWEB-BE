import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { LoginAttempt } from '../entities/login-attempt.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class LoginAttemptService {
  private readonly logger = new Logger(LoginAttemptService.name);
  
  // Configuration constants
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 30;
  private readonly ATTEMPT_WINDOW_MINUTES = 15; // Time window to count failed attempts
  private readonly CLEANUP_DAYS = 30; // Keep login attempts for 30 days

  constructor(
    @InjectRepository(LoginAttempt)
    private loginAttemptRepository: Repository<LoginAttempt>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Record a login attempt (success or failure)
   */
  async recordAttempt(
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string,
  ): Promise<void> {
    const attempt = this.loginAttemptRepository.create({
      email: email.toLowerCase(),
      ipAddress,
      userAgent,
      success,
      failureReason,
    });

    await this.loginAttemptRepository.save(attempt);

    this.logger.log(
      `Login attempt recorded: ${email} from ${ipAddress} - ${success ? 'SUCCESS' : 'FAILED'}`,
    );
  }

  /**
   * Get failed login attempts within the time window
   */
  async getRecentFailedAttempts(email: string, ipAddress?: string): Promise<number> {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - this.ATTEMPT_WINDOW_MINUTES);

    const whereCondition: any = {
      email: email.toLowerCase(),
      success: false,
      attemptTime: MoreThan(windowStart),
    };

    // Optionally filter by IP address for stricter rate limiting
    if (ipAddress) {
      whereCondition.ipAddress = ipAddress;
    }

    const count = await this.loginAttemptRepository.count({
      where: whereCondition,
    });

    return count;
  }

  /**
   * Check if account should be locked based on failed attempts
   */
  async shouldLockAccount(email: string): Promise<boolean> {
    const failedAttempts = await this.getRecentFailedAttempts(email);
    return failedAttempts >= this.MAX_FAILED_ATTEMPTS;
  }

  /**
   * Lock user account for specified duration
   */
  async lockAccount(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return;
    }

    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + this.LOCKOUT_DURATION_MINUTES);

    user.accountLockedUntil = lockUntil;
    user.failedLoginAttempts = await this.getRecentFailedAttempts(email);
    user.lastFailedLogin = new Date();

    await this.userRepository.save(user);

    this.logger.warn(
      `Account locked: ${email} until ${lockUntil.toISOString()} (${this.LOCKOUT_DURATION_MINUTES} minutes)`,
    );
  }

  /**
   * Reset failed login attempts after successful login
   */
  async resetFailedAttempts(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return;
    }

    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastFailedLogin = null;

    await this.userRepository.save(user);

    this.logger.log(`Failed login attempts reset for: ${email}`);
  }

  /**
   * Check if account is currently locked
   */
  async isAccountLocked(email: string): Promise<{ locked: boolean; remainingMinutes?: number }> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.accountLockedUntil) {
      return { locked: false };
    }

    const now = new Date();
    if (now < user.accountLockedUntil) {
      const remainingMs = user.accountLockedUntil.getTime() - now.getTime();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return { locked: true, remainingMinutes };
    }

    // Lock expired, reset the lockout
    await this.resetFailedAttempts(email);
    return { locked: false };
  }

  /**
   * Get login attempt statistics for a user
   */
  async getAttemptStats(email: string): Promise<{
    totalAttempts: number;
    failedAttempts: number;
    successfulAttempts: number;
    recentFailedAttempts: number;
    lastAttempt: Date | null;
  }> {
    const allAttempts = await this.loginAttemptRepository.find({
      where: { email: email.toLowerCase() },
      order: { attemptTime: 'DESC' },
      take: 100,
    });

    const recentFailedAttempts = await this.getRecentFailedAttempts(email);

    return {
      totalAttempts: allAttempts.length,
      failedAttempts: allAttempts.filter((a) => !a.success).length,
      successfulAttempts: allAttempts.filter((a) => a.success).length,
      recentFailedAttempts,
      lastAttempt: allAttempts.length > 0 ? allAttempts[0].attemptTime : null,
    };
  }

  /**
   * Clean up old login attempts (run periodically)
   */
  async cleanupOldAttempts(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.CLEANUP_DAYS);

    const result = await this.loginAttemptRepository.delete({
      attemptTime: LessThan(cutoffDate),
    });

    const deletedCount = result.affected || 0;
    this.logger.log(`Cleaned up ${deletedCount} old login attempts`);
    
    return deletedCount;
  }

  /**
   * Get configuration values (for admin/monitoring)
   */
  getConfiguration() {
    return {
      maxFailedAttempts: this.MAX_FAILED_ATTEMPTS,
      lockoutDurationMinutes: this.LOCKOUT_DURATION_MINUTES,
      attemptWindowMinutes: this.ATTEMPT_WINDOW_MINUTES,
      cleanupDays: this.CLEANUP_DAYS,
    };
  }
}
