// THROWAWAY UI PROTOTYPE C: Does a date-led reunion itinerary make the weekend easier to picture?
export function renderC(ui) {
  return `
  <div class="variant-c" id="top">
    <div class="c-topline"><span>A LITTLE TIME AWAY. A LOT TO CATCH UP ON.</span><span>06—08 AUGUST 2027</span></div>
    <header class="c-masthead container">
      <a class="c-brand" href="#top" aria-label="MTRS 95/97 reunion home"><span class="c-brand-mark">M</span><span>MTRS <b>95/97</b><small>THE REUNION WEEKEND</small></span></a>
      <nav class="c-nav" aria-label="Main navigation"><a href="#weekend">The weekend</a><a href="#venue">The venue</a><a href="#plans">Find your plan</a></nav>
      <a class="c-nav-rsvp" href="#rsvp">I'm coming ${ui.icon('arrowUpRight')}</a>
    </header>

    <main>
      <section class="c-hero container" aria-labelledby="c-hero-title">
        <div class="c-hero-copy">
          <p class="c-handnote">The wait is finally over!</p>
          <h1 id="c-hero-title">Reunion.<br>Let's get <span>together.</span><span class="c-title-heart" aria-label="with love">♡</span></h1>
          <p class="c-hero-description">Same friends. A few more stories.<br>Three days to pick up where we left off.</p>
          <div class="c-hero-details"><span>${ui.icon('calendar')} 6–8 August 2027</span><span>${ui.icon('pin')} Royal Orchid, Bangalore</span></div>
          <div class="c-hero-actions"><a class="button button-primary" href="#rsvp">Register your stay ${ui.icon('arrowUpRight')}</a><a class="c-text-link" href="#weekend">Explore the weekend ${ui.icon('arrow')}</a></div>
        </div>
        <div class="c-hero-art" aria-label="Class photo placeholder">
          <div class="c-photo-frame">${ui.photo('class','Your old class photo goes here')}<div class="c-photo-caption"><span>THE GANG, THEN.</span><span class="c-handwritten">The gang, again. ↗</span></div></div>
          <span class="c-postmark" aria-hidden="true">MTRS<br><strong>95/97</strong><br>TOGETHER AGAIN</span>
          <div class="c-photo-tape" aria-hidden="true"></div>
        </div>
      </section>

      <section class="c-countdown-strip container" aria-label="Time until the reunion"><div><span class="c-live-dot"></span><span class="c-countdown-intro">Your next chapter of<br><strong>“remember when?” starts in</strong></span></div>${ui.countdown()}<a href="#rsvp" class="c-countdown-cta">Save your place ${ui.icon('arrowUpRight')}</a></section>

      <section class="c-weekend-section container" id="weekend" aria-labelledby="c-weekend-title">
        <div class="c-section-heading"><div><p class="section-kicker">YOUR WEEKEND, AT A GLANCE</p><h2 id="c-weekend-title">Three days.<br><span>Years of catching up.</span></h2></div><p>A little structure.<br>Plenty of room for the good stuff.</p></div>
        <div class="c-schedule-layout">
          <div class="c-day-list">
            <article class="c-day c-day-friday"><div class="c-day-date"><span>FRIDAY</span><strong>06</strong><span>AUGUST</span></div><div class="c-day-content"><div class="c-day-icon">${ui.icon('sun')}</div><p class="c-day-tag">ARRIVE & UNWIND</p><h3>Back in the same room.</h3><p>Check in, drop your bags, and find your people. Our welcome evening is all about easy conversations and overdue catch-ups.</p><div class="c-day-bottom"><span>${ui.icon('check')} Check-in & welcome evening</span><span class="c-mini-pill c-mini-purple">2-night stay</span></div></div></article>
            <article class="c-day c-day-saturday"><div class="c-day-date"><span>SATURDAY</span><strong>07</strong><span>AUGUST</span></div><div class="c-day-content"><div class="c-day-icon">${ui.icon('star')}</div><p class="c-day-tag">THE MAIN EVENT</p><h3>The one we've waited for.</h3><p>Our main reunion celebrations. Familiar faces, shared memories, and new stories that we'll be telling for years.</p><div class="c-day-bottom"><span>${ui.icon('check')} Main reunion celebrations</span><span class="c-mini-pill c-mini-yellow">Everyone's invited</span></div></div></article>
            <article class="c-day c-day-sunday"><div class="c-day-date"><span>SUNDAY</span><strong>08</strong><span>AUGUST</span></div><div class="c-day-content"><div class="c-day-icon">${ui.icon('heart')}</div><p class="c-day-tag">UNTIL NEXT TIME</p><h3>One more coffee together.</h3><p>A farewell breakfast, a few last photos, and goodbyes that feel a little more like “see you soon.”</p><div class="c-day-bottom"><span>${ui.icon('check')} Breakfast & check-out</span><span class="c-mini-pill c-mini-sage">Overnight guests</span></div></div></article>
          </div>
          <aside class="c-weekend-ticket"><div class="c-ticket-top"><span>YOUR INVITATION</span>${ui.icon('heart')}</div><p class="c-ticket-handwriting">Leave a little space<br>for old friends.</p><div class="c-ticket-route"><div><small>FROM</small><strong>Wherever<br>you are.</strong></div>${ui.icon('arrow')}<div><small>TO</small><strong>Back<br>together.</strong></div></div><div class="c-ticket-perforation" aria-hidden="true"></div><dl><div><dt>WHEN</dt><dd>6–8 Aug 2027</dd></div><div><dt>WHERE</dt><dd>Royal Orchid<br>Bangalore</dd></div><div><dt>WHO</dt><dd>MTRS 95/97</dd></div></dl><a class="button button-primary" href="#rsvp">Count me in ${ui.icon('arrowUpRight')}</a><p class="c-ticket-note">Confirm your attendance.<br>Organizers coordinate rooms & payment.</p></aside>
        </div>
      </section>

      <section class="c-plans-section" id="plans" aria-labelledby="c-plans-title"><div class="container"><div class="c-section-heading"><div><p class="section-kicker">MAKE THE WEEKEND YOURS</p><h2 id="c-plans-title">How long can <span>you stay?</span></h2></div><p>One RSVP per alumnus.<br>Three ways to be part of it.</p></div>
        <div class="c-plan-list">
          <article class="c-plan-row c-plan-purple"><div class="c-plan-order">01</div><div class="c-plan-name"><span class="c-preferred">${ui.icon('star')} OUR PREFERRED OPTION!</span><h3>2-night stay</h3><span>6–8 AUGUST</span></div><div class="c-plan-description"><strong>The full catch-up.</strong><p>Welcome evening, reunion celebrations<br>and farewell breakfast.</p></div><div class="c-plan-dates" aria-label="Attending 6, 7 and 8 August"><span>06</span><span>07</span><span>08</span></div><button type="button" class="c-plan-select" data-plan="2_night"><span data-plan-label>Select plan</span> ${ui.icon('arrowUpRight')}</button></article>
          <article class="c-plan-row c-plan-sage"><div class="c-plan-order">02</div><div class="c-plan-name"><h3>1-night stay</h3><span>7–8 AUGUST</span></div><div class="c-plan-description"><strong>A night to remember.</strong><p>Reunion celebrations followed<br>by farewell breakfast.</p></div><div class="c-plan-dates" aria-label="Attending 7 and 8 August"><span class="c-date-inactive">06</span><span>07</span><span>08</span></div><button type="button" class="c-plan-select" data-plan="1_night"><span data-plan-label>Select plan</span> ${ui.icon('arrowUpRight')}</button></article>
          <article class="c-plan-row c-plan-peach"><div class="c-plan-order">03</div><div class="c-plan-name"><h3>Day attendee</h3><span>7 AUGUST</span></div><div class="c-plan-description"><strong>Here for the big day.</strong><p>Join the main reunion event<br>and celebrations.</p></div><div class="c-plan-dates" aria-label="Attending 7 August"><span class="c-date-inactive">06</span><span>07</span><span class="c-date-inactive">08</span></div><button type="button" class="c-plan-select" data-plan="day_attendee"><span data-plan-label>Select plan</span> ${ui.icon('arrowUpRight')}</button></article>
        </div><p class="c-plans-footnote">${ui.icon('leaf')} Choose your time with us. Room arrangements and payment will be coordinated by the organizers.</p>
      </div></section>

      <section class="c-venue-section container" id="venue" aria-labelledby="c-venue-title"><div class="c-venue-visual"><div class="c-venue-image">${ui.photo('venue','Royal Orchid venue photo placeholder')}</div><div class="c-venue-caption"><span>${ui.icon('pin')} OLD AIRPORT ROAD, BANGALORE</span><span class="c-handwritten">A change of scene.</span></div></div><div class="c-venue-copy"><p class="section-kicker">THE SETTING FOR OUR NEXT CHAPTER</p><h2 id="c-venue-title">Hello,<br><span>Royal Orchid.</span></h2><p>After exploring multiple hotel options and much deliberation we’re happy to announce that <strong>Royal Orchid, Bangalore</strong>, is our chosen venue!</p><p>On Old Airport Road, adjacent to the KGA Golf Course. A resort-style setting for long conversations, shared meals, and time together.</p><div class="c-venue-features"><span>${ui.icon('leaf')} Resort ambiance</span><span>${ui.icon('sun')} Poolside downtime</span><span>${ui.icon('users')} Dining together</span></div>${ui.brochure()}</div></section>

      <section class="c-travel-section container"><div class="c-travel-heading">${ui.icon('plane')}<div><p class="section-kicker">COMING FROM NEAR OR FAR?</p><h2>The getting-here details.</h2><p>Keep the weekend for catching up. Plan the journey here.</p></div></div>${ui.travel()}</section>

      <section class="c-rsvp-section" id="rsvp" aria-labelledby="c-rsvp-title"><div class="container c-rsvp-layout"><div class="c-rsvp-intro"><p class="section-kicker">YOUR PLACE IN THE STORY</p><h2 id="c-rsvp-title">Let's make<br><span>this happen.</span></h2><p>Tell us you're coming, choose your stay, and leave the rest to the catch-up.</p><div class="c-rsvp-checks"><span>${ui.icon('check')} One RSVP, one alumnus</span><span>${ui.icon('check')} Share a room with a batchmate</span><span>${ui.icon('check')} Rooms & payment coordinated separately</span></div><div class="c-rsvp-note"><span class="c-handwritten">We saved you a spot<br>in the next group photo. ♡</span></div></div><div class="c-rsvp-form">${ui.registration({layout:'steps'})}</div></div></section>
    </main>
    <footer class="c-footer container"><a class="c-footer-brand" href="#top">MTRS <strong>95/97</strong></a><span>6–8 August 2027 · Royal Orchid, Bangalore</span><span class="c-handwritten">Some things never change. ♡</span></footer>
  </div>`;
}
