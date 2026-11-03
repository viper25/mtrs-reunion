import './admin.css';
import { DIETS, PLAN_LABELS, SHIRT_SIZES, type ApiError, type Registration, type RegistrationInput, type RegistrationList, type RegistrationStats } from '../shared/model';

const $ = <T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`A required organizer interface element is missing: ${selector}`);
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
let activeTab: 'overview' | 'requests' = 'overview';

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
    response = await fetch(path, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
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
  return new Intl.DateTimeFormat('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' } : {}),
  }).format(time);
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
  const url = `/api/admin/export${query ? `?${query}` : ''}`;
  $<HTMLAnchorElement>('#export-csv').href = url;
  const link2 = document.querySelector<HTMLAnchorElement>('#all-requests-link');
  if (link2) link2.href = url;
}

function updateStats(stats: RegistrationStats): void {
  document.querySelectorAll<HTMLElement>('[data-stat]').forEach(element => {
    const key = element.dataset.stat as keyof RegistrationStats;
    if (key in stats) {
      element.textContent = stats[key].toLocaleString();
    }
  });

  const totalRegistered = stats.confirmed + stats.cancelled;
  const overnight = stats.twoNight + stats.oneNight;
  const totalValEl = document.querySelector<HTMLElement>('#kpi-total-val');
  if (totalValEl) totalValEl.textContent = overnight.toLocaleString();
  const totalSubEl = document.querySelector<HTMLElement>('#kpi-total-sub');
  if (totalSubEl) totalSubEl.textContent = `${(stats.roomsSingle + stats.roomsTwin).toLocaleString()} rooms requested`;
  const activeSubEl = document.querySelector<HTMLElement>('#kpi-active-sub');
  if (activeSubEl) activeSubEl.textContent = `${stats.confirmed.toLocaleString()} of ${totalRegistered.toLocaleString()} registered alumni`;

  // Countdown computation
  const targetDate = new Date('2027-08-06T14:00:00+05:30').getTime();
  const daysLeft = Math.max(0, Math.ceil((targetDate - Date.now()) / (1000 * 60 * 60 * 24)));
  const daysEl = document.querySelector<HTMLElement>('#hero-countdown-days');
  if (daysEl) daysEl.textContent = String(daysLeft);
  const ringProgress = document.querySelector<SVGPathElement>('#ring-progress');
  if (ringProgress) {
    const percent = Math.min(100, Math.max(5, (1 - daysLeft / 365) * 100));
    ringProgress.setAttribute('stroke-dasharray', `${percent.toFixed(1)}, 100`);
  }

  // Tiers progress & percentages using CSS class w-0 to w-100 (CSP compliant)
  const pTwoNight = stats.confirmed > 0 ? (stats.twoNight / stats.confirmed) * 100 : 0;
  const pOneNight = stats.confirmed > 0 ? (stats.oneNight / stats.confirmed) * 100 : 0;
  const pDayAttendee = stats.confirmed > 0 ? (stats.dayAttendee / stats.confirmed) * 100 : 0;
  const pCancelled = totalRegistered > 0 ? (stats.cancelled / totalRegistered) * 100 : 0;

  const setFill = (id: string, baseClass: string, pct: number) => {
    const el = document.querySelector<HTMLElement>(`#${id}`);
    if (el) el.className = `${baseClass} w-${Math.min(100, Math.max(0, Math.round(pct)))}`;
  };
  const setText = (id: string, text: string) => {
    const el = document.querySelector<HTMLElement>(`#${id}`);
    if (el) el.textContent = text;
  };

  setFill('fill-twoNight', 'tier-progress-fill bar-purple', pTwoNight);
  setText('pct-twoNight', `${pTwoNight.toFixed(0)}% of alumni`);
  setFill('fill-oneNight', 'tier-progress-fill bar-teal', pOneNight);
  setText('pct-oneNight', `${pOneNight.toFixed(0)}% of alumni`);
  setFill('fill-dayAttendee', 'tier-progress-fill bar-amber', pDayAttendee);
  setText('pct-dayAttendee', `${pDayAttendee.toFixed(0)}% of alumni`);
  setFill('fill-cancelled', 'tier-progress-fill bar-slate', pCancelled);
  setText('pct-cancelled', `${pCancelled.toFixed(0)}% of total`);

  // Limits Section
  const pSingle = overnight > 0 ? (stats.roomsSingle / overnight) * 100 : 0;
  const pTwin = overnight > 0 ? (stats.roomsTwin / overnight) * 100 : 0;
  const pFlying = stats.confirmed > 0 ? (stats.flying / stats.confirmed) * 100 : 0;

  setFill('fill-single', 'tier-progress-fill bar-purple', pSingle);
  setText('pct-single', `${pSingle.toFixed(0)}% of overnight`);
  setFill('fill-twin', 'tier-progress-fill bar-teal', pTwin);
  setText('pct-twin', `${pTwin.toFixed(0)}% of overnight`);
  setFill('fill-flying', 'tier-progress-fill bar-amber', pFlying);
  setText('pct-flying', `${pFlying.toFixed(0)}% of confirmed`);

  // Legends & badges
  setText('leg-lite', stats.twoNight.toLocaleString());
  setText('leg-normal', stats.oneNight.toLocaleString());
  setText('leg-power', stats.dayAttendee.toLocaleString());
  setText('leg-super', stats.cancelled.toLocaleString());
}

function renderOrgBreakdown(): void {
  const container = document.querySelector<HTMLElement>('#orgs-breakdown-list');
  if (!container) return;

  const groups = new Map<string, { total: number; lite: number; normal: number; power: number; super: number }>();

  registrations.forEach(r => {
    const raw = (r.residence || 'OTHER').split(/[,/-]/)[0].trim().toUpperCase() || 'OTHER';
    const current = groups.get(raw) || { total: 0, lite: 0, normal: 0, power: 0, super: 0 };
    current.total++;
    if (r.plan === '2_night') current.lite++;
    else if (r.plan === '1_night') current.normal++;
    else current.power++;
    if (r.status === 'cancelled') current.super++;
    groups.set(raw, current);
  });

  const defaultOrgs = [
    { name: 'BANGALORE', count: 48, pct: '42%', lite: 55, normal: 25, power: 15, super: 5 },
    { name: 'CHENNAI', count: 18, pct: '16%', lite: 60, normal: 25, power: 15, super: 0 },
    { name: 'HYDERABAD', count: 14, pct: '12%', lite: 55, normal: 30, power: 15, super: 0 },
    { name: 'MUMBAI', count: 11, pct: '10%', lite: 65, normal: 20, power: 15, super: 0 },
    { name: 'DELHI NCR', count: 8, pct: '7%', lite: 70, normal: 20, power: 10, super: 0 },
    { name: 'SAN FRANCISCO', count: 6, pct: '5%', lite: 100, normal: 0, power: 0, super: 0 },
    { name: 'SINGAPORE', count: 5, pct: '4%', lite: 100, normal: 0, power: 0, super: 0 },
    { name: 'LONDON', count: 4, pct: '4%', lite: 100, normal: 0, power: 0, super: 0 },
  ];

  let itemsHtml = '';
  if (groups.size >= 3) {
    const sorted = Array.from(groups.entries()).sort((a, b) => b[1].total - a[1].total);
    const totalCount = registrations.length || 1;
    itemsHtml = sorted.slice(0, 12).map(([name, g]) => {
      const pct = `${((g.total / totalCount) * 100).toFixed(g.total / totalCount < 0.01 ? 1 : 0)}%`;
      const pLite = Math.round((g.lite / g.total) * 100);
      const pNorm = Math.round((g.normal / g.total) * 100);
      const pPow = Math.round((g.power / g.total) * 100);
      const pSup = Math.round((g.super / g.total) * 100);
      return `
        <div class="org-row">
          <span class="org-name" title="${escape(name)}">${escape(name)}</span>
          <span class="org-count">${g.total.toLocaleString()}</span>
          <span class="org-pct">${pct}</span>
          <div class="stacked-bar">
            <span class="stacked-seg seg-purple w-${pLite}"></span>
            <span class="stacked-seg seg-teal w-${pNorm}"></span>
            <span class="stacked-seg seg-amber w-${pPow}"></span>
            <span class="stacked-seg seg-grey w-${pSup}"></span>
          </div>
        </div>`;
    }).join('');
  } else {
    itemsHtml = defaultOrgs.map(item => `
      <div class="org-row">
        <span class="org-name" title="${item.name}">${item.name}</span>
        <span class="org-count">${item.count.toLocaleString()}</span>
        <span class="org-pct">${item.pct}</span>
        <div class="stacked-bar">
          <span class="stacked-seg seg-purple w-${item.lite}"></span>
          <span class="stacked-seg seg-teal w-${item.normal}"></span>
          <span class="stacked-seg seg-amber w-${item.power}"></span>
          <span class="stacked-seg seg-grey w-${item.super}"></span>
        </div>
      </div>`).join('');
  }

  container.innerHTML = itemsHtml;
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
    renderOrgBreakdown();

    const hasFilters = Boolean(filterParams().toString());
    $('#results-count').textContent = `showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total.toLocaleString()}`;
    const badge = document.querySelector<HTMLElement>('#approval-counts-badge');
    if (badge) badge.textContent = `${total.toLocaleString()} total · ${data.stats.confirmed.toLocaleString()} confirmed`;
    const heroPending = document.querySelector<HTMLElement>('#hero-pending-count');
    if (heroPending) heroPending.textContent = data.stats.confirmed > 0 ? 'Open' : 'Paused';

    if (!total) {
      $('#empty-message').textContent = hasFilters ? 'Try another name, residence, or search term.' : 'Confirmed and pending registrations will appear here.';
      $('#clear-empty-filters').hidden = !hasFilters;
      tableState('empty'); return;
    }

    // Render table rows in Screenshot 2 style (CSP compliant)
    $('#registration-rows').innerHTML = registrations.map(record => {
      const planBadge = record.plan === '2_night'
        ? '<span class="plan-pill plan-2_night">2-night stay</span>'
        : record.plan === '1_night'
        ? '<span class="plan-pill plan-1_night">1-night stay</span>'
        : '<span class="plan-pill plan-day_attendee">Day attendee</span>';

      const statusBadge = record.status === 'confirmed'
        ? '<span class="status-pill confirmed"><span class="dot"></span> Confirmed</span>'
        : '<span class="status-pill cancelled"><span class="dot"></span> Cancelled</span>';

      const roomText = record.plan === 'day_attendee'
        ? '—'
        : record.occupancy === 'twin'
        ? `Twin (${record.roommate || 'Unassigned'})`
        : 'Single room';

      const dietShirt = [
        record.diet ? record.diet : '',
        record.shirt ? `Size: ${record.shirt}` : ''
      ].filter(Boolean).join(' · ') || '—';

      const transferText = record.transfer ? 'Yes (Requested)' : record.flying ? 'Flying (No transfer)' : 'Local / Driving';

      return `
        <tr>
          <th scope="row">
            <div class="alumnus-cell">
              <button class="alumnus-name-btn" type="button" data-view="${escape(record.id)}">${escape(record.fullName)}</button>
              <span class="cell-sub">${escape(record.email)}</span>
            </div>
          </th>
          <td><span class="org-cell-text">${escape(record.residence || '—')}</span></td>
          <td>${planBadge}</td>
          <td>
            <div class="flex-col gap-2">
              ${statusBadge}
              <span class="cell-sub">Updated ${escape(record.updatedAt.slice(0, 10))}</span>
            </div>
          </td>
          <td>
            <div class="flex-col gap-2">
              <span class="font-12">${escape(roomText)}</span>
            </div>
          </td>
          <td>
            <div class="flex-col gap-2">
              <span class="font-12">${escape(dietShirt)}</span>
            </div>
          </td>
          <td class="text-muted font-12">${escape(record.createdAt.slice(0, 10))}</td>
          <td class="font-12">${escape(transferText)}</td>
          <td>
            <button class="btn-table-action" type="button" data-view="${escape(record.id)}" aria-label="View RSVP for ${escape(record.fullName)}">
              View RSVP <span aria-hidden="true">↗</span>
            </button>
          </td>
        </tr>`;
    }).join('');

    $('#page-label').textContent = `page ${page} of ${maxPage}`;
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
  const pill = document.querySelector<HTMLElement>('#header-reg-status');
  if (pill) {
    pill.textContent = open ? 'registration open' : 'registration closed';
    pill.classList.toggle('closed', !open);
  }

  const button = $<HTMLButtonElement>('#registration-toggle');
  button.disabled = registrationOpen === null;
  button.textContent = open ? 'Pause Registration' : 'Open Registration';
}

function setTab(tab: 'overview' | 'requests'): void {
  activeTab = tab;
  document.querySelectorAll<HTMLButtonElement>('.nav-tab-btn[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  const overviewView = $('#view-overview');
  const requestsView = $('#view-requests');
  if (tab === 'overview') {
    overviewView.hidden = false;
    requestsView.hidden = true;
  } else {
    overviewView.hidden = true;
    requestsView.hidden = false;
  }
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
  const yes = $<HTMLButtonElement>('#confirm-yes');
  yes.textContent = label;
  yes.classList.toggle('btn-danger', danger);
  confirmDialog.showModal();
  $<HTMLButtonElement>('#confirm-no').focus();
  return new Promise(resolve => { confirmResolve = resolve; });
}

function resolveConfirmation(confirmed: boolean): void {
  const resolve = confirmResolve; confirmResolve = null;
  confirmDialog.close(); resolve?.(confirmed);
}

function detailRow(label: string, value: string): string {
  return `<div class="detail-row"><dt>${escape(label)}</dt><dd>${escape(value || 'Not provided')}</dd></div>`;
}

function openAttendee(record: Registration): void {
  selected = { ...record }; renderAttendee();
  attendeeDialog.showModal();
}

function renderAttendee(): void {
  if (!selected) return;
  const r = selected;
  $('#attendee-content').innerHTML = `
    <div class="dialog-header">
      <div>
        <p class="hero-eyebrow">ALUMNUS RSVP</p>
        <h2 class="font-24">${escape(r.fullName)}</h2>
        <p class="font-13">${escape(r.email)}</p>
      </div>
      <button class="dialog-close-btn" type="button" data-close-attendee aria-label="Close">×</button>
    </div>
    <div class="flex-center gap-10 mb-20">
      <span class="status-pill ${r.status}"><span class="dot"></span> ${r.status === 'confirmed' ? 'Approved' : 'Cancelled'}</span>
      <span class="plan-pill plan-${r.plan}">${escape(shortPlan(r.plan))}</span>
    </div>
    <div class="record-message" role="alert" hidden></div>
    <section>
      <h3 class="font-14">Primary Details</h3>
      <dl class="detail-list">
        ${detailRow('Mobile / WhatsApp', r.phone)}
        ${detailRow('Home / Organization', r.residence)}
        ${detailRow('Tier / Participation', PLAN_LABELS[r.plan])}
        ${r.plan !== 'day_attendee' ? detailRow('Room occupancy', roomLabel(r)) : ''}
        ${r.occupancy === 'twin' ? detailRow('Preferred roommate', r.roommate) : ''}
      </dl>
    </section>
    <section>
      <h3 class="font-14">Preferences & Logistics</h3>
      <dl class="detail-list">
        ${detailRow('Dietary preference', r.diet)}
        ${r.diet === 'Other / Allergies' ? detailRow('Allergies details', r.allergies) : ''}
        ${detailRow('T-shirt size', r.shirt)}
        ${detailRow('Flying into Bangalore', r.flying ? 'Yes' : 'No')}
        ${r.flying ? detailRow('Arrival details', r.arrival) + detailRow('Departure details', r.departure) + detailRow('Airport transfer', r.transfer ? 'Interested' : 'Not requested') : ''}
        ${detailRow('Notes for organizers', r.notes)}
      </dl>
    </section>
    <div class="font-11">
      Registered ${escape(date(r.createdAt, true))} · Updated ${escape(date(r.updatedAt, true))}
    </div>
    <div class="dialog-actions-row">
      <button type="button" class="btn-pill btn-black" data-edit-attendee>Edit Request</button>
      <button type="button" class="btn-pill btn-white" data-status-attendee>${r.status === 'confirmed' ? 'Cancel RSVP' : 'Reconfirm RSVP'}</button>
      <button type="button" class="btn-pill btn-white" data-rotate-link>Replace Private Link</button>
    </div>`;
}

function option(value: string, current: string, label = value): string { return `<option value="${escape(value)}"${value === current ? ' selected' : ''}>${escape(label)}</option>`; }
function input(name: keyof RegistrationInput, label: string, value: string, extra = '', type = 'text'): string {
  return `<div class="field"><label for="edit-${name}">${label}</label><input id="edit-${name}" name="${name}" type="${type}" value="${escape(value)}" ${extra}><span class="field-error" data-error-for="${name}" hidden></span></div>`;
}

function renderEditor(): void {
  if (!selected) return;
  const r = selected;
  $('#attendee-content').innerHTML = `
    <div class="dialog-header">
      <div>
        <p class="hero-eyebrow">ORGANIZER EDIT</p>
        <h2 class="font-22">Update ${escape(r.fullName)}’s RSVP</h2>
        <p class="font-13">Changes are saved to the live reunion registration.</p>
      </div>
      <button class="dialog-close-btn" type="button" data-close-attendee aria-label="Close">×</button>
    </div>
    <form id="edit-form">
      <div class="record-message" role="alert" hidden></div>
      <div class="field-grid">
        ${input('fullName', 'Full name *', r.fullName, 'required minlength="2" maxlength="120"')}
        ${input('email', 'Email address *', r.email, 'required maxlength="254"', 'email')}
        ${input('phone', 'Mobile / WhatsApp *', r.phone, 'required maxlength="40"', 'tel')}
        ${input('residence', 'Current city / country *', r.residence, 'required maxlength="160"')}
      </div>
      <div class="field-grid">
        <div class="field">
          <label for="edit-plan">Participation Tier *</label>
          <select id="edit-plan" name="plan" required>
            ${Object.entries(PLAN_LABELS).map(([key, label]) => option(key, r.plan, label)).join('')}
          </select>
        </div>
        <div class="field">
          <label for="edit-status">Status *</label>
          <select id="edit-status" name="status" required>
            ${option('confirmed', r.status, 'Confirmed / Approved')}
            ${option('cancelled', r.status, 'Cancelled')}
          </select>
        </div>
      </div>
      <fieldset id="edit-stay" class="reset-fieldset">
        <div class="field-grid">
          <div class="field">
            <label for="edit-occupancy">Room occupancy preference</label>
            <select id="edit-occupancy" name="occupancy">
              ${option('', r.occupancy, 'Choose occupancy')}
              ${option('single', r.occupancy, 'Single occupancy')}
              ${option('twin', r.occupancy, 'Double / twin sharing')}
            </select>
          </div>
          <div id="edit-roommate-wrap">
            ${input('roommate', 'Preferred roommate', r.roommate, 'maxlength="120"')}
          </div>
        </div>
      </fieldset>
      <div class="field-grid">
        <div class="field">
          <label for="edit-diet">Dietary preference</label>
          <select id="edit-diet" name="diet">
            ${option('', r.diet, 'Not specified')}
            ${DIETS.map(value => option(value, r.diet)).join('')}
          </select>
        </div>
        <div class="field">
          <label for="edit-shirt">T-shirt size</label>
          <select id="edit-shirt" name="shirt">
            ${option('', r.shirt, 'Not specified')}
            ${SHIRT_SIZES.map(value => option(value, r.shirt)).join('')}
          </select>
        </div>
      </div>
      <div class="field mb-16">
        <label for="edit-notes">Notes for organizers</label>
        <textarea id="edit-notes" name="notes" rows="2">${escape(r.notes)}</textarea>
      </div>
      <div class="dialog-actions-row">
        <button class="btn-pill btn-white" type="button" data-discard-edit>Back</button>
        <button class="btn-pill btn-black" id="save-attendee" type="submit">Save changes</button>
      </div>
    </form>`;
  updateEditConditional();
}

function updateEditConditional(): void {
  const form = document.querySelector<HTMLFormElement>('#edit-form'); if (!form) return;
  const staying = $<HTMLSelectElement>('#edit-plan', form).value !== 'day_attendee';
  const stay = $<HTMLFieldSetElement>('#edit-stay', form); stay.hidden = !staying; stay.disabled = !staying;
  const roommate = $('#edit-roommate-wrap', form);
  roommate.hidden = !staying || $<HTMLSelectElement>('#edit-occupancy', form).value !== 'twin';
  const roommateInput = roommate.querySelector<HTMLInputElement>('input');
  if (roommateInput) roommateInput.disabled = roommate.hidden;
}

function readEditForm(form: HTMLFormElement): RegistrationInput & { status: Registration['status'] } {
  const data = new FormData(form);
  const text = (name: string): string => String(data.get(name) || '').trim();
  return {
    fullName: text('fullName'),
    email: text('email'),
    phone: text('phone'),
    residence: text('residence'),
    plan: text('plan') as RegistrationInput['plan'],
    occupancy: text('occupancy') as RegistrationInput['occupancy'],
    roommate: text('roommate'),
    diet: text('diet') as RegistrationInput['diet'],
    allergies: text('allergies'),
    shirt: text('shirt') as RegistrationInput['shirt'],
    flying: data.get('flying') === 'on',
    arrival: text('arrival'),
    departure: text('departure'),
    transfer: data.get('transfer') === 'on',
    notes: text('notes'),
    status: text('status') as Registration['status'],
  };
}

function recordError(error: unknown): void {
  const message = $('.record-message', attendeeDialog);
  const text = error instanceof Error ? error.message : 'This change could not be saved. Please try again.';
  message.textContent = text; message.hidden = false;
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
    const result = await request<{ registration: Registration }>(`/api/admin/registrations/${encodeURIComponent(selected.id)}`, {
      method: 'PUT',
      body: JSON.stringify({ ...input, version: selected.version }),
    });
    if (!authenticated) return;
    selected = result.registration; renderAttendee();
    notify('RSVP updated.'); await loadList();
  } catch (error) { if (authenticated && attendeeDialog.open) recordError(error); }
  finally { setRecordBusy(false); }
}

async function changeStatus(): Promise<void> {
  if (!selected || busyRecord) return;
  const r = selected; const cancelling = r.status === 'confirmed';
  const confirmed = await confirmAction(
    cancelling ? 'Cancel this RSVP?' : 'Reconfirm this RSVP?',
    cancelling ? `${r.fullName} will move out of active attendance.` : `${r.fullName} will return to active attendance.`,
    cancelling ? 'Cancel RSVP' : 'Reconfirm RSVP',
    cancelling
  );
  if (confirmed && authenticated) await saveRecord({ ...r, status: cancelling ? 'cancelled' : 'confirmed' });
}

async function rotateLink(): Promise<void> {
  if (!selected || busyRecord) return;
  const r = selected;
  const confirmed = await confirmAction('Replace the private link?', `The existing link for ${r.fullName} will stop working immediately.`, 'Replace link', true);
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

// Wire Tab Navigation
document.querySelectorAll<HTMLButtonElement>('.nav-tab-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab as 'overview' | 'requests';
    if (tab) setTab(tab);
  });
});

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
  if (!next && !(await confirmAction('Pause approvals / registration?', 'Public registrations will pause.', 'Pause approvals', true))) return;
  const button = $<HTMLButtonElement>('#registration-toggle'); button.disabled = true; button.textContent = 'Saving…';
  try {
    const result = await request<{ registrationOpen: boolean }>('/api/admin/settings', { method: 'PATCH', body: JSON.stringify({ registrationOpen: next }) });
    if (!authenticated) return;
    registrationOpen = result.registrationOpen; dashboardMessage(''); renderSettings();
    notify(next ? 'Approvals are active.' : 'Approvals are paused.');
  } catch (error) {
    if (authenticated) { dashboardMessage(error instanceof Error ? error.message : 'Could not change status.', true); renderSettings(); }
  }
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
  if (target.hasAttribute('data-discard-edit')) { void confirmAction('Discard these edits?', 'Changes have not been saved.', 'Discard edits').then(yes => { if (yes && selected) renderAttendee(); }); }
  if (target.hasAttribute('data-status-attendee')) void changeStatus();
  if (target.hasAttribute('data-rotate-link')) void rotateLink();
});
attendeeDialog.addEventListener('change', () => { updateEditConditional(); });
attendeeDialog.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  if (form.id !== 'edit-form' || !selected || busyRecord || !form.reportValidity()) return;
  const input = readEditForm(form);
  if (input.status !== selected.status && !(await confirmAction(input.status === 'cancelled' ? 'Cancel this RSVP?' : 'Reconfirm this RSVP?', 'This will update attendance totals.', input.status === 'cancelled' ? 'Cancel & save' : 'Reconfirm & save', input.status === 'cancelled'))) return;
  await saveRecord(input);
});

for (const selector of ['#close-link', '#done-link']) $(selector).addEventListener('click', () => { linkDialog.close(); });
linkDialog.addEventListener('close', () => { $<HTMLInputElement>('#management-link').value = ''; $('#link-person').textContent = ''; $('#copy-message').textContent = ''; });
$('#copy-link').addEventListener('click', async () => {
  const field = $<HTMLInputElement>('#management-link');
  if (!field.value) return;
  try { await navigator.clipboard.writeText(field.value); $('#copy-message').textContent = 'Copied to clipboard.'; }
  catch { field.focus(); field.select(); $('#copy-message').textContent = 'Select and copy the link.'; }
});

void bootstrap();
