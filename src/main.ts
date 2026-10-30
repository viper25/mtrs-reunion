import './public.css';
import type { EventSettings, Plan, Registration } from '../shared/model';
import { createRegistration, getEvent } from './lib/api';
import { copyText, escapeHtml, focusHeading, safeUrl } from './lib/dom';
import { contactLinks } from './components/contact';
import { icon } from './components/icons';
import { RegistrationForm } from './components/registration-form';
import { footer, photo, wordmark } from './components/shell';

const app = document.querySelector<HTMLElement>('#app')!;
let registrationForm: RegistrationForm | null = null;
let selectedPlan: Plan | null = null;
let eventSettings: EventSettings | null = null;
let submitted = false;

const brochure = (): string => `<div class="brochure-slot"><button type="button" class="brochure-button" data-brochure disabled>${icon('download')} Download Venue Brochure ${icon('arrowUpRight')}</button><p class="small-note" data-brochure-note>The venue brochure will be added soon.</p></div>`;

app.innerHTML = `
  <div id="top">
    <header class="site-header page-width">${wordmark('#top')}<nav class="desktop-nav" aria-label="Main navigation"><a href="#weekend">The weekend</a><a href="#venue">Our little getaway</a><a href="#plans">Ways to join</a></nav><div class="header-actions"><a class="header-rsvp" href="#rsvp">I’m coming ${icon('arrowUpRight')}</a><button type="button" class="menu-toggle" aria-label="Open navigation" aria-controls="mobile-navigation" aria-expanded="false">${icon('menu')}</button></div></header>
    <nav class="mobile-nav page-width" id="mobile-navigation" aria-label="Mobile navigation" hidden><a href="#weekend">The weekend</a><a href="#venue">Our little getaway</a><a href="#plans">Ways to join</a><a href="#rsvp">Register your RSVP</a></nav>
    <main id="main-content">
      <section class="hero page-width" aria-labelledby="hero-title"><div class="hero-copy"><div class="top-note"><span aria-hidden="true">✳</span> THE WAIT IS FINALLY OVER!</div><p class="script hero-script">Same old friends.</p><h1 id="hero-title">A whole new<br><span>set of memories.</span></h1><p class="reunion-title">Reunion — Let’s Get Together <span aria-label="love">♥</span></p><p class="hero-description">The stories haven’t got old.<br>Neither has the feeling of being together.<br>Let’s pick up where we left off.</p><div class="hero-actions"><a href="#rsvp" class="button button-primary">Register Your Stay ${icon('arrowUpRight')}</a><a href="#weekend" class="text-link">What’s the plan? ${icon('arrow')}</a></div><div class="event-facts"><span>${icon('calendar')}<strong>6–8 August 2027</strong></span><span>${icon('pin')}Royal Orchid, Bangalore</span></div><div class="hero-brochure">${brochure()}</div></div>
      <div class="memory-board" aria-label="A scrapbook of old friendships and our next getaway"><div class="grid-paper" aria-hidden="true"></div><div class="polaroid polaroid-class"><span class="tape" aria-hidden="true"></span><div class="scrapbook-photo">${photo('class', 'Class photo placeholder')}</div><p class="polaroid-caption">Remember this lot? <span>♡</span></p></div><div class="polaroid polaroid-venue"><div class="scrapbook-photo">${photo('venue', 'Venue photo placeholder')}</div><p class="polaroid-caption">Next stop: Bangalore!</p></div><div class="round-sticker"><span>GOOD FRIENDS</span><strong>great<br>weekend.</strong><span>6—8 AUGUST 2027</span></div><p class="script board-note">A little nostalgia.<br>A little getaway.<span aria-hidden="true">⤵</span></p><span class="memory-spark spark-one" aria-hidden="true">✦</span><span class="memory-spark spark-two" aria-hidden="true">✳</span></div></section>

      <section class="countdown-band" aria-label="Countdown to the reunion"><div class="page-width countdown-inner"><div><span class="script">Worth the wait.</span><p>Until we’re all in the same room again.</p></div><div class="countdown" data-countdown aria-live="off">${['Days', 'Hours', 'Mins', 'Secs'].map((label, index) => `<div class="countdown-unit"><strong data-time="${index}">—</strong><span>${label}</span></div>`).join('<span class="countdown-separator" aria-hidden="true">:</span>')}</div><span class="band-heart script" aria-hidden="true">♡</span></div></section>

      <section class="welcome page-width" id="venue" aria-labelledby="venue-title"><div class="welcome-visual"><div class="venue-frame">${photo('venue', 'Royal Orchid, Bangalore · photo to come')}<div class="venue-photo-label">OUR HOME FOR THE WEEKEND</div></div><span class="script photo-note">A change of scene.<br>The same familiar faces.</span><span class="little-star" aria-hidden="true">✳</span></div><div class="welcome-copy"><p class="kicker">THE PLACE IS PICKED</p><h2 id="venue-title">Somewhere lovely.<br><span class="script">With our favourite people.</span></h2><p>After exploring multiple hotel options and much deliberation we’re happy to announce that <strong>Royal Orchid, Bangalore</strong>, is our chosen venue!</p><p>A resort-style setting, gardens, dining, and a rooftop pool make room for a little getaway and a lot of catching up.</p><div class="venue-address">${icon('pin')}<span><strong>Royal Orchid, Bangalore</strong><br>Old Airport Road · Adjacent to KGA Golf Course</span></div>${brochure()}<a class="source-link" href="https://www.royalorchidhotels.com/hotel-royal-orchid-bangalore/overview" target="_blank" rel="noopener noreferrer">Hotel details ${icon('arrowUpRight')}</a></div></section>

      <section class="weekend-section" id="weekend" aria-labelledby="weekend-title"><div class="page-width"><div class="section-heading"><div><p class="kicker">THREE DAYS. SO MANY STORIES.</p><h2 id="weekend-title">Leave room for <span class="script">a little nostalgia.</span></h2></div><p>Come for the celebrations.<br>Stay for the conversations.</p></div><div class="weekend-timeline">
        <article class="weekend-day"><div class="day-top"><span class="day-number">06</span><div><strong>FRIDAY</strong><span>AUGUST 2027</span></div>${icon('sun')}</div><span class="timeline-dot" aria-hidden="true"></span><h3>Well, look who’s here.</h3><p>Check in, settle in, and ease into our welcome evening. The catching up starts here.</p><span class="script day-footnote">The first of many “remember when”s.</span></article>
        <article class="weekend-day"><div class="day-top"><span class="day-number">07</span><div><strong>SATURDAY</strong><span>AUGUST 2027</span></div>${icon('star')}</div><span class="timeline-dot" aria-hidden="true"></span><h3>All together. At last.</h3><p>The main reunion celebrations! A day for familiar faces, shared memories, and a few new ones.</p><span class="script day-footnote">This one’s for all of us.</span></article>
        <article class="weekend-day"><div class="day-top"><span class="day-number">08</span><div><strong>SUNDAY</strong><span>AUGUST 2027</span></div>${icon('heart')}</div><span class="timeline-dot" aria-hidden="true"></span><h3>One more breakfast.</h3><p>A farewell breakfast before check-out. Longer goodbyes, fuller hearts, and a promise to do it again.</p><span class="script day-footnote">Until the next one…</span></article>
      </div></div></section>

      <section class="plans-section page-width" id="plans" aria-labelledby="plans-title"><div class="centered-heading"><p class="kicker">MAKE YOURSELF PART OF THE STORY</p><h2 id="plans-title">A whole weekend, <span class="script">or a wonderful day.</span></h2><p>However long you can stay, we’d love to see you.</p></div><div class="plan-grid">
        <article class="plan-card plan-purple"><div class="preferred-badge">${icon('star')} OUR PREFERRED OPTION!</div><div class="plan-meta"><span>THE FULL CATCH-UP</span><span>01</span></div><h3>2-night stay</h3><p class="plan-dates">6–8 August 2027</p><ul><li>${icon('check')}<span><strong>6 Aug</strong> · Check-in & welcome evening</span></li><li>${icon('check')}<span><strong>7 Aug</strong> · Main reunion celebrations</span></li><li>${icon('check')}<span><strong>8 Aug</strong> · Farewell breakfast & check-out</span></li></ul><p class="script plan-note">More time. More memories.</p><button type="button" class="plan-button" data-plan="2_night" aria-pressed="false"><span data-plan-label>Select Plan</span>${icon('arrowUpRight')}</button></article>
        <article class="plan-card plan-mint"><div class="plan-meta"><span>A LITTLE ESCAPE</span><span>02</span></div><h3>1-night stay</h3><p class="plan-dates">7–8 August 2027</p><ul><li>${icon('check')}<span><strong>7 Aug</strong> · Check-in & reunion celebrations</span></li><li>${icon('check')}<span><strong>8 Aug</strong> · Farewell breakfast & check-out</span></li></ul><p class="script plan-note">A night away with the old gang.</p><button type="button" class="plan-button" data-plan="1_night" aria-pressed="false"><span data-plan-label>Select Plan</span>${icon('arrowUpRight')}</button></article>
        <article class="plan-card plan-peach"><div class="plan-meta"><span>DON’T MISS THE PARTY</span><span>03</span></div><h3>Day attendee</h3><p class="plan-dates">7 August 2027</p><ul><li>${icon('check')}<span><strong>7 Aug</strong> · Join the main event & celebrations</span></li></ul><p class="script plan-note">One day. All the good company.</p><button type="button" class="plan-button" data-plan="day_attendee" aria-pressed="false"><span data-plan-label>Select Plan</span>${icon('arrowUpRight')}</button></article>
      </div><p class="plans-note">Your RSVP confirms attendance. The organizers will coordinate room arrangements and payment separately.</p></section>

      <section class="logistics page-width" aria-labelledby="travel-title"><div class="travel-intro"><span class="travel-icon" aria-hidden="true">${icon('plane')}</span><p class="kicker">FROM NEAR OR FAR</p><h2 id="travel-title">Find your way <span class="script">back to the gang.</span></h2><p>Flying into Bangalore? A little planning makes more room for the good stuff.</p><span class="script travel-note">We’ll help with the details.</span></div><div class="travel-accordion">
        <details><summary>Getting here from BLR ${icon('plus')}</summary><p>The hotel currently lists Kempegowda International Airport about 40 km away. Consider a direct airport taxi or ask the hotel about arranging a transfer. Travel time depends on traffic.</p><p><a href="https://kstdc.co/airport-taxi-bangalore/" target="_blank" rel="noopener noreferrer">Airport taxi information</a> · <a href="https://kias.mybmtc.com/" target="_blank" rel="noopener noreferrer">Airport bus services</a></p></details>
        <details><summary>Check-in & check-out ${icon('plus')}</summary><p>The hotel currently lists check-in at 2 pm and check-out at 11 am. Arrangements for our August 2027 reunion will be confirmed by the organizers.</p><p><a href="https://www.royalorchidhotels.com/hotel-royal-orchid-bangalore/overview" target="_blank" rel="noopener noreferrer">Hotel details</a></p></details>
        <details><summary>Bangalore in August ${icon('plus')}</summary><p>August is typically mild with showers. Pack a light layer and an umbrella so you’re ready for both catching up and stepping out.</p><p><a href="https://mausam.imd.gov.in/bengaluru/mcdata/climate.pdf" target="_blank" rel="noopener noreferrer">Climate guide</a> · Typical seasonal conditions, rather than a forecast for 2027.</p></details>
        <details><summary>Room sharing & airport transfer interest ${icon('plus')}</summary><p>Choose double / twin sharing and add a preferred batchmate’s name if you have one. If you’re flying in, use the RSVP form to share your arrival details and interest in a transfer. Organizers will coordinate these arrangements separately.</p></details>
      </div></section>

      <section class="rsvp-section" id="rsvp" aria-labelledby="rsvp-title"><div class="page-width rsvp-layout"><aside class="rsvp-intro"><p class="kicker">THE BEST PART IS YOU</p><h2 id="rsvp-title">There’s a place<br>for you <span class="script">here.</span></h2><p>Let us know you’re coming. One RSVP per alumnus, a few little details, and one very big reunion to look forward to.</p><div class="rsvp-sticky-note"><span class="note-pin" aria-hidden="true"></span><p class="script">We saved you a spot<br>in the next chapter.</p><span aria-hidden="true">♡</span></div><div class="rsvp-facts"><p>${icon('calendar')}6–8 August 2027</p><p>${icon('pin')}Royal Orchid, Bangalore</p><p>${icon('users')}MTRS 95/97</p></div><a class="existing-rsvp-link" href="/manage/">Already registered? Use your saved private link.</a></aside><div class="registration-surface" id="registration-surface"><div class="loading-panel" role="status"><span class="spinner dark-spinner" aria-hidden="true"></span><p>Getting everything ready for you…</p></div></div></div></section>
      <section class="organizer-contact page-width" id="contact" hidden aria-labelledby="contact-title"><div><p class="kicker">WE’RE HERE TO HELP</p><h2 id="contact-title">A question for <span class="script">the gang?</span></h2></div><div data-contact-links></div></section>
    </main>${footer()}
  </div>`;

function updateSelectedPlan(): void {
  app.querySelectorAll<HTMLButtonElement>('[data-plan]').forEach(button => {
    const active = button.dataset.plan === selectedPlan;
    button.setAttribute('aria-pressed', String(active));
    button.closest('.plan-card')?.classList.toggle('is-selected', active);
    button.querySelector<HTMLElement>('[data-plan-label]')!.textContent = eventSettings && !eventSettings.registrationOpen ? 'Registration closed' : active ? 'Selected' : 'Select Plan';
  });
}

function showConfirmation(registration: Registration, token: string): void {
  submitted = true;
  registrationForm = null;
  const surface = document.querySelector<HTMLElement>('#registration-surface')!;
  const link = `${window.location.origin}/manage/#token=${encodeURIComponent(token)}`;
  surface.innerHTML = `<section class="confirmation-panel" aria-labelledby="confirmation-title"><div class="confirmation-art" aria-hidden="true"><span>✳</span><div>${icon('check')}</div><span>✦</span></div><p class="kicker">RSVP CONFIRMED</p><h3 id="confirmation-title" tabindex="-1">You’re in, <span class="script">old friend!</span></h3><p>We’re looking forward to seeing you, <strong>${escapeHtml(registration.fullName)}</strong>.</p><p class="confirmation-plan">${icon('calendar')}${escapeHtml(registration.plan === '2_night' ? '2-night stay · 6–8 August 2027' : registration.plan === '1_night' ? '1-night stay · 7–8 August 2027' : 'Day attendee · 7 August 2027')}</p><div class="private-link-box"><h4>${icon('lock')} Save your private management link</h4><p>This link is shown only on this confirmation screen. Save it now to edit or cancel your RSVP later.</p><label for="management-link">Your private link</label><input id="management-link" type="text" readonly spellcheck="false" value="${escapeHtml(link)}" /><button type="button" class="button button-primary" data-copy-link>${icon('copy')} Copy private link</button><p class="copy-feedback" data-copy-feedback role="status"></p><p class="privacy-reminder">Anyone with this link can view, edit, or cancel your RSVP. Keep it private.</p></div><a href="${escapeHtml(link)}" class="inline-link">Manage my RSVP ${icon('arrowUpRight')}</a><p class="small-note">Organizers will coordinate rooms and payment separately.</p></section>`;
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
    surface.innerHTML = `<section class="closed-panel" aria-labelledby="closed-title"><span class="closed-icon">${icon('heart')}</span><p class="kicker">THE REUNION IS STILL HERE</p><h3 id="closed-title">Registration is closed.</h3><p>You can still explore the weekend programme and venue details.</p><p>Already registered? Use your saved private management link to view your RSVP or cancel if your plans change.</p><a class="button button-secondary" href="/manage/">Manage an existing RSVP ${icon('arrowUpRight')}</a>${contactLinks(settings)}</section>`;
  } else {
    registrationForm = new RegistrationForm(surface, { mode: 'create', onSubmit: async (input, website) => {
      const result = await createRegistration(input, website);
      showConfirmation(result.registration, result.managementToken);
    } });
    registrationForm.element.addEventListener('change', event => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.name === 'plan') { selectedPlan = target.value as Plan; updateSelectedPlan(); }
    });
    if (selectedPlan) registrationForm.setPlan(selectedPlan);
  }
  app.querySelectorAll<HTMLButtonElement>('[data-plan]').forEach(button => { button.disabled = !settings.registrationOpen; });
  updateSelectedPlan();
}

async function loadEvent(): Promise<void> {
  try {
    eventSettings = await getEvent();
    const url = safeUrl(eventSettings.brochureUrl);
    app.querySelectorAll<HTMLElement>('.brochure-slot').forEach(slot => {
      if (url) slot.innerHTML = `<a class="brochure-button" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${icon('download')} Download Venue Brochure ${icon('arrowUpRight')}</a><p class="small-note">Opens the hotel brochure in a new tab.</p>`;
    });
    const contacts = contactLinks(eventSettings);
    const contactSection = app.querySelector<HTMLElement>('#contact')!;
    if (contacts) { contactSection.hidden = false; contactSection.querySelector<HTMLElement>('[data-contact-links]')!.innerHTML = contacts; }
    renderRegistration(eventSettings);
  } catch {
    const surface = app.querySelector<HTMLElement>('#registration-surface')!;
    surface.innerHTML = `<div class="connection-panel" role="alert"><h3>We couldn’t load registration.</h3><p>Check your connection and try again. You can still explore the reunion details.</p><button type="button" class="button button-primary" data-retry-event>Try again ${icon('arrow')}</button></div>`;
  }
}

app.addEventListener('click', event => {
  const target = event.target as HTMLElement;
  const planButton = target.closest<HTMLButtonElement>('[data-plan]');
  if (planButton && !planButton.disabled) {
    if (submitted) { focusHeading(app.querySelector<HTMLElement>('#confirmation-title')); return; }
    selectedPlan = planButton.dataset.plan as Plan;
    registrationForm?.setPlan(selectedPlan);
    updateSelectedPlan();
    app.querySelector<HTMLElement>('#rsvp')!.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  if (target.closest('[data-retry-event]')) { void loadEvent(); }
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
    menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open navigation'); menu.innerHTML = icon('menu');
  }
});

const reunionStart = new Date('2027-08-06T14:00:00+05:30').getTime();
function tick(): void {
  const seconds = Math.max(0, Math.floor((reunionStart - Date.now()) / 1000));
  const values = [Math.floor(seconds / 86400), Math.floor((seconds % 86400) / 3600), Math.floor((seconds % 3600) / 60), seconds % 60];
  app.querySelectorAll<HTMLElement>('[data-time]').forEach((element, index) => { element.textContent = String(values[index]).padStart(2, '0'); });
  app.querySelector<HTMLElement>('[data-countdown]')!.setAttribute('aria-label', seconds > 0 ? `${values[0]} days, ${values[1]} hours, ${values[2]} minutes until the reunion` : 'Our reunion weekend has arrived');
}
tick();
window.setInterval(tick, 1000);
void loadEvent();
