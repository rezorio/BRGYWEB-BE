import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsEqualTo } from '../decorators/is-equal-to.decorator';

export class ChangePasswordDto {
  @ApiProperty({ 
    description: 'Current password for verification',
    example: 'oldPassword123',
    format: 'password'
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ 
    description: 'New password (min 6 characters, must include at least one special character)',
    example: 'newPassword123!',
    minLength: 6,
    format: 'password'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/^(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/, { 
    message: 'Password must contain at least one special character' 
  })
  newPassword: string;

  @ApiProperty({ 
    description: 'Confirm new password (must match new password)',
    example: 'newPasswordabc!',
    format: 'password'
  })
  @IsString()
  @IsNotEmpty()
  @IsEqualTo('newPassword', { message: 'Confirm password must match new password' })
  confirmNewPassword: string;
}
