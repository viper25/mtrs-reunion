import './admin.css';
import { DIETS, PLAN_LABELS, SHIRT_SIZES, type ApiError, type Registration, type RegistrationInput, type RegistrationList, type RegistrationStats } from '../shared/model';

const $ = <T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error('A required organizer interface element is missing.');
  return element;
};
const escape = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const attendeeDialog = $<HTMLDialogElement>('#attendee-dialog');
const confirmDialog = $<HTMLDialogElement>('#confirm-dialog');
const linkDialog = $<HTMLDialogElement>('#link-dialog');
const filterForm = $<HTMLFormElement>('#filters');
const searchInput = $<HTMLInputElement>('#search');
const planFilter = $<HTMLSelectElement>('#plan-filter');
const statusFilter = $<HTMLSelectElement>('#status-filter');
let authenticated = false;
let registrationOpen: boolean | null = null;
let registrations: Registration[] = [];
let page = 1;
let total = 0;
let pageSize = 50;
let selected: Registration | null = null;
let listController: AbortController | null = null;
let searchTimer: ReturnType<typeof setTimeout>;
let toastTimer: ReturnType<typeof setTimeout>;
let busyRecord = false;
let confirmResolve: ((value: boolean) => void) | null = null;

class RequestError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  constructor(status: number, data: Partial<ApiError>) {
    super(data.error || 'The request could not be completed. Please try again.');
    this.status = status; this.code = data.code || 'REQUEST_FAILED'; this.fields = data.fields;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('The server could not be reached. Check your connection and try again.');
  }
  const contentType = response.headers.get('content-type') || '';
  let data: unknown;
  if (contentType.includes('application/json')) {
    try { data = await response.json(); } catch { throw new Error('The server returned an unreadable response. Please try again.'); }
  } else {
    if (response.redirected || response.status === 401 || response.status === 403) {
      showAccessUnavailable();
      throw new RequestError(401, { error: 'Your protected organizer session is unavailable. Sign in through Cloudflare Access and try again.', code: 'UNAUTHORIZED' });
    }
    throw new Error('The server returned an unexpected response. Please try again.');
  }
  if (!response.ok) {
    const error = new RequestError(response.status, data as Partial<ApiError>);
    if (response.status === 401 || response.status === 403) showAccessUnavailable(error.message);
    throw error;
  }
  return data as T;
}

function showAccessUnavailable(message?: string): void {
  authenticated = false;
  listController?.abort();
  attendeeDialog.close(); linkDialog.close(); confirmDialog.close();
  selected = null; registrations = [];
  $<HTMLInputElement>('#management-link').value = '';
  $('#attendee-content').replaceChildren();
  $('#registration-rows').replaceChildren();
  $('#boot-state').hidden = true;
  $('#admin-content').hidden = true;
  $('#access-state').hidden = false;
  $('#access-message').textContent = message || 'Cloudflare Access could not verify this session. Open this dashboard through the configured Cloudflare Access address and sign in with your organizer email.';
}

function notify(message: string): void {
  const toast = $('#toast');
  clearTimeout(toastTimer); toast.textContent = message; toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; toast.textContent = ''; }, 5500);
}

function dashboardMessage(message: string, error = false): void {
  const banner = $('#dashboard-message');
  banner.textContent = message; banner.classList.toggle('error', error); banner.hidden = !message;
}

function date(value: string, withTime = false): string {
  const time = new Date(value);
  if (Number.isNaN(time.valueOf())) return 'Unavailable';
  return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' } : {}) }).format(time);
}

function filterParams(includePage = false): URLSearchParams {
  const params = new URLSearchParams();
  const q = searchInput.value.trim();
  if (q) params.set('q', q);
  if (planFilter.value) params.set('plan', planFilter.value);
  if (statusFilter.value) params.set('status', statusFilter.value);
  if (includePage) params.set('page', String(page));
  return params;
}

function updateExport(): void {
  const query = filterParams().toString();
  $<HTMLAnchorElement>('#export-csv').href = `/api/admin/export${query ? `?${query}` : ''}`;
}

function updateStats(stats: RegistrationStats): void {
  document.querySelectorAll<HTMLElement>('[data-stat]').forEach(element => {
    const key = element.dataset.stat as keyof RegistrationStats;
    element.textContent = String(stats[key]);
  });
}

function tableState(state: 'loading' | 'error' | 'empty' | 'table'): void {
  for (const name of ['loading', 'error', 'empty']) $(`#table-${name}`).hidden = state !== name;
  $('#table-wrap').hidden = state !== 'table';
  $('#pagination').hidden = state !== 'table';
  $<HTMLButtonElement>('#refresh-list').disabled = state === 'loading';
}

async function loadList(): Promise<void> {
  if (!authenticated) return;
  listController?.abort();
  const controller = new AbortController(); listController = controller;
  tableState('loading'); updateExport();
  $('#results-count').textContent = 'Loading RSVPs…';
  try {
    const data = await request<RegistrationList>(`/api/admin/registrations?${filterParams(true)}`, { signal: controller.signal });
    if (controller.signal.aborted || !authenticated) return;
    registrations = data.registrations; total = data.total; page = data.page; pageSize = data.pageSize;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) { page = maxPage; await loadList(); return; }
    updateStats(data.stats);
    const hasFilters = Boolean(filterParams().toString());
    $('#results-count').textContent = `${total.toLocaleString()} ${hasFilters ? 'matching ' : ''}RSVP${total === 1 ? '' : 's'}`;
    $('#results-updated').textContent = `Updated ${new Intl.DateTimeFormat('en-SG', { hour: 'numeric', minute: '2-digit' }).format(new Date())}`;
    if (!total) {
      $('#empty-message').textContent = hasFilters ? 'Try another name, email, city, or participation option.' : 'Confirmed and cancelled registrations will appear here.';
      $('#clear-empty-filters').hidden = !hasFilters;
      tableState('empty'); return;
    }
    $('#registration-rows').innerHTML = registrations.map(record => `<tr><th scope="row"><button class="alumnus-name" type="button" data-view="${escape(record.id)}">${escape(record.fullName)}</button><span class="cell-secondary">${escape(record.email)}</span></th><td><span class="plan-label plan-${escape(record.plan)}">${escape(shortPlan(record.plan))}</span><span class="cell-secondary">${record.plan === '2_night' ? '6–8 Aug' : record.plan === '1_night' ? '7–8 Aug' : '7 Aug'}</span></td><td>${escape(roomLabel(record))}</td><td class="residence-cell">${escape(record.residence)}</td><td><span class="status-pill ${record.status}">${record.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}</span></td><td class="date-cell">${escape(date(record.updatedAt))}</td><td><button class="table-action" type="button" data-view="${escape(record.id)}" aria-label="View RSVP for ${escape(record.fullName)}">View <span aria-hidden="true">↗</span></button></td></tr>`).join('');
    $('#page-label').textContent = `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total.toLocaleString()} · Page ${page} of ${maxPage}`;
    $<HTMLButtonElement>('#previous-page').disabled = page <= 1;
    $<HTMLButtonElement>('#next-page').disabled = page >= maxPage;
    tableState('table');
  } catch (error) {
    if (controller.signal.aborted || !authenticated) return;
    $('#table-error-message').textContent = error instanceof Error ? error.message : 'Please try again.';
    $('#results-count').textContent = 'Guest list unavailable'; tableState('error');
  }
}

function shortPlan(plan: Registration['plan']): string { return plan === '2_night' ? '2-night stay' : plan === '1_night' ? '1-night stay' : 'Day attendee'; }
function roomLabel(record: Registration): string { return record.plan === 'day_attendee' ? '—' : record.occupancy === 'twin' ? 'Twin sharing' : record.occupancy === 'single' ? 'Single' : 'Not specified'; }

async function loadSettings(): Promise<void> {
  try {
    const data = await request<{ registrationOpen: boolean }>('/api/admin/settings');
    if (!authenticated) return;
    registrationOpen = data.registrationOpen; renderSettings();
  } catch (error) {
    if (!authenticated) return;
    registrationOpen = null;
    $('#registration-status-title').textContent = 'Registration status unavailable';
    $('#registration-status-copy').textContent = 'Refresh the dashboard before changing public registration.';
    $<HTMLButtonElement>('#registration-toggle').disabled = true;
    dashboardMessage(error instanceof Error ? error.message : 'Could not load registration settings.', true);
  }
}

function renderSettings(): void {
  const open = registrationOpen === true;
  const control = $('.registration-control');
  control.classList.toggle('closed', !open);
  $('#registration-status-title').textContent = open ? 'RSVPs are open' : 'RSVPs are closed';
  $('#registration-status-copy').textContent = open ? 'Alumni can register and update their RSVP. Rooms and payment are coordinated separately.' : 'New RSVPs and attendee edits are paused. Organizers can continue managing registrations.';
  const button = $<HTMLButtonElement>('#registration-toggle');
  button.disabled = registrationOpen === null; button.textContent = open ? 'Close registration' : 'Open registration';
}

async function bootstrap(): Promise<void> {
  $('#access-state').hidden = true; $('#boot-state').hidden = false;
  try {
    const session = await request<{ email: string }>('/api/admin/session');
    authenticated = true;
    $('#session-email').textContent = session.email;
    $('#boot-state').hidden = true; $('#admin-content').hidden = false;
    dashboardMessage('');
    await Promise.all([loadSettings(), loadList()]);
  } catch (error) {
    showAccessUnavailable(error instanceof Error ? error.message : undefined);
  }
}

function confirmAction(title: string, description: string, label: string, danger = false): Promise<boolean> {
  $('#confirm-title').textContent = title; $('#confirm-description').textContent = description;
  const yes = $<HTMLButtonElement>('#confirm-yes'); yes.textContent = label; yes.classList.toggle('danger', danger);
  confirmDialog.showModal();
  $<HTMLButtonElement>('#confirm-no').focus();
  return new Promise(resolve => { confirmResolve = resolve; });
}

function resolveConfirmation(confirmed: boolean): void {
  const resolve = confirmResolve; confirmResolve = null;
  confirmDialog.close(); resolve?.(confirmed);
}

function detailRow(label: string, value: string): string { return `<div><dt>${escape(label)}</dt><dd>${escape(value || 'Not provided')}</dd></div>`; }

function openAttendee(record: Registration): void {
  selected = { ...record }; renderAttendee();
  attendeeDialog.showModal();
}

function renderAttendee(): void {
  if (!selected) return;
  const r = selected;
  $('#attendee-content').innerHTML = `<div class="dialog-heading"><div><p class="eyebrow">ALUMNUS RSVP</p><h2 id="attendee-dialog-title">${escape(r.fullName)}</h2><p>${escape(r.email)}</p></div><button class="dialog-close" type="button" data-close-attendee aria-label="Close attendee details">×</button></div><div class="record-summary"><span class="status-pill ${r.status}">${r.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}</span><span class="plan-label plan-${r.plan}">${escape(shortPlan(r.plan))}</span></div><div class="record-message" role="alert" hidden></div><section class="detail-section"><h3>The familiar details</h3><dl class="detail-list">${detailRow('Mobile / WhatsApp', r.phone)}${detailRow('Home', r.residence)}${detailRow('Participation', PLAN_LABELS[r.plan])}${r.plan !== 'day_attendee' ? detailRow('Occupancy request', roomLabel(r)) : ''}${r.occupancy === 'twin' ? detailRow('Preferred roommate', r.roommate) : ''}</dl></section><section class="detail-section"><h3>The little things</h3><dl class="detail-list">${detailRow('Dietary preference', r.diet)}${r.diet === 'Other / Allergies' ? detailRow('Allergies / dietary details', r.allergies) : ''}${detailRow('T-shirt size', r.shirt)}${detailRow('Flying in', r.flying ? 'Yes' : 'No')}${r.flying ? detailRow('Arrival', r.arrival) + detailRow('Departure', r.departure) + detailRow('Airport transfer', r.transfer ? 'Interested' : 'Not requested') : ''}${detailRow('Note for the organizers', r.notes)}</dl></section><div class="record-meta"><span>Registered ${escape(date(r.createdAt, true))}</span><span>Updated ${escape(date(r.updatedAt, true))} · version ${r.version}</span></div><div class="record-actions"><button type="button" class="button primary" data-edit-attendee>Edit RSVP</button><button type="button" class="button ${r.status === 'confirmed' ? 'danger-outline' : 'secondary'}" data-status-attendee>${r.status === 'confirmed' ? 'Cancel RSVP' : 'Reconfirm RSVP'}</button><button type="button" class="quiet-link" data-rotate-link>Replace private management link</button></div><p class="small-note">A confirmed RSVP records attendance. Room allocation and payment are coordinated separately.</p>`;
}

function option(value: string, current: string, label = value): string { return `<option value="${escape(value)}"${value === current ? ' selected' : ''}>${escape(label)}</option>`; }
function input(name: keyof RegistrationInput, label: string, value: string, extra = '', type = 'text'): string { return `<div class="field"><label for="edit-${name}">${label}</label><input id="edit-${name}" name="${name}" type="${type}" value="${escape(value)}" ${extra}><span class="field-error" data-error-for="${name}" hidden></span></div>`; }

function renderEditor(): void {
  if (!selected) return;
  const r = selected;
  $('#attendee-content').innerHTML = `<div class="dialog-heading"><div><p class="eyebrow">ORGANIZER EDIT</p><h2 id="attendee-dialog-title">Update ${escape(r.fullName)}’s RSVP</h2><p>Changes are saved to the live reunion registration.</p></div><button class="dialog-close" type="button" data-close-attendee aria-label="Close RSVP editor">×</button></div><form id="edit-form"><div class="record-message" role="alert" hidden></div><fieldset><legend>Personal details</legend><div class="field-grid">${input('fullName', 'Full name *', r.fullName, 'required minlength="2" maxlength="120" autocomplete="off"')}${input('email', 'Email address *', r.email, 'required maxlength="254" autocomplete="off"', 'email')}${input('phone', 'Mobile / WhatsApp with country code *', r.phone, 'required maxlength="40" autocomplete="off"', 'tel')}${input('residence', 'Current city / country *', r.residence, 'required maxlength="160" autocomplete="off"')}</div></fieldset><fieldset><legend>Participation & status</legend><div class="field-grid"><div class="field"><label for="edit-plan">Participation *</label><select id="edit-plan" name="plan" required>${Object.entries(PLAN_LABELS).map(([key, label]) => option(key, r.plan, label)).join('')}</select><span class="field-error" data-error-for="plan" hidden></span></div><div class="field"><label for="edit-status">RSVP status *</label><select id="edit-status" name="status" required>${option('confirmed', r.status, 'Confirmed')}${option('cancelled', r.status, 'Cancelled')}</select></div></div><fieldset class="conditional-fields" id="edit-stay"><div class="field-grid"><div class="field"><label for="edit-occupancy">Room occupancy preference *</label><select id="edit-occupancy" name="occupancy" required>${option('', r.occupancy, 'Choose occupancy')}${option('single', r.occupancy, 'Single occupancy')}${option('twin', r.occupancy, 'Double / twin sharing')}</select><span class="field-error" data-error-for="occupancy" hidden></span></div><div id="edit-roommate-wrap">${input('roommate', 'Preferred roommate (optional)', r.roommate, 'maxlength="120"')}</div></div></fieldset></fieldset><fieldset><legend>Event preferences</legend><div class="field-grid"><div class="field"><label for="edit-diet">Dietary preference</label><select id="edit-diet" name="diet">${option('', r.diet, 'Not specified')}${DIETS.map(value => option(value, r.diet)).join('')}</select><span class="field-error" data-error-for="diet" hidden></span></div><div class="field"><label for="edit-shirt">T-shirt size</label><select id="edit-shirt" name="shirt">${option('', r.shirt, 'Not specified')}${SHIRT_SIZES.map(value => option(value, r.shirt)).join('')}</select></div><div class="field wide" id="edit-allergies-wrap"><label for="edit-allergies">Allergies / dietary details</label><textarea id="edit-allergies" name="allergies" maxlength="500" rows="2">${escape(r.allergies)}</textarea><span class="field-error" data-error-for="allergies" hidden></span></div></div><label class="check-field"><input type="checkbox" name="flying" id="edit-flying"${r.flying ? ' checked' : ''}>Flying into Bangalore</label><fieldset class="conditional-fields" id="edit-travel"><legend class="sr-only">Travel details</legend><div class="field-grid">${input('arrival', 'Arrival details (optional)', r.arrival, 'maxlength="200"')}${input('departure', 'Departure details (optional)', r.departure, 'maxlength="200"')}</div><label class="check-field"><input type="checkbox" name="transfer"${r.transfer ? ' checked' : ''}>Interested in an airport transfer</label></fieldset><div class="field"><label for="edit-notes">Notes for the organizers</label><textarea id="edit-notes" name="notes" maxlength="2000" rows="3">${escape(r.notes)}</textarea><span class="field-error" data-error-for="notes" hidden></span></div></fieldset><div class="edit-footer"><button class="button secondary" type="button" data-discard-edit>Back to details</button><button class="button primary" id="save-attendee" type="submit">Save changes</button></div><p class="small-note">Version ${r.version}. If another update happens first, your unsaved changes will stay here for review.</p></form>`;
  updateEditConditional();
}

function updateEditConditional(): void {
  const form = document.querySelector<HTMLFormElement>('#edit-form'); if (!form) return;
  const staying = $<HTMLSelectElement>('#edit-plan', form).value !== 'day_attendee';
  const stay = $<HTMLFieldSetElement>('#edit-stay', form); stay.hidden = !staying; stay.disabled = !staying;
  const roommate = $('#edit-roommate-wrap', form);
  roommate.hidden = !staying || $<HTMLSelectElement>('#edit-occupancy', form).value !== 'twin';
  $<HTMLInputElement>('input', roommate).disabled = roommate.hidden;
  const flying = $<HTMLInputElement>('#edit-flying', form).checked;
  const travel = $<HTMLFieldSetElement>('#edit-travel', form); travel.hidden = !flying; travel.disabled = !flying;
  const allergies = $('#edit-allergies-wrap', form);
  allergies.hidden = $<HTMLSelectElement>('#edit-diet', form).value !== 'Other / Allergies';
  $<HTMLTextAreaElement>('textarea', allergies).disabled = allergies.hidden;
}

function readEditForm(form: HTMLFormElement): RegistrationInput & { status: Registration['status'] } {
  const data = new FormData(form);
  const text = (name: string): string => String(data.get(name) || '').trim();
  return { fullName: text('fullName'), email: text('email'), phone: text('phone'), residence: text('residence'), plan: text('plan') as RegistrationInput['plan'], occupancy: text('occupancy') as RegistrationInput['occupancy'], roommate: text('roommate'), diet: text('diet') as RegistrationInput['diet'], allergies: text('allergies'), shirt: text('shirt') as RegistrationInput['shirt'], flying: data.get('flying') === 'on', arrival: text('arrival'), departure: text('departure'), transfer: data.get('transfer') === 'on', notes: text('notes'), status: text('status') as Registration['status'] };
}

function recordError(error: unknown): void {
  const message = $('.record-message', attendeeDialog);
  let text = error instanceof Error ? error.message : 'This change could not be saved. Please try again.';
  if (error instanceof RequestError && error.code === 'VERSION_CONFLICT') text += ' Your unsaved changes are still here. Copy anything you need, then close this form, refresh the guest list, and reopen the RSVP to use its latest version.';
  if (error instanceof RequestError && error.code === 'EMAIL_REGISTERED') text = 'This email is already used by another RSVP. Your changes are still here. Choose another email, or look up the existing RSVP before making changes.';
  message.textContent = text; message.hidden = false;
  if (error instanceof RequestError && error.fields) {
    Object.entries(error.fields).forEach(([name, detail]) => {
      const span = attendeeDialog.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(name)}"]`);
      if (span) { span.textContent = detail; span.hidden = false; }
      const field = attendeeDialog.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${CSS.escape(name)}"]`);
      field?.setAttribute('aria-invalid', 'true');
    });
  }
  message.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function setRecordBusy(busy: boolean): void {
  busyRecord = busy;
  attendeeDialog.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = busy; });
  const form = attendeeDialog.querySelector<HTMLFormElement>('#edit-form');
  if (form) form.inert = busy;
  attendeeDialog.setAttribute('aria-busy', String(busy));
}

async function saveRecord(input: RegistrationInput & { status: Registration['status'] }): Promise<void> {
  if (!selected || busyRecord) return;
  setRecordBusy(true);
  try {
    const result = await request<{ registration: Registration }>(`/api/admin/registrations/${encodeURIComponent(selected.id)}`, { method: 'PUT', body: JSON.stringify({ ...input, version: selected.version }) });
    if (!authenticated) return;
    selected = result.registration; renderAttendee();
    notify('RSVP updated.'); await loadList();
  } catch (error) { if (authenticated && attendeeDialog.open) recordError(error); }
  finally { setRecordBusy(false); }
}

async function changeStatus(): Promise<void> {
  if (!selected || busyRecord) return;
  const r = selected; const cancelling = r.status === 'confirmed';
  const confirmed = await confirmAction(cancelling ? 'Cancel this RSVP?' : 'Reconfirm this RSVP?', cancelling ? `${r.fullName} will move out of the confirmed attendance and planning totals. Their registration will remain in the organizer record.` : `${r.fullName} will return to the confirmed attendance and planning totals.`, cancelling ? 'Cancel RSVP' : 'Reconfirm RSVP', cancelling);
  if (confirmed && authenticated) await saveRecord({ ...r, status: cancelling ? 'cancelled' : 'confirmed' });
}

async function rotateLink(): Promise<void> {
  if (!selected || busyRecord) return;
  const r = selected;
  const confirmed = await confirmAction('Replace the private management link?', `The existing link for ${r.fullName} will stop working immediately. A new link will be shown once for you to copy and share privately.`, 'Replace private link', true);
  if (!confirmed || !authenticated) return;
  setRecordBusy(true);
  try {
    const data = await request<{ managementToken: string }>(`/api/admin/registrations/${encodeURIComponent(r.id)}/link`, { method: 'POST' });
    if (!authenticated) return;
    attendeeDialog.close();
    const link = `${location.origin}/manage/#token=${encodeURIComponent(data.managementToken)}`;
    $<HTMLInputElement>('#management-link').value = link;
    $('#link-person').textContent = `New link for ${r.fullName}.`;
    $('#copy-message').textContent = 'Copy it before closing. It will not be displayed again.';
    linkDialog.showModal();
    void loadList();
  } catch (error) { if (authenticated && attendeeDialog.open) recordError(error); }
  finally { setRecordBusy(false); }
}

$('#retry-session').addEventListener('click', () => { void bootstrap(); });
$('#refresh-list').addEventListener('click', () => { dashboardMessage(''); void Promise.all([loadSettings(), loadList()]); });
$('#retry-list').addEventListener('click', () => { void loadList(); });
$('#clear-empty-filters').addEventListener('click', () => { filterForm.reset(); });
filterForm.addEventListener('submit', event => { event.preventDefault(); clearTimeout(searchTimer); page = 1; void loadList(); });
filterForm.addEventListener('reset', () => { clearTimeout(searchTimer); setTimeout(() => { page = 1; void loadList(); }, 0); });
searchInput.addEventListener('input', () => { clearTimeout(searchTimer); updateExport(); searchTimer = setTimeout(() => { page = 1; void loadList(); }, 350); });
for (const filter of [planFilter, statusFilter]) filter.addEventListener('change', () => { clearTimeout(searchTimer); page = 1; void loadList(); });
$('#previous-page').addEventListener('click', () => { if (page > 1) { page--; void loadList(); } });
$('#next-page').addEventListener('click', () => { if (page * pageSize < total) { page++; void loadList(); } });
$('#registration-rows').addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-view]');
  const record = registrations.find(r => r.id === button?.dataset.view);
  if (record) openAttendee(record);
});
$('#registration-toggle').addEventListener('click', async () => {
  if (registrationOpen === null || !authenticated) return;
  const next = !registrationOpen;
  if (!next && !(await confirmAction('Close public registration?', 'New RSVPs and attendee edits will pause. Alumni can still cancel an existing RSVP, and organizers can continue making changes here.', 'Close registration', true))) return;
  const button = $<HTMLButtonElement>('#registration-toggle'); button.disabled = true; button.textContent = 'Saving…';
  try {
    const result = await request<{ registrationOpen: boolean }>('/api/admin/settings', { method: 'PATCH', body: JSON.stringify({ registrationOpen: next }) });
    if (!authenticated) return;
    registrationOpen = result.registrationOpen; dashboardMessage(''); renderSettings(); notify(next ? 'Public registration is open.' : 'Public registration is closed.');
  } catch (error) { if (authenticated) { dashboardMessage(error instanceof Error ? error.message : 'Could not change registration status.', true); renderSettings(); } }
});
$('#confirm-yes').addEventListener('click', () => { resolveConfirmation(true); });
$('#confirm-no').addEventListener('click', () => { resolveConfirmation(false); });
confirmDialog.addEventListener('cancel', () => { resolveConfirmation(false); });
confirmDialog.addEventListener('close', () => { const resolve = confirmResolve; confirmResolve = null; resolve?.(false); });
attendeeDialog.addEventListener('cancel', event => { if (busyRecord) event.preventDefault(); });
attendeeDialog.addEventListener('close', () => { selected = null; $('#attendee-content').replaceChildren(); });
attendeeDialog.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!target || busyRecord) return;
  if (target.hasAttribute('data-close-attendee')) attendeeDialog.close();
  if (target.hasAttribute('data-edit-attendee')) renderEditor();
  if (target.hasAttribute('data-discard-edit')) { void confirmAction('Discard these edits?', 'Changes in this editor have not been saved.', 'Discard edits').then(yes => { if (yes && selected) renderAttendee(); }); }
  if (target.hasAttribute('data-status-attendee')) void changeStatus();
  if (target.hasAttribute('data-rotate-link')) void rotateLink();
});
attendeeDialog.addEventListener('change', () => { updateEditConditional(); });
attendeeDialog.addEventListener('input', event => {
  const field = event.target as HTMLInputElement;
  field.removeAttribute('aria-invalid');
  const error = attendeeDialog.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(field.name)}"]`);
  if (error) error.hidden = true;
});
attendeeDialog.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  if (form.id !== 'edit-form' || !selected || busyRecord || !form.reportValidity()) return;
  const input = readEditForm(form);
  if (input.status !== selected.status && !(await confirmAction(input.status === 'cancelled' ? 'Cancel this RSVP?' : 'Reconfirm this RSVP?', 'This will update the confirmed attendance and planning totals.', input.status === 'cancelled' ? 'Cancel & save changes' : 'Reconfirm & save changes', input.status === 'cancelled'))) return;
  await saveRecord(input);
});
for (const selector of ['#close-link', '#done-link']) $(selector).addEventListener('click', () => { linkDialog.close(); });
linkDialog.addEventListener('close', () => { $<HTMLInputElement>('#management-link').value = ''; $('#link-person').textContent = ''; $('#copy-message').textContent = ''; });
$('#copy-link').addEventListener('click', async () => {
  const field = $<HTMLInputElement>('#management-link');
  if (!field.value) return;
  try { await navigator.clipboard.writeText(field.value); $('#copy-message').textContent = 'Copied. Share this link privately with the alumnus.'; }
  catch { field.focus(); field.select(); $('#copy-message').textContent = 'Select and copy the link using your browser or keyboard.'; }
});

void bootstrap();
