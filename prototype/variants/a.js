// THROWAWAY UI PROTOTYPE — A asks whether a class scrapbook makes the invitation feel personal.
export function renderA(ui) {
  return `
  <div class="variant-a" id="top">
    <header class="a-header a-width">
      <a class="a-wordmark" href="#top" aria-label="MTRS 95/97 reunion home">MTRS <span>95/97</span><small>THE REUNION · 2027</small></a>
      <nav class="a-nav" aria-label="Main navigation"><a href="#weekend">The weekend</a><a href="#venue">Our little getaway</a><a href="#plans">Ways to join</a></nav>
      <a class="a-header-rsvp" href="#rsvp">I'm coming ${ui.icon('arrowUpRight')}</a>
    </header>

    <main>
      <section class="a-hero a-width" aria-labelledby="a-hero-title">
        <div class="a-hero-copy">
          <div class="a-top-note"><span class="a-tiny-star">✳</span> THE WAIT IS FINALLY OVER!</div>
          <p class="a-script a-hero-script">Same old friends.</p>
          <h1 id="a-hero-title">A whole new<br><span>set of memories.</span></h1>
          <p class="a-reunion-name">Reunion — Let's Get Together <span aria-label="love">♥</span></p>
          <p class="a-hero-description">The stories haven't got old.<br>Neither has the feeling of being together.<br>Let's pick up where we left off.</p>
          <div class="a-hero-actions"><a href="#rsvp" class="a-solid-button">Count me in ${ui.icon('arrowUpRight')}</a><a href="#weekend" class="a-text-link">What's the plan? ${ui.icon('arrow')}</a></div>
          <div class="a-hero-facts"><span>${ui.icon('calendar')} <strong>6–8 August 2027</strong></span><span>${ui.icon('pin')} Royal Orchid, Bangalore</span></div>
        </div>
        <div class="a-memory-board" aria-label="A scrapbook of reunion memories">
          <div class="a-grid-paper" aria-hidden="true"></div>
          <div class="a-polaroid a-polaroid-class"><span class="a-tape a-tape-top" aria-hidden="true"></span><div class="a-photo a-photo-class">${ui.photo('class','A place for our class photo')}</div><div class="a-polaroid-caption">Remember this lot? <span>♡</span></div></div>
          <div class="a-polaroid a-polaroid-venue"><div class="a-photo a-photo-venue">${ui.photo('venue','A place to make new memories')}</div><div class="a-polaroid-caption">Next stop: Bangalore!</div></div>
          <div class="a-round-sticker"><span>GOOD FRIENDS</span><strong>great<br>weekend.</strong><span>6—8 AUGUST 2027</span></div>
          <div class="a-hand-note a-note-one">A little nostalgia.<br>A little getaway.<span aria-hidden="true">⤵</span></div>
          <span class="a-memory-spark a-spark-one" aria-hidden="true">✦</span><span class="a-memory-spark a-spark-two" aria-hidden="true">✳</span>
        </div>
      </section>

      <section class="a-countdown-band" aria-label="Time until the reunion"><div class="a-width a-countdown-inner"><div><span class="a-script">Worth the wait.</span><p>Until we're all in the same room again.</p></div>${ui.countdown()}<span class="a-band-heart" aria-hidden="true">♡</span></div></section>

      <section class="a-welcome a-width" id="venue" aria-labelledby="a-welcome-title">
        <div class="a-welcome-visual"><div class="a-venue-frame">${ui.photo('venue','Royal Orchid, Bangalore — venue photo to come')}<div class="a-venue-photo-label">OUR HOME FOR THE WEEKEND</div></div><span class="a-script a-photo-note">A change of scene.<br>The same familiar faces.</span><span class="a-little-star" aria-hidden="true">✳</span></div>
        <div class="a-welcome-copy"><p class="a-kicker">THE PLACE IS PICKED</p><h2 id="a-welcome-title">Somewhere lovely.<br><span class="a-script">With our favourite people.</span></h2><p class="a-announcement">After exploring multiple hotel options and much deliberation we're happy to announce that <strong>Royal Orchid, Bangalore</strong>, is our chosen venue!</p><p>A little time away from the everyday, a lot of catching up, and a whole weekend to make it count.</p><div class="a-venue-address">${ui.icon('pin')}<span><strong>Royal Orchid, Bangalore</strong><br>Old Airport Road · Adjacent to KGA Golf Course</span></div><div class="a-brochure">${ui.brochure()}</div><small class="a-subtle">Venue photos and the hotel brochure will be added soon.</small></div>
      </section>

      <section class="a-weekend" id="weekend" aria-labelledby="a-weekend-title"><div class="a-width">
        <div class="a-section-head"><div><p class="a-kicker">THREE DAYS. SO MANY STORIES.</p><h2 id="a-weekend-title">Leave room for <span class="a-script">a little nostalgia.</span></h2></div><p>Come for the celebrations.<br>Stay for the conversations.</p></div>
        <div class="a-timeline">
          <article class="a-day"><div class="a-day-top"><span class="a-day-number">06</span><div><strong>FRIDAY</strong><span>AUGUST 2027</span></div><i aria-hidden="true">${ui.icon('sun')}</i></div><div class="a-timeline-dot"></div><h3>Well, look who's here.</h3><p>Check in, settle in, and ease into our welcome evening. The catching up starts here.</p><span class="a-script a-day-footnote">The first of many “remember when”s.</span></article>
          <article class="a-day"><div class="a-day-top"><span class="a-day-number">07</span><div><strong>SATURDAY</strong><span>AUGUST 2027</span></div><i aria-hidden="true">${ui.icon('star')}</i></div><div class="a-timeline-dot"></div><h3>All together. At last.</h3><p>The main reunion celebrations! A day for familiar faces, shared memories, and a few new ones.</p><span class="a-script a-day-footnote">This one's for all of us.</span></article>
          <article class="a-day"><div class="a-day-top"><span class="a-day-number">08</span><div><strong>SUNDAY</strong><span>AUGUST 2027</span></div><i aria-hidden="true">${ui.icon('heart')}</i></div><div class="a-timeline-dot"></div><h3>One more breakfast.</h3><p>A farewell breakfast before check-out. Longer goodbyes, fuller hearts, and a promise to do it again.</p><span class="a-script a-day-footnote">Until the next one…</span></article>
        </div>
      </div></section>

      <section class="a-plans a-width" id="plans" aria-labelledby="a-plans-title"><div class="a-centered-head"><p class="a-kicker">MAKE YOURSELF PART OF THE STORY</p><h2 id="a-plans-title">A whole weekend, <span class="a-script">or a wonderful day.</span></h2><p>However long you can stay, we'd love to see you.</p></div>
        <div class="a-plan-grid">
          <article class="a-plan a-plan-purple"><div class="a-preferred">${ui.icon('star')} OUR PREFERRED OPTION!</div><div class="a-plan-meta"><span>THE FULL CATCH-UP</span><span>01</span></div><h3>2-night stay</h3><p class="a-plan-date">6–8 August 2027</p><div class="a-plan-divider"></div><ul><li>${ui.icon('check')}<span><strong>6 Aug</strong> · Check-in & welcome evening</span></li><li>${ui.icon('check')}<span><strong>7 Aug</strong> · Main reunion celebrations</span></li><li>${ui.icon('check')}<span><strong>8 Aug</strong> · Farewell breakfast & check-out</span></li></ul><p class="a-script a-plan-note">More time. More memories.</p><button type="button" class="a-plan-button" data-plan="2_night"><span data-plan-label>Select plan</span> ${ui.icon('arrowUpRight')}</button></article>
          <article class="a-plan a-plan-mint"><div class="a-plan-meta"><span>A LITTLE ESCAPE</span><span>02</span></div><h3>1-night stay</h3><p class="a-plan-date">7–8 August 2027</p><div class="a-plan-divider"></div><ul><li>${ui.icon('check')}<span><strong>7 Aug</strong> · Check-in & reunion celebrations</span></li><li>${ui.icon('check')}<span><strong>8 Aug</strong> · Farewell breakfast & check-out</span></li></ul><p class="a-script a-plan-note">A night away with the old gang.</p><button type="button" class="a-plan-button" data-plan="1_night"><span data-plan-label>Select plan</span> ${ui.icon('arrowUpRight')}</button></article>
          <article class="a-plan a-plan-peach"><div class="a-plan-meta"><span>DON'T MISS THE PARTY</span><span>03</span></div><h3>Day attendee</h3><p class="a-plan-date">7 August 2027</p><div class="a-plan-divider"></div><ul><li>${ui.icon('check')}<span><strong>7 Aug</strong> · Join the main event & celebrations</span></li></ul><p class="a-script a-plan-note">One day. All the good company.</p><button type="button" class="a-plan-button" data-plan="day_attendee"><span data-plan-label>Select plan</span> ${ui.icon('arrowUpRight')}</button></article>
        </div><p class="a-plans-note">Your RSVP confirms your attendance. The organizers will coordinate room arrangements and payment separately.</p>
      </section>

      <section class="a-logistics a-width" aria-labelledby="a-travel-title"><div class="a-travel-intro"><span class="a-travel-icon" aria-hidden="true">${ui.icon('plane')}</span><p class="a-kicker">FROM NEAR OR FAR</p><h2 id="a-travel-title">Find your way <span class="a-script">back to the gang.</span></h2><p>Flying into Bangalore? A little planning makes more room for the good stuff.</p><span class="a-script a-travel-note">We'll help with the details.</span></div><div class="a-travel-details">${ui.travel()}</div></section>

      <section class="a-rsvp-wrap" id="rsvp" aria-labelledby="a-rsvp-title"><div class="a-width a-rsvp-layout"><aside class="a-rsvp-intro"><p class="a-kicker">THE BEST PART IS YOU</p><h2 id="a-rsvp-title">There's a place<br>for you <span class="a-script">here.</span></h2><p>Let us know you're coming. One RSVP per alumnus, a few little details, and one very big reunion to look forward to.</p><div class="a-rsvp-note"><span class="a-note-pin" aria-hidden="true"></span><p class="a-script">We saved you a spot<br>in the next chapter.</p><span aria-hidden="true">♡</span></div><div class="a-rsvp-details"><p>${ui.icon('calendar')} 6–8 August 2027</p><p>${ui.icon('pin')} Royal Orchid, Bangalore</p><p>${ui.icon('users')} MTRS 95/97</p></div></aside><div class="a-rsvp-form">${ui.registration({layout:'single'})}</div></div></section>
    </main>
    <footer class="a-footer a-width"><a class="a-wordmark" href="#top">MTRS <span>95/97</span><small>THE REUNION · 2027</small></a><p>Old friends. New memories. <span>Same us.</span></p><a href="#top" class="a-back-top" aria-label="Back to top">${ui.icon('arrow')}</a></footer>
  </div>`;
}
