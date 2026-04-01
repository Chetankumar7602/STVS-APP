import connectToDatabase from '@/lib/db';
import { sendMail } from '@/lib/email';
import SecurityEvent from '@/models/SecurityEvent';

const ALERT_LEVELS = new Set(['high', 'critical']);

export async function logSecurityEvent({
  type,
  severity = 'medium',
  username = '',
  userId = null,
  ip = '',
  userAgent = '',
  details = {},
}) {
  try {
    await connectToDatabase();
    const event = await SecurityEvent.create({
      type,
      severity,
      username,
      userId,
      ip,
      userAgent,
      details,
    });

    if (ALERT_LEVELS.has(severity) && process.env.ADMIN_ALERT_EMAIL) {
      const subject = `[Security Alert] ${type}`;
      const html = `
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Severity:</strong> ${severity}</p>
        <p><strong>User:</strong> ${username || 'Unknown'}</p>
        <p><strong>IP:</strong> ${ip || 'Unknown'}</p>
        <p><strong>User-Agent:</strong> ${userAgent || 'Unknown'}</p>
        <p><strong>Details:</strong> <pre>${JSON.stringify(details, null, 2)}</pre></p>
      `;
      await sendMail({ to: process.env.ADMIN_ALERT_EMAIL, subject, html });
    }

    return event;
  } catch (error) {
    console.error('Failed to log security event:', error);
    return null;
  }
}
