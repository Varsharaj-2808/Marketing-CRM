const nodemailer = require('nodemailer');

let transporter = null;

const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
};

const cleanEmail = (email) => {
  if (!email || typeof email !== 'string') return null;
  return email.replace(/[\s,;]+/g, '').trim().toLowerCase() || null;
};

const getTransporter = () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 15000,
    });
    console.log(`[SMTP] Configured: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} user=${process.env.SMTP_USER}`);
  } else {
    transporter = { sendMail: async (opts) => { console.log('[EMAIL LOG]', JSON.stringify(opts, null, 2)); return { messageId: 'console-log' }; } };
    console.log('[SMTP] Not configured - emails will be logged to console');
  }
  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  const cleanTo = cleanEmail(to);

  if (!cleanTo) {
    console.error(`[EMAIL] BLOCKED - Invalid recipient: "${to}" | subject="${subject}"`);
    return { success: false, error: 'Invalid recipient email address' };
  }
  if (!isValidEmail(cleanTo)) {
    console.error(`[EMAIL] BLOCKED - Malformed recipient: "${cleanTo}" | subject="${subject}"`);
    return { success: false, error: 'Malformed recipient email address' };
  }

  try {
    const t = getTransporter();
    const fromAddress = process.env.SMTP_FROM_EMAIL
      ? `"${process.env.SMTP_FROM_NAME || 'CRM'}" <${process.env.SMTP_FROM_EMAIL}>`
      : (process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@crm.com');

    console.log(`[EMAIL] Sending | to="${cleanTo}" | subject="${subject}" | html_length=${(html || '').length} | from="${fromAddress}"`);

    const info = await t.sendMail({
      from: fromAddress,
      to: cleanTo,
      subject,
      text,
      html,
    });

    console.log(`[EMAIL] SUCCESS | to="${cleanTo}" | subject="${subject}" | messageId=${info.messageId} | accepted=${JSON.stringify(info.accepted)} | rejected=${JSON.stringify(info.rejected)} | response="${info.response || ''}"`);

    return { success: true, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected, response: info.response };
  } catch (error) {
    console.error(`[EMAIL] FAILED | to="${cleanTo}" | subject="${subject}" | error="${error.message}" | code=${error.code || 'N/A'} | command=${error.command || 'N/A'}`);
    if (error.code) console.error(`[EMAIL] Error code: ${error.code}`);
    if (error.command) console.error(`[EMAIL] SMTP command: ${error.command}`);
    if (error.response) console.error(`[EMAIL] SMTP response: ${error.response}`);
    console.log(`[EMAIL FALLBACK] To: ${cleanTo}, Subject: ${subject}, Body: ${(text || html || '').substring(0, 200)}`);
    return { success: false, error: error.message, code: error.code };
  }
};

const sendPasswordResetEmail = async (to, resetUrl) => {
  const subject = 'Password Reset Request - CRM';
  const text = `You requested a password reset.\n\nPlease use the following link to reset your password:\n${resetUrl}\n\nThis link will expire in ${process.env.RESET_TOKEN_EXPIRY_MINUTES || 30} minutes.\n\nIf you did not request this, please ignore this email.`;
  const html = `<p>You requested a password reset.</p><p>Please click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link will expire in ${process.env.RESET_TOKEN_EXPIRY_MINUTES || 30} minutes.</p><p>If you did not request this, please ignore this email.</p>`;

  return sendEmail({ to, subject, text, html });
};

const sendWelcomeEmail = async (to, name, employeeId, tempPassword) => {
  const loginUrl = process.env.APP_URL || 'http://localhost:3000';
  const subject = 'Welcome to CRM - Your Account Details';
  const text = `Hello ${name},\n\nYour CRM account has been created.\n\nEmployee ID: ${employeeId}\nTemporary Password: ${tempPassword}\nLogin URL: ${loginUrl}\n\nPlease log in and change your password immediately.\n\nThis is a system-generated password. Do not share it with anyone.`;
  const html = `<p>Hello ${name},</p><p>Your CRM account has been created.</p><p><strong>Employee ID:</strong> ${employeeId}</p><p><strong>Temporary Password:</strong> ${tempPassword}</p><p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p><p>Please log in and change your password immediately.</p><p><em>This is a system-generated password. Do not share it with anyone.</em></p>`;

  return sendEmail({ to, subject, text, html });
};

const sendDailyReminderEmail = async (to, name, companyName, priority) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const subject = `Reminder: Follow-up Due Today - ${companyName}`;
  const text = `Hello ${name},\n\nThis is a reminder that a follow-up is due today for ${companyName} (Priority: ${priority}).\n\nPlease log in to your CRM dashboard to view and manage this lead: ${appUrl}\n\nBest regards,\nCRM System`;
  const html = `<p>Hello ${name},</p><p>This is a reminder that a follow-up is due <strong>today</strong> for <strong>${companyName}</strong> (Priority: ${priority}).</p><p>Please <a href="${appUrl}">log in to your CRM dashboard</a> to view and manage this lead.</p><br><p>Best regards,<br>CRM System</p>`;

  return sendEmail({ to, subject, text, html });
};

const sendLeadAssignedEmail = async (to, recipientName, lead, assignedByName, recipientRole) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const rolePrefix = recipientRole === 'Admin' ? '/admin' : '/marketing';
  const subject = `New Lead Assigned: ${lead.company_name}`;
  const leadUrl = `${appUrl}${rolePrefix}/leads/${lead.id}`;

  const text = [
    `Hello ${recipientName},`,
    ``,
    `A new lead has been assigned to you by ${assignedByName || 'Admin'}.`,
    ``,
    `Lead Details:`,
    `  Company   : ${lead.company_name}`,
    `  Contact   : ${lead.contact_person || 'N/A'}`,
    `  Mobile    : ${lead.mobile_number || 'N/A'}`,
    `  Priority  : ${lead.priority || 'N/A'}`,
    `  Lead ID   : ${lead.lead_id || 'N/A'}`,
    ``,
    `View Lead: ${leadUrl}`,
    ``,
    `Best regards,`,
    `CRM System`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:8px;">
      <h2 style="color:#1e3a5f;margin-bottom:8px;">New Lead Assigned</h2>
      <p style="color:#374151;">Hello <strong>${recipientName}</strong>,</p>
      <p style="color:#374151;">A new lead has been assigned to you by <strong>${assignedByName || 'Admin'}</strong>.</p>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin:16px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#6b7280;width:120px;">Company</td><td style="padding:6px 0;color:#111827;font-weight:600;">${lead.company_name}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Contact</td><td style="padding:6px 0;color:#111827;">${lead.contact_person || 'N/A'}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Mobile</td><td style="padding:6px 0;color:#111827;">${lead.mobile_number || 'N/A'}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Priority</td><td style="padding:6px 0;"><span style="background:${lead.priority === 'Hot' ? '#fee2e2' : lead.priority === 'Warm' ? '#fef3c7' : '#dbeafe'};color:${lead.priority === 'Hot' ? '#991b1b' : lead.priority === 'Warm' ? '#92400e' : '#1e40af'};padding:2px 10px;border-radius:9999px;font-size:13px;">${lead.priority || 'N/A'}</span></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Lead ID</td><td style="padding:6px 0;color:#111827;">${lead.lead_id || 'N/A'}</td></tr>
        </table>
      </div>
      <a href="${leadUrl}" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;margin-top:8px;">View Lead</a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">CRM System - This is an automated notification.</p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
};

const sendBulkLeadAssignedEmail = async (to, recipientName, leads, assignedByName, recipientRole) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const rolePrefix = recipientRole === 'Admin' ? '/admin' : '/marketing';
  const count = leads.length;
  const subject = `${count} Lead${count > 1 ? 's' : ''} Assigned to You`;

  const leadRows = leads.slice(0, 10).map(l =>
    `  - ${l.lead_id || 'N/A'} | ${l.company_name} | ${l.priority || 'N/A'}`
  ).join('\n');
  const extra = count > 10 ? `\n  ... and ${count - 10} more` : '';

  const text = [
    `Hello ${recipientName},`,
    ``,
    `${count} lead${count > 1 ? 's have' : ' has'} been bulk-assigned to you by ${assignedByName || 'Admin'}.`,
    ``,
    `Leads:`,
    leadRows + extra,
    ``,
    `View your leads: ${appUrl}${rolePrefix}/leads`,
    ``,
    `Best regards,`,
    `CRM System`,
  ].join('\n');

  const leadHtmlRows = leads.slice(0, 10).map(l => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;color:#111827;">${l.lead_id || 'N/A'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;color:#111827;">${l.company_name}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;"><span style="background:${l.priority === 'Hot' ? '#fee2e2' : l.priority === 'Warm' ? '#fef3c7' : '#dbeafe'};color:${l.priority === 'Hot' ? '#991b1b' : l.priority === 'Warm' ? '#92400e' : '#1e40af'};padding:2px 8px;border-radius:9999px;font-size:12px;">${l.priority || 'N/A'}</span></td>
    </tr>`).join('');
  const extraHtml = count > 10 ? `<tr><td colspan="3" style="padding:8px;color:#6b7280;font-style:italic;">... and ${count - 10} more</td></tr>` : '';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:8px;">
      <h2 style="color:#1e3a5f;">${count} Lead${count > 1 ? 's' : ''} Assigned to You</h2>
      <p style="color:#374151;">Hello <strong>${recipientName}</strong>,</p>
      <p style="color:#374151;"><strong>${count}</strong> lead${count > 1 ? 's have' : ' has'} been bulk-assigned to you by <strong>${assignedByName || 'Admin'}</strong>.</p>
      <table style="width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:6px;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;text-align:left;color:#6b7280;font-size:13px;">Lead ID</th>
            <th style="padding:8px;text-align:left;color:#6b7280;font-size:13px;">Company</th>
            <th style="padding:8px;text-align:left;color:#6b7280;font-size:13px;">Priority</th>
          </tr>
        </thead>
        <tbody>${leadHtmlRows}${extraHtml}</tbody>
      </table>
      <a href="${appUrl}${rolePrefix}/leads" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;margin-top:8px;">View My Leads</a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">CRM System - This is an automated notification.</p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
};

module.exports = { sendEmail, sendPasswordResetEmail, sendWelcomeEmail, sendDailyReminderEmail, sendLeadAssignedEmail, sendBulkLeadAssignedEmail, isValidEmail, cleanEmail };
