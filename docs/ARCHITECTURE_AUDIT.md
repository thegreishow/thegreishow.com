# Architecture Audit

Branch: `refactor/architecture-cleanup`

## Goal

Reduce duplication, separate unrelated responsibilities, document where new code belongs, and make future additions safer without changing working booking, mailing-list, payment, or public-facing behaviour.

## Guardrails

- Do not redesign the live site during this refactor.
- Preserve all public URLs unless a redirect is added first.
- Keep booking and mailing-list flows unchanged unless a test exposes a regression.
- Move one subsystem at a time and validate after every migration.
- Do not delete media until references and deployment behaviour are verified.

## Preliminary inventory

### Top-level application areas

- Public static pages at repository root
- `promo/` release campaigns
- `arcade/` games and lobby assets
- `whiteline/` talent and agency features
- `api/`, `functions/`, `workers/arcade-api/`, and `supabase/` backend/integration code
- `assets/` shared media, styles, and scripts
- `shared/` injected navigation and footer resources
- `scripts/` validation and maintenance tools
- `.github/workflows/` automation

### Current architecture strengths

- Dependency-free static-site validation exists.
- Shared navigation and footer are already established.
- Major public flows and legacy redirects are working.
- Page metadata, sitemap, robots rules, and analytics hooks are present.
- The site already has separate feature folders for promo, arcade, White Line, backend functions, and Supabase.

### Confirmed architecture pressure points

1. **Legacy entry-point naming**
   - Public pages still load `shared/nav.js`, but that file is now only a compatibility wrapper.
   - Global startup lives in `assets/js/core/site.js`; navigation and footer responsibilities live in separate components.

2. **Large flat root page surface**
   - The audit found 35 root-level HTML pages spanning core portals, owner/admin pages, White Line pages, archives, and compatibility routes.
   - Moving them immediately would risk public URLs, so classification and route documentation comes before relocation.

3. **Repeated page-specific styling and scripting**
   - The initial audit found 40 HTML pages containing inline CSS or JavaScript.
   - The three legacy promo pages have now moved their common CSS and modal behavior into shared assets.

4. **Structured content is incomplete**
   - Music, visuals, books, press, arcade, and promo pages still need a consistent data-driven content strategy.

5. **Repository weight is media-led**
   - The checked-out working tree is approximately 136 MB.
   - The largest files are first-party music masters, Astral Thread narration, and two oversized JPGs.
   - No exact duplicate media groups were found, so the main savings will come from image optimization and an explicit media-hosting policy rather than duplicate deletion.

6. **Multiple backend surfaces**
   - The audit counted files under `api/`, `functions/`, `workers/`, and `supabase/`.
   - Ownership, deployment target, and boundaries must be documented to avoid duplicate endpoints and configuration drift.

## Measured findings

The generated report is committed at `docs/ARCHITECTURE_REPORT.md` and reproduced automatically by the Architecture audit GitHub Actions workflow.

### Highest-impact storage targets

- `assets/audio/music/the-vibe.mp3` — 13.22 MB
- `assets/img/no-drama.jpg` — 11.53 MB
- `assets/img/home-bg.jpg` — 9.50 MB
- Astral Thread narration directory — many files between roughly 1 MB and 9 MB
- Remaining first-party music MP3s — roughly 5 MB to 7 MB each

### Practical conclusion

The two oversized JPGs are the safest first performance/storage optimization candidates. Audio should not be moved until playback, range requests, downloads, offline expectations, and Cloudflare caching are fully documented.

## Current responsibility map

```text
shared/
  nav.html
  footer.html
  nav.js                 # compatibility entry only

assets/js/core/
  site.js                # global startup and component orchestration
  analytics.js           # dataLayer/event helpers
  site-features.js       # conditional feature loading

assets/js/components/
  navigation.js          # navigation fetch, active state, mobile controls
  footer.js              # footer fetch and mount

assets/js/features/
  release-list.js        # release-list form enhancement

assets/js/
  promo-video.js
  promo-modal.js
  newsletter.js

assets/css/
  promo.css               # shared legacy promo-page presentation
```

Existing paths remain authoritative until each subsystem is migrated and tested.

## Audit worklist

- [x] Generate a complete repository tree with file sizes.
- [x] List the 50 largest tracked files.
- [x] Find exact duplicate media by checksum.
- [ ] Add near-duplicate filename and visual similarity checks.
- [x] Classify and freeze root/public routes in `docs/ROUTE_MAP.md`.
- [x] Inventory inline `<style>` and `<script>` blocks by page.
- [x] Split analytics, release-list, promo, navigation, and footer responsibilities.
- [ ] Inventory all remaining shared JS consumers.
- [ ] Map every backend directory to its deployment platform and owner.
- [ ] Check `.gitignore`, generated artifacts, secrets, and environment-file handling.
- [x] Record public routes before moving any file.
- [ ] Define smoke tests for homepage, booking, mailing list, promo pages, books, arcade, and White Line.
- [x] Add CI generation of the architecture report.

## Migrations completed

1. Promo-video loading moved behind `assets/js/core/site-features.js`.
2. Shared promo CSS moved into `assets/css/promo.css`.
3. Shared promo modal behavior moved into `assets/js/promo-modal.js`.
4. Analytics moved into `assets/js/core/analytics.js`.
5. Release-list enhancement moved into `assets/js/features/release-list.js`.
6. Navigation moved into `assets/js/components/navigation.js`.
7. Footer loading moved into `assets/js/components/footer.js`.
8. `shared/nav.js` became a compatibility wrapper for `assets/js/core/site.js`.

## Next migration sequence

1. Document backend deployment boundaries.
2. Add smoke-test coverage for critical working flows.
3. Audit `.gitignore`, environment files, generated artifacts, and repository secrets handling.
4. Optimize `no-drama.jpg` and `home-bg.jpg` after confirming every reference and visual fallback.
5. Select the next repeated inline-style family outside promo pages.

## Completion criteria

- Clear ownership for every major directory.
- No feature-specific behaviour inside navigation code.
- Repeated inline CSS reduced into shared components without visual regressions.
- Content-heavy sections use documented data structures.
- Large assets are optimized or relocated safely.
- Validation and smoke tests pass on the refactor branch before merge.
