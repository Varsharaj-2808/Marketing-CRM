import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(params: {
    userId?: string;
    action: string;
    resource?: string;
    resourceId?: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    result?: string;
  }): Promise<AuditLog> {
    const entry = this.auditLogRepository.create({
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      result: params.result || 'Success',
    });
    return this.auditLogRepository.save(entry);
  }

  async findByUserId(userId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
