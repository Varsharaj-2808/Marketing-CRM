const BusinessCategory = require('../models/BusinessCategory');
const BusinessSubCategory = require('../models/BusinessSubCategory');
const AuditLog = require('../models/AuditLog');

const getIpAndAgent = (req) => ({
  ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
  userAgent: req.headers['user-agent'] || '',
});

const wrapSuccess = (statusCode, message, body) => ({
  status: 'success',
  status_code: statusCode,
  message,
  body,
});

const wrapError = (statusCode, message, error) => ({
  status: 'error',
  status_code: statusCode,
  message,
  body: { error },
});

// ---- Categories ----

exports.createCategory = async (req, res, next) => {
  try {
    const { category_name } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (!category_name || !category_name.trim()) {
      return res.status(400).json(wrapError(400, 'Validation failed', 'Category name is required'));
    }

    const existing = await BusinessCategory.findAll();
    if (existing.some(c => c.category_name.toLowerCase() === category_name.trim().toLowerCase())) {
      return res.status(409).json(wrapError(409, 'Category name already exists', `A category named '${category_name.trim()}' already exists`));
    }

    const category = await BusinessCategory.create({ category_name: category_name.trim() });

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'category.created',
      resource: 'category',
      resourceId: category.id,
      details: JSON.stringify({ category_name: category.category_name }),
      ipAddress,
      userAgent,
      result: 'success',
    });

    res.status(201).json(wrapSuccess(201, 'Category created successfully', category));
  } catch (error) {
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const result = await BusinessCategory.findAllPaginated({
      search,
      status,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });

    res.json(wrapSuccess(200, 'Categories fetched successfully', {
      page: result.page,
      totalPages: result.totalPages,
      totalCount: result.total,
      limit: result.limit,
      data: result.data,
    }));
  } catch (error) {
    next(error);
  }
};

exports.getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await BusinessCategory.findById(id);
    if (!category) {
      return res.status(404).json(wrapError(404, 'Category not found', 'Category with the specified ID does not exist'));
    }
    res.json(wrapSuccess(200, 'Category fetched successfully', category));
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_name } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const category = await BusinessCategory.findById(id);
    if (!category) {
      return res.status(404).json(wrapError(404, 'Category not found', 'Category with the specified ID does not exist'));
    }

    if (category_name !== undefined) {
      if (!category_name.trim()) {
        return res.status(400).json(wrapError(400, 'Validation failed', 'Category name cannot be empty'));
      }
      const all = await BusinessCategory.findAll();
      const duplicate = all.find(
        c => c.id !== id && c.category_name.toLowerCase() === category_name.trim().toLowerCase()
      );
      if (duplicate) {
        return res.status(409).json(wrapError(409, 'Category name already exists', `A category named '${category_name.trim()}' already exists`));
      }
    }

    const updated = await BusinessCategory.update(id, {
      ...(category_name !== undefined && { category_name: category_name.trim() }),
    });

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'category.updated',
      resource: 'category',
      resourceId: id,
      details: JSON.stringify({ old: { category_name: category.category_name }, new: { category_name: updated.category_name } }),
      ipAddress,
      userAgent,
      result: 'success',
    });

    res.json(wrapSuccess(200, 'Category updated successfully', updated));
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const category = await BusinessCategory.findById(id);
    if (!category) {
      return res.status(404).json(wrapError(404, 'Category not found', 'Category with the specified ID does not exist'));
    }

    const { inUse, subCategoryCount, leadCount } = await BusinessCategory.isInUse(id);
    if (inUse) {
      return res.status(409).json({
        status: 'error',
        status_code: 409,
        message: 'Category is in use and cannot be deleted',
        body: {
          error: `Category is linked to ${subCategoryCount} Sub-Categories / ${leadCount} active leads. Deactivate instead.`,
          inUse: true,
        },
      });
    }

    await BusinessCategory.delete(id);

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'category.deleted',
      resource: 'category',
      resourceId: id,
      details: JSON.stringify({ category_name: category.category_name }),
      ipAddress,
      userAgent,
      result: 'success',
    });

    res.json(wrapSuccess(200, 'Category deleted successfully', { id }));
  } catch (error) {
    next(error);
  }
};

exports.patchCategoryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (!status || !['Active', 'Inactive'].includes(status)) {
      return res.status(400).json(wrapError(400, 'Validation failed', 'Status must be Active or Inactive'));
    }

    const category = await BusinessCategory.findById(id);
    if (!category) {
      return res.status(404).json(wrapError(404, 'Category not found', 'Category with the specified ID does not exist'));
    }

    if (category.status === status) {
      return res.status(400).json(wrapError(400, `Category is already ${status}`, `Requested status matches current status`));
    }

    const updated = await BusinessCategory.update(id, { status });

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'category.status_changed',
      resource: 'category',
      resourceId: id,
      details: JSON.stringify({ old: { status: category.status }, new: { status } }),
      ipAddress,
      userAgent,
      result: 'success',
    });

    const actionLabel = status === 'Inactive' ? 'deactivated' : 'activated';
    res.json(wrapSuccess(200, `Category ${actionLabel} successfully`, updated));
  } catch (error) {
    next(error);
  }
};

// ---- Sub-Categories ----

exports.createSubCategory = async (req, res, next) => {
  try {
    const { category_id, sub_category_name } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (!category_id) {
      return res.status(400).json(wrapError(400, 'Validation failed', 'Parent Category is required'));
    }
    if (!sub_category_name || !sub_category_name.trim()) {
      return res.status(400).json(wrapError(400, 'Validation failed', 'Sub-Category name is required'));
    }

    const parent = await BusinessCategory.findById(category_id);
    if (!parent) {
      return res.status(404).json(wrapError(404, 'Parent Category not found', 'Parent Category not found or inactive'));
    }

    const existingSubs = await BusinessSubCategory.findAll({ category_id });
    if (existingSubs.some(s => s.sub_category_name.toLowerCase() === sub_category_name.trim().toLowerCase())) {
      return res.status(409).json(wrapError(409, 'Duplicate Sub-Category name under same parent',
        `A sub-category named '${sub_category_name.trim()}' already exists under this parent category`));
    }

    const subcategory = await BusinessSubCategory.create({
      category_id,
      sub_category_name: sub_category_name.trim(),
    });

    // Attach parent category name for response
    subcategory.category_name = parent.category_name;

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'subcategory.created',
      resource: 'sub_category',
      resourceId: subcategory.id,
      details: JSON.stringify({ sub_category_name: subcategory.sub_category_name, category_id }),
      ipAddress,
      userAgent,
      result: 'success',
    });

    res.status(201).json(wrapSuccess(201, 'Sub-Category created successfully', subcategory));
  } catch (error) {
    next(error);
  }
};

exports.getSubCategories = async (req, res, next) => {
  try {
    const { status, category_id, page = 1, limit = 20 } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (category_id) filters.category_id = category_id;

    const subcategories = await BusinessSubCategory.findAll(filters);

    res.json(wrapSuccess(200, 'Sub-Categories fetched successfully', {
      page: parseInt(page, 10) || 1,
      totalPages: 1,
      totalCount: subcategories.length,
      limit: parseInt(limit, 10) || 20,
      data: subcategories,
    }));
  } catch (error) {
    next(error);
  }
};

exports.getSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subcategory = await BusinessSubCategory.findById(id);
    if (!subcategory) {
      return res.status(404).json(wrapError(404, 'Sub-Category not found', 'Sub-Category with the specified ID does not exist'));
    }
    res.json(wrapSuccess(200, 'Sub-Category fetched successfully', subcategory));
  } catch (error) {
    next(error);
  }
};

exports.updateSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sub_category_name, category_id } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const subcategory = await BusinessSubCategory.findById(id);
    if (!subcategory) {
      return res.status(404).json(wrapError(404, 'Sub-Category not found', 'Sub-Category with the specified ID does not exist'));
    }

    if (sub_category_name !== undefined && !sub_category_name.trim()) {
      return res.status(400).json(wrapError(400, 'Validation failed', 'Sub-Category name cannot be empty'));
    }

    if (category_id !== undefined) {
      const parent = await BusinessCategory.findById(category_id);
      if (!parent) {
        return res.status(404).json(wrapError(404, 'Parent Category not found', 'Parent Category not found or inactive'));
      }
    }

    const targetCategoryId = category_id || subcategory.category_id;
    const targetName = (sub_category_name !== undefined ? sub_category_name.trim() : subcategory.sub_category_name);
    if (sub_category_name !== undefined || category_id !== undefined) {
      const existingSubs = await BusinessSubCategory.findAll({ category_id: targetCategoryId });
      if (existingSubs.some(s => s.sub_category_name.toLowerCase() === targetName.toLowerCase() && s.id !== id)) {
        return res.status(409).json(wrapError(409, 'Duplicate Sub-Category name under same parent',
          `A sub-category named '${targetName}' already exists under this parent category`));
      }
    }

    const updated = await BusinessSubCategory.update(id, {
      ...(sub_category_name !== undefined && { sub_category_name: sub_category_name.trim() }),
      ...(category_id !== undefined && { category_id }),
    });

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'subcategory.updated',
      resource: 'sub_category',
      resourceId: id,
      details: JSON.stringify({
        old: { sub_category_name: subcategory.sub_category_name },
        new: { sub_category_name: updated.sub_category_name },
      }),
      ipAddress,
      userAgent,
      result: 'success',
    });

    res.json(wrapSuccess(200, 'Sub-Category updated successfully', updated));
  } catch (error) {
    next(error);
  }
};

exports.deleteSubCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const subcategory = await BusinessSubCategory.findById(id);
    if (!subcategory) {
      return res.status(404).json(wrapError(404, 'Sub-Category not found', 'Sub-Category with the specified ID does not exist'));
    }

    const inUse = await BusinessSubCategory.isInUse(id);
    if (inUse) {
      return res.status(409).json({
        status: 'error',
        status_code: 409,
        message: 'Sub-Category is in use and cannot be deleted',
        body: {
          error: 'Sub-Category is linked to active leads. Deactivate instead.',
          inUse: true,
        },
      });
    }

    await BusinessSubCategory.delete(id);

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'subcategory.deleted',
      resource: 'sub_category',
      resourceId: id,
      details: JSON.stringify({ sub_category_name: subcategory.sub_category_name }),
      ipAddress,
      userAgent,
      result: 'success',
    });

    res.json(wrapSuccess(200, 'Sub-Category deleted successfully', { id }));
  } catch (error) {
    next(error);
  }
};

exports.patchSubCategoryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    if (!status || !['Active', 'Inactive'].includes(status)) {
      return res.status(400).json(wrapError(400, 'Validation failed', 'Status must be Active or Inactive'));
    }

    const subcategory = await BusinessSubCategory.findById(id);
    if (!subcategory) {
      return res.status(404).json(wrapError(404, 'Sub-Category not found', 'Sub-Category with the specified ID does not exist'));
    }

    if (subcategory.status === status) {
      return res.status(400).json(wrapError(400, `Sub-Category is already ${status}`, 'Requested status matches current status'));
    }

    const updated = await BusinessSubCategory.update(id, { status });

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'subcategory.status_changed',
      resource: 'sub_category',
      resourceId: id,
      details: JSON.stringify({ old: { status: subcategory.status }, new: { status } }),
      ipAddress,
      userAgent,
      result: 'success',
    });

    const actionLabel = status === 'Inactive' ? 'deactivated' : 'activated';
    res.json(wrapSuccess(200, `Sub-Category ${actionLabel} successfully`, updated));
  } catch (error) {
    next(error);
  }
};

// ---- Active category/subcategory dropdowns (both Admin & Marketing) ----

exports.getActiveCategories = async (req, res, next) => {
  try {
    const categories = await BusinessCategory.findAllForDropdown();
    res.json(wrapSuccess(200, 'Active categories fetched successfully', {
      data: categories,
      count: categories.length,
    }));
  } catch (error) {
    next(error);
  }
};

exports.getActiveSubCategories = async (req, res, next) => {
  try {
    const { category_id, categoryId } = req.query;
    const id = category_id || categoryId;
    if (!id) {
      return res.status(400).json(wrapError(400, 'Validation failed', 'A valid category_id query parameter is required'));
    }

    const parent = await BusinessCategory.findById(id);
    if (!parent) {
      return res.status(404).json(wrapError(404, 'Category not found', 'Category with the specified ID does not exist'));
    }

    const subcategories = await BusinessSubCategory.findAllActiveByCategory(id);
    res.json(wrapSuccess(200, 'Active sub-categories fetched successfully', {
      category_id: id,
      data: subcategories,
      count: subcategories.length,
    }));
  } catch (error) {
    next(error);
  }
};

// ---- Seed Default Taxonomy ----

exports.seedDefaultTaxonomy = async (req, res, next) => {
  try {
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const existing = await BusinessCategory.findAll();
    const existingNames = new Set(existing.map(c => c.category_name.toLowerCase()));

    if (existing.length > 0) {
      return res.status(409).json(wrapError(409, 'Default taxonomy already seeded', 'System default categories have already been loaded'));
    }

    const defaults = [
      { name: 'IT Services', subs: ['Software Development', 'Cloud Solutions', 'IT Consulting', 'Cybersecurity', 'Data Analytics', 'AI & Machine Learning', 'DevOps', 'Technical Support'] },
      { name: 'Digital Marketing', subs: ['SEO', 'Social Media Marketing', 'PPC Advertising', 'Content Marketing'] },
      { name: 'Consulting', subs: ['Management Consulting', 'HR Consulting', 'Financial Consulting', 'Strategy Consulting'] },
      { name: 'Design & Creative', subs: ['UI/UX Design', 'Graphic Design', 'Video Production'] },
      { name: 'Healthcare', subs: ['Telemedicine', 'Health Analytics', 'Medical Devices', 'Healthcare Consulting'] },
      { name: 'Education & Training', subs: ['E-Learning', 'Corporate Training', 'Skill Development'] },
      { name: 'Real Estate', subs: ['Property Management', 'Real Estate Consulting', 'Facility Management', 'Commercial Leasing'] },
      { name: 'E-commerce', subs: ['Marketplace Management', 'Dropshipping', 'E-commerce Consulting', 'Payment Solutions'] },
    ];

    let categoriesCreated = 0;
    let subCategoriesCreated = 0;

    for (const cat of defaults) {
      const category = await BusinessCategory.create({ category_name: cat.name });
      categoriesCreated++;

      for (const sub of cat.subs) {
        await BusinessSubCategory.create({
          category_id: category.id,
          sub_category_name: sub,
        });
        subCategoriesCreated++;
      }
    }

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'category.taxonomy_seeded',
      resource: 'category',
      resourceId: 'system',
      details: JSON.stringify({ categoriesCreated, subCategoriesCreated }),
      ipAddress,
      userAgent,
      result: 'success',
    });

    res.json(wrapSuccess(200, 'Default taxonomy seeded', {
      categoriesCreated,
      subCategoriesCreated,
    }));
  } catch (error) {
    next(error);
  }
};

// ---- Category Audit Log ----

exports.getCategoryAuditLog = async (req, res, next) => {
  try {
    const { entityId, entityName, action, page = 1, limit = 20 } = req.query;

    const filters = { resource: 'category', page: parseInt(page, 10) || 1, limit: parseInt(limit, 10) || 20 };
    if (entityId) filters.resourceId = entityId;
    if (action) filters.action = action;

    const result = await AuditLog.findAll(filters);

    const data = result.data.map(log => ({
      id: log.id,
      module: log.resource === 'BusinessCategory' ? 'Category' : log.resource,
      entityId: log.resourceId,
      entityName: entityName || '',
      action: log.action,
      changedBy: log.email,
      timestamp: log.createdAt || log.created_at,
      changes: log.details ? tryParseJson(log.details) : undefined,
    }));

    res.json(wrapSuccess(200, 'Audit log fetched successfully', {
      page: filters.page,
      totalPages: result.pagination.totalPages,
      totalCount: result.pagination.totalRecords,
      limit: result.pagination.limit,
      data,
    }));
  } catch (error) {
    next(error);
  }
};

function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
