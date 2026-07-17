const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

const ALLOWED_ROLES = ['Admin', 'Marketing Executive'];
const VALID_STATUSES = ['active', 'inactive'];

const User = {
  async findById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByIdOrEmployeeId(identifier) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(identifier)) {
      const result = await query('SELECT * FROM users WHERE id = $1', [identifier]);
      if (result.rows[0]) return result.rows[0];
    }
    const result = await query('SELECT * FROM users WHERE "employee_id" = $1', [identifier]);
    return result.rows[0] || null;
  },

  async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async findByEmployeeId(employeeId) {
    const result = await query('SELECT * FROM users WHERE "employee_id" = $1', [employeeId]);
    return result.rows[0] || null;
  },

  async findByResetToken() {
    const result = await query('SELECT * FROM users WHERE "resetToken" IS NOT NULL');
    return result.rows;
  },

  async findAll() {
    const result = await query(
      `SELECT id, "employee_id", name, name as employee_name, email, mobile, role, "accountStatus" as status, department
       FROM users ORDER BY "createdAt" DESC`
    );
    return result.rows;
  },

  async findPaginated({ page = 1, limit = 20, search, role, status, department } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (search) {
      conditions.push(`(LOWER(name) LIKE $${idx} OR LOWER(email) LIKE $${idx} OR LOWER("employee_id") LIKE $${idx} OR mobile LIKE $${idx})`);
      values.push(`%${search.toLowerCase()}%`);
      idx++;
    }
    if (role) {
      conditions.push(`role = $${idx++}`);
      values.push(role);
    }
    if (status) {
      conditions.push(`LOWER("accountStatus") = $${idx++}`);
      values.push(status.toLowerCase());
    }
    if (department) {
      conditions.push(`department = $${idx++}`);
      values.push(department);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) FROM users ${whereClause}`, values);
    const totalRecords = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const offset = (page - 1) * limit;

    const dataResult = await query(
      `SELECT id, "employee_id", name, name as employee_name, email, mobile, role, "accountStatus" as status, department
       FROM users ${whereClause}
       ORDER BY "createdAt" DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    return {
      users: dataResult.rows,
      totalRecords,
      total: totalRecords,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      page,
      limit,
    };
  },

  async findActiveByRole(role) {
    const result = await query(
      `SELECT id, "employee_id", name as employee_name, email, role,
              "accountStatus" as status, department
       FROM users
       WHERE role = $1 AND "accountStatus" = 'active'
       ORDER BY name ASC`,
      [role]
    );
    return result.rows;
  },

  async getNextEmployeeId() {
    const result = await query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING("employee_id" FROM 5) AS INTEGER)), 0) + 1 AS next_seq FROM users`
    );
    const nextSeq = result.rows[0].next_seq;
    return `EMP-${String(nextSeq).padStart(5, '0')}`;
  },

  async create(data, client) {
    const { name, email, mobile, role, password, status, department } = data;
    const employeeId = await this.getNextEmployeeId();
    const passwordHash = await bcrypt.hash(password, 12);
    const userStatus = status || 'active';

    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];

    const db = client || { query };
    const result = await db.query(
      `INSERT INTO users ("employee_id", name, email, mobile, role, "accountStatus", password, "firstName", "lastName", department)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, "employee_id", name, email, mobile, role, "accountStatus" as status, "createdAt", "updatedAt", department`,
      [employeeId, name, email.toLowerCase(), mobile, role, userStatus, passwordHash, firstName, lastName, department || null]
    );
    return result.rows[0];
  },

  async update(id, fields, client) {
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
    const db = client || { query };
    const result = await db.query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async isEmailTaken(email, excludeId) {
    let sql = 'SELECT id FROM users WHERE email = $1';
    const params = [email.toLowerCase()];
    if (excludeId) {
      sql += ' AND id != $2';
      params.push(excludeId);
    }
    const result = await query(sql, params);
    return result.rows.length > 0;
  },

  async isMobileTaken(mobile, excludeId) {
    let sql = 'SELECT id FROM users WHERE mobile = $1';
    const params = [mobile];
    if (excludeId) {
      sql += ' AND id != $2';
      params.push(excludeId);
    }
    const result = await query(sql, params);
    return result.rows.length > 0;
  },

  async comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  async incrementFailedAttempts(id, client) {
    const db = client || { query };
    await db.query('UPDATE users SET "failedLoginAttempts" = "failedLoginAttempts" + 1 WHERE id = $1', [id]);
  },

  async lockAccount(id, lockoutUntil, failedAttempts, client) {
    const db = client || { query };
    await db.query(
      'UPDATE users SET "accountStatus" = $1, "lockoutUntil" = $2, "failedLoginAttempts" = $3 WHERE id = $4',
      ['locked', lockoutUntil, failedAttempts || 0, id]
    );
  },

  async unlockAccount(id, client) {
    const db = client || { query };
    await db.query(
      'UPDATE users SET "failedLoginAttempts" = 0, "lockoutUntil" = NULL, "accountStatus" = $1 WHERE id = $2',
      ['active', id]
    );
  },

  async setLastLogin(id, client) {
    const db = client || { query };
    await db.query('UPDATE users SET "lastLoginAt" = NOW() WHERE id = $1', [id]);
  },

  async storeRefreshToken(id, hashedToken, client) {
    const db = client || { query };
    await db.query('UPDATE users SET "refreshToken" = $1 WHERE id = $2', [hashedToken, id]);
  },

  async storeResetToken(id, hashedToken, expiry, client) {
    const db = client || { query };
    await db.query(
      'UPDATE users SET "resetToken" = $1, "resetTokenExpiry" = $2 WHERE id = $3',
      [hashedToken, expiry, id]
    );
  },

  async clearResetToken(id, client) {
    const db = client || { query };
    await db.query('UPDATE users SET "resetToken" = NULL, "resetTokenExpiry" = NULL WHERE id = $1', [id]);
  },

  async clearRefreshToken(id, client) {
    const db = client || { query };
    await db.query('UPDATE users SET "refreshToken" = NULL WHERE id = $1', [id]);
  },

  async clearAllTokens(id, client) {
    const db = client || { query };
    await db.query('UPDATE users SET "refreshToken" = NULL, "resetToken" = NULL, "resetTokenExpiry" = NULL WHERE id = $1', [id]);
  },

  async updateAccountStatus(id, status, client) {
    const db = client || { query };
    const result = await db.query(
      'UPDATE users SET "accountStatus" = $1 WHERE id = $2 RETURNING id, "employee_id", name, email, mobile, role, "accountStatus" as status',
      [status, id]
    );
    return result.rows[0] || null;
  },

  async updateRole(id, role, client) {
    const db = client || { query };
    const result = await db.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, "employee_id", name, email, mobile, role, "accountStatus" as status',
      [role, id]
    );
    return result.rows[0] || null;
  },

  toSafeUser(user) {
    if (!user) return null;
    const { password, refreshToken, resetToken, resetTokenExpiry, failedLoginAttempts, lockoutUntil, lastLoginAt, ...safe } = user;
    return {
      id: safe.id,
      employee_id: safe.employee_id,
      employee_name: safe.name || [safe.firstName, safe.lastName].filter(Boolean).join(' ').trim() || safe.email,
      name: safe.name || [safe.firstName, safe.lastName].filter(Boolean).join(' ').trim() || safe.email,
      email: safe.email,
      mobile: safe.mobile,
      role: safe.role,
      status: safe.accountStatus || safe.status,
    };
  },

  toResponseUser(user) {
    if (!user) return null;
    return {
      id: user.id,
      employee_id: user.employee_id,
      employee_name: user.name || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email,
      name: user.name || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      status: user.accountStatus || user.status,
    };
  },
};

User.ALLOWED_ROLES = ALLOWED_ROLES;
User.VALID_STATUSES = VALID_STATUSES;

module.exports = User;
