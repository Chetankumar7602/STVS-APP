const DEFAULT_ALLOWED_ADMIN_EMAILS = [
  'subudendrateerthavidyasamste@gmail.com',
  'chetankumar7602@gmail.com',
];

export function getAllowedAdminEmails() {
  const fromEnv = String(process.env.AUTH_ALLOWED_ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const source = fromEnv.length > 0 ? fromEnv : DEFAULT_ALLOWED_ADMIN_EMAILS;
  return Array.from(new Set(source));
}

export function isAllowedAdminEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;
  return getAllowedAdminEmails().includes(normalized);
}
