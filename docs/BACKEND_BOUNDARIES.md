# Backend Deployment Boundaries

This repository intentionally contains several server-side surfaces. They are not interchangeable and should not duplicate the same endpoint without an explicit migration plan.

## Responsibility map

| Directory | Runtime / deployment target | Primary responsibility | Public surface | Configuration ownership |
| --- | --- | --- | --- | --- |
| `functions/` | Cloudflare Pages Functions, deployed with the static site | Same-origin request handling, security middleware, public form/API endpoints, lightweight redirects | Routes derived from file paths, including `/api/*` | Cloudflare Pages project variables and secrets |
| `api/` | Compatibility/source module used by the Pages media route | Shared or legacy media resolution logic | Currently `api/media.js`; verify the active importer before moving | Inherited from the Pages Function that imports it |
| `workers/arcade-api/` | Standalone Cloudflare Worker with D1 | Arcade scores, leaderboard/community data and arcade-specific API behavior | Separate Worker endpoint configured by Wrangler | `workers/arcade-api/wrangler.toml` locally and GitHub/Cloudflare deployment secrets |
| `supabase/functions/` | Supabase Edge Functions | Database-adjacent workflows such as newsletter, booking notifications, payments and authenticated operations | Supabase project function URLs or explicitly proxied calls | Supabase project secrets; never browser-exposed |
| `supabase/migrations/` | Supabase Postgres migrations | Versioned schema, policy, trigger, function and scheduler changes | No direct public HTTP route | Supabase CLI/project migration history |
| `supabase/*.sql` | Historical/bootstrap SQL and operational references | Earlier setup scripts and documented upgrades | No direct route | Treat as reference unless incorporated into a timestamped migration |

## Rules for new backend work

1. **Prefer `functions/api/` for same-origin website endpoints.**
   Use this when a browser page should call `/api/...` on `thegreishow.com`, especially for validation, rate limiting, Turnstile, media proxying or lightweight orchestration.

2. **Prefer `supabase/functions/` for database-owned workflows.**
   Use this when the operation requires service-role access, database transactions, scheduled processing, email queues, PayPal reconciliation or authenticated owner workflows.

3. **Keep arcade infrastructure in `workers/arcade-api/`.**
   The standalone Worker and D1 database are an isolated product boundary. Do not add general website forms, music endpoints or White Line operations there.

4. **Do not add new standalone files to root `api/` without documenting the importer.**
   New public endpoints belong under `functions/api/`. The existing `api/media.js` should be treated as a compatibility/shared module until its call path is fully verified.

5. **Never commit deployment secrets.**
   Public browser configuration may contain publishable project URLs or anonymous keys only where intentionally designed. Service-role keys, webhook secrets, API tokens, SMTP credentials, Turnstile secrets and Wrangler local state must stay in provider secret stores or ignored local files.

6. **Schema changes must become timestamped migrations.**
   New production database changes belong in `supabase/migrations/`. Standalone SQL files may document history, but they should not become the only record of a live schema change.

## Request-flow examples

### Public booking form

```text
Browser form
  -> /api/whiteline (Cloudflare Pages Function)
  -> validation / rate limiting / Turnstile
  -> Supabase database
  -> queued notification
  -> Supabase Edge Function / scheduler
  -> Resend
```

### Promo media

```text
Promo player or download
  -> /api/media (Cloudflare Pages Function)
  -> release metadata / Drive or first-party source
  -> range-aware media response
```

### Arcade leaderboard

```text
Arcade client
  -> standalone Arcade Worker
  -> D1 database
  -> score / leaderboard response
```

## Migration safety checklist

Before moving an endpoint between runtimes:

- record the current public URL and callers;
- document required environment variables and secrets;
- preserve CORS, origin checks, rate limits and response formats;
- verify database privileges and service-role isolation;
- add a compatibility route or redirect where appropriate;
- deploy and test the replacement before removing the previous implementation;
- update this document and `docs/ROUTE_MAP.md`.

## Known follow-up

- Trace the exact importer and deployment role of `api/media.js`.
- Classify every `functions/api/` endpoint by feature owner.
- Convert any still-active standalone Supabase SQL upgrade files into an explicit migration history or mark them archived.
- Document the production Worker URL and D1 binding names without committing secret values.
