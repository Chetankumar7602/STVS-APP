import { URL } from 'url';

export function getPasskeyConfig(requestUrl = '') {
  const fallbackOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const expectedOrigin = process.env.AUTH_WEBAUTHN_ORIGIN || fallbackOrigin;
  const fromEnvRpId = process.env.AUTH_WEBAUTHN_RP_ID;
  const parsed = new URL(requestUrl || expectedOrigin);
  const rpID = fromEnvRpId || parsed.hostname;
  const rpName = process.env.AUTH_WEBAUTHN_RP_NAME || 'STVS Admin Portal';

  return { rpID, expectedOrigin, rpName };
}
