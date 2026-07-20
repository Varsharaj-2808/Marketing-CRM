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
    const nextSeq = result && result.rows && result.rows[0] && result.rows[0].next_seq !== undefined ? result.rows[0].next_seq : 1;
    return `LD-${year}-${String(nextSeq).padStart(5, '0')}`;
  },

  async create(data, creatorId) {
    const { company_name, contact_person, mobile_number, email, website, city, lead_source, category, sub_category, service_interested, servicesInterested, priority, estimated_value } = data;
    const leadId = await this.getNextLeadId();

    const isUuid = (val) => val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val).trim());

    const cleanSingleVal = (val) => {
      if (val === null || val === undefined) return null;
      let v = val;
      if (Array.isArray(v)) v = v[0];
      if (typeof v === 'string') {
        v = v.trim();
        if (v.startsWith('[') && v.endsWith(']')) {
          try {
            const p = JSON.parse(v);
            if (Array.isArray(p)) v = p[0];
          } catch (e) {}
        }
      }
      return v ? String(v).trim() : null;
    };

    const cleanCategory = isUuid(cleanSingleVal(category)) ? cleanSingleVal(category) : null;
    const cleanSubCategory = isUuid(cleanSingleVal(sub_category)) ? cleanSingleVal(sub_category) : null;
    const cleanLeadSource = cleanSingleVal(lead_source);
    const cleanCreatorId = isUuid(cleanSingleVal(creatorId)) ? cleanSingleVal(creatorId) : creatorId;

    let services = service_interested !== undefined ? service_interested : servicesInterested;
    if (services !== null && services !== undefined) {
      if (typeof services === 'string') {
        try { services = JSON.parse(services); } catch (e) {}
      }
      const arr = Array.isArray(services) ? services : [services];
      const flat = [];
      arr.forEach(item => {
        let val = item;
        if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
          try { val = JSON.parse(val); } catch (e) {}
        }
        if (Array.isArray(val)) {
          val.forEach(v => { if (v) flat.push(String(v)); });
        } else if (val !== null && val !== undefined && val !== '') {
          flat.push(String(val));
        }
      });

      if (flat.length > 0) {
        const hasNumericIds = flat.some(v => !isNaN(Number(v)) && Number.isInteger(Number(v)));
        if (hasNumericIds) {
          try {
            const svcResult = await query(
              `SELECT id::text, name FROM services WHERE id::text = ANY($1) OR name = ANY($1)`,
              [flat]
            );
            if (svcResult && svcResult.rows) {
              const nameMap = {};
              svcResult.rows.forEach(r => { nameMap[r.id] = r.name; nameMap[r.name] = r.name; });
              services = flat.map(v => nameMap[v] || v);
            } else {
              services = flat;
            }
          } catch (e) {
            services = flat;
          }
        } else {
          services = flat;
        }
      } else {
        services = null;
      }
    }

    const result = await query(
      `INSERT INTO leads ("company_name", "contact_person", "mobile_number", email, website, city, "lead_source", category, "sub_category", "service_interested", priority, "estimated_value", "assigned_to", "lead_id", stage, "lead_status")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'New', NULL)
       RETURNING *`,
      [company_name, contact_person, mobile_number, email || null, website || null, city || null, cleanLeadSource, cleanCategory, cleanSubCategory, services, priority, estimated_value || null, cleanCreatorId, leadId]
    );
    if (!result.rows[0]) return null;
    const resolved = await this._resolveServiceNames([result.rows[0]]);
    return resolved[0] || result.rows[0];
  },

  async findById(id) {
    const result = await query(
      `SELECT l.*, u.name as assigned_to_name, u.employee_id as assigned_employee_id,
              bc.category_name, bsc.sub_category_name,
              ls.name as lead_source_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       LEFT JOIN business_categories bc ON l.category = bc.id
       LEFT JOIN business_sub_categories bsc ON l.sub_category = bsc.id
       LEFT JOIN lead_sources ls ON l.lead_source = ls.id::text OR l.lead_source = ls.name
       WHERE l.id = $1`,
      [id]
    );
    if (!result.rows[0]) return null;
    const resolved = await this._resolveServiceNames([result.rows[0]]);
    return resolved[0] || result.rows[0];
  },

  async findByLeadId(leadId) {
    const result = await query(
      `SELECT l.*, u.name as assigned_to_name, u.employee_id as assigned_employee_id,
              bc.category_name, bsc.sub_category_name,
              ls.name as lead_source_name
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       LEFT JOIN business_categories bc ON l.category = bc.id
       LEFT JOIN business_sub_categories bsc ON l.sub_category = bsc.id
       LEFT JOIN lead_sources ls ON l.lead_source = ls.id::text OR l.lead_source = ls.name
       WHERE l.lead_id = $1`,
      [leadId]
    );
    if (!result.rows[0]) return null;
    const resolved = await this._resolveServiceNames([result.rows[0]]);
    return resolved[0] || result.rows[0];
  },

  async updateAssignedTo(id, assignedToUserId) {
    const result = await query(
      `UPDATE leads SET assigned_to = $1, assigned_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [assignedToUserId, id]
    );
    if (!result.rows[0]) return null;
    const resolved = await this._resolveServiceNames([result.rows[0]]);
    return resolved[0] || result.rows[0];
  },

  async findByMobile(mobile) {
    const result = await query('SELECT * FROM leads WHERE "mobile_number" = $1 AND stage != $2 AND lead_status != $3', [mobile, 'Closed Lost', 'Lost']);
    if (!result.rows[0]) return null;
    const resolved = await this._resolveServiceNames([result.rows[0]]);
    return resolved[0] || result.rows[0];
  },

  async findByEmail(email) {
    const result = await query('SELECT * FROM leads WHERE email = $1 AND stage != $2 AND lead_status != $3', [email, 'Closed Lost', 'Lost']);
    if (!result.rows[0]) return null;
    const resolved = await this._resolveServiceNames([result.rows[0]]);
    return resolved[0] || result.rows[0];
  },

  async findAll(filters = {}) {
    const { userId, isAdmin, search, ids, priority, stage, status, category, sub_category, lead_source, from_date, to_date, sortBy, sortOrder, page = 1, limit = 20, assigned_to, city, service_interested, created_by } = filters;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (!isAdmin && userId) {
      conditions.push(`l.assigned_to = $${idx++}`);
      values.push(userId);
    }

    // When Algolia returns a specific set of IDs (e.g. for export), scope the
    // query to exactly those leads instead of using SQL ILIKE.
    if (ids && ids.length > 0) {
      conditions.push(`l.id = ANY($${idx++})`);
      values.push(ids);
    } else if (search) {
      conditions.push(`(l.company_name ILIKE $${idx} OR l.contact_person ILIKE $${idx} OR l.email ILIKE $${idx} OR l.mobile_number ILIKE $${idx} OR l.city ILIKE $${idx} OR l.lead_id ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    if (priority && priority !== 'All') {
      conditions.push(`l.priority = $${idx++}`);
      values.push(priority);
    }

    if (stage && stage !== 'All') {
      if (stage === 'Active') {
        conditions.push(`l.stage != 'Closed' AND (l.lead_status IS NULL OR (l.lead_status != 'Won' AND l.lead_status != 'Lost'))`);
      } else if (stage === 'Won' || stage === 'Lost') {
        conditions.push(`(l.stage = 'Closed' OR l.stage = $${idx}) AND l.lead_status = $${idx}`);
        values.push(stage);
        idx++;
      } else {
        conditions.push(`l.stage = $${idx++}`);
        values.push(stage);
      }
    }

    if (status && status !== 'All') {
      if (status === 'Active') {
        conditions.push(`l.stage != 'Closed' AND (l.lead_status IS NULL OR (l.lead_status != 'Won' AND l.lead_status != 'Lost'))`);
      } else {
        conditions.push(`l.lead_status = $${idx++}`);
        values.push(status);
      }
    }

    if (category) {
      conditions.push(`l.category = $${idx++}`);
      values.push(category);
    }

    if (sub_category) {
      conditions.push(`l.sub_category = $${idx++}`);
      values.push(sub_category);
    }

    if (lead_source) {
      conditions.push(`(l.lead_source = $${idx} OR ls.name ILIKE $${idx})`);
      values.push(lead_source);
      idx++;
    }

    if (from_date) {
      conditions.push(`l.created_at >= $${idx++}`);
      values.push(from_date);
    }

    if (to_date) {
      conditions.push(`l.created_at <= $${idx++}`);
      values.push(`${to_date} 23:59:59`);
    }

    if (assigned_to) {
      conditions.push(`(l.assigned_to = $${idx} OR u.employee_id = $${idx} OR u.name ILIKE $${idx})`);
      values.push(assigned_to);
      idx++;
    }

    if (city) {
      conditions.push(`l.city ILIKE $${idx++}`);
      values.push(`%${city}%`);
    }

    if (service_interested) {
      conditions.push(`$${idx} = ANY(l.service_interested)`);
      values.push(service_interested);
      idx++;
    }

    if (created_by) {
      conditions.push(`EXISTS (
        SELECT 1 FROM lead_history lh 
        LEFT JOIN users u_creator ON lh.changed_by = u_creator.id
        WHERE lh.lead_id = l.id AND lh.field_name = 'lead_created' 
          AND (lh.changed_by = $${idx} OR u_creator.employee_id = $${idx} OR u_creator.name = $${idx})
      )`);
      values.push(created_by);
      idx++;
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
    const sortDir = sortOrder && sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Use a correlated subquery for lead_sources to avoid duplicate rows that
    // the OR condition could produce.
    const lsJoin = `LEFT JOIN LATERAL (
      SELECT name FROM lead_sources
      WHERE id::text = l.lead_source OR name = l.lead_source
      LIMIT 1
    ) ls ON true`;

    const countSql = `SELECT COUNT(*) FROM leads l
                      LEFT JOIN users u ON l.assigned_to = u.id
                      LEFT JOIN business_categories bc ON l.category = bc.id
                      LEFT JOIN business_sub_categories bsc ON l.sub_category = bsc.id
                      ${lsJoin}
                      ${where}`;
    const countRes = await query(countSql, values);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const offset = (page - 1) * limit;
    const sql = `SELECT l.*, u.name as assigned_to_name, u.employee_id as assigned_employee_id,
                        bc.category_name, bsc.sub_category_name,
                        ls.name as lead_source_name
                 FROM leads l
                 LEFT JOIN users u ON l.assigned_to = u.id
                 LEFT JOIN business_categories bc ON l.category = bc.id
                 LEFT JOIN business_sub_categories bsc ON l.sub_category = bsc.id
                 ${lsJoin}
                 ${where}
                 ORDER BY ${sortCol} ${sortDir}
                 LIMIT $${idx++} OFFSET $${idx++}`;
    values.push(limit, offset);

    const result = await query(sql, values);

    const rows = await this._resolveServiceNames(result.rows);

    return {
      data: rows,
      page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    };
  },
  async findAllAdmin(filters = {}) {
    const { search, ids, priority, stage, status, category, sub_category, lead_source, from_date, to_date, sortBy, sortOrder, page = 1, limit = 20, assigned_to, city, service_interested, created_by } = filters;

    const conditions = [];
    const values = [];
    let idx = 1;

    // When Algolia returns a specific set of IDs (e.g. for export), scope the
    // query to exactly those leads instead of using SQL ILIKE.
    if (ids && ids.length > 0) {
      conditions.push(`l.id = ANY($${idx++})`);
      values.push(ids);
    } else if (search) {
      conditions.push(`(l.company_name ILIKE $${idx} OR l.contact_person ILIKE $${idx} OR l.email ILIKE $${idx} OR l.mobile_number ILIKE $${idx} OR l.city ILIKE $${idx} OR l.lead_id ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    if (priority && priority !== 'All') {
      conditions.push(`l.priority = $${idx++}`);
      values.push(priority);
    }

    if (stage && stage !== 'All') {
      if (stage === 'Active') {
        conditions.push(`l.stage != 'Closed' AND (l.lead_status IS NULL OR (l.lead_status != 'Won' AND l.lead_status != 'Lost'))`);
      } else if (stage === 'Won' || stage === 'Lost') {
        conditions.push(`(l.stage = 'Closed' OR l.stage = $${idx}) AND l.lead_status = $${idx}`);
        values.push(stage);
        idx++;
      } else {
        conditions.push(`l.stage = $${idx++}`);
        values.push(stage);
      }
    }

    if (status && status !== 'All') {
      if (status === 'Active') {
        conditions.push(`l.stage != 'Closed' AND (l.lead_status IS NULL OR (l.lead_status != 'Won' AND l.lead_status != 'Lost'))`);
      } else {
        conditions.push(`l.lead_status = $${idx++}`);
        values.push(status);
      }
    }

    if (category) {
      conditions.push(`l.category = $${idx++}`);
      values.push(category);
    }

    if (sub_category) {
      conditions.push(`l.sub_category = $${idx++}`);
      values.push(sub_category);
    }

    if (lead_source) {
      conditions.push(`(l.lead_source = $${idx} OR ls.name ILIKE $${idx})`);
      values.push(lead_source);
      idx++;
    }

    if (from_date) {
      conditions.push(`l.created_at >= $${idx++}`);
      values.push(from_date);
    }

    if (to_date) {
      conditions.push(`l.created_at <= $${idx++}`);
      values.push(`${to_date} 23:59:59`);
    }

    if (assigned_to) {
      conditions.push(`(l.assigned_to = $${idx} OR u.employee_id = $${idx} OR u.name ILIKE $${idx})`);
      values.push(assigned_to);
      idx++;
    }

    if (city) {
      conditions.push(`l.city ILIKE $${idx++}`);
      values.push(`%${city}%`);
    }

    if (service_interested) {
      conditions.push(`$${idx} = ANY(l.service_interested)`);
      values.push(service_interested);
      idx++;
    }

    if (created_by) {
      conditions.push(`EXISTS (
        SELECT 1 FROM lead_history lh 
        LEFT JOIN users u_creator ON lh.changed_by = u_creator.id
        WHERE lh.lead_id = l.id AND lh.field_name = 'lead_created' 
          AND (lh.changed_by = $${idx} OR u_creator.employee_id = $${idx} OR u_creator.name = $${idx})
      )`);
      values.push(created_by);
      idx++;
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
    const sortDir = sortOrder && sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Use a correlated subquery for lead_sources to avoid duplicate rows that
    // the OR condition (`ls.id::text = ... OR ls.name = ...`) could produce.
    const lsJoin = `LEFT JOIN LATERAL (
      SELECT name FROM lead_sources
      WHERE id::text = l.lead_source OR name = l.lead_source
      LIMIT 1
    ) ls ON true`;

    const countSql = `SELECT COUNT(*) FROM leads l
                      LEFT JOIN users u ON l.assigned_to = u.id
                      LEFT JOIN business_categories bc ON l.category = bc.id
                      LEFT JOIN business_sub_categories bsc ON l.sub_category = bsc.id
                      ${lsJoin}
                      ${where}`;
    const countRes = await query(countSql, values);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const offset = (page - 1) * limit;
    const sql = `SELECT l.*, u.name as assigned_to_name, u.employee_id as assigned_employee_id,
                        bc.category_name, bsc.sub_category_name,
                        ls.name as lead_source_name
                 FROM leads l
                 LEFT JOIN users u ON l.assigned_to = u.id
                 LEFT JOIN business_categories bc ON l.category = bc.id
                 LEFT JOIN business_sub_categories bsc ON l.sub_category = bsc.id
                 ${lsJoin}
                 ${where}
                 ORDER BY ${sortCol} ${sortDir}
                 LIMIT $${idx++} OFFSET $${idx++}`;
    values.push(limit, offset);

    const result = await query(sql, values);

    const rows = await this._resolveServiceNames(result.rows);

    return {
      data: rows,
      page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    };
  },
  async _resolveServiceNames(rows) {
    if (!rows || rows.length === 0) return rows;
    const allValues = new Set();
    rows.forEach(r => {
      if (r.service_interested) {
        let svcs = r.service_interested;
        if (typeof svcs === 'string') {
          try { svcs = JSON.parse(svcs); } catch (e) {}
        }
        if (Array.isArray(svcs)) {
          svcs.forEach(v => {
            if (v && !isNaN(Number(v))) allValues.add(String(v));
          });
        } else if (svcs && !isNaN(Number(svcs))) {
          allValues.add(String(svcs));
        }
      }
    });
    if (allValues.size === 0) {
      return rows.map(r => {
        if (r.service_interested) {
          let svcs = r.service_interested;
          if (typeof svcs === 'string') {
            try {
              const p = JSON.parse(svcs);
              if (p !== null && p !== undefined) svcs = p;
            } catch (e) {}
          }
          if (Array.isArray(svcs)) {
            r.service_interested = svcs.length === 1 ? svcs[0] : (svcs.length > 1 ? svcs : null);
          }
        }
        return r;
      });
    }
    const valuesArr = Array.from(allValues);
    const nameMap = {};
    try {
      const svcResult = await query(
        `SELECT id::text, name FROM services WHERE id::text = ANY($1) OR name = ANY($1)`,
        [valuesArr]
      );
      if (svcResult && svcResult.rows) {
        svcResult.rows.forEach(r => { nameMap[r.id] = r.name; nameMap[r.name] = r.name; });
      }
    } catch (err) {
      console.warn('[Lead._resolveServiceNames] Lookup skipped:', err.message);
    }
    return rows.map(r => {
      if (r.service_interested) {
        let svcs = r.service_interested;
        if (typeof svcs === 'string') {
          try {
            const parsed = JSON.parse(svcs);
            if (parsed !== null && parsed !== undefined) svcs = parsed;
          } catch (e) {}
        }
        if (Array.isArray(svcs)) {
          const mapped = svcs.map(v => nameMap[String(v)] || String(v));
          r.service_interested = mapped.length === 1 ? mapped[0] : (mapped.length > 1 ? mapped : null);
        } else if (svcs !== null && svcs !== undefined && svcs !== '') {
          r.service_interested = nameMap[String(svcs)] || String(svcs);
        }
      }
      return r;
    });
  },
  async updateStage(id, stage, leadStatus = null) {
    const result = await query(
      `UPDATE leads
       SET stage = $1, lead_status = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [stage, leadStatus, id]
    );
    if (!result.rows[0]) return null;
    const resolved = await this._resolveServiceNames([result.rows[0]]);
    return resolved[0] || result.rows[0];
  },

  async closeLost(id, lostReason) {
    const result = await query(
      `UPDATE leads
       SET stage = 'Closed', lead_status = 'Lost', lost_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [lostReason, id]
    );
    if (!result.rows[0]) return null;
    const resolved = await this._resolveServiceNames([result.rows[0]]);
    return resolved[0] || result.rows[0];
  },

  async closeWon(id, finalDealValue, closureDate) {
    const result = await query(
      `UPDATE leads
       SET stage = 'Closed', lead_status = 'Won', final_deal_value = $1, closure_date = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [finalDealValue, closureDate, id]
    );
    if (!result.rows[0]) return null;
    const resolved = await this._resolveServiceNames([result.rows[0]]);
    return resolved[0] || result.rows[0];
  },

  async reopen(id) {
    const result = await query(
      `UPDATE leads
       SET stage = 'Contacted', lead_status = NULL, lost_reason = NULL, final_deal_value = NULL, closure_date = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (!result.rows[0]) return null;
    const resolved = await this._resolveServiceNames([result.rows[0]]);
    return resolved[0] || result.rows[0];
  },
};

module.exports = Lead;
