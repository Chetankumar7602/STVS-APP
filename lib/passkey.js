import { URL } from 'url';

export function getPasskeyConfig(requestUrl = '') {
  const fromEnvRpId = process.env.AUTH_WEBAUTHN_RP_ID;
  const fromEnvOrigin = process.env.AUTH_WEBAUTHN_ORIGIN;

  // Parse the actual incoming request URL so we always match what the browser sees
  let parsed = null;
  try {
    parsed = new URL(requestUrl);
  } catch {
    parsed = new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  }

  // rpID = hostname only (e.g. "your-app.vercel.app")
  const rpID = fromEnvRpId || parsed.hostname;

  // expectedOrigin = full origin (e.g. "https://your-app.vercel.app")
  // Must match EXACTLY what the browser sees — derive from request URL, not env fallback
  const expectedOrigin = fromEnvOrigin || `${parsed.protocol}//${parsed.host}`;

  const rpName = process.env.AUTH_WEBAUTHN_RP_NAME || 'STVS Admin Portal';

  return { rpID, expectedOrigin, rpName };
}
