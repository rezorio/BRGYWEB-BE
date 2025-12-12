import { IsEmail, IsNotEmpty, IsString, MinLength, ArrayNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ 
    description: 'User password (min 6 characters)',
    example: 'password123',
    minLength: 6,
    format: 'password'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ 
    description: 'User first name',
    example: 'John',
    minLength: 2
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ 
    description: 'User last name',
    example: 'Doe',
    minLength: 2
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName: string;

  @ApiProperty({ 
    description: 'Array of role names to assign to user',
    example: ['Citizen'],
    isArray: true,
    enum: ['Citizen', 'Admin', 'Super Admin']
  })
  @IsString({ each: true })
  @ArrayNotEmpty()
  roleNames: string[];

  // Optional profile fields
  @ApiPropertyOptional({ description: 'Middle name' })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiPropertyOptional({ description: 'Name suffix (Jr., Sr., III, etc.)' })
  @IsOptional()
  @IsString()
  suffix?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'House number' })
  @IsOptional()
  @IsString()
  houseNumber?: string;

  @ApiPropertyOptional({ description: 'Street address' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ description: 'Barangay' })
  @IsOptional()
  @IsString()
  barangay?: string;

  @ApiPropertyOptional({ description: 'City/Municipality' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Province' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: 'Region' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Zip code' })
  @IsOptional()
  @IsString()
  zipCode?: string;
}
