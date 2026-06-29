const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const algolia = require('../utils/algoliaService');

const getIpAndAgent = (req) => ({
  ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
  userAgent: req.headers['user-agent'] || '',
});

exports.deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const user = await User.findByIdOrEmployeeId(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentStatus = user.accountStatus || user.status;
    if (currentStatus === 'inactive') {
      return res.status(400).json({ success: false, message: 'User is already inactive' });
    }

    const updated = await User.updateAccountStatus(user.id, 'inactive');

    await algolia.saveUser(updated).catch(err => console.error('[deactivateUser] Algolia indexing skipped:', err.message));

    await AuditLog.create({
      userId: req.user.id,
      action: 'USER_STATUS_CHANGED',
      resource: 'User',
      resourceId: user.employee_id || id,
      details: JSON.stringify({ status: { old: currentStatus, new: 'inactive' } }),
      ipAddress,
      userAgent,
      result: 'Success',
    });

    res.json({
      success: true,
      message: 'User deactivated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

exports.activateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const user = await User.findByIdOrEmployeeId(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentStatus = user.accountStatus || user.status;
    if (currentStatus === 'active') {
      return res.status(400).json({ success: false, message: 'User is already active' });
    }

    const updated = await User.updateAccountStatus(user.id, 'active');

    await algolia.saveUser(updated).catch(err => console.error('[activateUser] Algolia indexing skipped:', err.message));

    await AuditLog.create({
      userId: req.user.id,
      action: 'USER_STATUS_CHANGED',
      resource: 'User',
      resourceId: user.employee_id || id,
      details: JSON.stringify({ status: { old: currentStatus, new: 'active' } }),
      ipAddress,
      userAgent,
      result: 'Success',
    });

    res.json({
      success: true,
      message: 'User activated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserStatusHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdOrEmployeeId(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const resourceId = user.employee_id || id;
    const logs = await AuditLog.findByResource('User', resourceId, [
      'USER_CREATED', 'USER_STATUS_CHANGED', 'USER_ROLE_CHANGED', 'USER_UPDATED',
    ]);

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};
