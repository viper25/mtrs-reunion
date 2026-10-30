# MTRS 95/97 — throwaway UI design study

Question: how should we balance school nostalgia with a relaxed resort weekend, and make an alumnus RSVP easy to complete?

Run from the project root:

```sh
npm run prototype
```

Open http://127.0.0.1:4173/?variant=A. No installation is needed (Node 20+).

- `?variant=A`: Class scrapbook — an asymmetrical invitation, memories, and one-page RSVP with review.
- `?variant=B`: Resort invitation — a spacious editorial invitation and a staged RSVP.
- `?variant=C`: Weekend itinerary — date-led planning, comparison rows, and a staged RSVP.

Use the floating bottom bar or the left/right arrow keys to switch. Arrow keys keep their usual behavior inside form fields. The `+` control opens design notes, current state, sample data, and success/duplicate-email/error previews. Form data survives concept switches in memory and clears on reload. No network submission, database, payment, email, or persistent storage is connected.

## Decisions supplied by the user

- Event identity: **MTRS 95/97** (do not infer the school’s expanded name or what the two years denote).
- Dates: **6–8 August 2027**; countdown target **6 August 2027, 14:00 India time**.
- Venue: **Royal Orchid, Bangalore**.
- Submission is a **confirmed attendance RSVP**. Organizers coordinate rooms and payment separately.
- One RSVP per alumnus; optional room sharing is with a batchmate.
- Balance nostalgia and a resort getaway; use placeholder imagery for this review.
- Chosen visual direction: **Version A — Class scrapbook**, selected by the user on 30 October 2026. Carry its nostalgic invitation, warm palette, scrapbook imagery, and one-page RSVP with review into the production design after the second interview.
- Outbound email is deferred because no email-sending service is configured. Alumni receive a private management link on the confirmation screen and save it to update or cancel their RSVP later. Organizers can replace lost links. No RSVP confirmations or edit links are sent by email in this phase.
- Organizers use a separate `/admin` dashboard with search/filtering and CSV export, protected by Cloudflare Access email OTP for approved organizer emails. Protect its admin API with the same access requirement.
- Organizers close or reopen registration manually from the dashboard; no automatic deadline.
- Participation cards show no prices. Organizers coordinate costs and payment separately.
- No capacity limits or waitlist: everyone is welcome to register while registration is open.

Venue illustrations are expressly placeholders, not photos of the property. The brochure is a visible placeholder. Airport distance, travel estimates, hotel facilities and timings, and August travel advice are deliberately marked for confirmation rather than presented as verified facts. No rates or booking guarantees have been invented. Fonts load from Google Fonts when available, with local fallback fonts.

## Review before production development

Version A is selected and the requested second interview is complete. The confirmed behavior above guides the production implementation in the project root. Deployment values (site domain, approved organizer emails, contact details) and final assets must be supplied or clearly marked as pending rather than invented. Cloudflare Access OTP for organizer login remains part of the design; the email deferral applies to app-sent messages. See the project-root README for verified visitor information and deployment setup.

This prototype has no production build. Its local server refuses `NODE_ENV=production`, and the design switcher requires the local server’s prototype flag. None of the prototype implementation should be promoted directly to production.

## Preview checks

Reviewed in Chromium at 1440, 768, 390, and 375 pixels wide. Checked plan selection, day-attendee room-field removal, twin-sharing roommate entry, dietary allergy details, flight fields, review, loading and success confirmation, duplicate email and submission-error messages, and form state preservation when switching concepts. No browser JavaScript errors were reported. Syntax checks and the local server check passed; the production-mode server refusal was also checked. These are prototype smoke checks, not production validation.

## Capture after review

Verdict: **Version A — Class scrapbook selected**, 30 October 2026. It answers the visual-direction question; the second interview also settled the RSVP and organizer flows recorded above. Preserve this decision and the full comparison as primary design evidence on a throwaway branch when Git metadata is available. The supplied workspace currently has an empty read-only `.git` directory, so it is not a usable repository and no branch or commit has been created. No implementation issue was supplied. The prototype remains isolated from the production build. Link the captured branch and this decision on the implementation issue when available.
