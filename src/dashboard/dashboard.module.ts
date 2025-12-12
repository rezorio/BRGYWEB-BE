import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User } from '../auth/entities/user.entity';
import { DocumentRequest } from '../documents/entities/document-request.entity';
import { Announcement } from '../announcements/entities/announcement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DocumentRequest, Announcement])
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService]
})
export class DashboardModule {}
