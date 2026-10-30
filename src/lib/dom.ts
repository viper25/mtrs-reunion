export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function focusHeading(element: HTMLElement | null): void {
  if (!element) return;
  element.tabIndex = -1;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}

export function safeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export async function copyText(value: string, input: HTMLInputElement, feedback: HTMLElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    feedback.textContent = 'Private link copied. Save it somewhere you can find it again.';
    return true;
  } catch {
    input.focus();
    input.select();
    feedback.textContent = 'Select and copy the link above, then save it somewhere private.';
    return false;
  }
}
