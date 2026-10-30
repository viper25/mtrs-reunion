// THROWAWAY UI PROTOTYPE: B, an editorial resort invitation.
export function renderB(ui) {
  return `
    <div class="variant-b" id="top">
      <header class="b-header container">
        <a class="b-wordmark" href="#top" aria-label="MTRS 95/97 home"><span class="b-brand-mark">m.</span><span>MTRS <strong>95/97</strong><small>BACK TO OUR KIND OF PEOPLE</small></span></a>
        <nav class="b-nav" aria-label="Main navigation"><a href="#weekend">The weekend</a><a href="#venue">The setting</a><a href="#plans">Your options</a></nav>
        <a class="b-header-rsvp" href="#rsvp">Count me in ${ui.icon('arrowUpRight')}</a>
      </header>

      <main>
        <section class="b-hero">
          <div class="b-hero-copy">
            <span class="b-pretitle"><span></span> The Wait is Finally Over!</span>
            <p class="b-reunion-label">MTRS 95/97 · THE REUNION</p>
            <h1>Reunion —<br>Let’s get<br><em>together.</em><span class="b-title-heart" aria-label="love">${ui.icon('heart')}</span></h1>
            <p class="b-hero-description">Same old friends. A little more life to catch up on.<br>One wonderful weekend to make it happen.</p>
            <div class="b-hero-actions"><a href="#rsvp" class="button b-mustard">Register Your Stay ${ui.icon('arrowUpRight')}</a><a href="#weekend" class="b-text-link">Meet us in Bangalore ${ui.icon('arrow')}</a></div>
            <div class="b-countdown"><span>THE NEXT CHAPTER STARTS IN</span>${ui.countdown()}</div>
          </div>
          <div class="b-hero-visual">
            <div class="b-venue-photo">${ui.photo('venue', 'Royal Orchid · venue photo placeholder')}</div>
            <div class="b-photo-caption"><span>THE SETTING FOR OUR NEXT MEMORY</span><p>Royal Orchid, <em>Bangalore.</em></p></div>
            <div class="b-photo-stamp"><span>Old friends,</span><strong>new memories.</strong>${ui.icon('sun')}</div>
          </div>
        </section>

        <div class="b-event-strip">
          <div class="container b-event-strip-inner"><div>${ui.icon('calendar')}<span><small>CLEAR YOUR CALENDAR</small><strong>6–8 August 2027</strong></span></div><div>${ui.icon('pin')}<span><small>WE’LL SEE YOU AT</small><strong>Royal Orchid, Bangalore</strong></span></div><a href="#" data-brochure>${ui.icon('download')} Download Venue Brochure ${ui.icon('arrowUpRight')}</a></div>
        </div>

        <section class="b-welcome container" id="venue">
          <div class="b-section-label"><span>01 / THE SETTING</span><span>A LITTLE ESCAPE, A LOT OF CATCHING UP</span></div>
          <div class="b-welcome-grid">
            <div><p class="b-script-note">We found our place.</p><h2>Room for<br>old stories.<br><span>And new ones.</span></h2></div>
            <div class="b-welcome-copy"><p class="b-announcement">After exploring multiple hotel options and much deliberation we’re happy to announce that <strong>Royal Orchid, Bangalore</strong>, is our chosen venue!</p><p>On Old Airport Road, beside the KGA Golf Course, a resort-style setting gives us the perfect excuse to slow down. Think long conversations, meals together, and a little time by the pool.</p><div class="b-venue-features"><span>${ui.icon('leaf')} Resort ambience</span><span>${ui.icon('sun')} Poolside downtime</span><span>${ui.icon('users')} A table for everyone</span></div><a class="b-inline-link" href="#" data-brochure>Explore the venue brochure ${ui.icon('arrowUpRight')}</a></div>
          </div>
          <div class="b-travel">${ui.travel()}</div>
        </section>

        <section class="b-weekend" id="weekend">
          <div class="container">
            <div class="b-section-label"><span>02 / THE WEEKEND</span><span>THREE DAYS. OUR KIND OF TIME.</span></div>
            <div class="b-weekend-heading"><h2>A weekend worth<br><em>coming back for.</em></h2><p>No school bell this time.<br>Just plenty of reasons to stay a little longer.</p></div>
            <div class="b-itinerary">
              <article><div class="b-date"><strong>06</strong><span>AUGUST<br>FRIDAY</span><span class="b-day-symbol">${ui.icon('sun')}</span></div><h3>The hello-agains</h3><p>Check in, settle down, and pick up right where we left off. A welcome evening made for catching up.</p><span class="b-day-footer">CHECK-IN + WELCOME EVENING</span></article>
              <article><div class="b-date"><strong>07</strong><span>AUGUST<br>SATURDAY</span><span class="b-day-symbol">${ui.icon('star')}</span></div><h3>The big reunion</h3><p>Our main reunion celebrations. Familiar faces, forgotten stories, and a whole new set of memories.</p><span class="b-day-footer">MAIN REUNION CELEBRATIONS</span></article>
              <article><div class="b-date"><strong>08</strong><span>AUGUST<br>SUNDAY</span><span class="b-day-symbol">${ui.icon('heart')}</span></div><h3>Until next time</h3><p>One last breakfast together, a few more photos, and goodbyes that feel a lot more like “see you soon.”</p><span class="b-day-footer">FAREWELL BREAKFAST + CHECK-OUT</span></article>
            </div>
          </div>
        </section>

        <section class="b-plans container" id="plans">
          <div class="b-section-label"><span>03 / YOUR WAY TO JOIN</span><span>MAKE A LITTLE ROOM FOR US</span></div>
          <div class="b-plan-heading"><h2>However you join,<br><em>you belong here.</em></h2><p>A full weekend, one night, or the big day.<br>Choose what works for you.</p></div>
          <div class="b-plan-grid">
            <article class="b-plan b-plan-purple"><div class="b-plan-preferred">${ui.icon('star')} OUR PREFERRED OPTION!</div><div class="b-plan-top"><span>THE FULL EXPERIENCE</span>${ui.icon('sun')}</div><h3>2-Night Stay</h3><p class="b-plan-dates">6–8 AUGUST 2027</p><p class="b-plan-intro">More time for the stories we haven’t told yet.</p><ul><li>${ui.icon('check')}<span><strong>6 Aug</strong> · Check-in & welcome evening</span></li><li>${ui.icon('check')}<span><strong>7 Aug</strong> · Main reunion celebrations</span></li><li>${ui.icon('check')}<span><strong>8 Aug</strong> · Breakfast & check-out</span></li></ul><button type="button" class="b-plan-select" data-plan="2_night"><span data-plan-label>Select plan</span> ${ui.icon('arrowUpRight')}</button></article>
            <article class="b-plan b-plan-green"><div class="b-plan-top"><span>A LITTLE WEEKEND ESCAPE</span>${ui.icon('leaf')}</div><h3>1-Night Stay</h3><p class="b-plan-dates">7–8 AUGUST 2027</p><p class="b-plan-intro">Stay for the celebrations. Linger for breakfast.</p><ul><li>${ui.icon('check')}<span><strong>7 Aug</strong> · Check-in & celebrations</span></li><li>${ui.icon('check')}<span><strong>8 Aug</strong> · Breakfast & check-out</span></li></ul><button type="button" class="b-plan-select" data-plan="1_night"><span data-plan-label>Select plan</span> ${ui.icon('arrowUpRight')}</button></article>
            <article class="b-plan b-plan-peach"><div class="b-plan-top"><span>ALL THE REUNION SPIRIT</span>${ui.icon('heart')}</div><h3>Day Attendee</h3><p class="b-plan-dates">7 AUGUST 2027</p><p class="b-plan-intro">Come for the day. Leave with a full heart.</p><ul><li>${ui.icon('check')}<span><strong>7 Aug</strong> · Main event & celebrations</span></li></ul><button type="button" class="b-plan-select" data-plan="day_attendee"><span data-plan-label>Select plan</span> ${ui.icon('arrowUpRight')}</button></article>
          </div>
          <p class="b-plan-note">Your RSVP confirms your attendance. Organizers will coordinate rooms and payment separately.</p>
        </section>

        <section class="b-rsvp" id="rsvp">
          <div class="container b-rsvp-grid">
            <aside class="b-rsvp-aside"><p class="b-section-label">04 / YOUR SEAT AT THE TABLE</p><h2>Some things<br>are better<br><em>together.</em></h2><p>Let us know you’re coming.<br>We’ll take it from here.</p><div class="b-rsvp-details"><span>${ui.icon('calendar')} 6–8 August 2027</span><span>${ui.icon('pin')} Royal Orchid, Bangalore</span><span>${ui.icon('users')} One RSVP per alumnus</span></div><div class="b-memory-photo">${ui.photo('class', 'Our school days · class photo placeholder')}</div><span class="b-rsvp-script">Your old gang is waiting.</span></aside>
            <div class="b-rsvp-form"><p class="b-form-kicker">MTRS 95/97 · RSVP</p><h3>Count me in.</h3><p class="b-form-description">A few details to help us plan a wonderful weekend.</p>${ui.registration({layout:'steps'})}</div>
          </div>
        </section>
      </main>

      <footer class="b-footer container"><a class="b-footer-brand" href="#top">MTRS <strong>95/97</strong></a><p>Old friendships. New memories.<br><span>Bangalore · August 2027</span></p><a class="b-back-top" href="#top">Back to the top ${ui.icon('arrowUpRight')}</a></footer>
    </div>
  `;
}
