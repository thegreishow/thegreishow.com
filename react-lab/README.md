# The Grei Show — React Enhancement Lab

A Vite + React + TypeScript workspace for progressively enhancing the current thegreishow.com interface without replacing its visual identity, Owner CMS, Supabase workflows or arcade engine.

## Review target

The branch preview is deployed from `react-bits-lab`:

- `https://react-bits-lab.thegreishow-com.pages.dev/react-preview.html`

The zero-build page mirrors the current homepage architecture for easy Cloudflare Pages review. The production-grade React source lives in this directory.

## Local development

Use Node.js 20.19 or newer. CI uses Node.js 22.

```bash
cd react-lab
cp .env.example .env.local
npm install
npm run dev
```

Validate and build with:

```bash
npm run check:architecture
npm run build
```

The compiled application is written to `react-lab/dist`.

## Environment contract

`VITE_SITE_ORIGIN`

- Optional absolute origin used for site routes and shared assets.
- Leave blank during branch-preview development to use the current origin.
- Set to `https://thegreishow.com` for production-equivalent compiled deployments.

`VITE_NEWSLETTER_ENDPOINT`

- Optional JSON POST endpoint for mailing-list submissions.
- When unset, the form performs client validation but does not transmit personal data.

See `.env.example` for the supported keys. Never commit secrets to Vite environment variables because values prefixed with `VITE_` are exposed to the browser.

## Architecture

```text
src/
├── App.tsx                     # page shell and live section order
├── HomeSections.tsx            # homepage section components
├── site-content.ts             # typed navigation, offers and platform data
├── config.ts                   # deployment and endpoint configuration
├── components/
│   ├── BlurText.tsx            # React Bits motion enhancement
│   └── ErrorBoundary.tsx       # render failure fallback
└── services/
    ├── analytics.ts            # shared event adapter
    └── newsletter.ts           # mailing-list transport adapter
```

The React page deliberately reuses the current production class names and stylesheets:

- `base.css`
- `layout.css`
- `components.css`
- `theme.css`
- `home.css`

`src/styles.css` contains only React-specific shell, modal, accessibility and fallback rules.

## Architecture contract

`scripts/validate-architecture.mjs` prevents accidental drift by verifying:

- all required section and service files exist
- homepage sections remain in the same order as the live page
- each section is exported through the component boundary
- the application is wrapped in an error boundary
- deployment environment variables remain centralized
- all five production design-system stylesheets are inherited
- React components do not hard-code the production origin

The contract runs during every production build and in GitHub Actions.

## Current React enhancements

- React Bits `BlurText` hero entrance
- Motion-powered art and card reveals with reduced-motion support
- accessible streaming-platform chooser with focus restoration and Escape handling
- centralized analytics events compatible with the existing site, Google Analytics and Plausible
- newsletter validation and configurable submission transport
- render error fallback to the live homepage
- deployment-safe route and asset resolution

## Migration rules

1. Preserve the current homepage section order and content hierarchy unless a deliberate product decision changes it.
2. Reuse current production assets, class names and routes.
3. Keep data, configuration, presentation and external services separated.
4. Move one route at a time only after its React version reaches functional parity.
5. Keep the current arcade loader, Workers/D1 leaderboard and Supabase-backed Owner CMS until React replacements are independently proven.
6. Merge infrastructure separately from major visual experiments whenever possible.

## React Bits

The React Bits shadcn registry is configured in `components.json`. Inspect components before installing them:

```bash
npx shadcn@latest add @react-bits/BorderGlow-TS-TW --dry-run
```

Only adopt effects that enhance an existing interface role. React Bits components should not redefine the site architecture.

## Automated validation

The branch workflow verifies:

- Node.js runtime consistency
- the React architecture contract
- TypeScript correctness
- the Vite production build
- zero-build preview JavaScript syntax
- repository-wide HTML and local-route integrity
- existing Astral Thread narration mappings

## Optional isolated Cloudflare Pages project

For a compiled Vite preview project:

- Root directory: `react-lab`
- Build command: `npm run build`
- Output directory: `dist`
- Environment: optionally set `VITE_SITE_ORIGIN=https://thegreishow.com`

Do not change the current production Pages project while this branch remains experimental.
