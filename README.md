# The Grei Show Website

The official home for The Grei Show: music, books, visual work, interactive experiments, and creative services.

## Local Preview

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Validation

```sh
node scripts/validate-site.mjs
```

The same dependency-free check runs on GitHub pushes and pull requests. It verifies local links and assets, page titles, and unsafe credential fields in public HTML.

## Conversion Foundation

- The homepage routes visitors to the ebook, Bandcamp, streaming, and qualified project inquiries.
- `shared/nav.js` and the unified inquiry flow emit `grei_page_view`, `grei_cta_click`, and `grei_lead_prepared` events to `window.dataLayer` without sending personal data.
- `connect.html` is the single destination for bookings, creative projects, press, licensing, and partnerships. It prepares a complete email for review; nothing sends automatically.
- Payment, scheduling, newsletter, and analytics providers still need owner accounts and live URLs. See `LAUNCH_CHECKLIST.md`.
- Cloudflare Pages Web Analytics is enabled and activates on the next production deployment.

See `PROJECT_STATE.md` for current product status.
