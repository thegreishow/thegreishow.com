import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

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

  await validateLocalTargets(filePath, source, document);
  validateCredentials(filePath, source);
}

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
