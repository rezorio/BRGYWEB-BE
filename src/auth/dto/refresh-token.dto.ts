import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ 
    description: 'Refresh token for renewing access token',
    example: 'eyJhbGciOiJIUIIII...'
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
