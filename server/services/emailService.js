const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

async function sendOtpEmail({ to, otp }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@epricetrack.com';
  const subject = 'Your password reset OTP';
  const text = `Your password reset OTP is: ${otp}\n\nThis code is valid for 5 minutes. If you did not request this, please ignore this email.`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#2B86C5;margin-bottom:16px;">Password Reset</h2>
      <p style="color:#475569;margin-bottom:16px;">Use the OTP below to reset your password:</p>
      <div style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#0f172a;background:#f1f5f9;padding:16px 24px;border-radius:8px;text-align:center;">${otp}</div>
      <p style="color:#64748b;margin-top:16px;font-size:14px;">This code expires in <strong>5 minutes</strong>.</p>
    </div>
  `;

  const transport = getTransporter();
  if (!transport) {
    console.log(`[emailService] SMTP not configured. OTP for ${to}: ${otp}`);
    return { sent: false, devMode: true };
  }

  await transport.sendMail({ from, to, subject, text, html });
  return { sent: true, devMode: false };
}

module.exports = { sendOtpEmail };
