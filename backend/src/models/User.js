const { query } = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = {
  async findById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async findByResetToken() {
    const result = await query('SELECT * FROM users WHERE "resetToken" IS NOT NULL');
    return result.rows;
  },

  async update(id, fields) {
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        if (key === 'password' && value) {
          setClauses.push(`"password" = $${idx++}`);
          values.push(await bcrypt.hash(value, 12));
        } else {
          setClauses.push(`"${key}" = $${idx++}`);
          values.push(value);
        }
      }
    }

    if (setClauses.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  async incrementFailedAttempts(id) {
    await query('UPDATE users SET "failedLoginAttempts" = "failedLoginAttempts" + 1 WHERE id = $1', [id]);
  },

  async lockAccount(id, lockoutUntil) {
    await query(
      'UPDATE users SET "accountStatus" = $1, "lockoutUntil" = $2 WHERE id = $3',
      ['locked', lockoutUntil, id]
    );
  },

  async unlockAccount(id) {
    await query(
      'UPDATE users SET "failedLoginAttempts" = 0, "lockoutUntil" = NULL, "accountStatus" = $1 WHERE id = $2',
      ['active', id]
    );
  },

  async setLastLogin(id) {
    await query('UPDATE users SET "lastLoginAt" = NOW() WHERE id = $1', [id]);
  },

  async storeRefreshToken(id, hashedToken) {
    await query('UPDATE users SET "refreshToken" = $1 WHERE id = $2', [hashedToken, id]);
  },

  async storeResetToken(id, hashedToken, expiry) {
    await query(
      'UPDATE users SET "resetToken" = $1, "resetTokenExpiry" = $2 WHERE id = $3',
      [hashedToken, expiry, id]
    );
  },

  async clearResetToken(id) {
    await query('UPDATE users SET "resetToken" = NULL, "resetTokenExpiry" = NULL WHERE id = $1', [id]);
  },

  async clearRefreshToken(id) {
    await query('UPDATE users SET "refreshToken" = NULL WHERE id = $1', [id]);
  },

  async clearAllTokens(id) {
    await query('UPDATE users SET "refreshToken" = NULL, "resetToken" = NULL, "resetTokenExpiry" = NULL WHERE id = $1', [id]);
  },

  toSafeUser(user) {
    if (!user) return null;
    const { password, refreshToken, resetToken, resetTokenExpiry, ...safe } = user;
    return safe;
  },

  toResponseUser(user) {
    if (!user) return null;
    return {
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email,
      email: user.email,
      role: user.role,
    };
  },
};

module.exports = User;
