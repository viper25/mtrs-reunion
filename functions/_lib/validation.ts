import { DIETS, PLANS, SHIRT_SIZES, type RegistrationInput } from '../../shared/model';
import { HttpError } from './types';

export function validateRegistration(source: Record<string, unknown>): RegistrationInput {
  const fields: Record<string, string> = {};
  const text = (key: string, max: number, required = false, multiline = false): string => {
    const raw = source[key];
    if (raw === undefined || raw === null || raw === '') {
      if (required) fields[key] = 'Please complete this field.';
      return '';
    }
    if (typeof raw !== 'string') { fields[key] = 'Please enter text.'; return ''; }
    const value = raw.trim();
    if (required && !value) fields[key] = 'Please complete this field.';
    if (value.length > max) fields[key] = `Please use ${max} characters or fewer.`;
    const invalid = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/ : /[\u0000-\u001f\u007f-\u009f]/;
    if (invalid.test(value)) fields[key] = 'Please remove unsupported control characters.';
    return value;
  };
  const boolean = (key: string): boolean => {
    if (source[key] === undefined) return false;
    if (typeof source[key] !== 'boolean') { fields[key] = 'Please choose yes or no.'; return false; }
    return source[key];
  };
  const fullName = text('fullName', 120, true);
  if (fullName && fullName.length < 2) fields.fullName = 'Please enter your full name.';
  const email = text('email', 254, true).toLowerCase();
  if (email && (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email) || email.startsWith('.') || email.includes('..') || email.includes('.@'))) {
    fields.email = 'Please enter a valid email address.';
  }
  const phone = text('phone', 40, true);
  if (phone && (!/^\+[\d\s().-]+$/.test(phone) || !/^\+[1-9]\d{6,14}$/.test(phone.replace(/[\s().-]/g, '')))) {
    fields.phone = 'Include your country code, for example +91 98765 43210.';
  }
  const residence = text('residence', 160, true);
  const plan = text('plan', 30, true);
  if (!(PLANS as readonly string[]).includes(plan)) fields.plan = 'Please select a participation option.';
  const staying = plan === '2_night' || plan === '1_night';
  const occupancy = staying ? text('occupancy', 20, true) : '';
  if (staying && occupancy !== 'single' && occupancy !== 'twin') fields.occupancy = 'Please select a room occupancy preference.';
  const roommate = staying && occupancy === 'twin' ? text('roommate', 120) : '';
  const diet = text('diet', 30);
  if (diet && !(DIETS as readonly string[]).includes(diet)) fields.diet = 'Please select one of the dietary preferences.';
  const allergies = diet === 'Other / Allergies' ? text('allergies', 500, false, true) : '';
  const shirt = text('shirt', 10);
  if (shirt && !(SHIRT_SIZES as readonly string[]).includes(shirt)) fields.shirt = 'Please select one of the T-shirt sizes.';
  const flying = boolean('flying');
  const arrival = flying ? text('arrival', 200) : '';
  const departure = flying ? text('departure', 200) : '';
  const transfer = flying ? boolean('transfer') : false;
  const notes = text('notes', 2000, false, true);
  if (Object.keys(fields).length) throw new HttpError(422, 'VALIDATION_ERROR', 'Please check the highlighted fields.', fields);
  return { fullName, email, phone, residence, plan, occupancy, roommate, diet, allergies, shirt, flying, arrival, departure, transfer, notes } as RegistrationInput;
}

export function requireVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new HttpError(422, 'INVALID_VERSION', 'Please refresh this RSVP before making changes.');
  }
  return value as number;
}
