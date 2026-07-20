import { open, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", "node_modules"]);
const issues = [];

let documentCount = 0;
let fragmentCount = 0;
let localTargetCount = 0;

function report(filePath, index, source, message) {
  const relativePath = path.relative(projectRoot, filePath);
  const line = source.slice(0, index).split("\n").length;
  issues.push({ relativePath, line, message });
}

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findHtmlFiles(entryPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      files.push(entryPath);
    }
  }

  return files;
}

function isHtmlDocument(source) {
  return /<!doctype\s+html\b/i.test(source) || /<html(?:\s|>)/i.test(source);
}

function validateTitle(filePath, source) {
  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(source);

  if (!titleMatch || !titleMatch[1].replace(/<[^>]*>/g, "").trim()) {
    report(filePath, titleMatch?.index ?? 0, source, "HTML page is missing a non-empty <title>.");
  }
}

function validateConflictMarkers(filePath, source) {
  for (const match of source.matchAll(/^(?:<<<<<<<|=======|>>>>>>>)(?:\s|$)/gm)) {
    report(filePath, match.index, source, "Unresolved merge conflict marker found.");
  }
}

function isSkippedTarget(value) {
  return (
    !value ||
    value.startsWith("#") ||
    value.startsWith("//") ||
    /^[a-z][a-z\d+.-]*:/i.test(value) ||
    /\$\{|{{|}}|<%|%>/.test(value)
  );
}

async function targetExists(targetPath) {
  try {
    const targetStat = await stat(targetPath);

    if (targetStat.isFile()) return true;
    if (!targetStat.isDirectory()) return false;

    return (await stat(path.join(targetPath, "index.html"))).isFile();
  } catch {
    return false;
  }
}

async function validateLocalTargets(filePath, source, document) {
  const sourceWithoutComments = source.replace(/<!--[\s\S]*?-->/g, (comment) =>
    comment.replace(/[^\n]/g, " "),
  );
  const sourceWithoutEmbeddedCode = sourceWithoutComments.replace(
    /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    (block) => {
      const openingTagEnd = block.indexOf(">") + 1;
      const closingTagStart = block.lastIndexOf("<");
      const embeddedContent = block.slice(openingTagEnd, closingTagStart).replace(/[^\n]/g, " ");
      return `${block.slice(0, openingTagEnd)}${embeddedContent}${block.slice(closingTagStart)}`;
    },
  );
  const attributePattern = /\b(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/gi;
  const baseDirectory = document ? path.dirname(filePath) : projectRoot;

  for (const match of sourceWithoutEmbeddedCode.matchAll(attributePattern)) {
    const rawValue = (match[2] ?? match[3] ?? match[4] ?? "").trim();

    if (isSkippedTarget(rawValue)) continue;

    const localValue = rawValue.split(/[?#]/, 1)[0];
    if (!localValue) continue;

    let decodedValue;
    try {
      decodedValue = decodeURIComponent(localValue);
    } catch {
      report(filePath, match.index, source, `${match[1].toLowerCase()} target has invalid URL encoding: ${rawValue}`);
      continue;
    }

    const targetPath = decodedValue.startsWith("/")
      ? path.resolve(projectRoot, `.${decodedValue}`)
      : path.resolve(baseDirectory, decodedValue);
    const relativeTarget = path.relative(projectRoot, targetPath);

    localTargetCount += 1;

    if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
      report(filePath, match.index, source, `${match[1].toLowerCase()} target leaves the site root: ${rawValue}`);
    } else if (!(await targetExists(targetPath))) {
      report(filePath, match.index, source, `${match[1].toLowerCase()} target does not exist: ${rawValue}`);
    }
  }
}

function getAttribute(tag, attributeName) {
  const pattern = new RegExp(
    `\\b${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'\\x60=<>]+))`,
    "i",
  );
  const match = pattern.exec(tag);
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : "";
}

function looksLikePlaceholder(value) {
  return (
    !value ||
    /\$\{|{{|}}|<%|%>/.test(value) ||
    /^(?:null|undefined|true|false)$/i.test(value) ||
    /^(?:your|replace|insert|example|sample|placeholder)[_-]/i.test(value)
  );
}

function validateCredentials(filePath, source) {
  const knownSecretPatterns = [
    ["GitHub token", /\b(?:gh[pousr]_[A-Za-z\d]{20,}|github_pat_[A-Za-z\d_]{20,})\b/g],
    ["AWS access key", /\b(?:AKIA|ASIA)[A-Z\d]{16}\b/g],
    ["Google API key", /\bAIza[A-Za-z\d_-]{35}\b/g],
    ["Slack token", /\bxox[baprs]-[A-Za-z\d-]{10,}\b/g],
    ["Stripe live secret", /\bsk_live_[A-Za-z\d]{16,}\b/g],
    ["private key", /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----/g],
  ];

  for (const [label, pattern] of knownSecretPatterns) {
    for (const match of source.matchAll(pattern)) {
      report(filePath, match.index, source, `Possible ${label} is exposed in public HTML.`);
    }
  }

  const assignmentPattern =
    /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|token|password|passwd|secret)\b\s*(?:=|:)\s*["'`]([^"'`\r\n]+)["'`]/gi;

  for (const match of source.matchAll(assignmentPattern)) {
    if (!looksLikePlaceholder(match[1].trim())) {
      report(filePath, match.index, source, "Possible hard-coded token or password in public HTML.");
    }
  }

  const credentialQueryPattern =
    /[?&](?:api[_-]?key|access[_-]?token|auth[_-]?token|token|password|passwd|secret)=([^&#"'\s]+)/gi;

  for (const match of source.matchAll(credentialQueryPattern)) {
    if (!looksLikePlaceholder(match[1].trim())) {
      report(filePath, match.index, source, "Possible token or password is exposed in a URL.");
    }
  }

  for (const match of source.matchAll(/<input\b[^>]*>/gi)) {
    const tag = match[0];
    const type = getAttribute(tag, "type").toLowerCase();
    const value = getAttribute(tag, "value").trim();
    const credentialContext = [
      getAttribute(tag, "id"),
      getAttribute(tag, "name"),
      getAttribute(tag, "placeholder"),
      getAttribute(tag, "aria-label"),
    ].join(" ");

    if (/\b(?:api[ -]?key|personal access token|secret|token)\b/i.test(credentialContext)) {
      report(filePath, match.index, source, "Public HTML requests a sensitive token from the visitor.");
    }

    if (type === "password" && value) {
      report(filePath, match.index, source, "Password field has a hard-coded value in public HTML.");
    }
  }
}

async function validateAstralThreadAudio() {
  const overridePath = path.join(projectRoot, "assets/js/books-audio-overrides.js");
  const chapterSources = [];
  const context = vm.createContext({ window: {} });

  for (let index = 1; index <= 20; index += 1) {
    const number = String(index).padStart(2, "0");
    const chapterPath = path.join(projectRoot, `assets/js/books-chapter-${number}.js`);
    const source = await readFile(chapterPath, "utf8");
    chapterSources.push(source);

    try {
      vm.runInContext(source, context, { filename: chapterPath });
    } catch (error) {
      report(chapterPath, 0, source, `Chapter data could not be loaded: ${error.message}`);
      return;
    }
  }

  const overrideSource = await readFile(overridePath, "utf8");

  try {
    vm.runInContext(overrideSource, context, { filename: overridePath });
  } catch (error) {
    report(overridePath, 0, overrideSource, `Audio mapping could not be loaded: ${error.message}`);
    return;
  }

  const chapters = context.window.astralThreadChapters;
  if (!Array.isArray(chapters) || chapters.length !== 20) {
    report(overridePath, 0, overrideSource, "Astral Thread audio must map exactly 20 chapters.");
    return;
  }

  const allAudioSource = `${chapterSources.join("\n")}\n${overrideSource}`;
  if (/aidocmaker\.com|mcp-preview/i.test(allAudioSource)) {
    report(overridePath, 0, overrideSource, "Temporary or blocked narration URLs remain in the chapter data.");
  }

  const seenAudioPaths = new Set();

  for (let index = 0; index < chapters.length; index += 1) {
    const chapter = chapters[index];
    const expectedNumber = String(index + 1).padStart(2, "0");

    if (chapter.number !== expectedNumber) {
      report(overridePath, 0, overrideSource, `Expected chapter ${expectedNumber} in audio position ${index + 1}.`);
    }

    if (chapter.previewAudio) {
      report(overridePath, 0, overrideSource, `Chapter ${chapter.number} still has a preview-audio fallback.`);
    }

    if (!/^assets\/audio\/books\/the-astral-thread\/v1\/[a-z0-9-]+\.mp3$/.test(chapter.fullAudio || "")) {
      report(overridePath, 0, overrideSource, `Chapter ${chapter.number} does not use a permanent local MP3 path.`);
      continue;
    }

    if (seenAudioPaths.has(chapter.fullAudio)) {
      report(overridePath, 0, overrideSource, `Chapter ${chapter.number} reuses another chapter's audio file.`);
      continue;
    }
    seenAudioPaths.add(chapter.fullAudio);

    const audioPath = path.join(projectRoot, chapter.fullAudio);
    try {
      const audioStat = await stat(audioPath);
      if (!audioStat.isFile() || audioStat.size < 100_000) {
        report(overridePath, 0, overrideSource, `Chapter ${chapter.number} narration is missing or unexpectedly small.`);
        continue;
      }

      const handle = await open(audioPath, "r");
      const signature = Buffer.alloc(3);
      await handle.read(signature, 0, signature.length, 0);
      await handle.close();

      const hasId3 = signature.toString("ascii") === "ID3";
      const hasMpegFrame = signature[0] === 0xff && (signature[1] & 0xe0) === 0xe0;
      if (!hasId3 && !hasMpegFrame) {
        report(overridePath, 0, overrideSource, `Chapter ${chapter.number} narration is not a recognizable MP3 file.`);
      }
    } catch {
      report(overridePath, 0, overrideSource, `Chapter ${chapter.number} narration file does not exist: ${chapter.fullAudio}`);
    }
  }
}

const htmlFiles = (await findHtmlFiles(projectRoot)).sort();

for (const filePath of htmlFiles) {
  const source = await readFile(filePath, "utf8");
  const document = isHtmlDocument(source);

  if (document) {
    documentCount += 1;
    validateTitle(filePath, source);
  } else {
    fragmentCount += 1;
  }

  validateConflictMarkers(filePath, source);
  await validateLocalTargets(filePath, source, document);
  validateCredentials(filePath, source);
}

await validateAstralThreadAudio();

issues.sort(
  (left, right) =>
    left.relativePath.localeCompare(right.relativePath) || left.line - right.line || left.message.localeCompare(right.message),
);

if (issues.length) {
  console.error(`Site validation failed with ${issues.length} issue${issues.length === 1 ? "" : "s"}:\n`);

  for (const issue of issues) {
    console.error(`- ${issue.relativePath}:${issue.line} ${issue.message}`);
  }

  console.error(
    `\nChecked ${documentCount} HTML pages, ${fragmentCount} HTML fragments, and ${localTargetCount} local targets.`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Site validation passed: checked ${documentCount} HTML pages, ${fragmentCount} HTML fragments, and ${localTargetCount} local targets.`,
  );
}
