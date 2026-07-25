import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const requiredFiles = [
  'src/App.tsx',
  'src/HomeSections.tsx',
  'src/site-content.ts',
  'src/config.ts',
  'src/styles.css',
  'src/services/analytics.ts',
  'src/services/newsletter.ts',
  'src/components/ErrorBoundary.tsx'
];

const errors = [];

for (const file of requiredFiles) {
  try {
    await access(file, constants.R_OK);
  } catch {
    errors.push(`Missing required architecture file: ${file}`);
  }
}

const [app, sections, main, config, styles] = await Promise.all([
  readFile('src/App.tsx', 'utf8'),
  readFile('src/HomeSections.tsx', 'utf8'),
  readFile('src/main.tsx', 'utf8'),
  readFile('src/config.ts', 'utf8'),
  readFile('src/styles.css', 'utf8')
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

if (errors.length) {
  console.error(`Architecture validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:\n`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('React architecture contract is valid.');
console.log(`Checked ${requiredFiles.length} required files, ${requiredSections.length} ordered sections and ${requiredStylesheets.length} live stylesheets.`);
