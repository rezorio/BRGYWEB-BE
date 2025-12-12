import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActivityLogsService } from '../auth/activity-logs.service';

@Controller('announcements')
export class AnnouncementsController {
  constructor(
    private readonly announcementsService: AnnouncementsService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  private readonly uploadPath = path.join(process.cwd(), 'uploads', 'announcements');

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/announcements',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async create(
    @Body() createAnnouncementDto: CreateAnnouncementDto,
    @Request() req,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      console.log('Create announcement - Body:', createAnnouncementDto);
      console.log('Create announcement - File:', file);
      
      if (file) {
        createAnnouncementDto.imageFilename = file.filename;
        createAnnouncementDto.image = `/uploads/announcements/${file.filename}`;
      }
      
      const announcement = await this.announcementsService.create(createAnnouncementDto, req.user.userId);
      
      // Log activity
      try {
        console.log('Creating activity log for announcement:', {
          userId: req.user.userId,
          email: req.user.email,
          announcementId: announcement.id,
        });
        
        await this.activityLogsService.create({
          title: 'Announcement Created',
          description: `Created new announcement: "${createAnnouncementDto.title}"`,
          type: 'announcement',
          changes: {
            action: 'create',
            announcementId: announcement.id,
            title: createAnnouncementDto.title,
            hasImage: !!file,
          },
          userId: req.user.userId,
          userEmail: req.user.email,
          userName: req.user.email,
          userRole: req.user.roles?.[0] || 'Unknown',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
        
        console.log('Activity log created successfully');
      } catch (logError) {
        console.error('Failed to create activity log:', logError);
        // Don't fail the announcement creation if logging fails
      }
      
      return announcement;
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw error;
    }
  }

  @Get()
  findAll() {
    console.log('Public announcements endpoint called');
    return this.announcementsService.findAll();
  }

  @Get('test')
  test() {
    console.log('Test endpoint called');
    return { message: 'Announcements API is working', timestamp: new Date() };
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  findAllForAdmin(@Request() req) {
    console.log('Admin announcements request - User:', req.user);
    return this.announcementsService.findAllForAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.announcementsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/announcements',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
    @Request() req,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      console.log('Update announcement - ID:', id);
      console.log('Update announcement - Body:', updateAnnouncementDto);
      console.log('Update announcement - File:', file);
      
      // Get old announcement for comparison
      const oldAnnouncement = await this.announcementsService.findOne(id);
      
      // Convert string boolean to actual boolean if needed
      if (typeof updateAnnouncementDto.isActive === 'string') {
        updateAnnouncementDto.isActive = updateAnnouncementDto.isActive === 'true';
      }
      
      if (file) {
        // Delete old image if exists
        if (oldAnnouncement.imageFilename) {
          const oldImagePath = path.join(this.uploadPath, oldAnnouncement.imageFilename);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        updateAnnouncementDto.imageFilename = file.filename;
        updateAnnouncementDto.image = `/uploads/announcements/${file.filename}`;
      }
      
      console.log('Update announcement - Processed DTO:', updateAnnouncementDto);
      const updatedAnnouncement = await this.announcementsService.update(id, updateAnnouncementDto);
      
      // Log activity with ALL field changes
      try {
        const changes: any = {};
        
        // Track title changes
        if (updateAnnouncementDto.title && updateAnnouncementDto.title !== oldAnnouncement.title) {
          changes.title = { from: oldAnnouncement.title, to: updateAnnouncementDto.title };
        }
        
        // Track description changes
        if (updateAnnouncementDto.description && updateAnnouncementDto.description !== oldAnnouncement.description) {
          changes.description = { from: oldAnnouncement.description, to: updateAnnouncementDto.description };
        }
        
        // Track date changes
        if (updateAnnouncementDto.date) {
          const oldDate = oldAnnouncement.date ? new Date(oldAnnouncement.date).toISOString().split('T')[0] : '';
          const newDate = new Date(updateAnnouncementDto.date).toISOString().split('T')[0];
          if (oldDate !== newDate) {
            changes.date = { from: oldDate, to: newDate };
          }
        }
        
        // Track image changes
        if (file) {
          changes.image = { 
            from: oldAnnouncement.imageFilename ? 'Previous image' : 'No image', 
            to: 'New image uploaded' 
          };
        }
        
        // Track active status changes
        if (updateAnnouncementDto.isActive !== undefined && updateAnnouncementDto.isActive !== oldAnnouncement.isActive) {
          changes.status = { 
            from: oldAnnouncement.isActive ? 'Active' : 'Inactive', 
            to: updateAnnouncementDto.isActive ? 'Active' : 'Inactive' 
          };
        }
        
        console.log('Creating activity log for update:', {
          userId: req.user.userId,
          email: req.user.email,
          changes,
        });
        
        await this.activityLogsService.create({
          title: 'Announcement Updated',
          description: `Updated announcement: "${oldAnnouncement.title}"`,
          type: 'announcement',
          changes,
          userId: req.user.userId,
          userEmail: req.user.email,
          userName: req.user.email,
          userRole: req.user.roles?.[0] || 'Unknown',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
        
        console.log('Activity log created successfully');
      } catch (logError) {
        console.error('Failed to create activity log:', logError);
        // Don't fail the update if logging fails
      }
      
      return updatedAnnouncement;
    } catch (error) {
      console.error('Error updating announcement:', error);
      throw error;
    }
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async toggleActive(@Param('id') id: string, @Request() req) {
    const announcement = await this.announcementsService.findOne(id);
    const oldStatus = announcement.isActive;
    
    const result = await this.announcementsService.toggleActive(id);
    const newStatus = !oldStatus;
    
    // Log activity
    await this.activityLogsService.create({
      title: `Announcement ${newStatus ? 'Activated' : 'Deactivated'}`,
      description: `${newStatus ? 'Activated' : 'Deactivated'} announcement: "${announcement.title}"`,
      type: 'announcement',
      changes: {
        action: 'toggle-active',
        announcementId: id,
        title: announcement.title,
        isActive: { from: oldStatus, to: newStatus },
      },
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.email,
      userRole: req.user.roles?.[0] || 'Unknown',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  async remove(@Param('id') id: string, @Request() req) {
    // Get announcement details before deletion
    const announcement = await this.announcementsService.findOne(id);
    
    // Delete image file if exists
    if (announcement.imageFilename) {
      const imagePath = path.join(this.uploadPath, announcement.imageFilename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    const result = await this.announcementsService.remove(id);
    
    // Log activity
    await this.activityLogsService.create({
      title: 'Announcement Deleted',
      description: `Deleted announcement: "${announcement.title}"`,
      type: 'announcement',
      changes: {
        action: 'delete',
        announcementId: id,
        title: announcement.title,
        hadImage: !!announcement.imageFilename,
      },
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.email,
      userRole: req.user.roles?.[0] || 'Unknown',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    return result;
  }
}
