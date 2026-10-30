import { DIETS, PLAN_LABELS, PLANS, SHIRT_SIZES, type Plan, type RegistrationInput } from '../../shared/model';
import { RequestError } from '../lib/api';
import { escapeHtml, focusHeading } from '../lib/dom';
import { icon } from './icons';

type Draft = Omit<RegistrationInput, 'plan'> & { plan: Plan | '' };
type Options = {
  mode: 'create' | 'manage';
  initial?: Partial<RegistrationInput>;
  submitLabel?: string;
  onSubmit: (input: RegistrationInput, website: string) => Promise<void>;
  onReload?: () => void;
};

const emptyDraft: Draft = {
  fullName: '', email: '', phone: '', residence: '', plan: '', occupancy: '', roommate: '',
  diet: '', allergies: '', shirt: '', flying: false, arrival: '', departure: '', transfer: false, notes: '',
};

export function registrationDetails(input: RegistrationInput, includePersonal = true): string {
  const rows: [string, string][] = [];
  if (includePersonal) rows.push(['Name', input.fullName], ['Email', input.email], ['Mobile / WhatsApp', input.phone], ['City / country', input.residence]);
  rows.push(['Participation', PLAN_LABELS[input.plan]]);
  if (input.plan !== 'day_attendee') {
    rows.push(['Room preference', input.occupancy === 'single' ? 'Single occupancy' : 'Double / twin sharing']);
    if (input.occupancy === 'twin') rows.push(['Preferred roommate', input.roommate || 'No preference provided']);
  }
  rows.push(['Dietary preference', input.diet || 'Not provided']);
  if (input.diet === 'Other / Allergies') rows.push(['Allergies / dietary details', input.allergies || 'Not provided']);
  rows.push(['T-shirt size', input.shirt || 'Not provided'], ['Flying into Bangalore', input.flying ? 'Yes' : 'No']);
  if (input.flying) rows.push(['Arrival details', input.arrival || 'Not provided'], ['Departure details', input.departure || 'Not provided'], ['Airport transfer interest', input.transfer ? 'Yes — please contact me' : 'Not requested']);
  if (input.notes) rows.push(['Notes for the organizers', input.notes]);
  return `<dl class="registration-details">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>`;
}

export class RegistrationForm {
  readonly element: HTMLFormElement;
  private readonly options: Options;
  private reviewing = false;
  private pending = false;
  private stale = false;
  private prefix: string;

  constructor(host: HTMLElement, options: Options) {
    this.options = options;
    this.prefix = options.mode === 'manage' ? 'manage' : 'rsvp';
    host.innerHTML = this.markup();
    this.element = host.querySelector<HTMLFormElement>('form')!;
    const initial: Draft = { ...emptyDraft, ...options.initial };
    this.element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name]').forEach(control => {
      const key = control.name as keyof Draft;
      if (!(key in initial)) return;
      if (control instanceof HTMLInputElement && control.type === 'radio') control.checked = control.value === initial[key];
      else if (control instanceof HTMLInputElement && control.type === 'checkbox') control.checked = Boolean(initial[key]);
      else control.value = String(initial[key]);
    });
    this.updateConditionalFields();
    this.element.addEventListener('input', event => this.onChange(event));
    this.element.addEventListener('change', event => this.onChange(event));
    this.element.addEventListener('submit', event => { event.preventDefault(); void this.submit(); });
    this.element.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (button?.hasAttribute('data-edit-rsvp')) this.showEdit();
      if (button?.hasAttribute('data-reload-rsvp')) this.options.onReload?.();
    });
  }

  setPlan(plan: Plan): void {
    if (this.pending || !PLANS.includes(plan)) return;
    const radio = this.element.querySelector<HTMLInputElement>(`input[name="plan"][value="${plan}"]`)!;
    radio.checked = true;
    this.clearError('plan');
    this.updateConditionalFields();
    if (this.reviewing) this.showEdit(false);
    radio.focus({ preventScroll: true });
  }

  private id(name: string): string { return `${this.prefix}-${name}`; }

  private error(name: string): string { return `<span class="field-error" id="${this.id(`${name}-error`)}" data-error-for="${name}" hidden></span>`; }

  private textField(name: string, label: string, options: { type?: string; required?: boolean; placeholder?: string; autocomplete?: string; max?: number; readonly?: boolean; help?: string; wide?: boolean } = {}): string {
    return `<div class="field${options.wide ? ' field-wide' : ''}"><label for="${this.id(name)}">${label}${options.required ? ' <span class="required-mark" aria-hidden="true">*</span><span class="sr-only"> (required)</span>' : ' <span class="optional">(optional)</span>'}</label><input id="${this.id(name)}" name="${name}" type="${options.type || 'text'}" ${options.required ? 'required' : ''} ${options.readonly ? 'readonly' : ''} ${options.autocomplete ? `autocomplete="${options.autocomplete}"` : ''} maxlength="${options.max || 160}" ${options.placeholder ? `placeholder="${options.placeholder}"` : ''} aria-describedby="${this.id(`${name}-error`)}${options.help ? ` ${this.id(`${name}-help`)}` : ''}" />${options.help ? `<span class="field-help" id="${this.id(`${name}-help`)}">${options.help}</span>` : ''}${this.error(name)}</div>`;
  }

  private markup(): string {
    return `<form class="registration-form" novalidate aria-label="${this.options.mode === 'create' ? 'Reunion registration' : 'Edit your RSVP'}">
      <div class="form-heading"><span class="kicker">${this.options.mode === 'create' ? 'YOUR NEXT CHAPTER STARTS HERE' : 'MAKE YOURSELF AT HOME'}</span><h3>${this.options.mode === 'create' ? "Let’s make it official." : 'Your RSVP details'}</h3><p>One RSVP per alumnus. Fields marked <span aria-hidden="true">*</span><span class="sr-only">with an asterisk</span> are required.</p></div>
      <div class="form-error-summary" data-form-error role="alert" tabindex="-1" hidden></div>
      <div data-edit-fields>
        <fieldset class="form-section"><legend><span class="section-number">01</span> A little about you</legend><div class="field-grid">
          ${this.textField('fullName', 'Full name', { required: true, autocomplete: 'name', max: 120, placeholder: 'The name your batchmates know' })}
          ${this.textField('email', 'Email address', { required: true, type: 'email', autocomplete: 'email', max: 254, readonly: this.options.mode === 'manage', placeholder: 'you@example.com', help: this.options.mode === 'manage' ? 'To change your email, contact the organizers.' : undefined })}
          ${this.textField('phone', 'Mobile / WhatsApp', { required: true, type: 'tel', autocomplete: 'tel', max: 32, placeholder: '+91 98765 43210', help: 'Include your country code, such as +91, +65, or +1.' })}
          ${this.textField('residence', 'Current city / country', { required: true, autocomplete: 'address-level2', max: 160, placeholder: 'Bangalore, India' })}
        </div></fieldset>

        <fieldset class="form-section"><legend><span class="section-number">02</span> Your kind of reunion</legend><p class="field-note">Choose how you’ll join us. <span class="required-mark" aria-hidden="true">*</span><span class="sr-only"> A participation option is required.</span></p>
          <div class="plan-radios">${PLANS.map(plan => `<label class="plan-radio plan-radio-${plan}" for="${this.id(plan)}"><input type="radio" name="plan" value="${plan}" id="${this.id(plan)}" required aria-describedby="${this.id('plan-error')}" /><span><strong>${plan === '2_night' ? '2-night stay' : plan === '1_night' ? '1-night stay' : 'Day attendee'}</strong><small>${plan === '2_night' ? '6–8 August' : plan === '1_night' ? '7–8 August' : '7 August only'}</small></span></label>`).join('')}</div>${this.error('plan')}
          <div class="stay-fields" data-conditional="stay" hidden><fieldset class="occupancy-fieldset"><legend class="form-label">Room occupancy preference <span class="required-mark" aria-hidden="true">*</span><span class="sr-only"> (required)</span></legend><div class="occupancy-group"><label for="${this.id('single')}"><input type="radio" name="occupancy" id="${this.id('single')}" value="single" aria-describedby="${this.id('occupancy-error')}" />Single occupancy</label><label for="${this.id('twin')}"><input type="radio" name="occupancy" id="${this.id('twin')}" value="twin" aria-describedby="${this.id('occupancy-error')}" />Double / twin sharing</label></div>${this.error('occupancy')}</fieldset>
            <div data-conditional="roommate" hidden>${this.textField('roommate', 'Preferred roommate name', { max: 120, placeholder: 'A fellow batchmate', help: 'A preference to help organizers coordinate; sharing is confirmed separately.' })}</div>
          </div>
          <p class="field-note attendance-note">Your RSVP confirms attendance. The organizers will coordinate rooms and payment separately.</p>
        </fieldset>

        <fieldset class="form-section"><legend><span class="section-number">03</span> The little details</legend><p class="field-note">These preferences are optional. Share what you know now.</p><div class="field-grid">
          <div class="field"><label for="${this.id('diet')}">Dietary preference <span class="optional">(optional)</span></label><select id="${this.id('diet')}" name="diet" aria-describedby="${this.id('diet-error')}"><option value="">Choose a preference</option>${DIETS.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}</select>${this.error('diet')}</div>
          <div class="field"><label for="${this.id('shirt')}">T-shirt size <span class="optional">(optional)</span></label><select id="${this.id('shirt')}" name="shirt" aria-describedby="${this.id('shirt-error')}"><option value="">Choose a size</option>${SHIRT_SIZES.map(value => `<option value="${value}">${value}</option>`).join('')}</select>${this.error('shirt')}</div>
        </div><div class="conditional-block" data-conditional="allergies" hidden>${this.textField('allergies', 'Dietary details / allergies', { max: 500, placeholder: 'Anything the organizers should know', help: 'Organizers will coordinate dietary requests with the venue.' })}</div>
          <label class="toggle-row" for="${this.id('flying')}"><input type="checkbox" name="flying" id="${this.id('flying')}" aria-controls="${this.id('travel')}" />${icon('plane')}<span>I am flying into Bangalore</span></label>
          <div class="travel-fields" id="${this.id('travel')}" data-conditional="travel" hidden><div class="field-grid">
            ${this.textField('arrival', 'Arrival details', { max: 200, placeholder: 'Flight, date and arrival time' })}
            ${this.textField('departure', 'Departure details', { max: 200, placeholder: 'Flight, date and departure time' })}
          </div><label class="checkbox-row" for="${this.id('transfer')}"><input type="checkbox" name="transfer" id="${this.id('transfer')}" /><span>I’m interested in an airport transfer</span></label><p class="field-help">This records your interest. Organizers will follow up on arrangements separately.</p>${this.error('flying')}${this.error('transfer')}</div>
          <div class="field notes-field"><label for="${this.id('notes')}">A message for the organizers <span class="optional">(optional)</span></label><textarea id="${this.id('notes')}" name="notes" rows="3" maxlength="2000" placeholder="Special requests, a message, or a story we really shouldn’t forget…" aria-describedby="${this.id('notes-error')}"></textarea>${this.error('notes')}</div>
        </fieldset>
        ${this.options.mode === 'create' ? `<div class="honeypot" aria-hidden="true"><label for="${this.id('website')}">Leave this field empty</label><input type="text" id="${this.id('website')}" name="website" tabindex="-1" autocomplete="off" /></div>` : ''}
      </div>
      <section class="review-panel" data-review hidden aria-labelledby="${this.id('review-title')}"><p class="kicker">LOOKING GOOD, OLD FRIEND</p><h3 id="${this.id('review-title')}" tabindex="-1">One last look.</h3><p>Check your details before ${this.options.mode === 'create' ? 'confirming your attendance' : 'saving your RSVP'}.</p><div data-review-details></div><div class="review-note">${this.options.mode === 'create' ? 'After confirming, save your private management link. It lets you return to edit or cancel your RSVP.' : 'Your email stays the same. Updated room and travel preferences will be available to the organizers.'}</div></section>
      <div class="form-footer"><button class="text-button" type="button" data-edit-rsvp hidden>${icon('arrow')} Edit details</button><button class="button button-primary" type="submit" data-submit>Review my RSVP ${icon('arrowUpRight')}</button></div><p class="form-hint">${this.options.mode === 'create' ? 'Your details are used to organize the reunion. Save the private link shown after confirmation to manage your RSVP.' : 'Anyone with your private link can manage this RSVP. Keep the link somewhere safe.'}</p>
    </form>`;
  }

  private onChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
    if (target instanceof HTMLInputElement) target.setCustomValidity('');
    this.clearError(target.name);
    if (['plan', 'occupancy', 'diet', 'flying'].includes(target.name)) this.updateConditionalFields();
  }

  private conditional(name: string, visible: boolean): void {
    const element = this.element.querySelector<HTMLElement>(`[data-conditional="${name}"]`)!;
    element.hidden = !visible;
    element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input,select,textarea').forEach(control => { control.disabled = !visible || this.pending; });
  }

  private updateConditionalFields(): void {
    const data = new FormData(this.element);
    const plan = data.get('plan');
    const stay = plan === '2_night' || plan === '1_night';
    this.conditional('stay', stay);
    const occupancy = this.element.querySelector<HTMLInputElement>('input[name="occupancy"]:checked')?.value;
    this.element.querySelectorAll<HTMLInputElement>('input[name="occupancy"]').forEach(input => { input.required = stay; });
    this.conditional('roommate', stay && occupancy === 'twin');
    this.conditional('allergies', data.get('diet') === 'Other / Allergies');
    const flying = this.element.querySelector<HTMLInputElement>('input[name="flying"]')!.checked;
    this.conditional('travel', flying);
  }

  private read(): RegistrationInput {
    const data = new FormData(this.element);
    const value = (key: string): string => String(data.get(key) || '').trim();
    const plan = value('plan') as Plan;
    const stay = plan === '2_night' || plan === '1_night';
    const occupancy = stay ? value('occupancy') as RegistrationInput['occupancy'] : '';
    const diet = value('diet') as RegistrationInput['diet'];
    const flying = data.get('flying') === 'on';
    return {
      fullName: value('fullName'), email: value('email'), phone: value('phone'), residence: value('residence'), plan,
      occupancy, roommate: occupancy === 'twin' ? value('roommate') : '', diet, allergies: diet === 'Other / Allergies' ? value('allergies') : '',
      shirt: value('shirt') as RegistrationInput['shirt'], flying, arrival: flying ? value('arrival') : '', departure: flying ? value('departure') : '',
      transfer: flying && data.get('transfer') === 'on', notes: value('notes'),
    };
  }

  private controls(name: string): (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[] {
    return [...this.element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name]')].filter(control => control.name === name);
  }

  private clearError(name: string): void {
    const error = [...this.element.querySelectorAll<HTMLElement>('[data-error-for]')].find(element => element.dataset.errorFor === name);
    if (error) { error.hidden = true; error.textContent = ''; }
    this.controls(name).forEach(control => control.removeAttribute('aria-invalid'));
  }

  private fieldError(name: string, message: string): void {
    const error = [...this.element.querySelectorAll<HTMLElement>('[data-error-for]')].find(element => element.dataset.errorFor === name);
    if (error) { error.hidden = false; error.textContent = message; }
    this.controls(name).forEach(control => control.setAttribute('aria-invalid', 'true'));
  }

  private validate(): boolean {
    this.element.querySelector<HTMLElement>('[data-form-error]')!.hidden = true;
    const controls = [...this.element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input,select,textarea')];
    controls.forEach(control => this.clearError(control.name));
    controls.forEach(control => {
      if (control instanceof HTMLInputElement && !control.disabled && control.required && ['text', 'email', 'tel'].includes(control.type)) {
        control.value = control.value.trim();
        control.setCustomValidity(control.value ? '' : 'Please complete this field.');
      }
    });
    const phone = this.element.elements.namedItem('phone') as HTMLInputElement;
    if (phone.value.trim() && !/^\+[1-9][\d\s().-]{6,24}$/.test(phone.value.trim())) phone.setCustomValidity('Include a country code, for example +91 98765 43210.');
    let first: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | undefined;
    const seen = new Set<string>();
    controls.forEach(control => {
      if (!control.willValidate || control.validity.valid) return;
      if (!first) first = control;
      if (!seen.has(control.name)) this.fieldError(control.name, control.type === 'radio' ? (control.name === 'plan' ? 'Choose how you’ll join us.' : 'Choose your room occupancy preference.') : control.validationMessage);
      seen.add(control.name);
    });
    if (first) { first.focus(); first.reportValidity(); return false; }
    return true;
  }

  private showReview(): void {
    this.reviewing = true;
    this.element.querySelector<HTMLElement>('[data-edit-fields]')!.hidden = true;
    const review = this.element.querySelector<HTMLElement>('[data-review]')!;
    review.hidden = false;
    review.querySelector<HTMLElement>('[data-review-details]')!.innerHTML = registrationDetails(this.read());
    this.element.querySelector<HTMLButtonElement>('[data-edit-rsvp]')!.hidden = false;
    this.submitLabel();
    focusHeading(review.querySelector('h3'));
  }

  private showEdit(focus = true): void {
    this.reviewing = false;
    this.element.querySelector<HTMLElement>('[data-edit-fields]')!.hidden = false;
    this.element.querySelector<HTMLElement>('[data-review]')!.hidden = true;
    this.element.querySelector<HTMLButtonElement>('[data-edit-rsvp]')!.hidden = true;
    this.submitLabel();
    if (focus) this.element.querySelector<HTMLInputElement>('input[name="fullName"]')!.focus();
  }

  private submitLabel(): void {
    const button = this.element.querySelector<HTMLButtonElement>('[data-submit]')!;
    button.innerHTML = this.pending ? '<span class="spinner" aria-hidden="true"></span> Saving your RSVP…' : `${this.reviewing ? (this.options.submitLabel || (this.options.mode === 'create' ? 'Confirm my RSVP' : 'Save changes')) : 'Review my RSVP'} ${icon('arrowUpRight')}`;
    button.disabled = this.pending || this.stale;
  }

  private busy(value: boolean): void {
    this.pending = value;
    this.element.setAttribute('aria-busy', String(value));
    this.element.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>('input,button,select,textarea').forEach(control => { control.disabled = value; });
    if (!value) this.updateConditionalFields();
    this.submitLabel();
  }

  private async submit(): Promise<void> {
    if (this.pending || this.stale) return;
    if (!this.reviewing) { if (this.validate()) this.showReview(); return; }
    const input = this.read();
    const website = (this.element.elements.namedItem('website') as HTMLInputElement | null)?.value || '';
    this.element.querySelector<HTMLElement>('[data-form-error]')!.hidden = true;
    this.busy(true);
    try {
      await this.options.onSubmit(input, website);
    } catch (error) {
      this.busy(false);
      const request = error instanceof RequestError ? error : null;
      const summary = this.element.querySelector<HTMLElement>('[data-form-error]')!;
      let message = request?.message || 'We could not save your RSVP. Your details are still here; please try again.';
      let action = '';
      if (request?.status === 409 && this.options.mode === 'create') {
        message = 'This email already has an RSVP. Use the private management link you saved to view or update your registration.';
        action = '<a href="/manage/" class="inline-link">Get help accessing my RSVP</a>';
      } else if (request?.status === 409 && this.options.mode === 'manage') {
        this.stale = true;
        message = 'This RSVP changed in another tab or was updated by the organizers. Reload the latest details before saving again.';
        action = '<button type="button" class="inline-link" data-reload-rsvp>Reload latest details</button>';
        this.submitLabel();
      }
      if (request && Object.keys(request.fields).length) {
        this.showEdit(false);
        Object.entries(request.fields).forEach(([name, text]) => this.fieldError(name, text));
        message = 'Please check the highlighted details below and try again.';
      }
      summary.innerHTML = `<strong>Let’s check that.</strong><p>${escapeHtml(message)}</p>${action}`;
      summary.hidden = false;
      focusHeading(summary);
      return;
    }
    this.busy(false);
  }
}
