import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const promoRoot = path.join(root, 'promo');
const issues = [];
const rows = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

function extractAttributes(source) {
  const values = [];
  const patterns = [
    /<(?:audio|source)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi,
    /\bdata-(?:audio|src|track|preview)\s*=\s*["']([^"']+)["']/gi,
    /\b(?:audioSrc|trackSrc|previewAudio|fullAudio)\s*[:=]\s*["'`]([^"'`]+)["'`]/gi,
    /\bhref\s*=\s*["']([^"']+\.(?:mp3|m4a|wav|ogg)(?:\?[^"']*)?)["']/gi,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) values.push(match[1]);
  }
  return [...new Set(values)];
}

function isExternal(value) {
  return /^(?:https?:)?\/\//i.test(value) || /^(?:data|blob):/i.test(value);
}

async function exists(filePath) {
  try { return (await stat(filePath)).isFile(); } catch { return false; }
}

let promoFiles;
try {
  promoFiles = (await walk(promoRoot)).filter(file => file.toLowerCase().endsWith('.html')).sort();
} catch {
  console.error('Promo directory does not exist.');
  process.exit(1);
}

for (const file of promoFiles) {
  const source = await readFile(file, 'utf8');
  const relative = path.relative(root, file);
  const audioRefs = extractAttributes(source);
  const hasPlayUi = /\bplay\b|aria-label\s*=\s*["'][^"']*play|data-(?:action|control)\s*=\s*["']play/i.test(source);
  const hasAudioElement = /<audio\b/i.test(source);
  const hasPlaybackCode = /\.play\s*\(|new\s+Audio\s*\(|AudioContext|currentTime/i.test(source);
  const missing = [];

  for (const ref of audioRefs) {
    if (isExternal(ref) || /\$\{|{{|}}/.test(ref)) continue;
    const clean = decodeURIComponent(ref.split(/[?#]/, 1)[0]);
    const target = clean.startsWith('/') ? path.join(root, clean.slice(1)) : path.resolve(path.dirname(file), clean);
    if (!await exists(target)) missing.push(ref);
  }

  if (hasPlayUi && audioRefs.length === 0) issues.push(`${relative}: has play UI but no discoverable audio source.`);
  if (hasPlayUi && !hasAudioElement && !hasPlaybackCode) issues.push(`${relative}: has play UI but no audio element or playback code.`);
  for (const ref of missing) issues.push(`${relative}: audio target does not exist: ${ref}`);

  rows.push({ relative, hasPlayUi, hasAudioElement, hasPlaybackCode, audioRefs, missing });
}

console.log(`PROMO AUDIO AUDIT: ${rows.length} HTML pages\n`);
for (const row of rows) {
  console.log(`- ${row.relative}`);
  console.log(`  play-ui=${row.hasPlayUi} audio-element=${row.hasAudioElement} playback-code=${row.hasPlaybackCode}`);
  console.log(`  sources=${row.audioRefs.length ? row.audioRefs.join(', ') : '(none)'}`);
  if (row.missing.length) console.log(`  missing=${row.missing.join(', ')}`);
}

if (issues.length) {
  console.error(`\nPROMO AUDIO ISSUES (${issues.length}):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log('\nAll promo playback surfaces have discoverable, existing audio targets.');
}
