import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { DocumentType } from '../entities/document-request.entity';

export class CreateAdminDocumentRequestDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(DocumentType)
  @IsOptional()
  requestType?: string = DocumentType.BARANGAY_CLEARANCE;

  @IsString()
  @IsNotEmpty()
  purpose: string;
}
