#!/usr/bin/env node

import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(projectRoot, "assets/audio/books/the-astral-thread/v1");
const requestedChapter = process.argv.find((argument) => argument.startsWith("--chapter="))?.slice("--chapter=".length);
const force = process.argv.includes("--force");
const chapterNumbers = [
  "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty",
];

await mkdir(outputDirectory, { recursive: true });

for (let index = 1; index <= 20; index += 1) {
  const chapterNumber = String(index).padStart(2, "0");
  if (requestedChapter && requestedChapter !== chapterNumber && requestedChapter !== String(index)) continue;

  const chapter = await loadChapter(chapterNumber);
  const filename = `chapter-${chapter.number}-${slugify(chapter.title)}.mp3`;
  const outputPath = path.join(outputDirectory, filename);
  if (!force && await exists(outputPath)) {
    console.log(`Skipping ${filename}; it already exists.`);
    continue;
  }

  const workingDirectory = await mkdtemp(path.join(tmpdir(), `astral-thread-${chapter.number}-`));
  const transcriptPath = path.join(workingDirectory, "transcript.txt");
  const aiffPath = path.join(workingDirectory, "narration.aiff");
  await writeFile(transcriptPath, transcriptFor(chapter), "utf8");

  try {
    console.log(`Generating Chapter ${chapter.number}: ${chapter.title}`);
    await run("say", ["-v", "Alex", "-r", "160", "-f", transcriptPath, "-o", aiffPath]);
    await run("ffmpeg", [
      "-y", "-i", aiffPath, "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "64k",
      "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-id3v2_version", "3",
      "-metadata", `title=${chapter.title}`, "-metadata", "album=The Astral Thread", "-metadata", `track=${index}`,
      outputPath,
    ]);
  } finally {
    await rm(workingDirectory, { recursive: true, force: true });
  }
}

async function loadChapter(chapterNumber) {
  const sourcePath = path.join(projectRoot, `assets/js/books-chapter-${chapterNumber}.js`);
  const source = await readFile(sourcePath, "utf8");
  const context = vm.createContext({ window: { astralThreadChapters: [] } });
  vm.runInContext(source, context, { filename: sourcePath });
  const chapters = context.window.astralThreadChapters;
  if (!Array.isArray(chapters) || chapters.length !== 1) throw new Error(`Could not load chapter ${chapterNumber}.`);
  return chapters[0];
}

function transcriptFor(chapter) {
  const title = String(chapter.title).replace(/[?!]+$/, "");
  return `Chapter ${chapterNumbers[Number(chapter.number) - 1]}. ${title}.\n\n${chapter.paragraphs.join("\n\n")}`;
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function exists(filePath) {
  try {
    const file = await stat(filePath);
    return file.isFile() && file.size >= 100_000;
  } catch {
    return false;
  }
}

function run(command, argumentsList) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, { stdio: ["ignore", "ignore", "pipe"] });
    let errorOutput = "";
    child.stderr.on("data", (chunk) => { errorOutput += chunk; });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed with exit code ${code}: ${errorOutput.trim()}`));
    });
  });
}
