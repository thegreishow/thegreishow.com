#!/usr/bin/env node

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
let checks = 0;

async function exists(relativePath) {
  try {
    return (await stat(path.join(root, relativePath))).isFile();
  } catch {
    return false;
  }
}

async function read(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch {
    failures.push(`${relativePath}: file is missing or unreadable`);
    return '';
  }
}

function expect(relativePath, source, pattern, description) {
  checks += 1;
  if (!pattern.test(source)) failures.push(`${relativePath}: ${description}`);
}

async function expectFile(relativePath, description = 'required file is missing') {
  checks += 1;
  if (!(await exists(relativePath))) failures.push(`${relativePath}: ${description}`);
}

const homepage = await read('index.html');
expect('index.html', homepage, /id=["']site-header["']/, 'shared header mount is missing');
expect('index.html', homepage, /class=["'][^"']*list-panel/, 'release-list panel is missing');
expect('index.html', homepage, /shared\/nav\.js/, 'global compatibility entry is not loaded');

const booking = await read('booking.html');
expect('booking.html', booking, /<form\b/i, 'booking form is missing');
expect('booking.html', booking, /shared\/nav\.js/, 'global site entry is not loaded');

const connect = await read('connect.html');
expect('connect.html', connect, /booking\.html|Request a booking|Book/i, 'booking path is not exposed from Connect');

for (const slug of ['no-drama', 'puff-puff-pass', 'the-vibe']) {
  const file = `promo/${slug}/index.html`;
  const source = await read(file);
  expect(file, source, /assets\/css\/promo\.css/, 'shared promo stylesheet is not loaded');
  expect(file, source, /id=["']stream-modal["']/, 'streaming modal markup is missing');
  expect(file, source, /id=["']open-platforms["']/, 'platform selector trigger is missing');
  expect(file, source, /shared\/nav\.js/, 'global site entry is not loaded');
}

const books = await read('books.html');
expect('books.html', books, /astralthread\.html|The Astral Thread/i, 'Astral Thread entry point is missing');
expect('books.html', books, /shared\/nav\.js/, 'global site entry is not loaded');

const arcade = await read('arcade.html');
expect('arcade.html', arcade, /arcade\/game\.html|arcade\/games\//, 'Arcade game path is missing');
expect('arcade.html', arcade, /shared\/nav\.js/, 'global site entry is not loaded');

const whiteline = await read('whiteline.html');
expect('whiteline.html', whiteline, /White Line/i, 'White Line page identity is missing');
expect('whiteline.html', whiteline, /shared\/nav\.js/, 'global site entry is not loaded');

const compatibilityEntry = await read('shared/nav.js');
expect('shared/nav.js', compatibilityEntry, /assets\/js\/core\/site\.js/, 'compatibility entry does not load the global bootstrap');

const bootstrap = await read('assets/js/core/site.js');
expect('assets/js/core/site.js', bootstrap, /components\/navigation\.js/, 'navigation component is not loaded');
expect('assets/js/core/site.js', bootstrap, /components\/footer\.js/, 'footer component is not loaded');
expect('assets/js/core/site.js', bootstrap, /core\/site-features\.js/, 'feature bootstrap is not loaded');

const features = await read('assets/js/core/site-features.js');
expect('assets/js/core/site-features.js', features, /core\/analytics\.js/, 'analytics module is not loaded');
expect('assets/js/core/site-features.js', features, /features\/release-list\.js/, 'release-list feature is not conditionally loaded');
expect('assets/js/core/site-features.js', features, /promo-modal\.js/, 'promo modal feature is not loaded');
expect('assets/js/core/site-features.js', features, /promo-video\.js/, 'promo video feature is not loaded');

for (const required of [
  'shared/nav.html',
  'shared/footer.html',
  'assets/js/components/navigation.js',
  'assets/js/components/footer.js',
  'assets/js/core/analytics.js',
  'assets/js/features/release-list.js',
  'assets/js/newsletter.js',
  'assets/js/promo-modal.js',
  'assets/js/promo-video.js',
  'assets/css/promo.css',
  'functions/api/booking.js',
]) {
  await expectFile(required);
}

if (failures.length) {
  console.error(`Smoke tests failed with ${failures.length} problem${failures.length === 1 ? '' : 's'}:\n`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Smoke tests passed: ${checks} critical architecture and route checks.`);
}
