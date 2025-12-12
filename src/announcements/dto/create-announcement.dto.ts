import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  imageFilename?: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;
}
