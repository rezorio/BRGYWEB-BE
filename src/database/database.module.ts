import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../auth/entities/user.entity';
import { Role } from '../auth/entities/role.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { ActivityLog } from '../auth/entities/activity-log.entity';
import { LoginAttempt } from '../auth/entities/login-attempt.entity';
import { Announcement } from '../announcements/entities/announcement.entity';
import { DocumentRequest } from '../documents/entities/document-request.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [User, Role, RefreshToken, ActivityLog, LoginAttempt, Announcement, DocumentRequest],
        synchronize: false,
        // logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
