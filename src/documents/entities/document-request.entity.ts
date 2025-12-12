import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied'
}

export enum DocumentType {
  BARANGAY_CLEARANCE = 'barangay_clearance',
  CERTIFICATE_OF_RESIDENCY = 'certificate_of_residency',
  CERTIFICATE_OF_INDIGENCY = 'certificate_of_indigency'
}

@Entity('document_requests')
export class DocumentRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ 
    name: 'request_type',
    type: 'varchar',
    length: 50,
    default: DocumentType.BARANGAY_CLEARANCE
  })
  requestType: string;

  @Column({ type: 'varchar', length: 255 })
  purpose: string;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING
  })
  status: RequestStatus;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string;

  @Column({ name: 'denial_reason', type: 'text', nullable: true })
  denialReason: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'processed_by' })
  processedBy: User;

  @Column({ name: 'processed_at', type: 'datetime', nullable: true })
  processedAt: Date;

  @Column({ name: 'generated_file_path', type: 'varchar', length: 500, nullable: true })
  generatedFilePath: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
