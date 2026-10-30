export interface Env {
  DB: D1Database;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ADMIN_EMAILS?: string;
  LOCAL_DEV_AUTH?: string;
  DEV_ADMIN_EMAIL?: string;
  CONTACT_EMAIL?: string;
  CONTACT_WHATSAPP?: string;
  BROCHURE_URL?: string;
}

export interface Data extends Record<string, unknown> {
  adminEmail?: string;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) { super(message); }
}

export function json(value: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return secureResponse(new Response(JSON.stringify(value), { status, headers }));
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return json({ error: error.message, code: error.code, ...(error.fields ? { fields: error.fields } : {}) }, error.status,
      error.status === 429 ? { 'Retry-After': '60' } : undefined);
  }
  // Never serialize database errors, requests, headers, tokens, or submitted personal information.
  return json({ error: 'We could not complete that request. Please try again shortly.', code: 'INTERNAL_ERROR' }, 500);
}

export function secureResponse(response: Response): Response {
  const safe = new Response(response.body, response);
  safe.headers.set('Cache-Control', 'private, no-store, max-age=0');
  safe.headers.set('X-Content-Type-Options', 'nosniff');
  safe.headers.set('Referrer-Policy', 'no-referrer');
  safe.headers.set('X-Frame-Options', 'DENY');
  safe.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  safe.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  safe.headers.set('X-Robots-Tag', 'noindex, nofollow');
  safe.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  return safe;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('Origin');
  if (origin !== new URL(request.url).origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    throw new HttpError(403, 'ORIGIN_REJECTED', 'Please submit this request from the reunion website.');
  }
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) {
    throw new HttpError(415, 'JSON_REQUIRED', 'Please send the form as JSON.');
  }
  const maximum = 16_384;
  if (Number(request.headers.get('Content-Length') || 0) > maximum) {
    throw new HttpError(413, 'BODY_TOO_LARGE', 'This form is too large. Please shorten the notes.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'INVALID_JSON', 'The form could not be read. Please try again.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > maximum) {
      await reader.cancel();
      throw new HttpError(413, 'BODY_TOO_LARGE', 'This form is too large. Please shorten the notes.');
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object required');
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'The form could not be read. Please try again.');
  }
}
