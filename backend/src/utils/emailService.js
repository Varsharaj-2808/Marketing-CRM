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

module.exports = { sendEmail, sendPasswordResetEmail };
