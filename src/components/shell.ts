import { icon } from './icons';

export function wordmark(href = '/'): string {
  return `
    <a class="wordmark" href="${href}" aria-label="MTRS 95/97 reunion home">
      <div class="brand-logo-combo">
        <div class="logo-badge" title="MTRS Reunion">M</div>
        <div class="hp-badge" title="Batch '95/'97">hp</div>
      </div>
      <span class="brand-divider">|</span>
      <span class="brand-title">MTRS <strong>95/97</strong></span>
    </a>`;
}

export function footer(): string {
  return `
    <footer class="site-footer shell">
      <div class="footer-inner">
        ${wordmark('/')}
        <p class="footer-copy">MTRS 95/97 Reunion · 6–8 August 2027 · Royal Orchid, Bangalore</p>
        <div class="footer-links">
          <a href="/admin/" class="footer-link">Organizer Desk ↗</a>
          <a href="#top" class="footer-link" aria-label="Back to top">↑ Top</a>
        </div>
      </div>
    </footer>`;
}

export function photo(kind: 'class' | 'venue', caption: string): string {
  return `<figure class="photo-placeholder"><img src="/assets/${kind === 'class' ? 'class-memory' : 'venue'}-placeholder.svg" width="700" height="500" alt="${kind === 'class' ? 'Illustrated placeholder for our class photograph' : 'Illustrated venue placeholder, not a photograph of Royal Orchid'}" loading="${kind === 'class' ? 'eager' : 'lazy'}" /><figcaption class="text-muted font-12">${caption}</figcaption></figure>`;
}
