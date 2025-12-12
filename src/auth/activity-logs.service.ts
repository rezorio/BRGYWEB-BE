import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { User } from './entities/user.entity';

export interface CreateActivityLogDto {
  title: string;
  description: string;
  type?: string;
  changes?: any;
  userId?: string;
  userEmail: string;
  userName: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createLogDto: CreateActivityLogDto): Promise<ActivityLog | null> {
    // Prevent logging routine access/viewing events
    const restrictedEvents = [
      'access', 'view', 'login', 'logout', 'signin', 'signout', 
      'opened', 'navigated', 'visited', 'displayed', 'loaded'
    ];
    
    const titleLower = createLogDto.title.toLowerCase();
    const descriptionLower = createLogDto.description.toLowerCase();
    
    const isRestrictedEvent = restrictedEvents.some(event => 
      titleLower.includes(event) || descriptionLower.includes(event)
    );
    
    if (isRestrictedEvent) {
      console.warn('Activity log blocked: Routine access/viewing events are not logged');
      return null;
    }

    let user: User | null = null;
    if (createLogDto.userId) {
      user = await this.userRepository.findOne({ 
        where: { id: createLogDto.userId } 
      });
    }

    const activityLog = this.activityLogRepository.create({
      ...createLogDto,
      user: user || undefined,
    });

    return this.activityLogRepository.save(activityLog);
  }

  async findAll(page = 1, limit = 10): Promise<{ logs: ActivityLog[], total: number }> {
    const skip = (page - 1) * limit;
    
    const [logs, total] = await this.activityLogRepository.findAndCount({
      relations: ['user'],
      order: { timestamp: 'DESC' },
      take: limit,
      skip,
    });

    return { logs, total };
  }

  async findByType(type: string, page = 1, limit = 10): Promise<{ logs: ActivityLog[], total: number }> {
    const skip = (page - 1) * limit;
    
    const [logs, total] = await this.activityLogRepository.findAndCount({
      where: { type },
      relations: ['user'],
      order: { timestamp: 'DESC' },
      take: limit,
      skip,
    });

    return { logs, total };
  }

  async findByUser(userId: string, page = 1, limit = 10): Promise<{ logs: ActivityLog[], total: number }> {
    const skip = (page - 1) * limit;
    
    const [logs, total] = await this.activityLogRepository.findAndCount({
      where: { userId },
      relations: ['user'],
      order: { timestamp: 'DESC' },
      take: limit,
      skip,
    });

    return { logs, total };
  }

  async findByDateRange(startDate: Date, endDate: Date, page = 1, limit = 10): Promise<{ logs: ActivityLog[], total: number }> {
    const skip = (page - 1) * limit;
    
    const [logs, total] = await this.activityLogRepository.findAndCount({
      where: { timestamp: Between(startDate, endDate) },
      relations: ['user'],
      order: { timestamp: 'DESC' },
      take: limit,
      skip,
    });

    return { logs, total };
  }

  async search(query: string, page = 1, limit = 10): Promise<{ logs: ActivityLog[], total: number }> {
    const skip = (page - 1) * limit;
    
    const [logs, total] = await this.activityLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.title LIKE :query', { query: `%${query}%` })
      .orWhere('log.description LIKE :query', { query: `%${query}%` })
      .orWhere('log.userName LIKE :query', { query: `%${query}%` })
      .orWhere('log.userEmail LIKE :query', { query: `%${query}%` })
      .orderBy('log.timestamp', 'DESC')
      .take(limit)
      .skip(skip)
      .getManyAndCount();

    return { logs, total };
  }

  async clearAllLogs(): Promise<void> {
    await this.activityLogRepository.clear();
  }

  async deleteOldLogs(daysOld = 150): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    await this.activityLogRepository
      .createQueryBuilder()
      .delete()
      .where('timestamp < :cutoffDate', { cutoffDate })
      .execute();
  }
}
