import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const requiredFiles = [
  'src/App.tsx',
  'src/HomeSections.tsx',
  'src/site-content.ts',
  'src/site-manifest.ts',
  'src/types/site.ts',
  'src/config.ts',
  'src/styles.css',
  'src/hooks/useModalDialog.ts',
  'src/services/analytics.ts',
  'src/services/newsletter.ts',
  'src/components/ErrorBoundary.tsx',
  'scripts/validate-live-parity.mjs'
];

const errors = [];

for (const file of requiredFiles) {
  try {
    await access(file, constants.R_OK);
  } catch {
    errors.push(`Missing required architecture file: ${file}`);
  }
}

const [app, sections, main, config, styles, content, modalHook, packageJson] = await Promise.all([
  readFile('src/App.tsx', 'utf8'),
  readFile('src/HomeSections.tsx', 'utf8'),
  readFile('src/main.tsx', 'utf8'),
  readFile('src/config.ts', 'utf8'),
  readFile('src/styles.css', 'utf8'),
  readFile('src/site-content.ts', 'utf8'),
  readFile('src/hooks/useModalDialog.ts', 'utf8'),
  readFile('package.json', 'utf8')
]);

const requiredSections = [
  'HeroSection',
  'SignalStrip',
  'ExploreSection',
  'SupportSection',
  'ServicesSection',
  'NewsletterSection'
];

let previousIndex = -1;
for (const section of requiredSections) {
  const index = app.indexOf(`<${section}`);
  if (index === -1) {
    errors.push(`App.tsx is missing ${section}.`);
  } else if (index < previousIndex) {
    errors.push(`App.tsx section order changed near ${section}. Preserve live homepage order.`);
  }
  previousIndex = Math.max(previousIndex, index);
}

for (const section of requiredSections) {
  if (!sections.includes(`export function ${section}`)) {
    errors.push(`HomeSections.tsx does not export ${section}.`);
  }
}

if (!main.includes('<ErrorBoundary>')) {
  errors.push('main.tsx must wrap the application in ErrorBoundary.');
}

if (!config.includes('VITE_SITE_ORIGIN') || !config.includes('VITE_NEWSLETTER_ENDPOINT')) {
  errors.push('config.ts must define the supported Vite environment variables.');
}

if (!config.includes("typeof window !== 'undefined'")) {
  errors.push('config.ts must remain safe outside a browser runtime.');
}

const requiredStylesheets = [
  'assets/css/base.css',
  'assets/css/layout.css',
  'assets/css/components.css',
  'assets/css/theme.css',
  'assets/css/home.css'
];

for (const stylesheet of requiredStylesheets) {
  if (!styles.includes(stylesheet)) {
    errors.push(`src/styles.css must inherit the live design system stylesheet: ${stylesheet}`);
  }
}

const sourceFiles = ['src/App.tsx', 'src/HomeSections.tsx'];
for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8');
  if (source.includes('https://thegreishow.com')) {
    errors.push(`${file} contains a hard-coded production origin. Use siteUrl() or shared content.`);
  }
}

if (!content.includes('satisfies readonly Portal[]') || !content.includes('satisfies readonly Offer[]')) {
  errors.push('site-content.ts must stay checked against the typed domain model.');
}

if (!sections.includes("offer.actionType === 'platform-modal'")) {
  errors.push('Support actions must use explicit typed action behavior instead of array position or tracking-name inference.');
}

for (const requiredBehavior of ['Escape', 'Tab', 'previousFocus', 'previousOverflow']) {
  if (!modalHook.includes(requiredBehavior)) {
    errors.push(`useModalDialog.ts is missing required accessibility behavior: ${requiredBehavior}`);
  }
}

const parsedPackage = JSON.parse(packageJson);
if (!parsedPackage.scripts?.['check:parity']) {
  errors.push('package.json must expose the live parity validation script.');
}
if (!String(parsedPackage.scripts?.build || '').includes('npm run check')) {
  errors.push('The production build must run the complete architecture, parity and typecheck suite.');
}

if (errors.length) {
  console.error(`Architecture validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:\n`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('React architecture contract is valid.');
console.log(`Checked ${requiredFiles.length} required files, ${requiredSections.length} ordered sections, ${requiredStylesheets.length} live stylesheets and interactive service boundaries.`);
