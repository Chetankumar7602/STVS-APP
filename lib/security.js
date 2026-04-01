import crypto from 'crypto';

const PASSWORD_POLICY = {
  minLength: 12,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  symbol: /[^A-Za-z0-9]/,
};

export function validatePasswordPolicy(password) {
  const value = String(password || '');
  const errors = [];

  if (value.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long.`);
  }
  if (!PASSWORD_POLICY.uppercase.test(value)) {
    errors.push('Password must include at least one uppercase letter.');
  }
  if (!PASSWORD_POLICY.lowercase.test(value)) {
    errors.push('Password must include at least one lowercase letter.');
  }
  if (!PASSWORD_POLICY.number.test(value)) {
    errors.push('Password must include at least one number.');
  }
  if (!PASSWORD_POLICY.symbol.test(value)) {
    errors.push('Password must include at least one symbol.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function sanitizeIdentifier(input, maxLength = 64) {
  return String(input || '')
    .trim()
    .slice(0, maxLength)
    .replace(/[^\w@.+-]/g, '');
}

export function sanitizeOtp(input) {
  return String(input || '')
    .trim()
    .replace(/[^\d]/g, '')
    .slice(0, 8);
}

export function hashValue(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

export function randomNumericCode(length = 6) {
  const max = 10 ** length;
  const code = crypto.randomInt(0, max);
  return code.toString().padStart(length, '0');
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function getRequestMeta(request) {
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const realIp = request.headers.get('x-real-ip') || '';
  const ip = forwardedFor.split(',')[0]?.trim() || realIp || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { ip, userAgent };
}
