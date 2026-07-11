const { query } = require('../config/db');

const VALID_FOLLOWUP_TYPES = ['Call', 'WhatsApp', 'Email', 'Online Meeting', 'Client Meeting', 'Demo', 'Proposal Discussion'];
const VALID_OUTCOMES = ['Interested', 'Need More Info', 'Proposal Requested', 'Budget Discussion', 'Decision Pending', 'Not Interested'];
const CLOSING_OUTCOMES = ['Not Interested'];

const Followup = {
  VALID_FOLLOWUP_TYPES,
  VALID_OUTCOMES,
  CLOSING_OUTCOMES,

  async create(data) {
    const {
      leadId,
      followupType,
      outcome,
      notes,
      nextFollowupDate,
      proposalAmount,
      stageAtLog,
      createdBy,
    } = data;

    const result = await query(
      `INSERT INTO followups (
        lead_id, followup_type, outcome, notes, next_followup_date,
        proposal_amount, stage_at_log, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        leadId,
        followupType,
        outcome,
        notes || null,
        nextFollowupDate || null,
        proposalAmount !== undefined && proposalAmount !== null ? proposalAmount : null,
        stageAtLog || null,
        createdBy,
      ]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query(
      `SELECT f.*, u.name as created_by_name, u.id as created_by_id
       FROM followups f
       LEFT JOIN users u ON f.created_by = u.id
       WHERE f.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findByLeadId(leadId) {
    const result = await query(
      `SELECT f.*, u.name as created_by_name, u.id as created_by_id
       FROM followups f
       LEFT JOIN users u ON f.created_by = u.id
       WHERE f.lead_id = $1
       ORDER BY f.created_at DESC`,
      [leadId]
    );
    return result.rows;
  },

  async addCorrection(id, correctionNotes, correctionBy) {
    const result = await query(
      `UPDATE followups
       SET correction_notes = $1, correction_by = $2, correction_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [correctionNotes, correctionBy, id]
    );
    return result.rows[0] || null;
  },

  formatResponse(followup) {
    return {
      id: followup.id,
      lead_id: followup.lead_id,
      followup_type: followup.followup_type,
      outcome: followup.outcome,
      notes: followup.notes || null,
      next_followup_date: followup.next_followup_date || null,
      proposal_amount: followup.proposal_amount !== undefined ? followup.proposal_amount : null,
      stage_at_log: followup.stage_at_log || null,
      created_by: {
        id: followup.created_by_id || followup.created_by,
        name: followup.created_by_name || null,
      },
      created_at: followup.created_at,
      correction_notes: followup.correction_notes || null,
      correction_by: followup.correction_by || null,
      correction_at: followup.correction_at || null,
    };
  },
};

module.exports = Followup;
