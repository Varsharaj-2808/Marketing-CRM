const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { ADMIN_USER } = require('./setup');

let mockQuery = jest.fn();
jest.mock('../config/db', () => ({
  query: (...args) => mockQuery(...args),
  getClient: jest.fn().mockResolvedValue({ query: (...args) => mockQuery(...args), release: jest.fn() }),
}));

jest.mock('../utils/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(),
}));

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/auth', require('../routes/auth'));
  app.use(require('../middleware/errorHandler'));
  return app;
};

const adminToken = jwt.sign(
  { id: ADMIN_USER.id, email: ADMIN_USER.email, role: ADMIN_USER.role },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

describe('Auth APIs from Excel Specification', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  describe('GET /auth/profile', () => {
    it('Profile fetched successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [ADMIN_USER] }); // for auth middleware
      mockQuery.mockResolvedValueOnce({ rows: [ADMIN_USER] }); // for User.findById

      const res = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: {
          id: ADMIN_USER.id,
          name: ADMIN_USER.name,
          email: ADMIN_USER.email,
          mobile: ADMIN_USER.mobile,
          role: ADMIN_USER.role
        }
      });
    });

    it('Invalid or expired JWT token', async () => {
      const res = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer invalid_or_expired_token`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        success: false,
        message: 'Invalid or expired token.'
      });
    });
  });

  describe('PUT /auth/change-password', () => {
    beforeEach(() => {
      // Setup the user lookup in middleware for all these requests
      mockQuery.mockResolvedValueOnce({ rows: [ADMIN_USER] }); // auth middleware
    });

    it('Password changed successfully', async () => {
      mockQuery.mockResolvedValue({ rows: [ADMIN_USER] }); // User.findById, BEGIN, User.update, clearRefreshToken, etc.
      const compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true).mockResolvedValueOnce(false); // isMatch=true, isSameAsCurrent=false

      const res = await request(app)
        .put('/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'OldPassword@123',
          newPassword: 'NewPassword@123'
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Password changed successfully.'
      });

      compareSpy.mockRestore();
    });

    it('Current password is incorrect', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [ADMIN_USER] }); // User.findById
      const compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false); // isMatch = false
      mockQuery.mockResolvedValueOnce({}); // AuditLog for failure

      const res = await request(app)
        .put('/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'WrongPassword@123',
          newPassword: 'NewPassword@123'
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        message: 'Current password is incorrect.'
      });

      compareSpy.mockRestore();
    });

    it('New password is too short (less than 8 characters)', async () => {
      const res = await request(app)
        .put('/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'OldPassword@123',
          newPassword: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        message: 'New password must be at least 8 characters long.'
      });
    });
  });
});
