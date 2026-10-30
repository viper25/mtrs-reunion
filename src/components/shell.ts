import { icon } from './icons';

export function wordmark(href = '/'): string {
  return `<a class="wordmark" href="${href}" aria-label="MTRS 95/97 reunion home">MTRS <span>95/97</span><small>THE REUNION · 2027</small></a>`;
}

export function footer(): string {
  return `<footer class="site-footer page-width">${wordmark('/')}<p>Old friends. New memories. <span class="script">Same us.</span></p><a href="#top" class="back-top" aria-label="Back to top">${icon('arrow')}</a></footer>`;
}

export function photo(kind: 'class' | 'venue', caption: string): string {
  return `<figure class="photo-placeholder"><img src="/assets/${kind === 'class' ? 'class-memory' : 'venue'}-placeholder.svg" width="700" height="500" alt="${kind === 'class' ? 'Illustrated placeholder for our class photograph' : 'Illustrated venue placeholder, not a photograph of Royal Orchid'}" loading="${kind === 'class' ? 'eager' : 'lazy'}" /><figcaption>${caption}</figcaption></figure>`;
}
