import './public.css';
import type { EventSettings, Registration } from '../shared/model';
import { cancelRegistration, getEvent, getRegistration, RequestError, updateRegistration } from './lib/api';
import { escapeHtml, focusHeading } from './lib/dom';
import { recoveryHelp } from './components/contact';
import { icon } from './components/icons';
import { registrationDetails, RegistrationForm } from './components/registration-form';
import { footer, wordmark } from './components/shell';

const app = document.querySelector<HTMLElement>('#app')!;
let token = readToken();
let settings: EventSettings | null = null;
let registration: Registration | null = null;
let registrationOpen = false;
let loadingSequence = 0;
let cancelling = false;

function readToken(): string {
  return new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
}

app.innerHTML = `<div id="top"><header class="site-header page-width">${wordmark('/')}<span class="private-badge">${icon('lock')} Your private RSVP</span></header><main class="private-main page-width" id="main-content"><div id="manage-surface"><div class="loading-panel" role="status"><span class="spinner dark-spinner" aria-hidden="true"></span><p>Opening your reunion plans…</p></div></div></main>${footer()}</div>`;
const surface = document.querySelector<HTMLElement>('#manage-surface')!;

function renderAccessError(error?: unknown): void {
  const request = error instanceof RequestError ? error : null;
  const invalid = Boolean(token) && (request?.status === 401 || request?.status === 404 || token.length > 512);
  surface.innerHTML = `<section class="access-panel" aria-labelledby="access-title"><span class="access-icon">${icon('lock')}</span><p class="kicker">A LITTLE PRIVACY FOR YOUR PLANS</p><h1 id="access-title" tabindex="-1">${!token ? 'Your RSVP has a private link.' : invalid ? 'This private link doesn’t work.' : 'We couldn’t open your RSVP.'}</h1><p>${!token ? 'Open the private management link you saved after confirming your RSVP. It takes you straight to your details.' : invalid ? 'Please check that you opened the complete link saved at registration. It may be incomplete or no longer valid.' : escapeHtml(request?.message || 'Check your connection and try again.')}</p>${token && !invalid ? `<button type="button" class="button button-primary" data-reload-manage>Try again ${icon('arrow')}</button>` : ''}<a href="/" class="button button-secondary">Back to the reunion ${icon('arrowUpRight')}</a></section>${recoveryHelp(settings)}`;
  focusHeading(surface.querySelector<HTMLElement>('#access-title'));
}

function renderManage(message = ''): void {
  if (!registration) return;
  const record = registration;
  const cancelled = record.status === 'cancelled';
  surface.innerHTML = `
    <section class="manage-heading" aria-labelledby="manage-title"><div><p class="kicker">MTRS 95/97 · YOUR NEXT CHAPTER</p><h1 id="manage-title">Your reunion <span class="script">plans.</span></h1><p>Good to see you, ${escapeHtml(record.fullName)}. Here’s your RSVP.</p></div><span class="status-pill ${cancelled ? 'status-cancelled' : ''}">${icon(cancelled ? 'heart' : 'check')}${cancelled ? 'Cancelled' : 'Confirmed'}</span></section>
    <div class="manage-notice" data-manage-notice role="status" tabindex="-1" ${message ? '' : 'hidden'}>${escapeHtml(message)}</div>
    ${cancelled ? `<div class="status-notice cancelled-notice"><h2>Your RSVP is cancelled.</h2><p>${registrationOpen ? 'If your plans have changed again, review your details below and reconfirm your attendance.' : 'Registration is currently closed. Contact the organizers if you would like to join again.'}</p></div>` : ''}
    ${!registrationOpen ? '<div class="status-notice"><h2>Registration is closed.</h2><p>Your saved details are shown below. Changes are paused, and you can still cancel a confirmed RSVP if your plans change.</p></div>' : ''}
    <div class="manage-layout"><aside class="manage-sidebar"><div class="event-note"><p class="kicker">OUR LITTLE GETAWAY</p><h2>Old friends.<br><span class="script">Same us.</span></h2><p>${icon('calendar')}6–8 August 2027</p><p>${icon('pin')}Royal Orchid, Bangalore</p><span class="script sidebar-signoff">See you in Bangalore.</span></div><div class="privacy-note">${icon('lock')}<div><strong>Keep your link private.</strong><p>Anyone with this link can view, edit, or cancel your RSVP. Your details are used to organize the reunion.</p></div></div><a class="inline-link" href="/">Explore the weekend ${icon('arrowUpRight')}</a></aside><div class="manage-content">${registrationOpen ? '<div class="registration-surface" data-management-form></div>' : `<section class="registration-surface saved-details"><h2>Your saved details</h2>${registrationDetails(record)}</section>`}
    ${!cancelled ? `<section class="cancel-section"><h2>Can’t make it this time?</h2><p>You can cancel your RSVP here. If you’ve arranged a room or payment, coordinate those arrangements with the organizers separately.</p><button type="button" class="text-button danger-link" data-open-cancel>Cancel my RSVP</button></section>` : ''}
    </div></div>${recoveryHelp(settings)}
    <dialog class="cancel-dialog" id="cancel-dialog" aria-labelledby="cancel-title" aria-describedby="cancel-description"><div class="dialog-heart" aria-hidden="true">${icon('heart')}</div><h2 id="cancel-title">Cancel your RSVP?</h2><p id="cancel-description">Your attendance at the MTRS 95/97 reunion will be marked as cancelled. The organizers will be able to see this change.</p><div class="dialog-error" data-cancel-error role="alert" tabindex="-1" hidden></div><div class="dialog-actions"><button type="button" class="button button-secondary" data-keep-rsvp autofocus>Keep my RSVP</button><button type="button" class="button button-danger" data-confirm-cancel>Yes, cancel my RSVP</button></div></dialog>`;

  if (registrationOpen) {
    const currentToken = token;
    new RegistrationForm(surface.querySelector<HTMLElement>('[data-management-form]')!, {
      mode: 'manage', initial: record, submitLabel: cancelled ? 'Reconfirm my RSVP' : 'Save changes', onReload: () => { void loadManage(); },
      onSubmit: async input => {
        const result = await updateRegistration(currentToken, input, record.version);
        if (currentToken !== token) return;
        registration = result.registration;
        renderManage(cancelled ? 'Welcome back! Your RSVP is confirmed again.' : 'Your RSVP has been updated. The organizers can see your latest details.');
        focusHeading(surface.querySelector<HTMLElement>('[data-manage-notice]'));
      },
    });
  }
  const dialog = surface.querySelector<HTMLDialogElement>('#cancel-dialog')!;
  dialog.addEventListener('cancel', event => { if (cancelling) event.preventDefault(); });
}

async function loadManage(): Promise<void> {
  const sequence = ++loadingSequence;
  if (!token || token.length > 512) { renderAccessError(); return; }
  surface.innerHTML = '<div class="loading-panel" role="status"><span class="spinner dark-spinner" aria-hidden="true"></span><p>Opening your reunion plans…</p></div>';
  try {
    const result = await getRegistration(token);
    if (sequence !== loadingSequence) return;
    registration = result.registration;
    registrationOpen = result.registrationOpen;
    renderManage();
    focusHeading(surface.querySelector<HTMLElement>('#manage-title'));
  } catch (error) {
    if (sequence !== loadingSequence) return;
    registration = null;
    renderAccessError(error);
  }
}

async function confirmCancellation(): Promise<void> {
  if (!registration || cancelling) return;
  const dialog = surface.querySelector<HTMLDialogElement>('#cancel-dialog')!;
  const button = dialog.querySelector<HTMLButtonElement>('[data-confirm-cancel]')!;
  const keep = dialog.querySelector<HTMLButtonElement>('[data-keep-rsvp]')!;
  const errorBox = dialog.querySelector<HTMLElement>('[data-cancel-error]')!;
  const currentToken = token;
  cancelling = true;
  dialog.setAttribute('aria-busy', 'true');
  button.disabled = true; keep.disabled = true; errorBox.hidden = true;
  button.innerHTML = '<span class="spinner" aria-hidden="true"></span> Cancelling…';
  try {
    const result = await cancelRegistration(currentToken, registration.version);
    if (currentToken !== token) return;
    registration = result.registration;
    dialog.close();
    renderManage('Your RSVP has been cancelled. We’ll miss you this time.');
    focusHeading(surface.querySelector<HTMLElement>('[data-manage-notice]'));
  } catch (error) {
    if (currentToken !== token) return;
    const request = error instanceof RequestError ? error : null;
    if (request?.status === 409) {
      dialog.close();
      const notice = surface.querySelector<HTMLElement>('[data-manage-notice]')!;
      notice.innerHTML = '<strong>This RSVP changed elsewhere.</strong><p>Reload the latest details before cancelling so you can review its current status.</p><button type="button" class="inline-link" data-reload-manage>Reload latest details</button>';
      notice.hidden = false;
      focusHeading(notice);
    } else {
      errorBox.textContent = request?.message || 'We couldn’t cancel your RSVP. Please try again.';
      errorBox.hidden = false;
      focusHeading(errorBox);
    }
  } finally {
    cancelling = false;
    dialog.removeAttribute('aria-busy');
    button.disabled = false; keep.disabled = false; button.textContent = 'Yes, cancel my RSVP';
  }
}

app.addEventListener('click', event => {
  const target = event.target as HTMLElement;
  if (target.closest('[data-reload-manage]')) void loadManage();
  if (target.closest('[data-open-cancel]')) surface.querySelector<HTMLDialogElement>('#cancel-dialog')!.showModal();
  if (target.closest('[data-keep-rsvp]') && !cancelling) surface.querySelector<HTMLDialogElement>('#cancel-dialog')!.close();
  if (target.closest('[data-confirm-cancel]')) void confirmCancellation();
});

// Scroll links must leave the private token in the URL fragment intact.
document.addEventListener('click', event => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest<HTMLAnchorElement>('a[href^="#"]');
  if (!anchor) return;
  const href = anchor.getAttribute('href');
  if (!href || href === '#' || href.startsWith('#token=')) return;
  const destination = document.getElementById(href.slice(1));
  if (!destination) return;
  event.preventDefault();
  focusHeading(destination);
});

window.addEventListener('hashchange', () => {
  const next = readToken();
  if (next === token) return;
  token = next; registration = null; void loadManage();
});

void getEvent().then(result => {
  settings = result;
  const recovery = surface.querySelector<HTMLElement>('.recovery-help');
  if (recovery) recovery.outerHTML = recoveryHelp(settings);
}).catch(() => { /* Existing private links still work when event contact details are unavailable. */ });
void loadManage();
