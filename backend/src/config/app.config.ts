import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  lockoutThreshold: parseInt(process.env.LOCKOUT_THRESHOLD || '5', 10),
  lockoutWindowMinutes: parseInt(process.env.LOCKOUT_WINDOW_MINUTES || '15', 10),
}));
