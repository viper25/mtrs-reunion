// THROWAWAY UI study: three structurally different layouts, simulated RSVP only.
import { renderA } from './variants/a.js';
import { renderB } from './variants/b.js';
import { renderC } from './variants/c.js';

const variants = {
  A: { name: 'Class scrapbook', render: renderA, question: 'Does a personal, nostalgic invitation make the weekend feel like ours?', flow: 'One-page form, then review' },
  B: { name: 'Resort invitation', render: renderB, question: 'Does a spacious resort invitation balance old friendships with a weekend away?', flow: 'Short steps, then review' },
  C: { name: 'Weekend itinerary', render: renderC, question: 'Does leading with the weekend programme make it easier to choose how to join?', flow: 'Short steps, then review' },
};
const params = new URLSearchParams(location.search);
const state = { variant: variants[params.get('variant')] ? params.get('variant') : 'A', plan: '', step: 1, values: {}, outcome: 'success', submission: 'idle', stateOpen: false };
const plans = { '2_night': { title: '2-night stay', dates: '6–8 August 2027' }, '1_night': { title: '1-night stay', dates: '7–8 August 2027' }, 'day_attendee': { title: 'Day attendee', dates: '7 August 2027' } };
const app = document.querySelector('#app');
const tools = document.querySelector('#prototype-tools');
const dialog = document.querySelector('#confirmation');
let photoIndex = 0;
let toastTimer;
let submissionTimer;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const paths = {
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  arrowUpRight: '<path d="M6 18 18 6M6 6h12v12"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2m4 0h2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  star: '<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3L2.8 9.7l6.4-.9L12 3Z"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  plane: '<path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  leaf: '<path d="M20 3C9 2 3 6 3 12a7 7 0 0 0 7 7c6 0 10-6 10-16ZM3 21 15 9"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-2-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
};
function icon(name) { return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.heart}</svg>`; }

function photo(kind, label) {
  const id = `placeholder-${++photoIndex}`;
  const isVenue = kind === 'venue';
  const picture = isVenue ? `
    <rect width="700" height="500" fill="#d4dfcf"/>
    <circle cx="522" cy="110" r="69" fill="#f7d87d"/>
    <path d="M0 298Q180 210 330 280T700 238V500H0Z" fill="#9fb9a0"/>
    <rect x="125" y="180" width="440" height="208" rx="3" fill="#f2ead6"/>
    <path d="M104 180h480l-45-35H149Z" fill="#7d9a80"/>
    <rect x="286" y="222" width="107" height="166" rx="53" fill="#839a87"/>
    <path d="M296 388V278a44 44 0 0 1 87 0v110" fill="#c1d3bc"/>
    <path d="M163 231h75v91h-75zm288 0h75v91h-75z" fill="#b9cbb6"/>
    <path d="M200 232v90m-37-45h75m250-45v90m-37-45h75" stroke="#ede7d6" stroke-width="6"/>
    <path d="M0 388h700v112H0Z" fill="#b8cbb0"/>
    <path d="M207 419h331l64 81H143Z" fill="#86b9b5"/>
    <path d="M224 428h295l36 48H183Z" fill="#b2d4ce"/>
    <path d="M42 402q20-172 10-278m0 0q-70 15-80 70m80-70q60 9 76 60m-76-60q-46-60-82-40m82 40q45-58 95-36" fill="none" stroke="#4f7964" stroke-width="14" stroke-linecap="round"/>
    <path d="M644 400q-18-153-2-229m0 0q-58 6-88 53m88-53q38 5 73 48m-73-48q-42-44-79-33m79 33q36-46 78-23" fill="none" stroke="#648a6d" stroke-width="12" stroke-linecap="round"/>
    <text x="345" y="350" text-anchor="middle" fill="#56775f" font-family="sans-serif" font-size="11" letter-spacing="4">A WEEKEND AWAY</text>
  ` : `
    <rect width="700" height="500" fill="#e3d9bf"/>
    <path d="M0 40h700v280H0Z" fill="#b7c5b1"/>
    <path d="M60 320V130h580v190" fill="#f1e9d4"/>
    <path d="M40 130 350 40l310 90Z" fill="#7f9c83"/>
    <path d="M313 320V187a37 37 0 0 1 74 0v133" fill="#9cae95"/>
    <path d="M111 170h62v76h-62zm106 0h62v76h-62zm205 0h62v76h-62zm107 0h62v76h-62z" fill="#bec8b3"/>
    <path d="M0 320h700v180H0Z" fill="#c2b99d"/>
    <path d="M0 382q250-40 700 20v98H0Z" fill="#9fae93"/>
    ${[136,243,350,457,564].map((x,i)=>`<g transform="translate(${x} ${i%2?293:308})"><circle cy="0" r="24" fill="${i%2?'#a97f61':'#bb9472'}"/><path d="M-25-6a25 25 0 0 1 50 0v-13a25 20 0 0 0-50 0Z" fill="#4e5748"/><path d="M-43 92V53a43 43 0 0 1 86 0v39" fill="${i%2?'#edf0dc':'#d4dfd0'}"/><path d="m-15 31 15 20 15-20" fill="#839e93"/><path d="M-43 92h86" stroke="#7c8c7a" stroke-width="3"/></g>`).join('')}
    <path d="M0 0h700v500H0Z" fill="#e1b56d" opacity=".08"/>
    <text x="350" y="470" text-anchor="middle" fill="#4e675a" font-family="sans-serif" font-size="12" letter-spacing="7">SAME PEOPLE. NEW STORIES.</text>
  `;
  return `<figure class="photo-slot photo-slot--${kind}"><svg viewBox="0 0 700 500" preserveAspectRatio="xMidYMid slice" role="img" aria-labelledby="${id}"><title id="${id}">${escape(label)} — illustration placeholder, not an actual photograph</title>${picture}</svg><figcaption>${escape(label)} · image placeholder</figcaption></figure>`;
}

function countdown() {
  return `<div class="countdown" aria-label="Countdown to 6 August 2027, 2 pm India time">${['days','hours','minutes','seconds'].map((unit,i)=>`${i ? '<span class="countdown-separator" aria-hidden="true">:</span>' : ''}<div class="countdown-unit"><strong data-countdown="${unit}">00</strong><span>${unit}</span></div>`).join('')}</div>`;
}

function travel() {
  return `<div class="travel-accordion">
    <details><summary>${icon('pin')} Where we’re meeting ${icon('plus')}</summary><p>Royal Orchid, Bangalore · Old Airport Road, adjacent to the KGA Golf Course. Venue photographs, facilities, and the hotel brochure will be confirmed with the organizers before launch.</p></details>
    <details><summary>${icon('plane')} Flying into Bangalore ${icon('plus')}</summary><p>Arriving at Kempegowda International Airport (BLR)? Share your travel plans in your RSVP. Airport distance, transfer options, and journey estimates will be added after verification. You can also express interest in an airport transfer.</p></details>
    <details><summary>${icon('clock')} Check-in, check-out & August weather ${icon('plus')}</summary><p>The weekend begins on 6 August; the one-night option begins on 7 August. Hotel check-in/check-out times and a useful August packing guide are to be confirmed.</p></details>
  </div>`;
}

const input = (name,label,type='text',placeholder='',extra='') => `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" placeholder="${placeholder}" ${extra}></div>`;
const select = (name,label,options) => `<div class="field"><label for="${name}">${label} <span>(optional)</span></label><select id="${name}" name="${name}"><option value="">Choose an option</option>${options.map(x=>`<option>${x}</option>`).join('')}</select></div>`;
function registration({ layout = 'single' } = {}) {
  return `<form class="rsvp-form" id="registration-form" data-layout="${layout}" novalidate>
    <p class="form-preview-note"><span class="form-preview-dot"></span>Design preview · Use sample details. Nothing is submitted.</p>
    <div class="form-steps" ${layout==='single'?'hidden':''} aria-label="Registration progress">${['You','Your stay','Preferences','Review'].map((x,i)=>`<span data-step-label="${i+1}"><i>${i+1}</i>${x}</span>`).join('')}</div>
    <div class="form-message" role="alert" hidden></div>
    <fieldset class="form-section" data-stage="1"><legend>A few familiar details</legend><p class="field-note">One RSVP per alumnus. Fields marked * are required.</p>
      <div class="field-grid">
        ${input('fullName','Full name *','text','The name your batchmates know','required minlength="2" maxlength="100" autocomplete="name"')}
        ${input('email','Email address *','email','you@example.com','required maxlength="254" autocomplete="email"')}
        ${input('phone','Mobile / WhatsApp *','tel','+91 98765 43210','required maxlength="25" autocomplete="tel" aria-describedby="phone-help"')}
        ${input('residence','Current city / country *','text','Singapore, Singapore','required minlength="2" maxlength="150" autocomplete="address-level2"')}
      </div><p class="field-help" id="phone-help">Include your country code, such as +91, +65, or +1.</p>
    </fieldset>
    <fieldset class="form-section" data-stage="2"><legend>How will you join us?</legend><p class="field-note">Choose your time together. Rooms and payment are coordinated by the organizers.</p>
      <div class="plan-radios">${Object.entries(plans).map(([key,p])=>`<label class="plan-radio" data-tier="${key}"><input type="radio" name="plan" value="${key}" required><strong>${p.title}</strong><small>${p.dates.replace('August 2027','Aug')}</small></label>`).join('')}</div>
      <fieldset class="form-section stay-fields" data-conditional="stay" hidden disabled><legend>Make yourself at home</legend><p class="form-label">Room occupancy preference *</p>
        <div class="occupancy-group"><label><input type="radio" name="occupancy" value="single" required>Single occupancy</label><label><input type="radio" name="occupancy" value="twin" required>Double / twin sharing</label></div>
        <div class="field" data-conditional="roommate" hidden><label for="roommate">Preferred roommate <span>(optional)</span></label><input name="roommate" id="roommate" maxlength="100" placeholder="A batchmate’s name"><span class="field-help">Roommate requests will be coordinated by the organizing team.</span></div>
      </fieldset>
    </fieldset>
    <fieldset class="form-section" data-stage="3"><legend>The little things</legend><p class="field-note">These details are optional. Help us make the weekend yours.</p>
      <div class="field-grid">${select('diet','Dietary preference',['Veg','Non-Veg','Jain','Vegan','Other / Allergies'])}${select('shirt','T-shirt size',['S','M','L','XL','XXL'])}
        <div class="field wide" data-conditional="allergies" hidden><label for="allergies">Dietary details / allergies <span>(optional)</span></label><input id="allergies" name="allergies" maxlength="500" placeholder="Anything the catering team should know"></div>
      </div>
      <label class="toggle-row"><input type="checkbox" name="flying" value="yes">${icon('plane')} I am flying into Bangalore</label>
      <fieldset class="form-section travel-fields" data-conditional="flying" hidden disabled><legend>Travel plans <span class="optional">(optional)</span></legend>
        <div class="field-grid">${input('arrival','Arrival details','text','Date, time, flight','maxlength="200"')}${input('departure','Departure details','text','Date, time, flight','maxlength="200"')}</div>
        <label class="toggle-row"><input type="checkbox" name="transfer" value="yes">I’m interested in an airport transfer</label>
      </fieldset>
      <div class="field"><label for="notes">A note for the organizers <span>(optional)</span></label><textarea id="notes" name="notes" maxlength="1500" placeholder="Special requests, a question, or just a hello…" rows="3"></textarea></div>
    </fieldset>
    <section class="form-review" data-stage="4" hidden aria-labelledby="review-title"><h3 id="review-title">Looking forward to seeing you.</h3><p class="field-note">Give your RSVP a quick check before confirming.</p><div data-review-content></div><p class="review-note">Your RSVP confirms your attendance. The organizers will coordinate room allocation and payment separately.</p></section>
    <div class="selected-plan-summary" data-plan-summary hidden></div>
    <div class="form-footer"><button type="button" class="form-back" data-form-back hidden>← Back</button><span data-footer-label class="field-help">A little planning. A lot of catching up.</span><button class="button button-primary" type="submit" data-submit>Review RSVP ${icon('arrow')}</button></div>
    <p class="form-hint">MTRS 95/97 · 6–8 August 2027 · Royal Orchid, Bangalore</p>
  </form>`;
}

const ui = { icon, photo, countdown, registration, travel, brochure: () => `<a href="#venue" class="brochure-link" data-brochure>${icon('download')} Download venue brochure ${icon('arrowUpRight')}</a>` };

function render() {
  photoIndex = 0;
  app.innerHTML = variants[state.variant].render(ui);
  document.body.dataset.variant = state.variant;
  document.title = `MTRS 95/97 · ${variants[state.variant].name} · Design prototype`;
  const form = app.querySelector('form');
  for (const field of form.elements) {
    if (!field.name) continue;
    if (field.name === 'plan') field.checked = state.plan === field.value;
    else if (field.type === 'radio') field.checked = state.values[field.name] === field.value;
    else if (field.type === 'checkbox') field.checked = Boolean(state.values[field.name]);
    else if (state.values[field.name] !== undefined) field.value = state.values[field.name];
  }
  if (state.step === 4 && !state.values.email) state.step = 1;
  updateConditional(); updateStep(); updatePlanButtons(); updateCountdown(); renderTools();
}

function capture() {
  const form = app.querySelector('form');
  for (const field of form.elements) {
    if (!field.name || field.name === 'plan') continue;
    if (field.type === 'radio') { if (field.checked) state.values[field.name] = field.value; }
    else state.values[field.name] = field.type === 'checkbox' ? field.checked : field.value;
  }
}

function updateConditional() {
  const form = app.querySelector('form');
  const stay = Boolean(state.plan && state.plan !== 'day_attendee');
  const occupancy = form.querySelector('[data-conditional="stay"]');
  occupancy.hidden = !stay; occupancy.disabled = !stay;
  for (const [name,show] of [['roommate',stay && state.values.occupancy==='twin'],['flying',Boolean(state.values.flying)],['allergies',state.values.diet==='Other / Allergies']]) {
    const block = form.querySelector(`[data-conditional="${name}"]`);
    block.hidden = !show;
    if (block.tagName === 'FIELDSET') block.disabled = !show;
    else block.querySelectorAll('input,textarea,select').forEach(el => el.disabled = !show);
  }
  const summary = form.querySelector('[data-plan-summary]');
  summary.hidden = !state.plan || state.step === 4;
  if (state.plan) summary.innerHTML = `<span>${icon('calendar')}<span><strong>${plans[state.plan].title}</strong><small>${plans[state.plan].dates}</small></span></span><button type="button" data-change-plan>Change</button>`;
  document.querySelectorAll('[data-selected-plan]').forEach(el => el.textContent = state.plan ? plans[state.plan].title : 'Choose how you’ll join');
  if (state.step === 4) updateReview();
}

function updateStep() {
  const form = app.querySelector('form');
  const single = form.dataset.layout === 'single';
  form.querySelectorAll('[data-stage]').forEach(el => { el.hidden = single ? (state.step === 4 ? el.dataset.stage !== '4' : el.dataset.stage === '4') : Number(el.dataset.stage)!==state.step; });
  form.querySelectorAll('[data-step-label]').forEach(el => {
    const n = Number(el.dataset.stepLabel);
    el.classList.toggle('current', n === state.step); el.classList.toggle('complete', n < state.step);
    if (n===state.step) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current');
  });
  form.querySelector('[data-form-back]').hidden = state.step === 1;
  form.querySelector('[data-footer-label]').hidden = state.step > 1;
  form.querySelector('[data-submit]').innerHTML = state.step === 4 ? `Confirm my RSVP ${icon('check')}` : single || state.step === 3 ? `Review RSVP ${icon('arrow')}` : `Continue ${icon('arrow')}`;
  updateConditional();
}

function updateReview() {
  const v = state.values;
  const pairs = [['Name',v.fullName],['Email',v.email],['WhatsApp',v.phone],['Home',v.residence],['Participation',plans[state.plan]?.title],['Dates',plans[state.plan]?.dates]];
  if(state.plan !== 'day_attendee') pairs.push(['Room preference',v.occupancy==='twin'?'Double / twin sharing':'Single occupancy']);
  if(state.plan !== 'day_attendee' && v.occupancy==='twin' && v.roommate) pairs.push(['Preferred roommate',v.roommate]);
  if(v.diet) pairs.push(['Dietary preference',v.diet]);
  if(v.diet==='Other / Allergies'&&v.allergies) pairs.push(['Dietary details',v.allergies]);
  if(v.shirt) pairs.push(['T-shirt size',v.shirt]);
  if(v.flying) { pairs.push(['Flying in','Yes']); if(v.arrival) pairs.push(['Arrival',v.arrival]); if(v.departure) pairs.push(['Departure',v.departure]); if(v.transfer) pairs.push(['Airport transfer','Interested']); }
  if(v.notes) pairs.push(['Notes',v.notes]);
  app.querySelector('[data-review-content]').innerHTML = `<dl>${pairs.map(([k,v])=>`<div><dt>${escape(k)}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl>`;
}

function updatePlanButtons() {
  app.querySelectorAll('[data-plan]').forEach(el => {
    const selected = el.dataset.plan === state.plan;
    el.classList.toggle('is-selected', selected);
    el.setAttribute('aria-pressed', String(selected));
    const label = el.querySelector('[data-plan-label]');
    if(label) label.textContent = selected ? 'Selected' : 'Select plan';
  });
}

function choosePlan(plan, scroll = false) {
  state.plan = plan;
  app.querySelectorAll('input[name="plan"]').forEach(el => el.checked = el.value === plan);
  updateConditional(); updatePlanButtons(); updateStatePanel();
  if(scroll) {
    const form = app.querySelector('form');
    if (form.dataset.layout !== 'single' && state.step === 4) { state.step=2; updateStep(); }
    app.querySelector('#rsvp').scrollIntoView({ behavior: 'smooth' });
    toast(`${plans[plan].title} selected. Complete your RSVP below.`);
  }
}

function validSections(stageNumbers) {
  const form = app.querySelector('form');
  const phone = form.elements.phone;
  const digits = phone.value.replace(/\D/g,'');
  phone.setCustomValidity(phone.value && (!/^\+[\d\s().-]+$/.test(phone.value) || digits.length<8 || digits.length>15) ? 'Enter a phone number starting with + and a country code, with 8–15 digits in total.' : '');
  for (const stage of stageNumbers) {
    const section = form.querySelector(`[data-stage="${stage}"]`);
    for (const field of section.querySelectorAll('input,select,textarea')) {
      if (field.willValidate && !field.checkValidity()) {
        if(form.dataset.layout !== 'single' || state.step === 4) { state.step=Number(stage); updateStep(); }
        field.focus(); field.reportValidity(); updateStatePanel(); return false;
      }
    }
  }
  return true;
}

function goStep(step) {
  state.step = step; updateStep(); updateStatePanel();
  const form = app.querySelector('form');
  form.scrollIntoView({ behavior:'smooth', block:'start' });
  form.querySelector(`[data-stage="${step}"] input, [data-stage="${step}"] h3`)?.focus({preventScroll:true});
}

function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent=message; el.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.hidden=true,4500);
}

function submit() {
  const form = app.querySelector('form');
  const button = form.querySelector('[data-submit]');
  state.submission='loading'; button.disabled=true; button.innerHTML='<span class="spinner" aria-hidden="true"></span> Confirming…'; form.setAttribute('aria-busy','true'); updateStatePanel();
  submissionTimer = setTimeout(()=>{
    state.submission=state.outcome; button.disabled=false; form.removeAttribute('aria-busy'); updateStep();
    if(state.outcome==='success') {
      const first = state.values.fullName.trim().split(/\s+/)[0];
      dialog.innerHTML=`<span class="eyebrow">Sample confirmation</span><div class="confirmation-mark">${icon('heart')}</div><span class="script">Old friends. New memories.</span><h2 id="confirmation-title">See you in Bangalore,<br>${escape(first)}!</h2><p>Your RSVP is confirmed for the <strong>${plans[state.plan].title.toLowerCase()}</strong>, ${plans[state.plan].dates}. The organizing team will coordinate rooms and payment separately.</p><button class="button button-primary" data-close-confirmation>Back to the reunion ${icon('arrow')}</button><small>This is a design preview. Your details have not been submitted or saved.</small>`;
      dialog.showModal();
    } else {
      const msg=form.querySelector('.form-message'); msg.hidden=false;
      msg.innerHTML=state.outcome==='duplicate'?'<strong>You’re already on the list.</strong>This email already has an RSVP. Contact the organizing team if your plans have changed.<br><button type="button" data-edit-email>Try another email</button>':'<strong>We couldn’t send your RSVP.</strong>Your details are still here. Please try again.';
      msg.scrollIntoView({behavior:'smooth',block:'center'});
    }
    updateStatePanel();
  },950);
}

function cycleVariant(direction) {
  if(state.submission==='loading') return toast('Let the sample submission finish before switching concepts.');
  capture(); state.variant=Object.keys(variants)[(Object.keys(variants).indexOf(state.variant)+direction+3)%3];
  const url = new URL(location.href); url.searchParams.set('variant',state.variant); url.hash=''; history.replaceState(null,'',url);
  render(); window.scrollTo({top:0,behavior:'instant'});
}

function renderTools() {
  if(!window.__MTRS_PROTOTYPE__) { tools.innerHTML=''; return; }
  tools.innerHTML=`<aside class="prototype-state" id="prototype-state" ${state.stateOpen?'':'hidden'}><h2>What are we evaluating?</h2><p>${variants[state.variant].question}</p><p>Flow: ${variants[state.variant].flow}. Every layout uses the same RSVP details. All form data stays in memory and clears on reload.</p><div class="state-actions"><button type="button" data-fill-sample>Fill sample details</button><button type="button" data-reset>Reset preview</button></div><label for="preview-outcome">Submission preview<select id="preview-outcome"><option value="success">Success</option><option value="duplicate">Email already registered</option><option value="error">Submission error</option></select></label><pre data-live-state></pre></aside><nav class="prototype-bar" aria-label="Prototype concept switcher"><div class="prototype-badge">Design prototype<span>Nothing is saved</span></div><button class="variant-arrow" data-cycle="-1" aria-label="Previous design concept">←</button><div class="variant-label">${state.variant} · ${variants[state.variant].name}<small>${Object.keys(variants).indexOf(state.variant)+1} / 3 · use ← → to explore</small></div><button class="variant-arrow" data-cycle="1" aria-label="Next design concept">→</button><button class="state-toggle" data-state-toggle aria-label="Design notes and preview controls" aria-controls="prototype-state" aria-expanded="${state.stateOpen}">${icon('plus')}</button></nav>`;
  tools.querySelector('#preview-outcome').value=state.outcome; updateStatePanel();
}

function updateStatePanel() {
  const pre=tools.querySelector('[data-live-state]');
  if(pre) pre.textContent=JSON.stringify({concept:state.variant,name:variants[state.variant].name,formFlow:variants[state.variant].flow,step:state.step,participation:state.plan||'not selected',values:state.values,previewOutcome:state.outcome,submission:state.submission,persistence:'memory only'},null,2);
}

function updateCountdown() {
  const remaining=Math.max(0,Date.parse('2027-08-06T14:00:00+05:30')-Date.now());
  const seconds=Math.floor(remaining/1000);
  const values={days:Math.floor(seconds/86400),hours:Math.floor(seconds%86400/3600),minutes:Math.floor(seconds%3600/60),seconds:seconds%60};
  app.querySelectorAll('[data-countdown]').forEach(el=>el.textContent=String(values[el.dataset.countdown]).padStart(2,'0'));
  if(!remaining) app.querySelectorAll('.countdown').forEach(el=>el.setAttribute('aria-label','The reunion weekend is here!'));
}

document.addEventListener('input',e=>{
  if(e.target.closest('form')) { if(e.target.name==='phone') e.target.setCustomValidity(''); capture(); updateStatePanel(); }
});
document.addEventListener('change',e=>{
  if(e.target.id==='preview-outcome') { state.outcome=e.target.value; state.submission='idle'; app.querySelector('.form-message').hidden=true; updateStatePanel(); }
  else if(e.target.closest('form')) { capture(); if(e.target.name==='plan') choosePlan(e.target.value); updateConditional(); updateStatePanel(); }
});
document.addEventListener('submit',e=>{
  if(e.target.id!=='registration-form') return;
  e.preventDefault(); if(state.submission==='loading') return;
  capture(); const single=e.target.dataset.layout==='single';
  if(state.step===4) { if(validSections([1,2,3])) submit(); }
  else if(validSections(single?[1,2,3]:[state.step])) goStep(single?4:state.step+1);
});
document.addEventListener('click',e=>{
  const el=e.target.closest('button,a'); if(!el) return;
  if(el.hasAttribute('data-plan')) { e.preventDefault(); choosePlan(el.dataset.plan,true); }
  else if(el.hasAttribute('data-brochure')) { e.preventDefault(); toast('Brochure placeholder — the hotel PDF will be added before launch.'); }
  else if(el.hasAttribute('data-cycle')) cycleVariant(Number(el.dataset.cycle));
  else if(el.hasAttribute('data-state-toggle')) { state.stateOpen=!state.stateOpen; renderTools(); }
  else if(el.hasAttribute('data-form-back')) goStep(app.querySelector('form').dataset.layout==='single'?1:state.step-1);
  else if(el.hasAttribute('data-change-plan')) { if(app.querySelector('form').dataset.layout!=='single') goStep(2); else app.querySelector('[data-stage="2"]').scrollIntoView({behavior:'smooth',block:'center'}); app.querySelector('input[name="plan"]')?.focus({preventScroll:true}); }
  else if(el.hasAttribute('data-edit-email')) { goStep(1); app.querySelector('#email').focus(); }
  else if(el.hasAttribute('data-close-confirmation')) dialog.close();
  else if(el.hasAttribute('data-fill-sample')) { state.values={fullName:'Alex Mathew',email:'alex@example.com',phone:'+65 8123 4567',residence:'Singapore, Singapore',occupancy:'twin',roommate:'',diet:'Veg',shirt:'M',flying:true,arrival:'6 Aug · afternoon',departure:'8 Aug · evening',transfer:true,notes:''}; state.plan='2_night'; state.step=1; render(); toast('Sample details filled. Explore the RSVP form below.'); }
  else if(el.hasAttribute('data-reset')) { clearTimeout(submissionTimer); state.plan=''; state.step=1; state.values={}; state.submission='idle'; state.outcome='success'; render(); toast('Preview reset. All sample details cleared.'); }
});
document.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||dialog.open||e.target.closest('input,textarea,select,[contenteditable], [role="textbox"]')) return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight') { e.preventDefault(); cycleVariant(e.key==='ArrowLeft'?-1:1); }
});
window.addEventListener('popstate',()=>{capture();const key=new URLSearchParams(location.search).get('variant');state.variant=variants[key]?key:'A';render();});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
const initialUrl=new URL(location.href); initialUrl.searchParams.set('variant',state.variant); history.replaceState(null,'',initialUrl);
render(); setInterval(updateCountdown,1000);
