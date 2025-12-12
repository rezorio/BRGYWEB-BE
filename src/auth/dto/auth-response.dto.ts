import { ApiProperty } from '@nestjs/swagger';

class UserDto {
  @ApiProperty({ 
    description: 'User ID',
    example: 'user-id'
  })
  id: string;

  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com'
  })
  email: string;

  @ApiProperty({ 
    description: 'User first name',
    example: 'John'
  })
  firstName: string;

  @ApiProperty({ 
    description: 'User last name',
    example: 'Doe'
  })
  lastName: string;

  @ApiProperty({ 
    description: 'User roles',
    example: ['user'],
    isArray: true
  })
  roles: string[];
}

export class AuthResponseDto {
  @ApiProperty({ 
    description: 'JWT access token for API authentication',
    example: 'eyJhbGciOiJIo...'
  })
  accessToken: string;

  @ApiProperty({ 
    description: 'JWT refresh token for renewing access token',
    example: 'eyJhb&ciOiJIo...'
  })
  refreshToken: string;

  @ApiProperty({ 
    description: 'User information',
    type: UserDto
  })
  user: UserDto;
}
