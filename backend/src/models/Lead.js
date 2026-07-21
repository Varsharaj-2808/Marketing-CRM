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
    const cleanCreatorId = isUuid(cleanSingleVal(creatorId)) ? cleanSingleVal(creatorId) : creatorId;

    // Resolve lead_source: UUID → use directly | numeric ID → look up UUID/name | name string → use as-is
    let cleanLeadSource = cleanSingleVal(lead_source);
    if (cleanLeadSource && !isUuid(cleanLeadSource) && !isNaN(Number(cleanLeadSource)) && Number.isInteger(Number(cleanLeadSource))) {
      // Numeric ID from old local DB schema — look up by integer id or name
      try {
        const srcResult = await query(
          `SELECT id::text, name FROM lead_sources WHERE id::text = $1`,
          [cleanLeadSource]
        );
        if (srcResult && srcResult.rows && srcResult.rows[0]) {
          // Prefer UUID if the live DB has UUIDs, otherwise fall back to name
          cleanLeadSource = isUuid(srcResult.rows[0].id) ? srcResult.rows[0].id : srcResult.rows[0].name;
        }
      } catch (e) {
        // keep cleanLeadSource as-is on error
      }
    }

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
        const hasUuidIds = flat.every(v => isUuid(v));
        const hasNumericIds = !hasUuidIds && flat.some(v => !isNaN(Number(v)) && Number.isInteger(Number(v)));

        if (hasUuidIds) {
          // Live DB: UUIDs passed directly — use as-is
          services = flat;
        } else if (hasNumericIds) {
          // Old local DB: integer IDs — look up by id or name
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
          // Name strings — use as-is
          services = flat;
        }
      } else {
        services = null;
      }
    }
    const jsonServices = services ? JSON.stringify(services) : null;
    const result = await query(
      `INSERT INTO leads ("company_name", "contact_person", "mobile_number", email, website, city, "lead_source", category, "sub_category", "service_interested", priority, "estimated_value", "assigned_to", "lead_id", stage, "lead_status")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'New', NULL)
       RETURNING *`,
      [company_name, contact_person, mobile_number, email || null, website || null, city || null, cleanLeadSource, cleanCategory, cleanSubCategory, jsonServices, priority, estimated_value || null, cleanCreatorId, leadId]
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
       WHERE l.id = $1 /* SELECT l.*, u.name as assigned_to_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE l.id = $1 */`,
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
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(String(assigned_to).trim())) {
        conditions.push(`l.assigned_to = $${idx}`);
        values.push(assigned_to);
        idx++;
      } else {
        conditions.push(`(u.employee_id = $${idx} OR u.name ILIKE $${idx})`);
        values.push(assigned_to);
        idx++;
      }
    }

    if (city) {
      conditions.push(`l.city ILIKE $${idx++}`);
      values.push(`%${city}%`);
    }

    if (service_interested) {
      conditions.push(`l.service_interested ? $${idx}`);
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
    const totalCount = countRes && countRes.rows && countRes.rows[0] ? parseInt(countRes.rows[0].count, 10) || 0 : 0;

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
      totalPages: totalCount === 0 ? 0 : (Math.ceil(totalCount / limit) || 1),
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
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(String(assigned_to).trim())) {
        conditions.push(`l.assigned_to = $${idx}`);
        values.push(assigned_to);
        idx++;
      } else {
        conditions.push(`(u.employee_id = $${idx} OR u.name ILIKE $${idx})`);
        values.push(assigned_to);
        idx++;
      }
    }

    if (city) {
      conditions.push(`l.city ILIKE $${idx++}`);
      values.push(`%${city}%`);
    }

    if (service_interested) {
      conditions.push(`l.service_interested ? $${idx}`);
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
    const totalCount = countRes && countRes.rows && countRes.rows[0] ? parseInt(countRes.rows[0].count, 10) || 0 : 0;

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
      totalPages: totalCount === 0 ? 0 : (Math.ceil(totalCount / limit) || 1),
      totalCount,
    };
  },
  async _resolveServiceNames(rows) {
    if (!rows || rows.length === 0) return rows;

    // Collect all UUID values from service_interested across all rows
    const allUuids = new Set();
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    rows.forEach(r => {
      if (!r.service_interested) return;
      let svcs = r.service_interested;
      if (typeof svcs === 'string') {
        try { svcs = JSON.parse(svcs); } catch (e) {}
      }
      const arr = Array.isArray(svcs) ? svcs : [svcs];
      arr.forEach(v => {
        if (v && UUID_RE.test(String(v).trim())) {
          allUuids.add(String(v).trim());
        }
      });
    });

    // Build UUID → name map
    const nameMap = {};
    if (allUuids.size > 0) {
      try {
        const svcResult = await query(
          `SELECT id::text, name FROM services WHERE id = ANY($1::uuid[])`,
          [Array.from(allUuids)]
        );
        if (svcResult && svcResult.rows) {
          svcResult.rows.forEach(r => { nameMap[r.id] = r.name; });
        }
      } catch (err) {
        console.warn('[Lead._resolveServiceNames] Lookup skipped:', err.message);
      }
    }

    // Map each row's service_interested UUIDs → display names
    return rows.map(r => {
      if (!r.service_interested) return r;
      let svcs = r.service_interested;
      if (typeof svcs === 'string') {
        try {
          const p = JSON.parse(svcs);
          if (p !== null && p !== undefined) svcs = p;
        } catch (e) {}
      }
      if (Array.isArray(svcs)) {
        const mapped = svcs.map(v => {
          const s = String(v).trim();
          return nameMap[s] || s;   // UUID → name; fallback keeps value as-is
        }).filter(Boolean);
        r.service_interested = mapped.length > 0 ? mapped : null;
      } else if (svcs !== null && svcs !== undefined && svcs !== '') {
        const s = String(svcs).trim();
        r.service_interested = nameMap[s] || s;
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

  async update(id, fields, client) {
    const ALLOWED = [
      'company_name', 'contact_person', 'mobile_number', 'email', 'website',
      'city', 'lead_source', 'category', 'sub_category', 'service_interested',
      'priority', 'estimated_value', 'next_followup_date', 'remarks',
    ];
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(fields)) {
      if (!ALLOWED.includes(key)) continue;
      let dbVal = val;
      if (key === 'service_interested') {
        dbVal = val !== null && val !== undefined ? JSON.stringify(val) : null;
      }
      setClauses.push(`"${key}" = $${idx++}`);
      values.push(dbVal);
    }

    if (setClauses.length === 0) return null;

    setClauses.push(`"updated_at" = NOW()`);
    values.push(id);

    const sql = `UPDATE leads SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
    const executor = client ? client.query.bind(client) : query;
    const result = await executor(sql, values);
    if (!result.rows[0]) return null;
    const resolved = await this._resolveServiceNames([result.rows[0]]);
    return resolved[0] || result.rows[0];
  },

  async softDelete(id, client) {
    const executor = client ? client.query.bind(client) : query;
    const result = await executor(
      `UPDATE leads SET deleted_at = NOW(), is_deleted = TRUE, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, "lead_id"`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findByMobileForUpdate(mobile, excludeId) {
    const result = await query(
      `SELECT id, "lead_id" FROM leads
       WHERE "mobile_number" = $1 AND id != $2 AND deleted_at IS NULL
       LIMIT 1`,
      [mobile, excludeId]
    );
    return result.rows[0] || null;
  },

  async findByEmailForUpdate(email, excludeId) {
    const result = await query(
      `SELECT id, "lead_id" FROM leads
       WHERE email = $1 AND id != $2 AND deleted_at IS NULL
       LIMIT 1`,
      [email, excludeId]
    );
    return result.rows[0] || null;
  },
};

module.exports = Lead;
