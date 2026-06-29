const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { generateTempPassword } = require('../utils/passwordUtils');
const { sendWelcomeEmail } = require('../utils/emailService');
const algolia = require('../utils/algoliaService');

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

    const user = await User.create({
      name: sanitize(name.trim()),
      email: email.trim(),
      mobile: mobile.trim(),
      role,
      password: tempPassword,
      status: userStatus,
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'USER_CREATED',
      resource: 'User',
      resourceId: user.employee_id,
      details: JSON.stringify({ name: user.name, email: user.email, role: user.role, status: user.status }),
      ipAddress,
      userAgent,
      result: 'Success',
    });

    await sendWelcomeEmail(user.email, user.name, user.employee_id, tempPassword);

    await algolia.saveUser(user).catch(err => console.error('[createUser] Algolia indexing skipped:', err.message));

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: {
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        status: user.status,
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

    const updated = await User.update(user.id, fieldsToUpdate);

    await algolia.saveUser(updated).catch(err => console.error('[updateUser] Algolia indexing skipped:', err.message));

    for (const change of changes) {
      await AuditLog.create({
        userId: req.user.id,
        action: change.field === 'role' ? 'USER_ROLE_CHANGED' : 'USER_UPDATED',
        resource: 'User',
        resourceId: user.employee_id || id,
        details: JSON.stringify({ field: change.field, old_value: change.old, new_value: change.new }),
        ipAddress,
        userAgent,
        result: 'Success',
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully.',
      data: User.toSafeUser(updated),
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
    res.status(403).json({
      success: false,
      message: 'User deletion is not permitted. Use deactivation instead.',
    });
  } catch (error) {
    next(error);
  }
};
