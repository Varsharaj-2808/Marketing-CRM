const Lead = require('../models/Lead');
const LeadHistory = require('../models/LeadHistory');
const AuditLog = require('../models/AuditLog');

const VALID_PRIORITIES = ['Hot', 'Warm', 'Cold'];

const getIpAndAgent = (req) => ({
  ipAddress: (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim() || req.ip,
  userAgent: req.headers['user-agent'] || '',
});

const MOBILE_REGEX = /^\d{10}$/;

exports.createLead = async (req, res, next) => {
  try {
    const { company_name, contact_person, mobile_number, email, website, city, lead_source, category, sub_category, service_interested, priority, estimated_value } = req.body;
    const { ipAddress, userAgent } = getIpAndAgent(req);

    const errors = {};

    if (!company_name || !company_name.trim()) {
      errors.company_name = 'Company Name is required';
    }
    if (!contact_person || !contact_person.trim()) {
      errors.contact_person = 'Contact Person is required';
    }
    if (!mobile_number || !mobile_number.trim()) {
      errors.mobile_number = 'Mobile Number is required';
    } else if (!MOBILE_REGEX.test(mobile_number.replace(/\D/g, ''))) {
      errors.mobile_number = 'Mobile Number must be exactly 10 numeric digits';
    }
    if (!lead_source || !lead_source.trim()) {
      errors.lead_source = 'Lead Source is required';
    }
    if (!category || !category.trim()) {
      errors.category = 'Business Category is required';
    }
    if (!priority) {
      errors.priority = 'Priority is required';
    } else if (!VALID_PRIORITIES.includes(priority)) {
      errors.priority = 'Priority must be one of: Hot, Warm, Cold';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json(errors);
    }

    const lead = await Lead.create(req.body, req.user.id);

    await LeadHistory.create({
      leadId: lead.id,
      fieldName: 'lead_created',
      changeSummary: `Lead Created by ${req.user.name || req.user.email} on ${new Date().toISOString()}`,
      changedBy: req.user.id,
    });

    await AuditLog.create({
      userId: req.user.id,
      email: req.user.email,
      action: 'LEAD_CREATED',
      resource: 'Lead',
      resourceId: lead.lead_id,
      details: JSON.stringify({ company_name: lead.company_name, contact_person: lead.contact_person, mobile_number: lead.mobile_number }),
      ipAddress,
      userAgent,
      result: 'Success',
    });

    res.status(201).json({
      success: true,
      message: 'Lead created successfully.',
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

exports.checkMobile = async (req, res, next) => {
  try {
    const { mobile } = req.query;
    if (!mobile) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }
    const existing = await Lead.findByMobile(mobile);
    if (existing) {
      return res.json({ isDuplicate: true, leadId: existing.lead_id });
    }
    res.json({ isDuplicate: false });
  } catch (error) {
    next(error);
  }
};

exports.checkEmail = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const existing = await Lead.findByEmail(email);
    if (existing) {
      return res.json({ isDuplicate: true, leadId: existing.lead_id });
    }
    res.json({ isDuplicate: false });
  } catch (error) {
    next(error);
  }
};

exports.getLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

exports.getLeads = async (req, res, next) => {
  try {
    const { search, priority, stage, sortBy, sortOrder, page, limit } = req.query;
    const isAdmin = req.user.role === 'Admin';

    const result = await Lead.findAll({
      userId: req.user.id,
      isAdmin,
      search,
      priority,
      stage,
      sortBy,
      sortOrder,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    res.json({
      success: true,
      data: result.data,
      page: result.page,
      totalPages: result.totalPages,
      totalCount: result.totalCount,
    });
  } catch (error) {
    next(error);
  }
};

exports.getLeadHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    const history = await LeadHistory.findByLeadId(id);
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};
