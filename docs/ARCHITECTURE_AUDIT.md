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
   - `shared/nav.js` currently coordinates navigation, footer loading, release-list enhancement, analytics-related site behaviour, and promo-video loading.
   - Promo-specific behaviour should not depend on the navigation module.

2. **Large flat root page surface**
   - Many unrelated HTML pages live at repository root, including public portals, owner/admin pages, White Line pages, media archives, and project microsites.
   - Moving them immediately would risk public URLs, so the first step is classification and routing documentation rather than relocation.

3. **Repeated page-specific styling**
   - `PROJECT_STATE.md` confirms that several pages still contain inline style blocks while the shared component layer is incomplete.

4. **Structured content is incomplete**
   - Music, visuals, books, press, arcade, and promo pages still need a consistent data-driven content strategy.

5. **Repository weight needs measurement**
   - The repository is approximately 152 MB. The audit must identify the largest tracked assets, duplicates, generated files, and media that should be externally hosted or compressed.

6. **Multiple backend surfaces**
   - `api/`, `functions/`, `workers/arcade-api/`, and `supabase/` may be intentional, but ownership, deployment target, and boundaries must be documented to avoid duplicate endpoints and configuration drift.

## Target responsibility map

```text
shared/
  nav.html
  footer.html

assets/js/core/
  site.js                # global bootstrapping only
  analytics.js           # dataLayer/event helpers

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

- [ ] Generate a complete repository tree with file sizes.
- [ ] List the 50 largest tracked files.
- [ ] Find duplicate assets by checksum and near-duplicate filename.
- [ ] Classify every root HTML page: core, archive, app, admin, legacy, redirect target, or microsite.
- [ ] Inventory inline `<style>` and `<script>` blocks by page.
- [ ] Inventory shared JS responsibilities and page consumers.
- [ ] Map every backend directory to its deployment platform and owner.
- [ ] Check `.gitignore`, generated artifacts, secrets, and environment-file handling.
- [ ] Record all public routes before moving any file.
- [ ] Define smoke tests for homepage, booking, mailing list, promo pages, books, arcade, and White Line.

## First migration candidate

Split promo-video loading out of `shared/nav.js` into a neutral global bootstrap or a promo-only page entry. This is small, reversible, and directly reduces coupling without changing URLs or markup.

## Completion criteria

- Clear ownership for every major directory.
- No feature-specific behaviour inside navigation code.
- Repeated inline CSS reduced into shared components without visual regressions.
- Content-heavy sections use documented data structures.
- Large and duplicate assets are reduced or relocated safely.
- Validation and smoke tests pass on the refactor branch before merge.
