# Owner Setup Guide — The Grei Show Website

This document tracks the remaining owner-side setup items needed to fully launch revenue features, scheduling, newsletters, and analytics.

**Last updated:** July 21, 2026

## Completed

- [x] Privacy Policy (`privacy.html`)
- [x] Terms of Service & Refunds (`terms.html`)
- [x] Added legal links to main footers (index, connect, whiteline)
- [x] Improved deposit language in connect.html process list
- [x] CSS consolidation in `components.css`

## Remaining Owner Setup Tasks

### 1. Paid Deposit / Checkout Link (High Priority)
- Create a clear entry offer (e.g. "Project Consultation + Quote – $250 USD" or production review session).
- **Recommended tools**:
  - Stripe Payment Link (easiest)
  - PayPal "Buy Now" button
  - Or integrate with existing Supabase `create-booking-checkout` Edge Function
- Add prominent CTAs on:
  - Homepage (support section)
  - `connect.html`
  - `whiteline.html` booking section

**Placeholder to replace:**
`[INSERT DEPOSIT / CHECKOUT LINK HERE]`

### 2. Scheduling Tool
- Set up Calendly, SavvyCal, or TidyCal.
- Add link or embed in:
  - `connect.html` contact cards
  - Homepage service section
  - Whiteline booking flow

**Placeholder:**
`[INSERT SCHEDULING LINK HERE]`

### 3. Newsletter / Release List
- Replace the current `mailto:` "Join the list" button.
- Options:
  - Use existing Supabase email automation functions (recommended — already built)
  - Buttondown or ConvertKit embed (quick)
- Add form to homepage, footer, and connect page.

**Current placeholder:** `mailto:thegreishow@gmail.com?subject=Add%20me...`

### 4. Analytics
- Add Plausible or Google Analytics 4.
- Your existing `dataLayer` events (`grei_page_view`, `grei_cta_click`, `grei_lead_prepared`) are excellent — connect them.

### 5. Final Polish
- Update Amazon book link if a more global storefront is preferred.
- Add real press photos + downloadable media kit to Press page.
- Generate and upload final 20-chapter Astral Thread narration MP3s.
- Decide when to make `whiteline.html` visible in main navigation.

## Quick Links (Fill These In)

- Deposit / Checkout: [INSERT LINK]
- Scheduling: [INSERT LINK]
- Newsletter Provider: [INSERT LINK OR FORM EMBED]
- Analytics Property: [INSERT ID]

## Notes
- The current inquiry flow in `connect.html` (prepare email) is intentionally low-friction and spam-resistant. Keep it while adding the above.
- You already have strong backend infrastructure (Supabase + PayPal webhooks + talent payouts). These front-end pieces will complete the revenue loop.

Once these are filled in, the site will be fully revenue-ready.