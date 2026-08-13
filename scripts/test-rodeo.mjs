import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const gameDir = resolve(root, 'arcade/games/rodeo-are-you-ready');
const [html, css, game, worker, registry] = await Promise.all([
  readFile(resolve(gameDir, 'index.html'), 'utf8'),
  readFile(resolve(gameDir, 'assets/game.css'), 'utf8'),
  readFile(resolve(gameDir, 'assets/game.js'), 'utf8'),
  readFile(resolve(root, 'workers/arcade-api/src/index.js'), 'utf8'),
  readFile(resolve(root, 'arcade/games/games.json'), 'utf8').then(JSON.parse)
]);

assert.match(game, /const cards = \[\["1"[^\n]+\["2"[^\n]+\["3"/, 'count-up must run 1, 2, 3');
assert.match(game, /MODE_ASSETS\[modeId\]\.map\(loadAsset\)/, 'selected event assets must load on demand');
assert.doesNotMatch(html, /rel="preload"[^>]+(?:animation|voice|instrumental)/, 'heavy gameplay assets must not preload');
assert.match(html, /preload="metadata"[^>]+rodeo-instrumental|id="music" preload="metadata"/, 'music should use metadata loading');
assert.match(game, /stage\.dataset\.haptics = hardwareFeedback \? "hardware" : "audio-visual"/, 'haptic fallback must be observable');
assert.match(game, /function spriteEchoes\(/, 'sprite reactions must include directional afterimages');
assert.match(game, /function dustTrail\(/, 'moving characters must emit arena dust');
assert.match(game, /function speedStreak\(/, 'charges and boosts must expose speed animation');
assert.match(game, /if \(reducedMotion \|\| !image\.complete/, 'secondary sprite motion must respect reduced-motion preferences');
assert.match(game, /NOTES\.E2[\s\S]+NOTES\.B2/, 'impact sound must remain in E major');
assert.match(game, /class="score-sync"/, 'results must expose online score status');
assert.match(worker, /WHERE game=\? AND level=\? AND player_hash=\?/, 'personal bests must be scoped by event and difficulty');
assert.match(worker, /rank\(env,b\.game,personalBest,level\)/, 'rank must be scoped by event and difficulty');
assert.match(css, /prefers-reduced-motion: reduce/, 'animation must honor reduced-motion preferences');

const rodeo = registry.find(entry => entry.id === 'rodeo-are-you-ready');
assert.equal(rodeo?.leaderboards?.length, 8, 'all four events need Easy and Standard boards');
assert.deepEqual(rodeo.leaderboards.map(board => board.level), [1,2,3,4,5,6,7,8]);

for (const asset of [
  'ride-animation-v3.png', 'ride-fall-animation-v2.png', 'matadora-animation-v4.png',
  'raging-bull-hit-v1.png', 'charging-bull-animation-v3.png',
  'horseback-rider-animation-v3.png', 'runaway-cow-animation-v2.webp',
  'rolling-calf-events-v1.png', 'exec-cb0ec69b-a278-437a-977e-973194b4cf70.mp4'
]) {
  assert.ok((await stat(resolve(gameDir, 'assets', asset))).size > 0, `${asset} must exist`);
}

console.log('Rodeo regression checks passed: controls, assets, haptics, scoring, and accessibility.');
