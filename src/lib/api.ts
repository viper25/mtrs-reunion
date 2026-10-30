import type { ApiError, EventSettings, Registration, RegistrationInput } from '../../shared/model';

export class RequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;
  constructor(status: number, body: Partial<ApiError>) {
    super(body.error || 'We could not complete that request. Please try again.');
    this.name = 'RequestError';
    this.status = status;
    this.code = body.code || 'REQUEST_FAILED';
    this.fields = body.fields || {};
  }
}

export async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...options, cache: 'no-store', headers: { Accept: 'application/json', ...options.headers } });
  } catch {
    throw new RequestError(0, { code: 'NETWORK_ERROR', error: 'We could not connect. Check your connection and try again; your details are still here.' });
  }
  let body: unknown;
  try { body = await response.json(); } catch {
    throw new RequestError(response.status, { code: 'INVALID_RESPONSE', error: 'The server could not complete this request. Please try again shortly.' });
  }
  if (!response.ok) throw new RequestError(response.status, body as Partial<ApiError>);
  return body as T;
}

export const getEvent = (): Promise<EventSettings> => requestJson('/api/event');
export const createRegistration = (input: RegistrationInput, website: string): Promise<{ registration: Registration; managementToken: string }> => requestJson('/api/registrations', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, website }),
});
export const getRegistration = (token: string): Promise<{ registration: Registration; registrationOpen: boolean }> => requestJson('/api/manage', { headers: { Authorization: `Bearer ${token}` } });
export const updateRegistration = (token: string, input: RegistrationInput, version: number): Promise<{ registration: Registration }> => requestJson('/api/manage', {
  method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...input, version }),
});
export const cancelRegistration = (token: string, version: number): Promise<{ registration: Registration }> => requestJson('/api/manage/cancel', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ version }),
});
