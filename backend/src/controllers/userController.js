const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { generateTempPassword } = require('../utils/passwordUtils');
const { sendWelcomeEmail } = require('../utils/emailService');
const algolia = require('../utils/algoliaService');
const { query } = require('../config/db');
const { withTransaction } = require('../utils/transactionHelper');

const sanitize = (str) => str.replace(/<[^>]*>/g, '');

const getIpAndAgent = (req) => ({
  ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
  userAgent: req.headers['user-agent'] || '',
});

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, mobile, role, status } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Employee Name is required' });
    }
    if (name.length > 100) {
      return res.status(400).json({ success: false, message: 'Employee Name exceeds maximum length of 100 characters' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (email.length > 255) {
      return res.status(400).json({ success: false, message: 'Email exceeds maximum length of 255 characters' });
    }
    if (!mobile || !mobile.trim()) {
      return res.status(400).json({ success: false, message: 'Mobile Number is required' });
    }
    if (!role) {
      return res.status(400).json({ success: false, message: 'Role is required' });
    }
    if (!User.ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role. Allowed values: ${User.ALLOWED_ROLES.join(', ')}` });
    }
    if (!status || !status.trim()) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }
    if (!User.VALID_STATUSES.includes(status.toLowerCase())) {
      return res.status(400).json({ success: false, message: `Invalid status. Allowed values: ${User.VALID_STATUSES.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}` });
    }

    const emailExists = await User.isEmailTaken(email);
    if (emailExists) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const mobileExists = await User.isMobileTaken(mobile);
    if (mobileExists) {
      return res.status(409).json({ success: false, message: 'Mobile number already registered.' });
    }

    const tempPassword = generateTempPassword();
    const userStatus = status.toLowerCase();

    const user = await withTransaction(async (client) => {
      const newUser = await User.create({
        name: sanitize(name.trim()),
        email: email.trim(),
        mobile: mobile.trim(),
        role,
        password: tempPassword,
        status: userStatus,
      }, client);

      await AuditLog.create({
        userId: req.user.id,
        action: 'user.created',
        resource: 'user',
        resourceId: newUser.employee_id,
        details: JSON.stringify({ name: newUser.name, email: newUser.email, role: newUser.role, status: newUser.status }),
        ipAddress,
        userAgent,
        result: 'success',
      }, client);

      return newUser;
    });

    await sendWelcomeEmail(user.email, user.name, user.employee_id, tempPassword);

    await algolia.saveUser(user).catch(err => console.error('[createUser] Algolia indexing skipped:', err.message));

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: {
        id: user.id,
        employee_id: user.employee_id,
        employee_name: user.name,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      const detail = error.detail || '';
      if (detail.includes('email')) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }
      if (detail.includes('mobile')) {
        return res.status(409).json({ success: false, message: 'Mobile number already registered.' });
      }
    }
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const { search, role, status, page, limit } = req.query;

    if (role === 'Marketing Executive') {
      const users = await User.findActiveByRole('Marketing Executive');
      return res.json({ success: true, data: users });
    }

    if (search || role || status) {
      const algoliaResult = await algolia.searchUsers(
        search || '',
        { role, status },
        parseInt(page) || 1,
        parseInt(limit) || 20
      );

      if (algoliaResult) {
        return res.json({
          success: true,
          data: algoliaResult.hits,
          pagination: {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            totalRecords: algoliaResult.nbHits,
            totalPages: algoliaResult.nbPages,
          },
        });
      }
    }

    const users = await User.findAll();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    let user;

    if (id === 'me') {
      user = await User.findById(req.user.id);
    } else {
      user = await User.findByIdOrEmployeeId(id);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isSelf = user.id === req.user.id;
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }

    res.json({ success: true, data: User.toSafeUser(user) });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, role } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const user = await User.findByIdOrEmployeeId(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name !== undefined && name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Employee Name cannot be empty' });
    }
    if (name && name.length > 100) {
      return res.status(400).json({ success: false, message: 'Employee Name exceeds maximum length of 100 characters' });
    }
    if (name) {
      req.body.name = sanitize(name.trim());
    }
    if (email !== undefined && email.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Email cannot be empty' });
    }
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }
    }
    if (role && !User.ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role. Allowed values: ${User.ALLOWED_ROLES.join(', ')}` });
    }

    if (email && email.toLowerCase() !== user.email) {
      const emailTaken = await User.isEmailTaken(email, user.id);
      if (emailTaken) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }
    }

    if (req.body.mobile && req.body.mobile !== user.mobile) {
      const mobileTaken = await User.isMobileTaken(req.body.mobile, user.id);
      if (mobileTaken) {
        return res.status(409).json({ success: false, message: 'Mobile number already registered.' });
      }
    }

    const changes = [];
    const fieldsToUpdate = {};

    if (name !== undefined && name.trim() !== user.name) {
      changes.push({ field: 'name', old: user.name, new: name.trim() });
      fieldsToUpdate.name = name.trim();
    }
    if (email !== undefined && email.toLowerCase() !== user.email) {
      changes.push({ field: 'email', old: user.email, new: email.toLowerCase() });
      fieldsToUpdate.email = email.toLowerCase();
    }
    if (req.body.mobile !== undefined && req.body.mobile !== user.mobile) {
      changes.push({ field: 'mobile', old: user.mobile, new: req.body.mobile });
      fieldsToUpdate.mobile = req.body.mobile;
    }
    if (role !== undefined && role !== user.role) {
      changes.push({ field: 'role', old: user.role, new: role });
      fieldsToUpdate.role = role;
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ success: false, message: 'No changes detected' });
    }

    const updated = await withTransaction(async (client) => {
      const updatedUser = await User.update(user.id, fieldsToUpdate, client);

      for (const change of changes) {
        await AuditLog.create({
          userId: req.user.id,
          action: change.field === 'role' ? 'user.role_changed' : 'user.updated',
          resource: 'user',
          resourceId: user.employee_id || id,
          details: JSON.stringify({ field: change.field, old_value: change.old, new_value: change.new, old_role: change.old, new_role: change.new }),
          ipAddress,
          userAgent,
          result: 'success',
        }, client);
      }

      return updatedUser;
    });

    await algolia.saveUser(updated).catch(err => console.error('[updateUser] Algolia indexing skipped:', err.message));

    res.json({
      success: true,
      message: 'User updated successfully.',
      data: {
        id: updated.id,
        employee_id: updated.employee_id,
        employee_name: updated.name,
        name: updated.name,
        email: updated.email,
        mobile: updated.mobile,
        role: updated.role,
        status: updated.accountStatus || updated.status,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      const detail = error.detail || '';
      if (detail.includes('email')) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }
      if (detail.includes('mobile')) {
        return res.status(409).json({ success: false, message: 'Mobile number already registered.' });
      }
    }
    next(error);
  }
};

exports.reindexUsers = async (req, res, next) => {
  try {
    const users = await User.findAll();
    await algolia.indexAllUsers(users);
    res.json({ success: true, message: `Re-indexed ${users.length} users to Algolia.` });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(403).json({ success: false, message: 'User deletion is not permitted. Use deactivation instead.' });
    }

    const { ipAddress, userAgent } = getIpAndAgent(req);

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await withTransaction(async (client) => {
      const deleteResult = await client.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
      if (!deleteResult.rows[0]) {
        throw new Error('User not found');
      }

      await AuditLog.create({
        userId: req.user.id,
        action: 'user.deleted',
        resource: 'user',
        resourceId: user.employee_id || id,
        details: JSON.stringify({ name: user.name, email: user.email, role: user.role }),
        ipAddress,
        userAgent,
        result: 'success',
      }, client);
    });

    await algolia.deleteUser(id).catch(err => console.error('[deleteUser] Algolia deletion skipped:', err.message));

    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.getDeactivatedUsers = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, "employee_id", name, name as employee_name, email, mobile, role, "accountStatus" as status
       FROM users
       WHERE "accountStatus" = 'inactive'
       ORDER BY "createdAt" DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.reindexUsers = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, employee_id, name, email, mobile, role, "accountStatus" as status, "createdAt", "updatedAt" FROM users WHERE "accountStatus" != 'deleted'`
    );
    const users = result.rows;
    if (!users.length) {
      return res.json({ success: true, message: 'No users found to index.', count: 0 });
    }
    await algolia.indexAllUsers(users);
    return res.json({ success: true, message: `Re-indexed ${users.length} users to Algolia.`, count: users.length });
  } catch (error) {
    next(error);
  }
};
