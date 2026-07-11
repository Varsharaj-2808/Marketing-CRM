const SavedView = require('../models/SavedView');
const AuditLog = require('../models/AuditLog');
const { success: wrapSuccess, error: wrapError } = require('../utils/response');

const getIpAndAgent = (req) => ({
  ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
  userAgent: req.headers['user-agent'] || '',
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const validateUuid = (id) => UUID_REGEX.test(id);

exports.getSavedViews = async (req, res, next) => {
  try {
    const views = await SavedView.findByUser(req.user.id);
    res.json({ success: true, message: 'Saved views fetched successfully', data: views });
  } catch (error) {
    next(error);
  }
};

exports.createSavedView = async (req, res, next) => {
  try {
    const { name, filters } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (name === undefined || name === null) {
      return res.status(400).json(wrapError('Name is required'));
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json(wrapError('Name cannot be empty'));
    }
    if (name.length > 100) {
      return res.status(400).json(wrapError('Name must be 100 characters or less'));
    }

    const existing = await SavedView.findByNameAndUser(name.trim(), req.user.id);
    if (existing) {
      return res.status(409).json(wrapError('A saved view with this name already exists'));
    }

    const savedView = await SavedView.create({
      name: name.trim(),
      filters: filters !== undefined ? filters : {},
      createdBy: req.user.id,
    });

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'SAVED_VIEW_CREATED',
      resource: 'SavedView',
      resourceId: savedView.id,
      details: JSON.stringify({ name: savedView.name, filters: savedView.filters }),
      ipAddress,
      userAgent,
      result: 'Success',
    });

    res.status(201).json({
      success: true,
      message: 'Saved view created',
      data: {
        id: savedView.id,
        name: savedView.name,
        filters: savedView.filters,
        created_by: savedView.created_by,
        created_at: savedView.created_at,
        updated_at: savedView.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSavedView = async (req, res, next) => {
  try {
    const { viewId } = req.params;
    const { name, filters } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (!validateUuid(viewId)) {
      return res.status(400).json(wrapError('Invalid view ID format'));
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json(wrapError('Name cannot be empty'));
    }
    if (name !== undefined && name.length > 100) {
      return res.status(400).json(wrapError('Name must be 100 characters or less'));
    }

    if (name === undefined && filters === undefined) {
      return res.status(400).json(wrapError('At least one field (name or filters) must be provided'));
    }

    const existing = await SavedView.findById(viewId);
    if (!existing) {
      return res.status(404).json(wrapError('Saved view not found'));
    }

    if (existing.created_by !== req.user.id) {
      return res.status(403).json(wrapError('You do not have permission to modify this saved view'));
    }

    if (name !== undefined && name.trim() !== existing.name) {
      const duplicate = await SavedView.findByNameAndUser(name.trim(), req.user.id, viewId);
      if (duplicate) {
        return res.status(409).json(wrapError('A saved view with this name already exists'));
      }
    }

    const updateFields = {};
    if (name !== undefined) {
      updateFields.name = name.trim();
    }
    if (filters !== undefined) {
      updateFields.filters = filters;
    }

    const updated = await SavedView.update(viewId, updateFields);

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'SAVED_VIEW_UPDATED',
      resource: 'SavedView',
      resourceId: viewId,
      details: JSON.stringify({ name: name || existing.name, filters: filters || existing.filters }),
      ipAddress,
      userAgent,
      result: 'Success',
    });

    res.json({
      success: true,
      message: 'Saved view updated',
      data: {
        id: updated.id,
        name: updated.name,
        filters: updated.filters,
        created_by: updated.created_by,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteSavedView = async (req, res, next) => {
  try {
    const { viewId } = req.params;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (!validateUuid(viewId)) {
      return res.status(400).json(wrapError('Invalid view ID format'));
    }

    const existing = await SavedView.findById(viewId);
    if (!existing) {
      return res.status(404).json(wrapError('Saved view not found'));
    }

    if (existing.created_by !== req.user.id) {
      return res.status(403).json(wrapError('You do not have permission to delete this saved view'));
    }

    await SavedView.delete(viewId);

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'SAVED_VIEW_DELETED',
      resource: 'SavedView',
      resourceId: viewId,
      details: JSON.stringify({ name: existing.name }),
      ipAddress,
      userAgent,
      result: 'Success',
    });

    res.json({ success: true, message: 'Saved view deleted', data: null });
  } catch (error) {
    next(error);
  }
};
