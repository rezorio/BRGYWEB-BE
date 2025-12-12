import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { Announcement } from './entities/announcement.entity';
import { ActivityLogsService } from '../auth/activity-logs.service';
import { ActivityLog } from '../auth/entities/activity-log.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Announcement, ActivityLog, User])],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService, ActivityLogsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
