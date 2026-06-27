import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { AccountStatus } from '../../common/enums/account-status.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly lockoutThreshold: number;
  private readonly lockoutWindowMinutes: number;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {
    this.lockoutThreshold =
      this.configService.get<number>('app.lockoutThreshold') ?? 5;
    this.lockoutWindowMinutes =
      this.configService.get<number>('app.lockoutWindowMinutes') ?? 15;
  }

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      await this.auditLogService.log({
        action: 'LOGIN_FAILED',
        details: `Invalid login attempt for email: ${email}`,
        ipAddress,
        userAgent,
        result: 'Failed',
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.accountStatus === AccountStatus.INACTIVE) {
      await this.auditLogService.log({
        userId: user.id,
        action: 'LOGIN_REJECTED_INACTIVE',
        details: 'Account is inactive',
        ipAddress,
        userAgent,
        result: 'Failed',
      });
      throw new UnauthorizedException('Account is inactive. Contact your administrator.');
    }

    if (user.accountStatus === AccountStatus.LOCKED && user.lockoutUntil) {
      if (new Date() < user.lockoutUntil) {
        const retryAfter = Math.ceil(
          (user.lockoutUntil.getTime() - Date.now()) / 1000,
        );
        await this.auditLogService.log({
          userId: user.id,
          action: 'LOGIN_REJECTED_LOCKED',
          details: `Account locked. Retry after ${retryAfter} seconds`,
          ipAddress,
          userAgent,
          result: 'Failed',
        });
        throw new UnauthorizedException(
          `Account is temporarily locked. Try again in ${retryAfter} seconds.`,
        );
      }
      user.failedLoginAttempts = 0;
      user.lockoutUntil = null as any;
      user.accountStatus = AccountStatus.ACTIVE;
      await this.usersRepository.save(user);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= this.lockoutThreshold) {
        const lockoutDuration = this.lockoutWindowMinutes * 60 * 1000;
        user.lockoutUntil = new Date(Date.now() + lockoutDuration);
        user.accountStatus = AccountStatus.LOCKED;

        await this.usersRepository.save(user);
        await this.auditLogService.log({
          userId: user.id,
          action: 'ACCOUNT_LOCKED',
          details: `Account locked after ${user.failedLoginAttempts} failed attempts`,
          ipAddress,
          userAgent,
          result: 'Failed',
        });

        const retryAfter = this.lockoutWindowMinutes * 60;
        throw new UnauthorizedException(
          `Account is temporarily locked. Try again in ${retryAfter} seconds.`,
        );
      }

      await this.usersRepository.save(user);
      await this.auditLogService.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        details: `Invalid password (attempt ${user.failedLoginAttempts}/${this.lockoutThreshold})`,
        ipAddress,
        userAgent,
        result: 'Failed',
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    user.failedLoginAttempts = 0;
    user.lockoutUntil = null as any;
    user.accountStatus = AccountStatus.ACTIVE;
    user.lastLoginAt = new Date();
    await this.usersRepository.save(user);

    const tokens = await this.generateTokens(user);

    await this.auditLogService.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resource: 'Auth',
      details: 'Successful login',
      ipAddress,
      userAgent,
      result: 'Success',
    });

    this.logger.log(`User ${user.email} logged in successfully`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        accountStatus: user.accountStatus,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('app.jwtSecret')!,
      });
      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user) throw new UnauthorizedException('User not found');

      const accessToken = this.jwtService.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: this.configService.get<string>('app.jwtExpiresIn')! as any },
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const expiresIn = this.configService.get<string>('app.jwtExpiresIn')! as any;
    const refreshExpiresIn = this.configService.get<string>('app.jwtRefreshExpiresIn')! as any;

    const accessToken = this.jwtService.sign(payload, {
      expiresIn,
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshExpiresIn,
    });

    return { accessToken, refreshToken };
  }
}
