import nodemailer from 'nodemailer';

function isEmailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASS);
}

export function createMailTransport() {
  if (!isEmailConfigured()) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASS,
    },
  });
}

export async function sendMail(options) {
  const transporter = createMailTransport();

  if (!transporter) {
    console.warn('Gmail credentials not configured. Email not sent.');
    console.log('[MOCK EMAIL]', {
      to: options.to,
      subject: options.subject,
    });
    return { mocked: true };
  }

  return transporter.sendMail(options);
}
