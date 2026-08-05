# Public Route Map

This document freezes the current public route surface before any file relocation. A route may be implemented by a root HTML file, a folder index, a compatibility wrapper, or a Cloudflare rewrite. Do not move or delete an implementation until its replacement and redirect behaviour are tested.

## Core public portals

| Route | Implementation | Classification | Notes |
| --- | --- | --- | --- |
| `/` | `index.html` | Core | Homepage and primary discovery funnel |
| `/about.html` | `about.html` | Core | Artist biography and positioning |
| `/music.html` | `music.html` | Core | Music catalogue and support flow |
| `/visuals.html` | `visuals.html` | Core | Visual work portal |
| `/books.html` | `books.html` | Core | Books catalogue |
| `/press.html` | `press.html` | Core | Press and media portal |
| `/connect.html` | `connect.html` | Core | Unified inquiry and booking destination |
| `/arcade.html` | `arcade.html` | Core app | Arcade lobby |
| `/merch.html` | `merch.html` | Core commerce placeholder | Merchandise portal |
| `/photography.html` | `photography.html` | Core service | Photography portfolio |
| `/privacy.html` | `privacy.html` | Legal | Privacy policy |
| `/terms.html` | `terms.html` | Legal | Site/service terms |
| `/404.html` | `404.html` | System | Not-found page |

## Media archives

| Route | Implementation | Classification | Notes |
| --- | --- | --- | --- |
| `/music-videos.html` | `music-videos.html` | Archive | Child of Visuals |
| `/documentaries.html` | `documentaries.html` | Archive | Child of Visuals |
| `/live-sessions.html` | `live-sessions.html` | Archive | Child of Visuals |
| `/epk.html` | `epk.html` | Press utility | Electronic press-kit route |

## Books and story routes

| Route | Implementation | Classification | Notes |
| --- | --- | --- | --- |
| `/astralthread.html` | `astralthread.html` | Legacy/reader entry | Preserve until the current reader route is fully documented |

## Business and project microsites

| Route | Implementation | Classification | Notes |
| --- | --- | --- | --- |
| `/wheel-it-records.html` | `wheel-it-records.html` | Compatibility wrapper | Verify destination before removing |
| `/wheelitrecords/` | `wheelitrecords/index.html` | Microsite | Wheel It! Records destination |
| `/ilovekingston.html` | `ilovekingston.html` | Microsite | Tours and experiences |
| `/legendarycolocolo.html` | `legendarycolocolo.html` | Talent profile | Public roster/profile route |

## Promo routes

Cloudflare currently rewrites `/promo`, `/promo/`, and `/promo/*` to `promo/index.html` with status 200. Route handling is therefore application-like and must be tested carefully before changing the folder structure.

| Route | Implementation | Classification | Notes |
| --- | --- | --- | --- |
| `/promo/` | `promo/index.html` | Promo app | Dynamic promo hub and fallback renderer |
| `/promo/no-drama/` | `promo/no-drama/index.html` plus rewrite behaviour | Legacy promo page | Preserve playback and direct-link behaviour |
| `/promo/puff-puff-pass/` | `promo/puff-puff-pass/index.html` plus rewrite behaviour | Legacy promo page | Preserve playback and download behaviour |
| `/promo/the-vibe/` | `promo/the-vibe/index.html` plus rewrite behaviour | Legacy promo page | Preserve playback and video behaviour |

## Arcade routes

| Route | Implementation | Classification | Notes |
| --- | --- | --- | --- |
| `/arcade/arcade.html` | `arcade/arcade.html` | Compatibility wrapper | Likely redirects or points back to lobby |
| `/arcade/game.html` | `arcade/game.html` | App shell | Shared game detail/runtime page |
| `/arcade/leaderboard.html` | `arcade/leaderboard.html` | App utility | Leaderboard interface |
| `/arcade/games/dreamweaver-oracle/` | folder index | Game | Standalone playable route |
| `/arcade/games/jamaica-run/` | folder index | Game | Standalone playable route |
| `/arcade/games/signal-runner/` | folder index | Game | Standalone playable route |
| `/arcade/games/template-game/` | folder index | Development template | Do not expose more prominently without review |

## White Line public routes

| Route | Implementation | Classification | Notes |
| --- | --- | --- | --- |
| `/whiteline.html` | `whiteline.html` | Core microsite | Main White Line destination |
| `/whiteline/` | `whiteline/index.html` | Compatibility wrapper | Preserve until canonical route is confirmed |
| `/whiteline-apply.html` | `whiteline-apply.html` | Public workflow | Application flow |
| `/whiteline-castings.html` | `whiteline-castings.html` | Public workflow | Casting listings/workflow |
| `/whiteline-profile.html` | `whiteline-profile.html` | Public/profile app | Verify authentication expectations |
| `/whiteline-talent.html` | `whiteline-talent.html` | Compatibility wrapper | Verify destination before removing |
| `/whiteline-talent-terms.html` | `whiteline-talent-terms.html` | Legal | Talent terms |
| `/whiteline-payment-success.html` | `whiteline-payment-success.html` | Transaction callback | Must remain stable for payment return URLs |

## Owner, talent, and administrative routes

These routes should remain unindexed and must not be moved casually because authentication, redirects, bookmarks, or third-party callbacks may depend on them.

| Route | Implementation | Classification | Notes |
| --- | --- | --- | --- |
| `/admin.html` | `admin.html` | Admin | Legacy or utility administration route |
| `/owner.html` | `owner.html` | Owner app | Owner access route |
| `/owner-cms.html` | `owner-cms.html` | Owner app | CMS/editor route |
| `/whiteline-admin.html` | `whiteline-admin.html` | Admin | White Line administration |
| `/whiteline-talent-login.html` | `whiteline-talent-login.html` | Authentication | Talent login |
| `/whiteline-talent-portal.html` | `whiteline-talent-portal.html` | Authenticated app | Talent portal |

## Compatibility and legacy routes

| Route | Implementation | Classification | Migration rule |
| --- | --- | --- | --- |
| `/booking.html` | `booking.html` | Legacy redirect/bridge | Preserve until all inbound links use `/connect.html` |
| `/wheel-it-records.html` | `wheel-it-records.html` | Legacy redirect/bridge | Preserve until all inbound links use the canonical Wheel It route |
| `/whiteline/` | `whiteline/index.html` | Legacy bridge | Preserve while both route forms exist |
| `/whiteline-talent.html` | `whiteline-talent.html` | Legacy bridge | Confirm target and analytics before removal |

## Route-change rules

1. Never rename a public file and merge in the same step without adding and testing a redirect first.
2. Transaction callbacks, authentication routes, and emailed links receive the highest stability priority.
3. Cloudflare rewrites must be considered part of the application architecture, not just hosting configuration.
4. Compatibility wrappers may be small, but their traffic and references must be checked before deletion.
5. Any future folder migration should preserve canonical URLs and add automated route smoke tests.
