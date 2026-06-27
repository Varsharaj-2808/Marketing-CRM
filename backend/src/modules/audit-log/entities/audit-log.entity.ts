import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ length: 50 })
  action: string;

  @Column({ length: 255, nullable: true })
  resource: string;

  @Column({ length: 50, nullable: true })
  resourceId: string;

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({ length: 45, nullable: true })
  ipAddress: string;

  @Column({ length: 255, nullable: true })
  userAgent: string;

  @Column({ length: 20, default: 'Success' })
  result: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.auditLogs, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
