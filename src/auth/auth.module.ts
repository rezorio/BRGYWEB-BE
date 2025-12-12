import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLogsController } from './activity-logs.controller';
import { LoginAttemptService } from './services/login-attempt.service';
import { UserRequestService } from './services/user-request.service';
import { OTPService } from './services/otp.service';
import { UserRequestController } from './controllers/user-request.controller';
import { OTPController } from './controllers/otp.controller';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { LoginAttempt } from './entities/login-attempt.entity';
import { UserRequest } from './entities/user-request.entity';
import { OTP } from './entities/otp.entity';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtModuleOptions } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, RefreshToken, ActivityLog, LoginAttempt, UserRequest, OTP]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret',
        signOptions: {
          expiresIn: '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, ActivityLogsController, UserRequestController, OTPController],
  providers: [
    AuthService,
    ActivityLogsService,
    LoginAttemptService,
    UserRequestService,
    OTPService,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
