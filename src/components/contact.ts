import type { EventSettings } from '../../shared/model';
import { escapeHtml } from '../lib/dom';
import { icon } from './icons';

export function contactLinks(settings: EventSettings | null): string {
  const links: string[] = [];
  if (settings?.contactEmail) links.push(`<a href="mailto:${escapeHtml(encodeURIComponent(settings.contactEmail))}">${icon('mail')} ${escapeHtml(settings.contactEmail)}</a>`);
  if (settings?.contactWhatsApp) {
    const digits = settings.contactWhatsApp.replace(/\D/g, '');
    if (digits) links.push(`<a href="https://wa.me/${digits}" target="_blank" rel="noopener noreferrer">${icon('phone')} WhatsApp ${escapeHtml(settings.contactWhatsApp)}</a>`);
  }
  return links.length ? `<div class="contact-links">${links.join('')}</div>` : '';
}

export function recoveryHelp(settings: EventSettings | null): string {
  const links = contactLinks(settings);
  return `<div class="recovery-help"><h2>Lost your private link?</h2><p>Ask the reunion organizers to help you recover access to your RSVP. For your privacy, entering an email address does not reveal an existing registration.</p>${links || '<p class="muted">Organizer contact details have not been added to this site yet. Please reach them through your usual reunion group.</p>'}</div>`;
}
