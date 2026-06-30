const { query } = require('../config/db');

const Lead = {
  async getNextLeadId() {
    const year = new Date().getFullYear();
    const result = await query(
      `SELECT COALESCE(
        MAX(CAST(SUBSTRING("lead_id" FROM 9) AS INTEGER)), 0
      ) + 1 AS next_seq FROM leads WHERE "lead_id" LIKE $1`,
      [`LD-${year}-%`]
    );
    const nextSeq = result.rows[0].next_seq;
    return `LD-${year}-${String(nextSeq).padStart(5, '0')}`;
  },

  async create(data, creatorId) {
    const { company_name, contact_person, mobile_number, email, website, city, lead_source, category, sub_category, service_interested, priority, estimated_value } = data;
    const leadId = await this.getNextLeadId();
    const result = await query(
      `INSERT INTO leads ("company_name", "contact_person", "mobile_number", email, website, city, "lead_source", category, "sub_category", "service_interested", priority, "estimated_value", "assigned_to", stage, "lead_status")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'New Lead', 'New Lead')
       RETURNING *`,
      [company_name, contact_person, mobile_number, email || null, website || null, city || null, lead_source, category, sub_category || null, service_interested || null, priority, estimated_value || null, creatorId]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query(
      `SELECT l.*, u.name as assigned_to_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findByLeadId(leadId) {
    const result = await query(
      `SELECT l.*, u.name as assigned_to_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.lead_id = $1`,
      [leadId]
    );
    return result.rows[0] || null;
  },

  async findByMobile(mobile) {
    const result = await query('SELECT * FROM leads WHERE "mobile_number" = $1 AND stage != $2', [mobile, 'Closed Lost']);
    return result.rows[0] || null;
  },

  async findByEmail(email) {
    const result = await query('SELECT * FROM leads WHERE email = $1 AND stage != $2', [email, 'Closed Lost']);
    return result.rows[0] || null;
  },

  async findAll(filters = {}) {
    const { userId, isAdmin, search, priority, stage, sortBy, sortOrder, page = 1, limit = 20 } = filters;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (!isAdmin && userId) {
      conditions.push(`l.assigned_to = $${idx++}`);
      values.push(userId);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(`(
        l.company_name ILIKE $${idx} OR
        l.contact_person ILIKE $${idx} OR
        l.mobile_number ILIKE $${idx} OR
        l.email ILIKE $${idx} OR
        l.lead_source ILIKE $${idx} OR
        l.lead_id ILIKE $${idx}
      )`);
      values.push(searchPattern);
      idx++;
    }

    if (priority) {
      conditions.push(`l.priority = $${idx++}`);
      values.push(priority);
    }

    if (stage) {
      conditions.push(`l.stage = $${idx++}`);
      values.push(stage);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const allowedSortColumns = {
      lead_id: 'l.lead_id',
      company_name: 'l.company_name',
      contact_person: 'l.contact_person',
      mobile_number: 'l.mobile_number',
      email: 'l.email',
      lead_source: 'l.lead_source',
      priority: 'l.priority',
      estimated_value: 'l.estimated_value',
      stage: 'l.stage',
      created_at: 'l.created_at',
      updated_at: 'l.updated_at',
    };

    const sortCol = allowedSortColumns[sortBy] || 'l.created_at';
    const sortDir = sortOrder && sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const countResult = await query(
      `SELECT COUNT(*) FROM leads l ${where}`,
      values
    );
    const totalCount = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * limit;
    const sql = `SELECT l.*, u.name as assigned_to_name
                 FROM leads l
                 LEFT JOIN users u ON l.assigned_to = u.id
                 ${where}
                 ORDER BY ${sortCol} ${sortDir}
                 LIMIT $${idx++} OFFSET $${idx++}`;
    values.push(limit, offset);

    const result = await query(sql, values);

    return {
      data: result.rows,
      page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    };
  },
};

module.exports = Lead;
