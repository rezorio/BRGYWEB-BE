import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Patch,
  Param,
  Get,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OTPService } from '../services/otp.service';
import { AuthService } from '../auth.service';
import { OTPSmsService } from '../../sms/sms.service';

@Controller('otp')
export class OTPController {
  private otpSmsService: OTPSmsService;

  constructor(
    private readonly otpService: OTPService,
    private readonly authService: AuthService,
  ) {
    this.otpSmsService = new OTPSmsService();
  }

  /**
   * Step 1: Submit registration data and request OTP
   */
  @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3 per 15 minutes
  @Post('registration/request')
  @HttpCode(HttpStatus.CREATED)
  async requestRegistrationOTP(@Body() registrationData: any, @Req() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Hash password before storing
    const hashedPassword = await this.authService.hashPassword(
      registrationData.password,
    );
    registrationData.password = hashedPassword;

    const result = await this.otpService.createRegistrationOTP(
      registrationData,
      ipAddress,
      userAgent,
    );

    // Send OTP via SMS
    try {
      await this.otpSmsService.sendRegistrationOTP(
        registrationData.phoneNumber,
        result.code,
        registrationData.firstName,
      );
    } catch (error) {
      console.error('Failed to send OTP SMS:', error);
      // Continue even if SMS fails - user can still use the code
    }

    return {
      message: 'OTP sent to your phone number',
      otpId: result.otpId,
      expiresAt: result.expiresAt,
      // DEVELOPMENT ONLY - Remove in production
      code: result.code,
    };
  }

  /**
   * Step 2: Verify OTP and complete registration
   */
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 per 5 minutes
  @Post('registration/verify')
  @HttpCode(HttpStatus.OK)
  async verifyRegistrationOTP(
    @Body() body: { otpId: string; code: string },
  ) {
    const user = await this.otpService.verifyRegistrationOTP(
      body.otpId,
      body.code,
    );

    // Auto-login after successful registration
    const tokens = await this.authService.generateTokens(user);

    return {
      message: 'Registration successful',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        roles: user.roles.map((role) => role.name),
      },
    };
  }

  /**
   * Step 1: Request password reset OTP
   */
  @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3 per 15 minutes
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordResetOTP(
    @Body() body: { phoneNumber: string },
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.otpService.createPasswordResetOTP(
      body.phoneNumber,
      ipAddress,
      userAgent,
    );

    // Send OTP via SMS
    try {
      // Get user's first name from email (we'll need to fetch user)
      const firstName = result.email.split('@')[0]; // Fallback
      await this.otpSmsService.sendPasswordResetOTP(
        body.phoneNumber,
        result.code,
        firstName,
      );
    } catch (error) {
      console.error('Failed to send OTP SMS:', error);
      // Continue even if SMS fails - user can still use the code
    }

    // Mask email for security
    const maskedEmail = this.maskEmail(result.email);

    return {
      message: 'OTP sent to your phone number',
      otpId: result.otpId,
      email: maskedEmail,
      expiresAt: result.expiresAt,
      // DEVELOPMENT ONLY - Remove in production
      code: result.code,
    };
  }

  /**
   * Step 2: Verify OTP for password reset
   */
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 per 5 minutes
  @Post('password-reset/verify')
  @HttpCode(HttpStatus.OK)
  async verifyPasswordResetOTP(
    @Body() body: { otpId: string; code: string },
  ) {
    const result = await this.otpService.verifyPasswordResetOTP(
      body.otpId,
      body.code,
    );

    return {
      message: 'OTP verified successfully',
      resetToken: result.userId, // Use this to reset password
      email: this.maskEmail(result.email),
    };
  }

  /**
   * Step 3: Reset password
   */
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 per 5 minutes
  @Patch('password-reset/complete')
  @HttpCode(HttpStatus.OK)
  async completePasswordReset(
    @Body() body: { resetToken: string; newPassword: string },
  ) {
    await this.otpService.resetPassword(body.resetToken, body.newPassword);

    return {
      message: 'Password reset successful. You can now login with your new password.',
    };
  }

  /**
   * Resend OTP
   */
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 per 5 minutes
  @Post('resend/:otpId')
  @HttpCode(HttpStatus.OK)
  async resendOTP(@Param('otpId') otpId: string) {
    const result = await this.otpService.resendOTP(otpId);

    // Get OTP details to send SMS
    try {
      const otpDetails = await this.otpService.getOTPDetails(otpId);
      await this.otpSmsService.sendOTP(
        otpDetails.phoneNumber,
        result.code,
        otpDetails.type === 'registration' ? 'registration' : 'password reset',
      );
    } catch (error) {
      console.error('Failed to send OTP SMS:', error);
      // Continue even if SMS fails
    }

    return {
      message: 'OTP resent successfully',
      expiresAt: result.expiresAt,
      // DEVELOPMENT ONLY - Remove in production
      code: result.code,
    };
  }

  /**
   * Get OTP details (for checking status)
   */
  @Get(':otpId')
  @HttpCode(HttpStatus.OK)
  async getOTPDetails(@Param('otpId') otpId: string) {
    return await this.otpService.getOTPDetails(otpId);
  }

  /**
   * Helper to mask email
   */
  private maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    const maskedUsername =
      username.charAt(0) +
      '*'.repeat(username.length - 2) +
      username.charAt(username.length - 1);
    return `${maskedUsername}@${domain}`;
  }
}
