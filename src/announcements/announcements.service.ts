import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './entities/announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private announcementsRepository: Repository<Announcement>,
  ) {}

  async create(
    createAnnouncementDto: CreateAnnouncementDto,
    userId: string,
  ): Promise<Announcement> {
    try {
      console.log('Service - Creating announcement with data:', createAnnouncementDto);
      console.log('Service - User ID:', userId);
      
      const announcement = this.announcementsRepository.create({
        ...createAnnouncementDto,
        createdById: userId,
      });

      console.log('Service - Created entity:', announcement);
      const savedAnnouncement = await this.announcementsRepository.save(announcement);
      console.log('Service - Saved announcement:', savedAnnouncement);
      
      return savedAnnouncement;
    } catch (error) {
      console.error('Service - Error creating announcement:', error);
      throw new BadRequestException(`Failed to create announcement: ${error.message}`);
    }
  }

  async findAll(): Promise<Announcement[]> {
    return await this.announcementsRepository.find({
      where: { isActive: true },
      order: { date: 'DESC' },
      relations: ['createdBy'],
    });
  }

  async findAllForAdmin(): Promise<Announcement[]> {
    try {
      console.log('Service - Fetching all announcements for admin');
      const announcements = await this.announcementsRepository.find({
        order: { createdAt: 'DESC' },
        relations: ['createdBy'],
      });
      console.log('Service - Found announcements:', announcements.length);
      return announcements;
    } catch (error) {
      console.error('Service - Error fetching announcements:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<Announcement> {
    const announcement = await this.announcementsRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!announcement) {
      throw new NotFoundException(`Announcement with ID ${id} not found`);
    }

    return announcement;
  }

  async update(
    id: string,
    updateAnnouncementDto: UpdateAnnouncementDto,
  ): Promise<Announcement> {
    try {
      console.log('Service - Updating announcement ID:', id);
      console.log('Service - Update data:', updateAnnouncementDto);
      
      const announcement = await this.findOne(id);
      console.log('Service - Found announcement:', announcement);

      Object.assign(announcement, updateAnnouncementDto);
      console.log('Service - Updated announcement object:', announcement);

      const savedAnnouncement = await this.announcementsRepository.save(announcement);
      console.log('Service - Saved announcement:', savedAnnouncement);
      
      return savedAnnouncement;
    } catch (error) {
      console.error('Service - Error updating announcement:', error);
      throw new BadRequestException(`Failed to update announcement: ${error.message}`);
    }
  }

  async remove(id: string): Promise<void> {
    const announcement = await this.findOne(id);
    await this.announcementsRepository.remove(announcement);
  }

  async toggleActive(id: string): Promise<Announcement> {
    const announcement = await this.findOne(id);
    announcement.isActive = !announcement.isActive;
    return await this.announcementsRepository.save(announcement);
  }
}
