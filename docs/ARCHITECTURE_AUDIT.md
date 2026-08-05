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

1. **Overloaded shared bootstrap**
   - `shared/nav.js` coordinates navigation, footer loading, release-list enhancement, analytics-related site behaviour, and feature bootstrapping.
   - Promo-specific behaviour has now been moved behind `assets/js/core/site-features.js`, reducing the first layer of coupling.

2. **Large flat root page surface**
   - The audit found 35 root-level HTML pages spanning core portals, owner/admin pages, White Line pages, archives, and compatibility routes.
   - Moving them immediately would risk public URLs, so classification and route documentation comes before relocation.

3. **Repeated page-specific styling and scripting**
   - 40 HTML pages contain inline CSS or JavaScript.
   - The largest immediate targets are `index.html`, `about.html`, the arcade games, and the three legacy promo pages.

4. **Structured content is incomplete**
   - Music, visuals, books, press, arcade, and promo pages still need a consistent data-driven content strategy.

5. **Repository weight is media-led**
   - The checked-out working tree is 136.45 MB across 295 files.
   - The largest files are first-party music masters, Astral Thread narration, and two oversized JPGs.
   - No exact duplicate media groups were found, so the main savings will come from image optimization and an explicit media-hosting policy rather than duplicate deletion.

6. **Multiple backend surfaces**
   - The audit counted 1 file under `api/`, 9 under `functions/`, 4 under `workers/`, and 33 under `supabase/`.
   - These may be intentional, but ownership, deployment target, and boundaries must be documented to avoid duplicate endpoints and configuration drift.

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

## Target responsibility map

```text
shared/
  nav.html
  footer.html

assets/js/core/
  site.js                # global bootstrapping only
  analytics.js           # dataLayer/event helpers
  site-features.js       # path-aware feature loading

assets/js/components/
  navigation.js
  footer.js
  media-player.js

assets/js/features/
  promo-video.js
  release-list.js
  newsletter.js
  booking.js

assets/js/pages/
  <page-specific entry files>

assets/css/
  base.css
  layout.css
  components/
  features/
  pages/

data/
  releases/
  music.json
  visuals.json
  books.json
  press.json
  arcade.json
```

This is a direction, not an immediate move plan. Existing paths remain authoritative until each subsystem is migrated and tested.

## Audit worklist

- [x] Generate a complete repository tree with file sizes.
- [x] List the 50 largest tracked files.
- [x] Find exact duplicate media by checksum.
- [ ] Add near-duplicate filename and visual similarity checks.
- [ ] Classify every root HTML page: core, archive, app, admin, legacy, redirect target, or microsite.
- [x] Inventory inline `<style>` and `<script>` blocks by page.
- [x] Inventory the first shared JS responsibility split.
- [ ] Inventory all shared JS consumers.
- [ ] Map every backend directory to its deployment platform and owner.
- [ ] Check `.gitignore`, generated artifacts, secrets, and environment-file handling.
- [ ] Record all public routes before moving any file.
- [ ] Define smoke tests for homepage, booking, mailing list, promo pages, books, arcade, and White Line.
- [x] Add CI generation of the architecture report.

## First migration completed

Promo-video loading is no longer owned directly by `shared/nav.js`. Navigation now invokes a neutral, path-aware feature bootstrap at `assets/js/core/site-features.js`, which loads the existing promo-video layer only for `/promo/` routes.

## Next migration sequence

1. Classify the 35 root HTML pages and freeze their public-route status.
2. Document backend deployment boundaries.
3. Extract shared styling from the three legacy promo pages into one promo stylesheet.
4. Optimize `no-drama.jpg` and `home-bg.jpg` after confirming every reference and visual fallback.
5. Split analytics and release-list enhancement out of `shared/nav.js` in separate reversible commits.

## Completion criteria

- Clear ownership for every major directory.
- No feature-specific behaviour inside navigation code.
- Repeated inline CSS reduced into shared components without visual regressions.
- Content-heavy sections use documented data structures.
- Large assets are optimized or relocated safely.
- Validation and smoke tests pass on the refactor branch before merge.
