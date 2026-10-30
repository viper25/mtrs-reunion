import type { Registration, RegistrationInput, RegistrationStats } from '../../shared/model';
import { PLANS } from '../../shared/model';
import { authenticateAdmin, makeManagementToken, managementHash, sha256 } from './auth';
import { assertSameOrigin, errorResponse, HttpError, json, readBody, secureResponse, type Env } from './types';
import { requireVersion, validateRegistration } from './validation';

interface RegistrationRow {
  id: string;
  email: string;
  data: string;
  status: 'confirmed' | 'cancelled';
  version: number;
  management_hash: string;
  created_at: string;
  updated_at: string;
}

function publicRegistration(row: RegistrationRow): Registration {
  return { ...(JSON.parse(row.data) as RegistrationInput), email: row.email, id: row.id, status: row.status,
    version: row.version, createdAt: row.created_at, updatedAt: row.updated_at };
}

async function registrationOpen(db: D1Database): Promise<boolean> {
  const settings = await db.prepare('SELECT registration_open FROM event_settings WHERE id = 1').first<{ registration_open: number }>();
  if (!settings) throw new HttpError(503, 'DATABASE_NOT_READY', 'Registration is being prepared. Please try again shortly.');
  return settings.registration_open === 1;
}

function closed(): HttpError {
  return new HttpError(403, 'REGISTRATION_CLOSED', 'Registration and RSVP changes are currently closed. You can still cancel an existing RSVP or contact the organizers.');
}

function conflict(): HttpError {
  return new HttpError(409, 'VERSION_CONFLICT', 'This RSVP has changed since you opened it. Refresh the page before saving again.');
}

function duplicate(): HttpError {
  return new HttpError(409, 'EMAIL_REGISTERED', 'This email already has an RSVP. Open your saved private management link to make changes, or contact an organizer for help.');
}

function isEmailConflict(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed: registrations\.email/i.test(error.message);
}

function brochureUrl(value?: string): string | null {
  const url = (value || '').trim();
  if (/^\/(?!\/)[^\\\u0000-\u0020]*$/.test(url)) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : null;
  } catch { return null; }
}

async function rateLimitCreate(request: Request, db: D1Database): Promise<void> {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const key = await sha256(`registration-create:${new URL(request.url).hostname}:${ip}`);
  const windowStart = Math.floor(Date.now() / 60_000) * 60;
  const result = await db.prepare(`INSERT INTO rate_limits (key, window_start, attempts) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET
      attempts = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.attempts + 1 ELSE 1 END,
      window_start = excluded.window_start
    RETURNING attempts`).bind(key, windowStart).first<{ attempts: number }>();
  if (!result || result.attempts > 10) throw new HttpError(429, 'RATE_LIMITED', 'Too many registration attempts. Please wait a minute and try again.');
  // A small bounded cleanup keeps old rate-limit rows from accumulating indefinitely.
  await db.prepare('DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE window_start < ? LIMIT 100)').bind(windowStart - 3600).run();
}

async function createRegistration(request: Request, env: Env): Promise<Response> {
  await rateLimitCreate(request, env.DB);
  const source = await readBody(request);
  if (source.website !== undefined && source.website !== '') throw new HttpError(400, 'FORM_REJECTED', 'We could not accept this submission. Please try again.');
  if (!(await registrationOpen(env.DB))) throw closed();
  const input = validateRegistration(source);
  const token = makeManagementToken();
  const hash = await sha256(token);
  const now = new Date().toISOString();
  let row: RegistrationRow | null;
  try {
    // INSERT and the open-state check occur in one SQLite statement. UNIQUE(email) arbitrates concurrent submits.
    row = await env.DB.prepare(`INSERT INTO registrations (id,email,data,status,version,management_hash,created_at,updated_at)
      SELECT ?, ?, ?, 'confirmed', 1, ?, ?, ? WHERE EXISTS (SELECT 1 FROM event_settings WHERE id = 1 AND registration_open = 1)
      RETURNING *`).bind(crypto.randomUUID(), input.email, JSON.stringify(input), hash, now, now).first<RegistrationRow>();
  } catch (error) {
    if (isEmailConflict(error)) throw duplicate();
    throw error;
  }
  if (!row) throw closed();
  return json({ registration: publicRegistration(row), managementToken: token }, 201);
}

async function managedRegistration(request: Request, env: Env): Promise<RegistrationRow> {
  const hash = await managementHash(request);
  const row = await env.DB.prepare('SELECT * FROM registrations WHERE management_hash = ?').bind(hash).first<RegistrationRow>();
  if (!row) throw new HttpError(401, 'MANAGEMENT_UNAUTHORIZED', 'This private link is invalid or has been replaced. Contact an organizer if you need a new link.');
  return row;
}

async function getManage(request: Request, env: Env): Promise<Response> {
  const row = await managedRegistration(request, env);
  return json({ registration: publicRegistration(row), registrationOpen: await registrationOpen(env.DB) });
}

async function putManage(request: Request, env: Env): Promise<Response> {
  const row = await managedRegistration(request, env);
  if (!(await registrationOpen(env.DB))) throw closed();
  const source = await readBody(request);
  const version = requireVersion(source.version);
  const input = validateRegistration(source);
  if (input.email !== row.email) throw new HttpError(422, 'EMAIL_IMMUTABLE', 'Contact an organizer to change the email address on your RSVP.', { email: 'Your RSVP email cannot be changed here.' });
  const updated = await env.DB.prepare(`UPDATE registrations SET data = ?, status = 'confirmed', version = version + 1, updated_at = ?
    WHERE id = ? AND management_hash = ? AND version = ?
    AND EXISTS (SELECT 1 FROM event_settings WHERE id = 1 AND registration_open = 1) RETURNING *`)
    .bind(JSON.stringify(input), new Date().toISOString(), row.id, row.management_hash, version).first<RegistrationRow>();
  if (!updated) {
    if (!(await registrationOpen(env.DB))) throw closed();
    throw conflict();
  }
  return json({ registration: publicRegistration(updated) });
}

async function cancelManage(request: Request, env: Env): Promise<Response> {
  const row = await managedRegistration(request, env);
  const source = await readBody(request);
  const version = requireVersion(source.version);
  const updated = await env.DB.prepare(`UPDATE registrations SET status = 'cancelled', version = version + 1, updated_at = ?
    WHERE id = ? AND management_hash = ? AND version = ? RETURNING *`)
    .bind(new Date().toISOString(), row.id, row.management_hash, version).first<RegistrationRow>();
  if (!updated) throw conflict();
  return json({ registration: publicRegistration(updated) });
}

function filters(url: URL): { clause: string; values: string[] } {
  const q = (url.searchParams.get('q') || '').trim();
  const plan = url.searchParams.get('plan') || '';
  const status = url.searchParams.get('status') || '';
  if (q.length > 100 || (plan && !(PLANS as readonly string[]).includes(plan)) || (status && status !== 'confirmed' && status !== 'cancelled')) {
    throw new HttpError(400, 'INVALID_FILTER', 'Please choose valid search filters.');
  }
  const clauses: string[] = [];
  const values: string[] = [];
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, char => `\\${char}`)}%`;
    clauses.push(`(email LIKE ? ESCAPE '\\' OR json_extract(data, '$.fullName') LIKE ? ESCAPE '\\' OR json_extract(data, '$.residence') LIKE ? ESCAPE '\\')`);
    values.push(like, like, like);
  }
  if (plan) { clauses.push("json_extract(data, '$.plan') = ?"); values.push(plan); }
  if (status) { clauses.push('status = ?'); values.push(status); }
  return { clause: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', values };
}

async function stats(db: D1Database): Promise<RegistrationStats> {
  const row = await db.prepare(`SELECT
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) AS confirmed,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled,
    COUNT(CASE WHEN status = 'confirmed' AND json_extract(data,'$.plan') = '2_night' THEN 1 END) AS twoNight,
    COUNT(CASE WHEN status = 'confirmed' AND json_extract(data,'$.plan') = '1_night' THEN 1 END) AS oneNight,
    COUNT(CASE WHEN status = 'confirmed' AND json_extract(data,'$.plan') = 'day_attendee' THEN 1 END) AS dayAttendee,
    COUNT(CASE WHEN status = 'confirmed' AND json_extract(data,'$.occupancy') = 'single' THEN 1 END) AS roomsSingle,
    COUNT(CASE WHEN status = 'confirmed' AND json_extract(data,'$.occupancy') = 'twin' THEN 1 END) AS roomsTwin,
    COUNT(CASE WHEN status = 'confirmed' AND json_extract(data,'$.flying') = 1 THEN 1 END) AS flying,
    COUNT(CASE WHEN status = 'confirmed' AND json_extract(data,'$.transfer') = 1 THEN 1 END) AS transfer
    FROM registrations`).first<RegistrationStats>();
  if (!row) throw new HttpError(503, 'DATABASE_NOT_READY', 'The registration database is not ready.');
  return row;
}

async function listRegistrations(url: URL, env: Env): Promise<Response> {
  const filter = filters(url);
  const rawPage = url.searchParams.get('page') || '1';
  if (!/^\d{1,7}$/.test(rawPage) || Number(rawPage) < 1) throw new HttpError(400, 'INVALID_PAGE', 'Please choose a valid results page.');
  const page = Number(rawPage);
  const pageSize = 50;
  const [rows, count, totals] = await Promise.all([
    env.DB.prepare(`SELECT * FROM registrations${filter.clause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`).bind(...filter.values, pageSize, (page - 1) * pageSize).all<RegistrationRow>(),
    env.DB.prepare(`SELECT COUNT(*) AS total FROM registrations${filter.clause}`).bind(...filter.values).first<{ total: number }>(),
    stats(env.DB),
  ]);
  return json({ registrations: rows.results.map(publicRegistration), total: count?.total || 0, page, pageSize, stats: totals });
}

export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  // Spreadsheet formulas may begin after whitespace; protect all user-controlled cells.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

async function exportRegistrations(url: URL, env: Env): Promise<Response> {
  const filter = filters(url);
  const rows = await env.DB.prepare(`SELECT * FROM registrations${filter.clause} ORDER BY created_at DESC, id DESC`).bind(...filter.values).all<RegistrationRow>();
  const columns: (keyof Registration)[] = ['id','status','fullName','email','phone','residence','plan','occupancy','roommate','diet','allergies','shirt','flying','arrival','departure','transfer','notes','createdAt','updatedAt'];
  const csv = '\uFEFF' + [columns.map(csvCell).join(','), ...rows.results.map(row => {
    const registration = publicRegistration(row);
    return columns.map(column => csvCell(registration[column])).join(',');
  })].join('\r\n');
  return secureResponse(new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="mtrs-reunion-rsvps.csv"' } }));
}

async function adminUpdate(request: Request, env: Env, id: string): Promise<Response> {
  const source = await readBody(request);
  const input = validateRegistration(source);
  const version = requireVersion(source.version);
  if (source.status !== 'confirmed' && source.status !== 'cancelled') throw new HttpError(422, 'INVALID_STATUS', 'Please select a valid RSVP status.');
  let row: RegistrationRow | null;
  try {
    row = await env.DB.prepare(`UPDATE registrations SET email = ?, data = ?, status = ?, version = version + 1, updated_at = ?
      WHERE id = ? AND version = ? RETURNING *`).bind(input.email, JSON.stringify(input), source.status, new Date().toISOString(), id, version).first<RegistrationRow>();
  } catch (error) {
    if (isEmailConflict(error)) throw duplicate();
    throw error;
  }
  if (!row) {
    const exists = await env.DB.prepare('SELECT id FROM registrations WHERE id = ?').bind(id).first();
    if (!exists) throw new HttpError(404, 'NOT_FOUND', 'This RSVP could not be found.');
    throw conflict();
  }
  return json({ registration: publicRegistration(row) });
}

async function adminLink(env: Env, id: string): Promise<Response> {
  const token = makeManagementToken();
  const row = await env.DB.prepare(`UPDATE registrations SET management_hash = ?, version = version + 1, updated_at = ? WHERE id = ? RETURNING id`)
    .bind(await sha256(token), new Date().toISOString(), id).first();
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'This RSVP could not be found.');
  return json({ managementToken: token });
}

function methodNotAllowed(allow: string): Response {
  return json({ error: 'This request method is not supported.', code: 'METHOD_NOT_ALLOWED' }, 405, { Allow: allow });
}

export async function handleApi(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');
    const method = request.method.toUpperCase();
    if (!['GET', 'POST', 'PUT', 'PATCH'].includes(method)) return methodNotAllowed('GET, POST, PUT, PATCH');
    if (method !== 'GET') assertSameOrigin(request);
    if (!env.DB) throw new HttpError(503, 'DATABASE_NOT_READY', 'The registration database is not connected yet.');
    if (path === '/api/event') {
      if (method !== 'GET') return methodNotAllowed('GET');
      return json({ registrationOpen: await registrationOpen(env.DB), contactEmail: env.CONTACT_EMAIL || null,
        contactWhatsApp: env.CONTACT_WHATSAPP || null, brochureUrl: brochureUrl(env.BROCHURE_URL) });
    }
    if (path === '/api/registrations') return method === 'POST' ? await createRegistration(request, env) : methodNotAllowed('POST');
    if (path === '/api/manage') {
      if (method === 'GET') return await getManage(request, env);
      if (method === 'PUT') return await putManage(request, env);
      return methodNotAllowed('GET, PUT');
    }
    if (path === '/api/manage/cancel') return method === 'POST' ? await cancelManage(request, env) : methodNotAllowed('POST');
    if (path === '/api/admin' || path.startsWith('/api/admin/')) {
      const email = await authenticateAdmin(request, env);
      if (path === '/api/admin/session') return method === 'GET' ? json({ email }) : methodNotAllowed('GET');
      if (path === '/api/admin/settings') {
        if (method === 'GET') return json({ registrationOpen: await registrationOpen(env.DB) });
        if (method !== 'PATCH') return methodNotAllowed('GET, PATCH');
        const source = await readBody(request);
        if (typeof source.registrationOpen !== 'boolean') throw new HttpError(422, 'VALIDATION_ERROR', 'Please specify whether registration is open.');
        await env.DB.prepare('UPDATE event_settings SET registration_open = ? WHERE id = 1').bind(source.registrationOpen ? 1 : 0).run();
        return json({ registrationOpen: source.registrationOpen });
      }
      if (path === '/api/admin/registrations') return method === 'GET' ? await listRegistrations(url, env) : methodNotAllowed('GET');
      if (path === '/api/admin/export') return method === 'GET' ? await exportRegistrations(url, env) : methodNotAllowed('GET');
      const match = /^\/api\/admin\/registrations\/([a-f0-9-]{36})(\/link)?$/.exec(path);
      if (match) {
        if (match[2]) return method === 'POST' ? await adminLink(env, match[1]) : methodNotAllowed('POST');
        return method === 'PUT' ? await adminUpdate(request, env, match[1]) : methodNotAllowed('PUT');
      }
    }
    throw new HttpError(404, 'NOT_FOUND', 'This API endpoint could not be found.');
  } catch (error) {
    return errorResponse(error);
  }
}
