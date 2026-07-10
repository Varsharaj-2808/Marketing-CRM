const nodemailer = require('nodemailer');

let transporter = null;

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
    });
    console.log(`SMTP configured: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  } else {
    transporter = { sendMail: async (opts) => console.log('[EMAIL LOG]', opts) };
    console.log('SMTP not configured - emails will be logged to console');
  }
  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const t = getTransporter();
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@crm.com',
      to,
      subject,
      text,
      html,
    });
    console.log(`Email sent to ${to}: ${subject} (messageId: ${info.messageId || 'N/A'})`);
  } catch (error) {
    console.error(`Failed to send email to ${to}: ${error.message}`);
    console.log(`[FALLBACK LOG] To: ${to}, Subject: ${subject}, Body: ${text || html}`);
  }
};

const sendPasswordResetEmail = async (to, resetUrl) => {
  const subject = 'Password Reset Request - CRM';
  const text = `You requested a password reset.\n\nPlease use the following link to reset your password:\n${resetUrl}\n\nThis link will expire in ${process.env.RESET_TOKEN_EXPIRY_MINUTES || 30} minutes.\n\nIf you did not request this, please ignore this email.`;
  const html = `<p>You requested a password reset.</p><p>Please click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link will expire in ${process.env.RESET_TOKEN_EXPIRY_MINUTES || 30} minutes.</p><p>If you did not request this, please ignore this email.</p>`;

  await sendEmail({ to, subject, text, html });
};

const sendWelcomeEmail = async (to, name, employeeId, tempPassword) => {
  const loginUrl = process.env.APP_URL || 'http://localhost:3000';
  const subject = 'Welcome to CRM - Your Account Details';
  const text = `Hello ${name},\n\nYour CRM account has been created.\n\nEmployee ID: ${employeeId}\nTemporary Password: ${tempPassword}\nLogin URL: ${loginUrl}\n\nPlease log in and change your password immediately.\n\nThis is a system-generated password. Do not share it with anyone.`;
  const html = `<p>Hello ${name},</p><p>Your CRM account has been created.</p><p><strong>Employee ID:</strong> ${employeeId}</p><p><strong>Temporary Password:</strong> ${tempPassword}</p><p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p><p>Please log in and change your password immediately.</p><p><em>This is a system-generated password. Do not share it with anyone.</em></p>`;

  await sendEmail({ to, subject, text, html });
};

const sendDailyReminderEmail = async (to, name, companyName, priority) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const subject = `Reminder: Follow-up Due Today - ${companyName}`;
  const text = `Hello ${name},\n\nThis is a reminder that a follow-up is due today for ${companyName} (Priority: ${priority}).\n\nPlease log in to your CRM dashboard to view and manage this lead: ${appUrl}\n\nBest regards,\nCRM System`;
  const html = `<p>Hello ${name},</p><p>This is a reminder that a follow-up is due <strong>today</strong> for <strong>${companyName}</strong> (Priority: ${priority}).</p><p>Please <a href="${appUrl}">log in to your CRM dashboard</a> to view and manage this lead.</p><br><p>Best regards,<br>CRM System</p>`;

  await sendEmail({ to, subject, text, html });
};

module.exports = { sendEmail, sendPasswordResetEmail, sendWelcomeEmail, sendDailyReminderEmail };
