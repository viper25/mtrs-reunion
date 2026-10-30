/prototype Create UI designs for a schoo reunion site based on the requirements below. /grill-me  to refine the UI before starting on development.

### Role & Objective
Act as an expert Full-Stack Developer specializing in the Cloudflare ecosystem. Build a complete, production-ready, responsive event information and registration web application for a **School Reunion (6–8 August 2027)** at **Royal Orchid, Bangalore**. 

### Tech Stack & Architecture
- **Frontend:** HTML5, Tailwind CSS (via CDN or Vite build), and clean Vanilla JavaScript (or lightweight Alpine.js/React if preferred for state). Hosted on **Cloudflare Pages**.
- **Backend API:** **Cloudflare Pages Functions** (`/functions/api/...`) using TypeScript/JavaScript workers.
- **Database:** **Cloudflare D1 (SQLite)** bound to the Pages Function as `DB`.
- **Configuration:** Include `wrangler.toml`, `schema.sql`, and `package.json` for local development (`wrangler pages dev`) and deployment.

---

### Visual & UI Design Guidelines (Matching Event Poster)
- **Theme:** Warm, nostalgic, resort-getaway aesthetic with tropical foliage accents.
- **Color Palette:**
  - Primary Background: Warm Cream / Off-White (`#FDFBF7` / `#F7F2E7`)
  - Primary Brand / Header: Deep Teal / Navy (`#124E5B` / `#0F3C4C`)
  - Accent / Highlight: Warm Mustard Yellow (`#F4C430` / `#EAB308`)
  - Tier Card 1 (2-Night Stay): Soft Lavender background (`#EDE9FE`) with Deep Purple accents (`#4C1D95`)
  - Tier Card 2 (1-Night Stay): Soft Sage/Mint background (`#E6F4EA`) with Teal accents (`#115E59`)
  - Tier Card 3 (Day Attendee): Soft Peach/Terracotta background (`#FCE8E6`) with Rust accents (`#B45309`)
- **Typography:** 
  - Headings: Playful script/handwritten font (e.g., `'Caveat'` or `'Pacifico'` from Google Fonts) paired with bold sans-serif (`'Plus Jakarta Sans'` or `'Montserrat'`).

---

### Page Sections & Content Requirements

#### 1. Hero Section
- **Badge/Pre-title:** "The Wait is Finally Over!"
- **Main Title:** "Reunion — Let's Get Together ❤️"
- **Event Highlights Bar:**
  - 📅 **Dates:** 6 – 8 August 2027
  - 📍 **Venue:** Royal Orchid, Bangalore
- **Countdown Timer:** Live JavaScript countdown timer ticking down to `2027-08-06T14:00:00+05:30`.
- **Primary CTAs:** "Register Your Stay" (smooth scrolls to form) & "Download Venue Brochure" (placeholder link for PDF brochure).

#### 2. Welcome & Venue Spotlight
- **Announcement Copy:** 
  > "After exploring multiple hotel options and much deliberation we’re happy to announce that **Royal Orchid, Bangalore**, is our chosen venue!"
- **Visitor Information Cards:**
  - **About the Venue:** Highlight Royal Orchid Bangalore (Old Airport Road, adjacent to KGA Golf Course), resort ambiance, dining, and pool facilities.
  - **Travel & Logistics (For those flying in):** Distance from Kempegowda International Airport (BLR), best transport options, standard check-in/check-out times, and weather in Bangalore in August.
  - **Brochure Download:** Prominent button to view/download the hotel brochure PDF.

#### 3. Participation Options & Programme Details (3-Column Interactive Pricing/Package Cards)
Display the three participation tiers styled after the poster. Clicking "Select Plan" on any card should auto-select that option in the registration form below:

1. **2-Night Stay (Purple Theme)** — *Include a badge: "⭐ OUR PREFERRED OPTION!"*
   - **6 Aug:** Check-in & Welcome Evening / Catch-up
   - **7 Aug:** Main Reunion Celebrations! 🎉
   - **8 Aug:** Farewell Breakfast & Check-out
2. **1-Night Stay (Teal/Green Theme)**
   - **7 Aug:** Check-in & Reunion Celebrations! 🎉
   - **8 Aug:** Farewell Breakfast & Check-out
3. **Day Attendee (Terracotta/Orange Theme)**
   - **7 Aug:** Join us for the main event & celebrations!

#### 4. Registration Form Section
Build a user-friendly, validated form that dynamically adjusts fields based on the selected participation option:
- **Personal Details:**
  - Full Name (`required`)
  - Email Address (`required`, validated)
  - Mobile / WhatsApp Number with Country Code (`required`, e.g., `+91`, `+65`, `+1`, etc.)
  - Current City / Country of Residence (`required`)
- **Participation Tier (`required` radio cards):**
  - `2_night` (2-Night Stay: 6–8 Aug)
  - `1_night` (1-Night Stay: 7–8 Aug)
  - `day_attendee` (Day Attendee: 7 Aug only)
- **Stay & Occupancy Details (Conditionally shown if `2_night` or `1_night` is selected):**
  - Room Occupancy Preference: Single Occupancy, Double/Twin Sharing (with a batchmate)
  - Preferred Roommate Name (optional text input if Twin Sharing is selected).
- **Event & Travel Preferences:**
  - Dietary Preferences (`Veg`, `Non-Veg`, `Jain`, `Vegan`, `Other/Allergies`)
  - T-Shirt Size (`S`, `M`, `L`, `XL`, `XXL`)
  - Flying In? (Checkbox/Toggle: "I am flying into Bangalore" + optional Arrival/Departure details or airport transfer interest)
  - Special Requests / Notes / Message for the organizers (textarea)
- **UX States:** Loading spinner during submission, clear error handling (e.g., if email is already registered, allow updating or show friendly message), and a celebratory confirmation modal/view