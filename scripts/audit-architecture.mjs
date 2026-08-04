#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'docs', 'ARCHITECTURE_REPORT.md');
const SKIP_DIRS = new Set(['.git', 'node_modules', '.wrangler', 'dist', 'build', '.cache']);
const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.md', '.toml', '.yml', '.yaml']);
const MEDIA_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.mp3', '.wav', '.m4a', '.mp4', '.mov', '.pdf']);

async function walk(directory, files = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute, files);
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

async function hashFile(file) {
  const content = await readFile(file);
  return createHash('sha256').update(content).digest('hex');
}

async function inspectText(file) {
  const content = await readFile(file, 'utf8');
  return {
    inlineStyles: (content.match(/<style\b/gi) || []).length,
    inlineScripts: (content.match(/<script(?![^>]*\bsrc=)[^>]*>/gi) || []).length,
    lines: content.split(/\r?\n/).length
  };
}

const files = await walk(ROOT);
const records = [];
const duplicateCandidates = new Map();

for (const file of files) {
  const info = await stat(file);
  const extension = path.extname(file).toLowerCase();
  const record = {
    path: relative(file),
    bytes: info.size,
    extension,
    inlineStyles: 0,
    inlineScripts: 0,
    lines: null
  };

  if (TEXT_EXTENSIONS.has(extension) && info.size < 5 * 1024 * 1024) {
    Object.assign(record, await inspectText(file));
  }

  if (MEDIA_EXTENSIONS.has(extension) && info.size > 0) {
    const key = `${info.size}:${await hashFile(file)}`;
    const group = duplicateCandidates.get(key) || [];
    group.push(record.path);
    duplicateCandidates.set(key, group);
  }

  records.push(record);
}

const largest = [...records].sort((a, b) => b.bytes - a.bytes).slice(0, 50);
const rootHtml = records.filter(record => !record.path.includes('/') && record.extension === '.html');
const inlinePages = records
  .filter(record => record.extension === '.html' && (record.inlineStyles || record.inlineScripts))
  .sort((a, b) => (b.inlineStyles + b.inlineScripts) - (a.inlineStyles + a.inlineScripts));
const duplicates = [...duplicateCandidates.values()].filter(group => group.length > 1);
const totalBytes = records.reduce((sum, record) => sum + record.bytes, 0);

const report = [
  '# Architecture Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Repository summary',
  '',
  `- Files scanned: ${records.length}`,
  `- Working-tree size: ${formatBytes(totalBytes)}`,
  `- Root HTML pages: ${rootHtml.length}`,
  `- HTML pages with inline CSS or JavaScript: ${inlinePages.length}`,
  `- Exact duplicate media groups: ${duplicates.length}`,
  '',
  '## 50 largest files',
  '',
  '| Size | Path |',
  '| ---: | --- |',
  ...largest.map(record => `| ${formatBytes(record.bytes)} | \`${record.path}\` |`),
  '',
  '## Root HTML pages',
  '',
  ...rootHtml.map(record => `- \`${record.path}\``),
  '',
  '## Inline style and script inventory',
  '',
  '| Inline styles | Inline scripts | Lines | Page |',
  '| ---: | ---: | ---: | --- |',
  ...inlinePages.map(record => `| ${record.inlineStyles} | ${record.inlineScripts} | ${record.lines ?? '-'} | \`${record.path}\` |`),
  '',
  '## Exact duplicate media',
  '',
  ...(duplicates.length
    ? duplicates.flatMap((group, index) => [`### Group ${index + 1}`, '', ...group.map(file => `- \`${file}\``), ''])
    : ['No exact duplicate media files found.']),
  '',
  '## Backend surfaces',
  '',
  ...['api', 'functions', 'workers', 'supabase'].map(directory => {
    const count = records.filter(record => record.path === directory || record.path.startsWith(`${directory}/`)).length;
    return `- \`${directory}/\`: ${count} files`;
  }),
  '',
  '## Notes',
  '',
  '- This report measures the checked-out working tree, not historical Git object size.',
  '- Review every duplicate group before deleting anything; public URLs and deployment references may still depend on a copy.',
  '- Re-run with `node scripts/audit-architecture.mjs` after each cleanup phase.'
].join('\n');

await writeFile(OUTPUT, `${report}\n`, 'utf8');
console.log(`Architecture report written to ${relative(OUTPUT)}`);
