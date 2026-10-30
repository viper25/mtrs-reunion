export const PLANS = ['2_night', '1_night', 'day_attendee'] as const;
export type Plan = typeof PLANS[number];
export const DIETS = ['Veg', 'Non-Veg', 'Jain', 'Vegan', 'Other / Allergies'] as const;
export const SHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type RegistrationStatus = 'confirmed' | 'cancelled';

export interface RegistrationInput {
  fullName: string;
  email: string;
  phone: string;
  residence: string;
  plan: Plan;
  occupancy: 'single' | 'twin' | '';
  roommate: string;
  diet: typeof DIETS[number] | '';
  allergies: string;
  shirt: typeof SHIRT_SIZES[number] | '';
  flying: boolean;
  arrival: string;
  departure: string;
  transfer: boolean;
  notes: string;
}

export interface Registration extends RegistrationInput {
  id: string;
  status: RegistrationStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string;
  code: string;
  fields?: Record<string, string>;
}

export interface EventSettings {
  registrationOpen: boolean;
  contactEmail: string | null;
  contactWhatsApp: string | null;
  brochureUrl: string | null;
}

export interface RegistrationStats {
  confirmed: number;
  cancelled: number;
  twoNight: number;
  oneNight: number;
  dayAttendee: number;
  roomsSingle: number;
  roomsTwin: number;
  flying: number;
  transfer: number;
}

export interface RegistrationList {
  registrations: Registration[];
  total: number;
  page: number;
  pageSize: number;
  stats: RegistrationStats;
}

export const PLAN_LABELS: Record<Plan, string> = {
  '2_night': '2-night stay · 6–8 August 2027',
  '1_night': '1-night stay · 7–8 August 2027',
  day_attendee: 'Day attendee · 7 August 2027',
};
