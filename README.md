# MTRS 95/97 reunion

Responsive reunion information, confirmed attendance RSVPs, private attendee management, and an organizer dashboard for **6–8 August 2027 at Royal Orchid, Bangalore**. The visual direction is the approved Version A class scrapbook.

Built with vanilla TypeScript, Vite, compiled Tailwind CSS, Cloudflare Pages Functions, and a D1 SQLite database bound as `DB`.

## Run locally

Requires Node **22.13+** and npm. The database used by development is local; these commands do not access a production database.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:8788/**, **/manage/**, or **/admin/**. The development command builds the site, applies `schema.sql` to local D1 without deleting existing records, and starts `wrangler pages dev`.

The local server explicitly enables an organizer identity (`organizer@example.test`) on loopback only so the dashboard can be reviewed without a Cloudflare account. This bypass is absent from the deployment configuration and also requires a loopback request without a Cloudflare edge header. Do not expose the development server to a network or use this identity in production.

For frontend hot reload, keep the Pages server running and use `npm run dev:ui` in another terminal. Vite proxies `/api` to port 8788. The Pages server uses the last built frontend; run `npm run build` to refresh its assets.

```sh
npm run check
npm test
npm run build
```

Validation completed locally: both TypeScript checks, the production Vite build, the Pages Functions build, and all 12 backend/security tests pass. A Chromium walkthrough against the actual local D1 database covered registration, saved-link edits, cancellation/reconfirmation, organizer edits, link replacement/revocation, CSV downloads, manual closing/reopening, and cancellation while closed. Public, management, and dashboard layouts were checked at 375, 390, 768, and 1440 pixels; the dashboard table scrolls inside its own region. No browser JavaScript errors were reported. Cloudflare Access JWT behavior is tested with signed tokens and a mocked key endpoint; a live Cloudflare OTP login still requires your account/domain configuration.

The walkthrough created a small number of clearly named `Browser Review Alumnus` records with `example.test` email addresses in local D1. These are local review fixtures, not registrations in a cloud database.

The original three design concepts remain isolated under `prototype/` and can be opened with `npm run prototype`. They are excluded from the production build.

## Final behavior

- One alumnus per RSVP. Attendance is confirmed on submission; organizers coordinate rooms and payment separately.
- Three participation choices: two nights (6–8 August), one night (7–8 August), or the main event only (7 August).
- No public prices, capacity limits, or waitlist.
- Optional roommate, dietary, T-shirt, travel, and special-request details; stay fields are validated only for overnight attendance.
- Every successful registration shows a private management link. Alumni must save it; the application sends no email. The link allows updates, cancellation, and reconfirmation while registration is open.
- The management token appears in the URL fragment, not the query or path, and is sent to the management API in an authorization header. Only its SHA-256 hash is stored in D1. It is never included in organizer exports.
- Someone who loses the link should contact an organizer. An organizer can issue a replacement in the dashboard; replacing it invalidates the previous link. Links do not expire automatically in this phase.
- The dashboard provides search, plan/status filters, pagination, attendance/room/travel totals, CSV exports, attendee edits, and replacement management links.
- Organizers manually close or reopen registration. Closing blocks new submissions and attendee edits/reconfirmation; existing attendees can still cancel, and organizers can still make corrections.
- Duplicate email addresses cannot overwrite an existing RSVP. The public form directs the alumnus to their saved link or organizing team.

The server validates and bounds input, uses prepared SQL statements, detects conflicting edits with record versions, checks mutation origins, limits registration attempts, and escapes spreadsheet formulas in CSV exports. Private responses are not cached. These controls complement Cloudflare Access rather than replacing it.

## Configure Cloudflare before deployment

The configuration deliberately contains no real account IDs or organizer addresses. `npm run deploy` refuses to proceed until the D1 ID, Access settings, and at least one public organizer contact are populated.

1. Authenticate Wrangler and create the database:

   ```sh
   npx wrangler login
   npx wrangler d1 create mtrs-9597
   ```

2. Put the returned database ID in `wrangler.toml` under `[[d1_databases]]`. Keep the binding named `DB`. The all-zero ID is a local-development placeholder.

3. Apply the schema to the intended remote database:

   ```sh
   npx wrangler d1 execute mtrs-9597 --remote --file schema.sql
   ```

4. Create a Cloudflare Pages project named `mtrs-9597-reunion` and set up its custom domain. The build command is `npm run build`; the output directory is `dist`. Functions are in `functions/` at the repository root, not inside `dist`.

5. Configure Cloudflare Access as described below, then populate these values in `wrangler.toml`:

   | Setting | Value |
   | --- | --- |
   | `ACCESS_TEAM_DOMAIN` | Your Cloudflare Access team domain, such as `your-team.cloudflareaccess.com` |
   | `ACCESS_AUD` | The protected application's Audience (AUD) tag |
   | `ADMIN_EMAILS` | Comma-separated approved organizer email addresses |
   | `CONTACT_EMAIL` | Public organizer contact email; supply this or WhatsApp for lost-link help |
   | `CONTACT_WHATSAPP` | Public organizer WhatsApp number with country code; supply this or email |
   | `BROCHURE_URL` | Optional real hotel brochure URL; use a same-origin path such as `/assets/venue-brochure.pdf` or an HTTPS URL |

6. Build, check, and deploy:

   ```sh
   npm run deploy
   ```

Use a separate D1 database and Access application/audience for deployed preview environments. Repeat non-inheritable bindings and variables under the appropriate Wrangler environment rather than pointing previews at production data. A deployed preview receives no local authentication bypass.

### Cloudflare Access email OTP

The application sends no email. **Cloudflare Access itself sends organizer login codes**, independently of an application email provider.

In Cloudflare Zero Trust, enable **One-time PIN** as an identity provider. Create one self-hosted Access application covering the site's organizer paths:

- `your-domain/admin` and `your-domain/admin/*`
- `your-domain/api/admin` and `your-domain/api/admin/*`

Use the same application/AUD for these paths. Allow only the named organizer email addresses and require One-time PIN login. An allow rule for every valid email would let arbitrary people attempt organizer access; use the specific organizer allowlist. Match that list with `ADMIN_EMAILS` in the application configuration.

Protect corresponding paths on any additional hostname if you serve the organizer interface there. Pages Functions independently validate the signed Access assertion's issuer, audience, expiration, and organizer email before returning dashboard assets or admin API data. Missing configuration, missing tokens, spoofed email headers, invalid signatures, and unapproved email addresses fail closed. This also protects an alternate `pages.dev` hostname that has not been configured for Access login; it will not offer a working organizer login until its Access configuration is set up.

Follow the current [Cloudflare OTP setup](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/), [JWT validation guide](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), and [Pages configuration documentation](https://developers.cloudflare.com/pages/functions/wrangler-configuration/).

## Content to supply before public launch

The user chose image placeholders for this phase. Replace the clearly labelled class and venue illustrations with supplied photographs, add the real hotel PDF, and configure at least one public organizer contact so lost-link recovery is usable. The implementation does not invent a school expansion, organizer identities, reunion prices, or a room-booking guarantee.

The hotel currently lists a 40 km airport distance, 14:00 check-in, 11:00 check-out, dining, lawns, and a rooftop swimming pool on its [official property page](https://www.royalorchidhotels.com/hotel-royal-orchid-bangalore/overview). Confirm the group's arrangements for August 2027 with the hotel. Airport taxi and bus references use [KSTDC](https://kstdc.co/airport-taxi-bangalore/) and [BMTC](https://kias.mybmtc.com/). August packing advice uses [IMD's 1991–2020 climate normals](https://mausam.imd.gov.in/bengaluru/mcdata/climate.pdf), not a forecast for the reunion dates. Sources were checked on 30 October 2026.

Only organizers and someone holding an alumnus's private management link can access that RSVP's personal details. Organizers should agree on the event's contact person, retention/deletion date, and operational handling of dietary/allergy details before collecting real registrations. No analytics, payment service, bulk email integration, or attendee directory is included.

## Implementation layout

```text
index.html              Reunion information and RSVP
manage/index.html       Private attendee management
admin/index.html        Access-protected organizer dashboard
src/                    Frontend code and styles
shared/model.ts         Shared API types
functions/              Pages Functions and server validation/authentication
schema.sql              Idempotent initial D1 schema
wrangler.toml           Pages/D1 configuration
tests/                  Backend behavior and security tests
prototype/              Preserved throwaway design evidence, excluded from deployment
```

No cloud resources have been created or deployed by the implementation work. Real account/domain/Access configuration is required before a production launch.
