import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { handleApi } from '../functions/_lib/api';
import { authenticateAdmin, sha256 } from '../functions/_lib/auth';
import { HttpError, type Env } from '../functions/_lib/types';
import { validateRegistration } from '../functions/_lib/validation';
import { onRequest as middleware } from '../functions/_middleware';
import type { Registration, RegistrationInput, RegistrationList } from '../shared/model';

const origin = 'http://localhost:8788';
const example: RegistrationInput = {
  fullName: 'Asha Kumar', email: 'asha@example.test', phone: '+91 98765 43210', residence: 'Singapore',
  plan: '2_night', occupancy: 'twin', roommate: 'A batchmate', diet: 'Veg', allergies: '', shirt: 'M',
  flying: true, arrival: '6 August afternoon', departure: '8 August evening', transfer: true, notes: '',
};

function fixture(t: TestContext, extra: Partial<Env> = {}) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(resolve(import.meta.dirname, '../schema.sql'), 'utf8'));
  t.after(() => sqlite.close());
  const adapter = {
    prepare(sql: string) {
      let args: (string | number | null)[] = [];
      const prepared = {
        bind(...values: (string | number | null)[]) { args = values; return prepared; },
        async first(column?: string) {
          const row = sqlite.prepare(sql).get(...args) || null;
          return column && row ? row[column] : row;
        },
        async all() { return { results: sqlite.prepare(sql).all(...args), success: true, meta: {} }; },
        async run() { const result = sqlite.prepare(sql).run(...args); return { results: [], success: true, meta: { changes: Number(result.changes) } }; },
      };
      return prepared;
    },
  };
  const env: Env = { DB: adapter as unknown as D1Database, LOCAL_DEV_AUTH: 'true', ...extra };
  return { sqlite, env };
}

function request(path: string, method = 'GET', body?: unknown, token?: string, headers: HeadersInit = {}) {
  const all = new Headers(headers);
  if (method !== 'GET') { if (!all.has('Origin')) all.set('Origin', origin); all.set('Content-Type', 'application/json'); }
  if (token) all.set('Authorization', `Bearer ${token}`);
  return new Request(`${origin}${path}`, { method, headers: all, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

async function create(env: Env, input: Partial<RegistrationInput> = {}) {
  const response = await handleApi(request('/api/registrations', 'POST', { ...example, ...input }), env);
  assert.equal(response.status, 201, await response.clone().text());
  return await response.json() as { registration: Registration; managementToken: string };
}

test('validation clears hidden values and rejects malformed visible fields', () => {
  const result = validateRegistration({ ...example, plan: 'day_attendee', occupancy: 'invented', roommate: 'ignored', flying: false, arrival: 'ignored', transfer: 'ignored', allergies: 'ignored' });
  assert.equal(result.occupancy, ''); assert.equal(result.roommate, ''); assert.equal(result.arrival, '');
  assert.equal(result.transfer, false); assert.equal(result.allergies, '');
  assert.throws(() => validateRegistration({ ...example, phone: '9876543210', notes: 'a'.repeat(2001), occupancy: '' }), (error: unknown) => {
    assert.ok(error instanceof HttpError); assert.equal(error.status, 422);
    assert.ok(error.fields?.phone); assert.ok(error.fields?.notes); assert.ok(error.fields?.occupancy); return true;
  });
});

test('creation returns structured validation errors rather than a rejected handler promise', async t => {
  const { env, sqlite } = fixture(t);
  const response = await handleApi(request('/api/registrations', 'POST', { ...example, email: 'not an email', phone: '123' }), env);
  assert.equal(response.status, 422);
  const payload = await response.json() as { code: string; fields: Record<string, string> };
  assert.equal(payload.code, 'VALIDATION_ERROR');
  assert.ok(payload.fields.email); assert.ok(payload.fields.phone);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM registrations').get()!.count, 0);
  assert.match(response.headers.get('Content-Security-Policy')!, /frame-ancestors 'none'/);
});

test('event exposes safe configured brochure paths and leaves unconfigured contacts empty', async t => {
  const { env } = fixture(t);
  for (const [configured, expected] of [['/assets/venue-brochure.pdf', '/assets/venue-brochure.pdf'], ['https://hotel.example.test/brochure.pdf', 'https://hotel.example.test/brochure.pdf'], ['//evil.example.test/file.pdf', null], ['/\\evil.example.test/file.pdf', null], ['javascript:alert(1)', null]] as const) {
    const response = await handleApi(request('/api/event'), { ...env, BROCHURE_URL: configured });
    const settings = await response.json() as { brochureUrl: string | null; contactEmail: string | null; contactWhatsApp: string | null };
    assert.equal(settings.brochureUrl, expected);
    assert.equal(settings.contactEmail, null); assert.equal(settings.contactWhatsApp, null);
  }
});

test('creation normalizes email, returns a private token once, and uniquely arbitrates duplicate submits', async t => {
  const { sqlite, env } = fixture(t);
  const responses = await Promise.all([
    handleApi(request('/api/registrations', 'POST', { ...example, email: '  ASHA@EXAMPLE.TEST ' }), env),
    handleApi(request('/api/registrations', 'POST', example), env),
  ]);
  assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
  const created = await responses.find(response => response.status === 201)!.json() as { registration: Registration; managementToken: string };
  assert.equal(created.registration.email, example.email);
  assert.match(created.managementToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal('management_hash' in created.registration, false);
  const row = sqlite.prepare('SELECT * FROM registrations').get()!;
  assert.equal(row.management_hash, await sha256(created.managementToken));
  assert.equal(JSON.stringify(row).includes(created.managementToken), false);
  const manage = await handleApi(request('/api/manage', 'GET', undefined, created.managementToken), env);
  assert.equal(manage.status, 200);
  assert.equal(JSON.stringify(await manage.json()).includes(created.managementToken), false);
  assert.match(manage.headers.get('Cache-Control')!, /no-store/);
  assert.equal(manage.headers.get('Referrer-Policy'), 'no-referrer');
  assert.equal(manage.headers.get('X-Robots-Tag'), 'noindex, nofollow');
});

test('management requires bearer authorization and GET never changes registration state', async t => {
  const { env, sqlite } = fixture(t);
  const created = await create(env);
  const before = sqlite.prepare('SELECT version, status FROM registrations').get();
  assert.equal((await handleApi(request(`/api/manage?token=${created.managementToken}`), env)).status, 401);
  assert.equal((await handleApi(request('/api/manage', 'GET', undefined, 'x'.repeat(43)), env)).status, 401);
  assert.equal((await handleApi(request('/api/manage', 'GET', undefined, created.managementToken), env)).status, 200);
  assert.deepEqual(sqlite.prepare('SELECT version, status FROM registrations').get(), before);
});

test('self-service uses optimistic versions, immutable email, and reconfirms cancelled RSVPs', async t => {
  const { env } = fixture(t);
  const { managementToken: token } = await create(env);
  const update = await handleApi(request('/api/manage', 'PUT', { ...example, notes: 'See you there', version: 1 }, token), env);
  assert.equal(update.status, 200);
  assert.equal((await update.json() as { registration: Registration }).registration.version, 2);
  assert.equal((await handleApi(request('/api/manage', 'PUT', { ...example, version: 1 }, token), env)).status, 409);
  const badEmail = await handleApi(request('/api/manage', 'PUT', { ...example, email: 'different@example.test', version: 2 }, token), env);
  assert.equal(badEmail.status, 422);
  const cancelled = await handleApi(request('/api/manage/cancel', 'POST', { version: 2 }, token), env);
  assert.equal((await cancelled.json() as { registration: Registration }).registration.status, 'cancelled');
  const reconfirmed = await handleApi(request('/api/manage', 'PUT', { ...example, version: 3 }, token), env);
  assert.equal((await reconfirmed.json() as { registration: Registration }).registration.status, 'confirmed');
});

test('closed registration blocks creation and edits while allowing cancellation and organizer changes', async t => {
  const { env } = fixture(t);
  const created = await create(env);
  assert.equal((await handleApi(request('/api/admin/settings', 'PATCH', { registrationOpen: false }), env)).status, 200);
  const event = await handleApi(request('/api/event'), env);
  assert.equal((await event.json() as { registrationOpen: boolean }).registrationOpen, false);
  assert.equal((await handleApi(request('/api/registrations', 'POST', { ...example, email: 'new@example.test' }), env)).status, 403);
  assert.equal((await handleApi(request('/api/manage', 'PUT', { ...example, version: 1 }, created.managementToken), env)).status, 403);
  const cancel = await handleApi(request('/api/manage/cancel', 'POST', { version: 1 }, created.managementToken), env);
  assert.equal(cancel.status, 200);
  const edit = await handleApi(request(`/api/admin/registrations/${created.registration.id}`, 'PUT', { ...example, version: 2, status: 'confirmed' }), env);
  assert.equal(edit.status, 200);
  assert.equal((await handleApi(request('/api/admin/settings', 'PATCH', { registrationOpen: true }), env)).status, 200);
});

test('organizer filtering, global confirmed statistics, and CSV protect data and spreadsheet cells', async t => {
  const { env } = fixture(t);
  await create(env, { fullName: '=HYPERLINK("https://example.test")', notes: '  +malicious formula' });
  const day = await create(env, { email: 'day@example.test', plan: 'day_attendee', flying: false });
  await handleApi(request('/api/manage/cancel', 'POST', { version: 1 }, day.managementToken), env);
  const listResponse = await handleApi(request('/api/admin/registrations?status=cancelled'), env);
  const list = await listResponse.json() as RegistrationList;
  assert.equal(list.total, 1); assert.equal(list.pageSize, 50); assert.equal(list.registrations[0].email, 'day@example.test');
  assert.deepEqual(list.stats, { confirmed: 1, cancelled: 1, twoNight: 1, oneNight: 0, dayAttendee: 0, roomsSingle: 0, roomsTwin: 1, flying: 1, transfer: 1 });
  assert.equal((await handleApi(request('/api/admin/registrations?q=%27%20OR%201%3D1--'), env)).status, 200);
  const literal = await handleApi(request('/api/admin/registrations?q=%25'), env);
  assert.equal((await literal.json() as RegistrationList).total, 0);
  const csvResponse = await handleApi(request('/api/admin/export?status=confirmed'), env);
  const csv = await csvResponse.text();
  assert.match(csv, /'=?HYPERLINK/); assert.match(csv, /'\+91/); assert.match(csv, /'\+malicious/);
  assert.equal(csv.includes('day@example.test'), false); assert.equal(csv.includes('management'), false);
  assert.match(csvResponse.headers.get('Cache-Control')!, /no-store/);
});

test('organizer link rotation revokes old links and stale edits', async t => {
  const { env } = fixture(t);
  const created = await create(env);
  const link = await handleApi(request(`/api/admin/registrations/${created.registration.id}/link`, 'POST', {}), env);
  assert.equal(link.status, 200);
  const next = await link.json() as { managementToken: string };
  assert.notEqual(next.managementToken, created.managementToken);
  assert.equal((await handleApi(request('/api/manage', 'GET', undefined, created.managementToken), env)).status, 401);
  assert.equal((await handleApi(request('/api/manage', 'GET', undefined, next.managementToken), env)).status, 200);
  assert.equal((await handleApi(request(`/api/admin/registrations/${created.registration.id}`, 'PUT', { ...example, version: 1, status: 'confirmed' }), env)).status, 409);
});

test('same-origin enforcement, honeypot, streaming body limits, and atomic creation rate limit', async t => {
  const { env, sqlite } = fixture(t);
  assert.equal((await handleApi(request('/api/registrations', 'POST', example, undefined, { Origin: 'https://evil.test' }), env)).status, 403);
  assert.equal((await handleApi(new Request(`${origin}/api/registrations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(example) }), env)).status, 403);
  assert.equal((await handleApi(request('/api/registrations', 'POST', { ...example, website: 'bot' }), env)).status, 400);
  const tooLarge = await handleApi(request('/api/registrations', 'POST', { ...example, notes: 'a'.repeat(17_000) }), env);
  assert.equal(tooLarge.status, 413);
  sqlite.exec('DELETE FROM rate_limits');
  const attempts = await Promise.all(Array.from({ length: 11 }, (_, i) => handleApi(request('/api/registrations', 'POST', { ...example, email: `person${i}@example.test` }), env)));
  assert.equal(attempts.filter(response => response.status === 201).length, 10);
  const limited = attempts.find(response => response.status === 429)!;
  assert.equal(limited.headers.get('Retry-After'), '60');
  const rateRow = sqlite.prepare('SELECT key, attempts FROM rate_limits').get()!;
  assert.match(rateRow.key as string, /^[a-f0-9]{64}$/); assert.equal(rateRow.attempts, 11);
});

test('admin fails closed, ignores identity headers, and restricts local bypass to non-edge localhost', async t => {
  const { env } = fixture(t, { LOCAL_DEV_AUTH: undefined });
  const unconfigured = await handleApi(request('/api/admin/session'), env);
  assert.equal(unconfigured.status, 503);
  const configured = { ...env, ACCESS_TEAM_DOMAIN: 'reunion.cloudflareaccess.com', ACCESS_AUD: 'audience', ADMIN_EMAILS: 'organizer@example.test' };
  assert.equal((await handleApi(request('/api/admin/session', 'GET', undefined, undefined, { 'Cf-Access-Authenticated-User-Email': 'organizer@example.test' }), configured)).status, 401);
  assert.equal((await handleApi(request('/api/admin/session', 'GET', undefined, undefined, { 'CF-Ray': 'edge' }), { ...env, LOCAL_DEV_AUTH: 'true' })).status, 503);
  await assert.rejects(authenticateAdmin(new Request('https://reunion.test/admin'), { ...env, LOCAL_DEV_AUTH: 'true' }), (error: unknown) => error instanceof HttpError && error.status === 503);
  let continued = false;
  const response = await (middleware as (context: unknown) => Promise<Response>)({ request: request('/admin/index.html'), env, data: {}, next: async () => { continued = true; return new Response('secret dashboard'); } });
  assert.equal(response.status, 503); assert.equal(continued, false);
});

test('Cloudflare Access verifies signing key, issuer, audience, expiry, and the organizer allowlist', async t => {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  const key = await exportJWK(publicKey);
  key.kid = 'test-key'; key.alg = 'RS256'; key.use = 'sig';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: string | URL | Request) => {
    assert.equal(String(input), 'https://jwt-tests.cloudflareaccess.com/cdn-cgi/access/certs');
    return new Response(JSON.stringify({ keys: [key] }), { headers: { 'Content-Type': 'application/json' } });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const { env } = fixture(t, { LOCAL_DEV_AUTH: undefined, ACCESS_TEAM_DOMAIN: 'jwt-tests.cloudflareaccess.com', ACCESS_AUD: 'reunion-audience', ADMIN_EMAILS: 'organizer@example.test' });
  const token = (claims: { email?: string; issuer?: string; audience?: string; expired?: boolean } = {}) => new SignJWT({ email: claims.email || 'organizer@example.test' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuer(claims.issuer || 'https://jwt-tests.cloudflareaccess.com')
    .setAudience(claims.audience || 'reunion-audience').setIssuedAt().setExpirationTime(claims.expired ? Math.floor(Date.now() / 1000) - 60 : '5m').sign(privateKey);
  const signedRequest = async (claims = {}) => request('/api/admin/session', 'GET', undefined, undefined, { 'Cf-Access-Jwt-Assertion': await token(claims) });
  assert.equal((await handleApi(await signedRequest(), env)).status, 200);
  assert.equal((await handleApi(await signedRequest({ issuer: 'https://wrong.cloudflareaccess.com' }), env)).status, 401);
  assert.equal((await handleApi(await signedRequest({ audience: 'wrong' }), env)).status, 401);
  assert.equal((await handleApi(await signedRequest({ expired: true }), env)).status, 401);
  assert.equal((await handleApi(await signedRequest({ email: 'outsider@example.test' }), env)).status, 403);
});
