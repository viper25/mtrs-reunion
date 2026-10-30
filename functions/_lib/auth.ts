import { createRemoteJWKSet, jwtVerify } from 'jose';
import { HttpError, type Env } from './types';

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function authenticateAdmin(request: Request, env: Env): Promise<string> {
  const host = new URL(request.url).hostname;
  if (env.LOCAL_DEV_AUTH === 'true' && (host === 'localhost' || host === '127.0.0.1') && !request.headers.has('CF-Ray')) {
    return (env.DEV_ADMIN_EMAIL || 'organizer@example.test').trim().toLowerCase();
  }
  const team = (env.ACCESS_TEAM_DOMAIN || '').trim().toLowerCase();
  const audience = (env.ACCESS_AUD || '').trim();
  const emails = (env.ADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.cloudflareaccess\.com$/.test(team) || !audience || !emails.length) {
    throw new HttpError(503, 'ADMIN_NOT_CONFIGURED', 'Organizer access has not been configured yet.');
  }
  const assertion = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!assertion || assertion.length > 16_384) throw new HttpError(401, 'ADMIN_UNAUTHORIZED', 'Please sign in through the organizer access portal.');
  const issuer = `https://${team}`;
  let keySet = jwksCache.get(team);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    jwksCache.set(team, keySet);
  }
  try {
    const { payload } = await jwtVerify(assertion, keySet, { issuer, audience, algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'email'] });
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    if (!email || !emails.includes(email)) throw new HttpError(403, 'ADMIN_FORBIDDEN', 'This account is not on the organizer access list.');
    return email;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, 'ADMIN_UNAUTHORIZED', 'Your organizer session is invalid or expired. Please sign in again.');
  }
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function makeManagementToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function managementHash(request: Request): Promise<string> {
  const authorization = request.headers.get('Authorization') || '';
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization);
  if (!match) throw new HttpError(401, 'MANAGEMENT_UNAUTHORIZED', 'Please open your saved private management link, or contact an organizer.');
  return sha256(match[1]);
}
