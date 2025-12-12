import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRequestService } from '../services/user-request.service';
import { UserRequestType, UserRequestStatus } from '../entities/user-request.entity';

@Controller('user-requests')
export class UserRequestController {
  constructor(private readonly userRequestService: UserRequestService) {}

  /**
   * PUBLIC: Submit registration request (rate limited)
   * Limit: 3 requests per 15 minutes per IP
   */
  @Post('registration')
  @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3 per 15 minutes
  @HttpCode(HttpStatus.CREATED)
  async submitRegistrationRequest(@Body() userData: any, @Req() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const request = await this.userRequestService.createRegistrationRequest(
      userData,
      ipAddress,
      userAgent,
    );

    return {
      message:
        'Registration request submitted successfully. Please wait for admin approval.',
      requestId: request.id,
      status: request.status,
    };
  }

  /**
   * PUBLIC: Submit password reset request (rate limited)
   * Limit: 3 requests per 15 minutes per IP
   */
  @Post('password-reset')
  @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3 per 15 minutes
  @HttpCode(HttpStatus.CREATED)
  async submitPasswordResetRequest(
    @Body() body: { email: string; message: string },
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const request = await this.userRequestService.createPasswordResetRequest(
      body.email,
      body.message,
      ipAddress,
      userAgent,
    );

    return {
      message:
        'Password reset request submitted successfully. An admin will review your request.',
      requestId: request.id,
      status: request.status,
    };
  }

  /**
   * ADMIN: Get all user requests with pagination and filtering
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async getAllRequests(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('type') type?: UserRequestType,
    @Query('status') status?: UserRequestStatus,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    return await this.userRequestService.getAllRequests(
      pageNum,
      limitNum,
      type,
      status,
    );
  }

  /**
   * ADMIN: Get pending requests count
   */
  @Get('pending/count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async getPendingCount() {
    const count = await this.userRequestService.getPendingCount();
    return { count };
  }

  /**
   * ADMIN: Get single request by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async getRequestById(@Param('id') id: string) {
    return await this.userRequestService.getRequestById(id);
  }

  /**
   * ADMIN: Approve registration request
   */
  @Patch(':id/approve-registration')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async approveRegistrationRequest(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user.userId;
    const user = await this.userRequestService.approveRegistrationRequest(
      id,
      adminId,
    );

    return {
      message: 'Registration request approved successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  /**
   * ADMIN: Approve password reset request
   */
  @Patch(':id/approve-password-reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async approvePasswordResetRequest(
    @Param('id') id: string,
    @Body() body: { newPassword: string },
    @Req() req: any,
  ) {
    const adminId = req.user.userId;
    const user = await this.userRequestService.approvePasswordResetRequest(
      id,
      adminId,
      body.newPassword,
    );

    return {
      message: 'Password reset approved successfully',
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  /**
   * ADMIN: Deny a request
   */
  @Patch(':id/deny')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async denyRequest(
    @Param('id') id: string,
    @Body() body: { denialReason: string },
    @Req() req: any,
  ) {
    const adminId = req.user.userId;
    const request = await this.userRequestService.denyRequest(
      id,
      adminId,
      body.denialReason,
    );

    return {
      message: 'Request denied successfully',
      request: {
        id: request.id,
        status: request.status,
        denialReason: request.denialReason,
      },
    };
  }

  /**
   * ADMIN: Delete a request
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Super Admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRequest(@Param('id') id: string) {
    await this.userRequestService.deleteRequest(id);
  }
}
