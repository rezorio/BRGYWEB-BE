import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { DocumentRequest, RequestStatus } from '../documents/entities/document-request.entity';
import { Announcement } from '../announcements/entities/announcement.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(DocumentRequest)
    private documentRequestRepository: Repository<DocumentRequest>,
    @InjectRepository(Announcement)
    private announcementRepository: Repository<Announcement>,
  ) {}

  async getDashboardStats() {
    // Get total users count
    const totalUsers = await this.userRepository.count();

    // Get active users count (users with isActive = true)
    const activeUsers = await this.userRepository.count({
      where: { isActive: true }
    });

    // Get pending document requests count
    const pendingRequests = await this.documentRequestRepository.count({
      where: { status: RequestStatus.PENDING }
    });

    // Get upcoming announcement (next active announcement by date)
    const upcomingAnnouncement = await this.announcementRepository.findOne({
      where: { 
        isActive: true,
        date: MoreThan(new Date())
      },
      order: { date: 'ASC' }
    });

    // If no upcoming announcement, get the most recent active one
    let announcementTitle = 'No upcoming events';
    if (upcomingAnnouncement) {
      announcementTitle = upcomingAnnouncement.title;
    } else {
      const latestAnnouncement = await this.announcementRepository.findOne({
        where: { isActive: true },
        order: { date: 'DESC' }
      });
      if (latestAnnouncement) {
        announcementTitle = latestAnnouncement.title;
      }
    }

    return {
      totalUsers,
      activeUsers,
      pendingRequests,
      upcomingEvent: announcementTitle
    };
  }

  async getRecentDocumentRequests(limit: number = 5) {
    const requests = await this.documentRequestRepository.find({
      relations: ['user', 'processedBy'],
      order: { updatedAt: 'DESC' },
      take: limit
    });

    return requests.map(request => {
      const userName = `${request.user.firstName} ${request.user.lastName}`;
      const requestTypeFormatted = this.formatRequestType(request.requestType);
      
      let action = '';
      let description = '';
      let icon = '';
      let iconBg = '';
      
      // Determine action based on status and timestamps
      if (request.status === RequestStatus.PENDING) {
        action = 'Created';
        description = `${userName} requested ${requestTypeFormatted}`;
        icon = 'fas fa-file-alt text-blue-600';
        iconBg = 'bg-blue-100';
      } else if (request.status === RequestStatus.APPROVED) {
        action = 'Approved';
        const processedByName = request.processedBy 
          ? `${request.processedBy.firstName} ${request.processedBy.lastName}`
          : 'Admin';
        description = `${processedByName} approved ${requestTypeFormatted} for ${userName}`;
        icon = 'fas fa-check-circle text-green-600';
        iconBg = 'bg-green-100';
      } else if (request.status === RequestStatus.DENIED) {
        action = 'Denied';
        const processedByName = request.processedBy 
          ? `${request.processedBy.firstName} ${request.processedBy.lastName}`
          : 'Admin';
        description = `${processedByName} denied ${requestTypeFormatted} for ${userName}`;
        icon = 'fas fa-times-circle text-red-600';
        iconBg = 'bg-red-100';
      }

      return {
        id: request.id,
        action,
        title: `${action} - ${requestTypeFormatted}`,
        description,
        time: this.formatTimeAgo(request.updatedAt),
        icon,
        iconBg,
        status: request.status,
        requestType: request.requestType,
        userName,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
      };
    });
  }

  private formatRequestType(requestType: string): string {
    const typeMap = {
      'barangay_clearance': 'Barangay Clearance',
      'certificate_of_residency': 'Certificate of Residency',
      'certificate_of_indigency': 'Certificate of Indigency'
    };
    return typeMap[requestType] || requestType;
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
}
