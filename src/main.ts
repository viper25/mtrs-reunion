import './public.css';
import type { EventSettings, Plan, Registration } from '../shared/model';
import { createRegistration, getEvent } from './lib/api';
import { copyText, escapeHtml, focusHeading, safeUrl } from './lib/dom';
import { contactLinks } from './components/contact';
import { icon } from './components/icons';
import { RegistrationForm } from './components/registration-form';
import { footer, wordmark } from './components/shell';

const app = document.querySelector<HTMLElement>('#app')!;
let registrationForm: RegistrationForm | null = null;
let selectedPlan: Plan | null = null;
let eventSettings: EventSettings | null = null;
let submitted = false;

const brochure = (): string => `
  <div class="brochure-slot">
    <button type="button" class="btn-pill btn-white" data-brochure disabled>
      ${icon('download')} Venue Brochure ↗
    </button>
  </div>`;

app.innerHTML = `
  <div id="top">
    <!-- Top App Navigation Bar (Screenshot 1 & 2 Style) -->
    <header class="site-header shell">
      <div class="flex-center gap-12">
        ${wordmark('#top')}
        <nav class="desktop-nav" aria-label="Main navigation">
          <a href="#top">Overview</a>
          <a href="#weekend">The Weekend</a>
          <a href="#venue">Venue & Stay</a>
          <a href="#plans">Ways to Join</a>
          <a href="#rsvp">RSVP</a>
        </nav>
      </div>

      <div class="header-actions">
        <span class="badge-status-pill" id="public-reg-pill">● registration open</span>
        <span class="header-timestamp">Aug 6–8, 2027 · Royal Orchid, Bangalore</span>
        <a class="btn-pill btn-black" href="#rsvp">Register Your Stay ↓</a>
        <button type="button" class="menu-toggle" aria-label="Open navigation" aria-controls="mobile-navigation" aria-expanded="false">
          ${icon('menu')}
        </button>
      </div>
    </header>

    <nav class="mobile-nav shell" id="mobile-navigation" aria-label="Mobile navigation" hidden>
      <a href="#top">Overview</a>
      <a href="#weekend">The Weekend</a>
      <a href="#venue">Venue & Stay</a>
      <a href="#plans">Ways to Join</a>
      <a href="#rsvp">Register your RSVP</a>
      <a href="/manage/">Manage Existing RSVP ↗</a>
      <a href="/admin/">Organizer Desk ↗</a>
    </nav>

    <main id="main-content" class="shell">
      <!-- Section 1: Hero Card (Screenshot 1 Style) -->
      <section class="hero-wrap" aria-labelledby="hero-title">
        <div class="hero-card">
          <div class="hero-card-header">
            <div>
              <div class="hero-eyebrow"><span class="dot-indicator green"></span> MTRS 95/97 · 30-YEAR REUNION</div>
              <h1 class="hero-title" id="hero-title">Old friends. A whole new set of <span class="script">memories.</span></h1>
              <p class="hero-subtitle">Relive school days of laughter, catch-ups, and nostalgia at Royal Orchid, Bangalore. 6–8 August 2027.</p>
            </div>
            <div class="hero-photo-showcase" aria-label="Reunion memories">
              <figure class="polaroid-card">
                <div class="tape" aria-hidden="true"></div>
                <img class="polaroid-img" src="/assets/class-memory-placeholder.svg" alt="MTRS Batch Memory" width="175" height="110" />
                <figcaption class="polaroid-caption">Remember this lot? ♡</figcaption>
              </figure>
              <figure class="polaroid-card polaroid-venue">
                <div class="tape" aria-hidden="true"></div>
                <img class="polaroid-img" src="/assets/venue-placeholder.svg" alt="Royal Orchid Hotel Bangalore" width="175" height="110" />
                <figcaption class="polaroid-caption">Royal Orchid, BLR</figcaption>
              </figure>
            </div>
          </div>

          <!-- 4 KPI Metrics Row -->
          <div class="kpi-row">
            <div class="kpi-item">
              <span class="kpi-label">Reunion dates</span>
              <div class="kpi-value-row">
                <span class="kpi-number font-22">6–8 Aug 2027</span>
              </div>
              <span class="kpi-subtext">Friday check-in to Sunday farewell</span>
            </div>

            <div class="kpi-item">
              <span class="kpi-label">Venue</span>
              <div class="kpi-value-row">
                <span class="kpi-number font-22">Royal Orchid</span>
              </div>
              <span class="kpi-subtext">Old Airport Road, Bangalore</span>
            </div>

            <div class="kpi-item" data-countdown aria-live="off">
              <span class="kpi-label">Countdown</span>
              <div class="kpi-value-row ring-stat">
                <svg class="ring-chart-svg" viewBox="0 0 36 36">
                  <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  <path class="ring-val" id="hero-ring" stroke-dasharray="25, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                </svg>
                <div>
                  <span class="kpi-number"><strong data-time="0">—</strong></span>
                  <span class="font-14 text-muted">days left</span>
                </div>
              </div>
              <span class="kpi-subtext"><span data-time="1">00</span>h <span data-time="2">00</span>m <span data-time="3">00</span>s live</span>
            </div>

            <div class="kpi-item">
              <span class="kpi-label">RSVP status</span>
              <div class="kpi-value-row">
                <span class="kpi-number flex-center">
                  <span class="dot-indicator green"></span> Open
                </span>
              </div>
              <span class="kpi-subtext">One RSVP per alumnus</span>
            </div>
          </div>

          <!-- Action Pills Row -->
          <div class="action-pills-row">
            <a href="#rsvp" class="btn-pill btn-black">Register Your Stay ↓</a>
            <a href="#weekend" class="btn-pill btn-white">Weekend Programme</a>
            <a href="#venue" class="btn-pill btn-white">Venue Details</a>
            <a href="/manage/" class="btn-pill btn-white">Already Registered? ↗</a>
            ${brochure()}
          </div>

          <!-- 3 Participation Tiers Grid (Screenshot 1 Tiers Style) -->
          <div class="tiers-grid" id="plans">
            <article class="tier-col plan-card plan-purple">
              <span class="preferred-tag">${icon('star')} Preferred Option</span>
              <div class="tier-top">
                <span class="tier-name"><span class="dot-indicator purple"></span> 2-night stay</span>
              </div>
              <span class="tier-dates">6–8 August 2027</span>
              <ul class="tier-details-list">
                <li>${icon('check')} 6 Aug: Check-in & welcome evening</li>
                <li>${icon('check')} 7 Aug: Main reunion celebrations 🎉</li>
                <li>${icon('check')} 8 Aug: Farewell breakfast & check-out</li>
              </ul>
              <button type="button" class="tier-action-btn" data-plan="2_night" aria-pressed="false">
                <span data-plan-label>Select Option</span> ${icon('arrowUpRight')}
              </button>
            </article>

            <article class="tier-col plan-card plan-mint">
              <div class="tier-top">
                <span class="tier-name"><span class="dot-indicator blue"></span> 1-night stay</span>
              </div>
              <span class="tier-dates">7–8 August 2027</span>
              <ul class="tier-details-list">
                <li>${icon('check')} 7 Aug: Check-in & reunion celebrations 🎉</li>
                <li>${icon('check')} 8 Aug: Farewell breakfast & check-out</li>
              </ul>
              <button type="button" class="tier-action-btn" data-plan="1_night" aria-pressed="false">
                <span data-plan-label>Select Option</span> ${icon('arrowUpRight')}
              </button>
            </article>

            <article class="tier-col plan-card plan-peach">
              <div class="tier-top">
                <span class="tier-name"><span class="dot-indicator amber"></span> Day attendee</span>
              </div>
              <span class="tier-dates">7 August 2027</span>
              <ul class="tier-details-list">
                <li>${icon('check')} 7 Aug: Join main event & celebrations</li>
              </ul>
              <button type="button" class="tier-action-btn" data-plan="day_attendee" aria-pressed="false">
                <span data-plan-label>Select Option</span> ${icon('arrowUpRight')}
              </button>
            </article>
          </div>

          <p class="hero-footer-note">Limits and room coordination are managed by the organizing committee.</p>
        </div>
      </section>

      <!-- Section 2: Venue & Travel Spotlight (Screenshot 1 "Usage Against Limits" 3-Card Style) -->
      <section class="section-block" id="venue" aria-labelledby="venue-title">
        <div class="section-heading-row">
          <h2 class="section-title" id="venue-title">Venue & Travel Spotlight</h2>
          <p class="section-sub">Everything you need to know about our home for the weekend.</p>
        </div>
        <div class="limits-grid">
          <div class="limit-card">
            <div class="limit-card-img-wrap">
              <img src="/assets/venue-placeholder.svg" alt="Hotel Royal Orchid Bangalore" class="limit-card-img" width="400" height="140" />
            </div>
            <span class="limit-card-label"><span class="dot-indicator green"></span> Royal Orchid, Bangalore</span>
            <p class="limit-card-desc">Old Airport Road · Adjacent to KGA Golf Course. Resort ambiance, sprawling gardens, fine dining, and rooftop pool for our reunion catch-ups.</p>
            <a class="limit-card-link" href="https://www.royalorchidhotels.com/hotel-royal-orchid-bangalore/overview" target="_blank" rel="noopener noreferrer">
              Hotel details ↗
            </a>
          </div>

          <div class="limit-card">
            <span class="limit-card-label"><span class="dot-indicator blue"></span> Getting Here from BLR</span>
            <p class="limit-card-desc">Kempegowda Airport ~40 km away. Direct airport taxis and BMTC airport shuttle buses available. Note your airport transfer interest in your RSVP.</p>
            <a class="limit-card-link" href="https://kstdc.co/airport-taxi-bangalore/" target="_blank" rel="noopener noreferrer">
              Airport transport info ↗
            </a>
          </div>

          <div class="limit-card">
            <span class="limit-card-label"><span class="dot-indicator amber"></span> Bangalore in August</span>
            <p class="limit-card-desc">Mild, breezy monsoon weather (~20–28°C) with occasional showers. Pack a light layer and an umbrella so you're ready for both catching up and stepping out.</p>
            <a class="limit-card-link" href="https://mausam.imd.gov.in/bengaluru/mcdata/climate.pdf" target="_blank" rel="noopener noreferrer">
              Climate guide ↗
            </a>
          </div>
        </div>
      </section>

      <!-- Section 3: Weekend Programme Timeline -->
      <section class="section-block" id="weekend" aria-labelledby="weekend-title">
        <div class="section-heading-row">
          <h2 class="section-title" id="weekend-title">The Weekend Programme</h2>
          <p class="section-sub">Three days of catching up, shared laughter, and new memories.</p>
        </div>
        <div class="timeline-grid">
          <article class="timeline-card day-friday">
            <div class="timeline-card-header">
              <span class="timeline-date-pill">Friday · 06 Aug 2027</span>
              ${icon('sun')}
            </div>
            <h3>Well, look who’s here.</h3>
            <p>Check in, settle in, and ease into our welcome evening catch-up. The stories and “remember whens” start here.</p>
            <span class="timeline-note">Welcome Dinner & Informal Drinks</span>
          </article>

          <article class="timeline-card day-saturday">
            <div class="timeline-card-header">
              <span class="timeline-date-pill">Saturday · 07 Aug 2027</span>
              ${icon('star')}
            </div>
            <h3>All together. At last.</h3>
            <p>The main reunion celebrations! A full day and festive evening for all alumni, shared memories, photo sessions, and speeches.</p>
            <span class="timeline-note">Gala Dinner & Milestone Celebrations</span>
          </article>

          <article class="timeline-card day-sunday">
            <div class="timeline-card-header">
              <span class="timeline-date-pill">Sunday · 08 Aug 2027</span>
              ${icon('heart')}
            </div>
            <h3>One more breakfast.</h3>
            <p>A farewell breakfast before checkout. Longer goodbyes, fuller hearts, and a promise to do it again soon.</p>
            <span class="timeline-note">Farewell Breakfast & Check-out</span>
          </article>
        </div>
      </section>

      <!-- Section 4: RSVP Form Container -->
      <section class="rsvp-surface-wrap" id="rsvp" aria-labelledby="rsvp-title">
        <div class="registration-surface" id="registration-surface">
          <div class="table-state-box" role="status">
            <div class="spinner-ring" aria-hidden="true"></div>
            <p>Getting everything ready for you…</p>
          </div>
        </div>
      </section>

      <section class="section-block" id="contact" hidden aria-labelledby="contact-title">
        <h2 class="section-title" id="contact-title">Need help with your RSVP?</h2>
        <div data-contact-links></div>
      </section>
    </main>

    ${footer()}
  </div>`;

function updateSelectedPlan(): void {
  app.querySelectorAll<HTMLButtonElement>('[data-plan]').forEach(button => {
    const active = button.dataset.plan === selectedPlan;
    button.setAttribute('aria-pressed', String(active));
    button.closest('.plan-card')?.classList.toggle('is-selected', active);
    button.querySelector<HTMLElement>('[data-plan-label]')!.textContent = eventSettings && !eventSettings.registrationOpen ? 'Registration closed' : active ? 'Selected' : 'Select Option';
  });
}

function showConfirmation(registration: Registration, token: string): void {
  submitted = true;
  registrationForm = null;
  const surface = document.querySelector<HTMLElement>('#registration-surface')!;
  const link = `${window.location.origin}/manage/#token=${encodeURIComponent(token)}`;
  surface.innerHTML = `
    <section class="confirmation-panel" aria-labelledby="confirmation-title">
      <div class="confirmation-art" aria-hidden="true">${icon('check')}</div>
      <p class="hero-eyebrow">RSVP CONFIRMED</p>
      <h3 id="confirmation-title" tabindex="-1">You’re in, ${escapeHtml(registration.fullName)}!</h3>
      <p class="text-muted font-14 mb-20">We’re looking forward to seeing you at Royal Orchid, Bangalore.</p>
      
      <div class="private-link-box">
        <h4>${icon('lock')} Save your private management link</h4>
        <p class="text-muted font-12 mb-10">This link is shown only on this confirmation screen. Save it now to edit or cancel your RSVP later.</p>
        <label for="management-link" class="sr-only">Your private link</label>
        <input id="management-link" type="text" readonly spellcheck="false" value="${escapeHtml(link)}" />
        <div class="flex-center gap-10">
          <button type="button" class="btn-pill btn-black" data-copy-link>${icon('copy')} Copy private link</button>
          <a href="${escapeHtml(link)}" class="btn-pill btn-white">Manage my RSVP ↗</a>
        </div>
        <p class="copy-feedback text-muted font-11 mt-10" data-copy-feedback role="status"></p>
      </div>

      <p class="text-muted font-12">Organizers will coordinate room arrangements and payment separately.</p>
    </section>`;

  surface.querySelector<HTMLButtonElement>('[data-copy-link]')!.addEventListener('click', () => {
    const input = surface.querySelector<HTMLInputElement>('#management-link')!;
    void copyText(link, input, surface.querySelector<HTMLElement>('[data-copy-feedback]')!);
  });
  focusHeading(surface.querySelector<HTMLElement>('#confirmation-title'));
}

function renderRegistration(settings: EventSettings): void {
  const surface = document.querySelector<HTMLElement>('#registration-surface')!;
  if (submitted) return;
  if (!settings.registrationOpen) {
    registrationForm = null;
    surface.innerHTML = `
      <section class="confirmation-panel" aria-labelledby="closed-title">
        <div class="confirmation-art bg-danger-subtle">${icon('close')}</div>
        <p class="hero-eyebrow">REGISTRATION PAUSED</p>
        <h3 id="closed-title">Registration is currently closed.</h3>
        <p class="text-muted font-13 mb-20">You can still explore the weekend programme and venue details.</p>
        <p class="text-muted font-13">Already registered? Use your saved private management link to view your RSVP or cancel if your plans change.</p>
        <div class="mt-20">
          <a class="btn-pill btn-white" href="/manage/">Manage an existing RSVP ↗</a>
        </div>
        ${contactLinks(settings)}
      </section>`;
    const pill = document.querySelector<HTMLElement>('#public-reg-pill');
    if (pill) {
      pill.textContent = '● registration closed';
      pill.classList.add('closed');
    }
  } else {
    registrationForm = new RegistrationForm(surface, {
      mode: 'create',
      onSubmit: async (input, website) => {
        const result = await createRegistration(input, website);
        showConfirmation(result.registration, result.managementToken);
      },
    });
    registrationForm.element.addEventListener('change', event => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.name === 'plan') {
        selectedPlan = target.value as Plan;
        updateSelectedPlan();
      }
    });
    if (selectedPlan) registrationForm.setPlan(selectedPlan);
  }
  app.querySelectorAll<HTMLButtonElement>('[data-plan]').forEach(button => {
    button.disabled = !settings.registrationOpen;
  });
  updateSelectedPlan();
}

async function loadEvent(): Promise<void> {
  try {
    eventSettings = await getEvent();
    const url = safeUrl(eventSettings.brochureUrl);
    app.querySelectorAll<HTMLElement>('.brochure-slot').forEach(slot => {
      if (url) {
        slot.innerHTML = `<a class="btn-pill btn-white" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${icon('download')} Venue Brochure ↗</a>`;
      }
    });
    const contacts = contactLinks(eventSettings);
    const contactSection = app.querySelector<HTMLElement>('#contact')!;
    if (contacts) {
      contactSection.hidden = false;
      contactSection.querySelector<HTMLElement>('[data-contact-links]')!.innerHTML = contacts;
    }
    renderRegistration(eventSettings);
  } catch {
    const surface = app.querySelector<HTMLElement>('#registration-surface')!;
    surface.innerHTML = `
      <div class="table-state-box" role="alert">
        <h3>We couldn’t load registration.</h3>
        <p>Check your connection and try again. You can still explore the reunion details.</p>
        <button type="button" class="btn-pill btn-black" data-retry-event>Try again</button>
      </div>`;
  }
}

app.addEventListener('click', event => {
  const target = event.target as HTMLElement;
  const planButton = target.closest<HTMLButtonElement>('[data-plan]');
  if (planButton && !planButton.disabled) {
    if (submitted) {
      focusHeading(app.querySelector<HTMLElement>('#confirmation-title'));
      return;
    }
    selectedPlan = planButton.dataset.plan as Plan;
    registrationForm?.setPlan(selectedPlan);
    updateSelectedPlan();
    app.querySelector<HTMLElement>('#rsvp')!.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }
  if (target.closest('[data-retry-event]')) {
    void loadEvent();
  }
  const menuToggle = target.closest<HTMLButtonElement>('.menu-toggle');
  if (menuToggle) {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    menuToggle.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
    menuToggle.innerHTML = icon(expanded ? 'menu' : 'close');
    app.querySelector<HTMLElement>('#mobile-navigation')!.hidden = expanded;
  }
  if (target.closest('#mobile-navigation a')) {
    app.querySelector<HTMLElement>('#mobile-navigation')!.hidden = true;
    const menu = app.querySelector<HTMLButtonElement>('.menu-toggle')!;
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
    menu.innerHTML = icon('menu');
  }
});

const reunionStart = new Date('2027-08-06T14:00:00+05:30').getTime();
function tick(): void {
  const seconds = Math.max(0, Math.floor((reunionStart - Date.now()) / 1000));
  const values = [
    Math.floor(seconds / 86400),
    Math.floor((seconds % 86400) / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ];
  app.querySelectorAll<HTMLElement>('[data-time]').forEach((element, index) => {
    element.textContent = String(values[index]).padStart(2, '0');
  });
  const ring = app.querySelector<SVGPathElement>('#hero-ring');
  if (ring) {
    const days = values[0];
    const percent = Math.min(100, Math.max(5, (1 - days / 365) * 100));
    ring.setAttribute('stroke-dasharray', `${percent.toFixed(1)}, 100`);
  }
  const cd = app.querySelector<HTMLElement>('[data-countdown]');
  if (cd) {
    cd.setAttribute('aria-label', seconds > 0 ? `${values[0]} days, ${values[1]} hours, ${values[2]} minutes until the reunion` : 'Our reunion weekend has arrived');
  }
}
tick();
window.setInterval(tick, 1000);
void loadEvent();
