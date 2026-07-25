# The Grei Show — React Bits Lab

An isolated Vite + React + TypeScript prototype for gradually introducing React Bits into thegreishow.com without changing the current static site or Owner CMS.

## Run locally

Use Node.js 20.19 or newer.

```bash
cd react-lab
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

The generated site will be written to `react-lab/dist`.

## React Bits

The lab already includes the official TypeScript + Tailwind `BlurText` component and its Motion dependency.

The React Bits shadcn registry is configured in `components.json`. Preview additional components before installing them:

```bash
npx shadcn@latest add @react-bits/BorderGlow-TS-TW --dry-run
```

Install after reviewing the proposed changes:

```bash
npx shadcn@latest add @react-bits/BorderGlow-TS-TW
```

## Migration strategy

1. Keep the existing root website and CMS untouched.
2. Build and review new interfaces inside `react-lab`.
3. Reuse the existing routes and production assets.
4. Move one page at a time only after the React replacement matches or improves current functionality.
5. Preserve the current arcade loader, Workers/D1 leaderboard integration and Supabase-backed Owner CMS until React equivalents are proven.

## Cloudflare Pages test project

For an isolated preview project, use:

- Root directory: `react-lab`
- Build command: `npm run build`
- Output directory: `dist`

Do not change the existing production Pages project while this branch is experimental.
