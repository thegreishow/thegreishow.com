import { readFile } from 'node:fs/promises';

const [liveHtml, manifest, app, sections, content] = await Promise.all([
  readFile('../index.html', 'utf8'),
  readFile('src/site-manifest.ts', 'utf8'),
  readFile('src/App.tsx', 'utf8'),
  readFile('src/HomeSections.tsx', 'utf8'),
  readFile('src/site-content.ts', 'utf8')
]);

const reactSource = `${app}\n${sections}\n${content}`;
const errors = [];

function extractArray(name) {
  const match = manifest.match(new RegExp(`${name}:\\s*\\[([\\s\\S]*?)\\]`, 'm'));
  if (!match) {
    errors.push(`site-manifest.ts is missing ${name}.`);
    return [];
  }
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((entry) => entry[1]);
}

for (const group of ['phrases', 'routes', 'assets', 'statistics']) {
  for (const value of extractArray(group)) {
    if (!liveHtml.includes(value)) errors.push(`Live index.html no longer contains ${group.slice(0, -1)}: ${value}`);
    if (!reactSource.includes(value)) errors.push(`React source is missing live ${group.slice(0, -1)}: ${value}`);
  }
}

const liveSectionOrder = ['hero', 'signal-strip', 'explore', 'support', 'service-panel', 'list-section'];
let lastIndex = -1;
for (const marker of liveSectionOrder) {
  const index = liveHtml.indexOf(marker);
  if (index === -1) errors.push(`Live index.html is missing architecture marker: ${marker}`);
  if (index !== -1 && index < lastIndex) errors.push(`Live homepage order changed near ${marker}. Update the parity contract intentionally.`);
  lastIndex = Math.max(lastIndex, index);
}

if (errors.length) {
  console.error(`Live parity validation failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:\n`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Live homepage parity contract is valid.');
console.log('Checked copy, routes, assets, statistics and section order against index.html.');
