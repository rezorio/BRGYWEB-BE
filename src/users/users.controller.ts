import { Controller, Get, Put, Post, Param, Body, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('Admin', 'Super Admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAllUsers() {
    const users = await this.usersService.findAllUsers();
    
    // Format users for frontend
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        role: user.roles?.[0]?.name || 'Citizen',
        status: user.isActive ? 'Active' : 'Inactive',
        joinedDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }) : 'Unknown',
      };
    });
  }

  @Get(':id')
  @Roles('Admin', 'Super Admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') userId: string) {
    console.log('[UsersController] GET /users/:id called for:', userId);
    const user = await this.usersService.findUserById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    const response = {
      ...userWithoutPassword,
      role: user.roles?.[0]?.name || 'Citizen',
      status: user.isActive ? 'Active' : 'Inactive',
      joinedDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }) : 'Unknown',
    };

    console.log('[UsersController] Returning user data:', response);
    return response;
  }

  @Put(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update user profile (Admin endpoint)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') userId: string,
    @Body() updateData: any
  ) {
    console.log('[UsersController] PUT /users/:id called');
    console.log('[UsersController] User ID:', userId);
    console.log('[UsersController] Update data:', updateData);

    // Convert status to isActive boolean
    if (updateData.status) {
      updateData.isActive = updateData.status === 'Active';
    }

    const updatedUser = await this.usersService.updateUser(userId, updateData);

    console.log('[UsersController] User updated successfully:', updatedUser.id);

    // Return complete user data without password
    const { password, ...userWithoutPassword } = updatedUser;
    
    const response = {
      ...userWithoutPassword,
      role: updatedUser.roles?.[0]?.name || 'Citizen',
      status: updatedUser.isActive ? 'Active' : 'Inactive',
      joinedDate: updatedUser.createdAt ? new Date(updatedUser.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }) : 'Unknown',
    };

    console.log('[UsersController] Sending response:', response);
    return response;
  }

  @Get('profile')
  @Roles('Citizen', 'Admin', 'Super Admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Request() req) {
    return {
      message: 'User profile endpoint',
      user: req.user,
    };
  }

  @Get('moderator')
  @Roles('Admin', 'Super Admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Access administrative endpoint (Admin/Super Admin)' })
  @ApiResponse({ status: 200, description: 'Admin access granted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  moderatorOnly() {
    return { message: 'This endpoint is accessible by Admins and Super Admins' };
  }

  @Post(':id/refresh-profile-status')
  @Roles('Admin', 'Super Admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Refresh profile completeness status for a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'Profile status refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async refreshProfileStatus(@Param('id') userId: string) {
    console.log('[UsersController] POST /users/:id/refresh-profile-status called for:', userId);
    
    const user = await this.usersService.refreshProfileStatus(userId);
    
    const { password, ...userWithoutPassword } = user;
    const response = {
      ...userWithoutPassword,
      role: user.roles?.[0]?.name || 'Citizen',
      status: user.isActive ? 'Active' : 'Inactive',
      message: 'Profile completeness status refreshed successfully'
    };

    console.log('[UsersController] Profile status refreshed:', {
      userId: user.id,
      isProfileComplete: user.isProfileComplete
    });
    
    return response;
  }
}
