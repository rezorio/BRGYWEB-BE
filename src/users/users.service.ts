import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Role } from '../auth/entities/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async findAllUsers(): Promise<User[]> {
    return await this.userRepository.find({
      relations: ['roles'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
      cache: false // Disable cache to ensure fresh data
    });
  }

  async updateUser(userId: string, updateData: any): Promise<User> {
    console.log('[UsersService] updateUser called for userId:', userId);
    console.log('[UsersService] Update data received:', updateData);

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
      cache: false // Disable cache to ensure fresh data
    });

    if (!user) {
      console.error('[UsersService] User not found:', userId);
      throw new Error('User not found');
    }

    console.log('[UsersService] Current user data before update:', {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      street: user.street
    });

    // Update all allowed profile fields
    const allowedFields = [
      'firstName', 'middleName', 'lastName', 'suffix',
      'dateOfBirth', 'gender', 'civilStatus',
      'phoneNumber',
      'houseNumber', 'street'
    ];

    allowedFields.forEach(field => {
      if (updateData.hasOwnProperty(field)) {
        console.log(`[UsersService] Updating ${field}: "${user[field]}" -> "${updateData[field]}"`);
        user[field] = updateData[field];
      }
    });

    // Update isActive status
    if (updateData.isActive !== undefined) {
      console.log(`[UsersService] Updating isActive: ${user.isActive} -> ${updateData.isActive}`);
      user.isActive = updateData.isActive;
    }

    // Update role if provided
    if (updateData.role) {
      const role = await this.roleRepository.findOne({
        where: { name: updateData.role },
      });
      if (role) {
        console.log(`[UsersService] Updating role to: ${role.name}`);
        user.roles = [role];
      }
    }

    // Check if profile is complete after update
    user.isProfileComplete = user.checkProfileCompleteness();
    console.log('[UsersService] Profile complete status:', user.isProfileComplete);

    console.log('[UsersService] Saving user to database...');
    const savedUser = await this.userRepository.save(user);
    console.log('[UsersService] User saved successfully! New values:', {
      email: savedUser.email,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      phoneNumber: savedUser.phoneNumber,
      street: savedUser.street,
      isProfileComplete: savedUser.isProfileComplete
    });

    return savedUser;
  }

  /**
   * Refresh profile completeness status for a user
   * This is useful to sync the isProfileComplete field with actual data
   */
  async refreshProfileStatus(userId: string): Promise<User> {
    console.log('[UsersService] Refreshing profile status for userId:', userId);

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
      cache: false // Disable cache to ensure fresh data
    });

    if (!user) {
      console.error('[UsersService] User not found:', userId);
      throw new Error('User not found');
    }

    // Recalculate profile completeness
    const wasComplete = user.isProfileComplete;
    user.isProfileComplete = user.checkProfileCompleteness();
    
    console.log('[UsersService] Profile status changed:', {
      before: wasComplete,
      after: user.isProfileComplete,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      street: user.street
    });

    // Save if status changed
    if (wasComplete !== user.isProfileComplete) {
      const savedUser = await this.userRepository.save(user);
      console.log('[UsersService] Profile status updated and saved');
      return savedUser;
    }

    console.log('[UsersService] Profile status unchanged, no save needed');
    return user;
  }
}
