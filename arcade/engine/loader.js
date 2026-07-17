// Grei Arcade Engine - Loader Layer
// Builds the Arcade interface dynamically from games.json

import { loadGameRegistry } from './registry.js';
import { openGameEmbed } from './embed.js';
import {
  getPlayerProfile,
  savePlayerProfile,
  recordGameLaunch,
  getRecentActivity,
  getDailyChallenge,
  getArcadeLevel
} from './community.js';

let arcadeState = {
  games: [],
  visibleGames: [],
  activeTag: 'all',
  search: ''
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getGameTags(game) {
  return Array.isArray(game.tags) ? game.tags : [];
}

function getAllTags(games) {
  return [...new Set(games.flatMap(getGameTags))].sort((a, b) => a.localeCompare(b));
}

function getGameTypeLabel(game) {
  return game.type === 'external' ? 'External' : 'Native';
}

function createGameCard(game) {
  const card = document.createElement('article');
  card.className = 'arcade-card';
  card.dataset.tags = getGameTags(game).join('|').toLowerCase();
  card.dataset.title = String(game.title || '').toLowerCase();

  const tags = getGameTags(game)
    .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join('');

  card.innerHTML = `
    <div class="arcade-card-inner">
      <div class="arcade-thumb">
        <img src="${escapeHtml(game.thumbnail || '')}" alt="${escapeHtml(game.title)} thumbnail" loading="lazy" />
      </div>
      <div class="arcade-info">
        <div class="arcade-meta">
          <span>${escapeHtml(getGameTypeLabel(game))}</span>
          <span>v${escapeHtml(game.version || '1.0')}</span>
        </div>
        <h3>${escapeHtml(game.title)}</h3>
        <p>${escapeHtml(game.description || '')}</p>
        <div class="arcade-tags">${tags}</div>
      </div>
      <button class="play-btn" type="button" data-id="${escapeHtml(game.id)}">Play</button>
    </div>
  `;

  const image = card.querySelector('img');
  image.addEventListener('error', () => {
    image.removeAttribute('src');
    image.alt = '';
  });

  return card;
}

function createCommunityPanel(games) {
  const profile = getPlayerProfile();
  const level = getArcadeLevel(profile.xp);
  const challenge = getDailyChallenge(games);
  const recent = getRecentActivity();
  const recentMarkup = recent.length
    ? recent.map(item => `<span class="community-pill">${escapeHtml(item.title)}</span>`).join('')
    : '<span class="community-muted">Your recent games will appear here.</span>';

  return `
    <section class="arcade-community" aria-label="Arcade community profile">
      <div class="community-profile">
        <div>
          <p class="arcade-kicker">Player identity</p>
          <h2 id="community-player-name">${escapeHtml(profile.name)}</h2>
          <p class="community-muted">Arcade Level ${level} · ${profile.xp} XP · ${profile.gamesPlayed} launches</p>
        </div>
        <button class="filter" id="edit-profile" type="button">Edit name</button>
      </div>
      <div class="community-challenge">
        <p class="arcade-kicker">Daily challenge</p>
        <h3>${challenge.game ? escapeHtml(challenge.game.title) : 'Arcade challenge'}</h3>
        <p>${escapeHtml(challenge.objective)}</p>
        <span class="community-reward">+${challenge.reward} XP when global profiles launch</span>
      </div>
      <div class="community-recent">
        <p class="arcade-kicker">Recently played</p>
        <div class="community-pills">${recentMarkup}</div>
      </div>
    </section>
  `;
}

function createShell(root, games) {
  const tags = getAllTags(games);
  const nativeCount = games.filter(game => game.type !== 'external').length;
  const externalCount = games.length - nativeCount;

  root.innerHTML = `
    <main class="arcade-shell">
      <section class="arcade-hero" aria-labelledby="arcade-title">
        <div>
          <p class="arcade-kicker">The Grei Show</p>
          <h1 id="arcade-title">Arcade</h1>
          <p>Play original games, chase personal bests, complete daily challenges, and build your identity inside The Grei Show creative universe.</p>
        </div>
        <div class="arcade-stats" aria-label="Arcade stats">
          <div class="stat"><strong>${games.length}</strong><span>Total games</span></div>
          <div class="stat"><strong>${nativeCount}</strong><span>Native builds</span></div>
          <div class="stat"><strong>${externalCount}</strong><span>External embeds</span></div>
          <div class="stat"><strong>${tags.length}</strong><span>Tags</span></div>
        </div>
      </section>

      ${createCommunityPanel(games)}

      <section class="arcade-controls" aria-label="Arcade controls">
        <input class="arcade-search" type="search" placeholder="Search arcade" aria-label="Search arcade games" />
        <div class="arcade-filters" role="list" aria-label="Filter arcade games">
          <button class="filter active" type="button" data-tag="all">All</button>
          ${tags.map(tag => `<button class="filter" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join('')}
        </div>
      </section>

      <div class="arcade-status"></div>
      <section class="arcade-grid" aria-label="Arcade games"></section>
    </main>
  `;
}

function filterGames() {
  const query = arcadeState.search.trim().toLowerCase();
  const activeTag = arcadeState.activeTag.toLowerCase();

  arcadeState.visibleGames = arcadeState.games.filter(game => {
    const tags = getGameTags(game).map(tag => tag.toLowerCase());
    const matchesTag = activeTag === 'all' || tags.includes(activeTag);
    const searchable = [game.title, game.description, game.creator, ...tags].join(' ').toLowerCase();
    const matchesQuery = !query || searchable.includes(query);
    return matchesTag && matchesQuery;
  });
}

function renderGames(root) {
  const grid = root.querySelector('.arcade-grid');
  const status = root.querySelector('.arcade-status');
  if (!grid || !status) return;

  grid.innerHTML = '';
  status.textContent = `${arcadeState.visibleGames.length} of ${arcadeState.games.length} games shown`;

  if (!arcadeState.visibleGames.length) {
    grid.innerHTML = '<div class="arcade-empty">No games match that search yet.</div>';
    return;
  }

  arcadeState.visibleGames.forEach(game => grid.appendChild(createGameCard(game)));
  attachGameEvents(grid, arcadeState.games);
}

function setActiveFilter(root, tag) {
  arcadeState.activeTag = tag;
  root.querySelectorAll('.filter[data-tag]').forEach(button => {
    button.classList.toggle('active', button.dataset.tag === tag);
  });
  filterGames();
  renderGames(root);
}

function attachCommunityEvents(root) {
  root.querySelector('#edit-profile')?.addEventListener('click', () => {
    const current = getPlayerProfile();
    const value = window.prompt('Choose your Arcade player name:', current.name);
    if (value === null) return;
    const profile = savePlayerProfile({ ...current, name: value });
    const name = root.querySelector('#community-player-name');
    if (name) name.textContent = profile.name;
  });
}

function attachLobbyEvents(root) {
  const search = root.querySelector('.arcade-search');
  const filters = root.querySelector('.arcade-filters');

  search?.addEventListener('input', () => {
    arcadeState.search = search.value;
    filterGames();
    renderGames(root);
  });

  filters?.addEventListener('click', event => {
    const button = event.target.closest('.filter[data-tag]');
    if (!button) return;
    setActiveFilter(root, button.dataset.tag || 'all');
  });

  attachCommunityEvents(root);
}

function attachGameEvents(container, games) {
  container.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const game = games.find(g => g.id === id);
      if (!game || !game.entry) return;

      recordGameLaunch(game);

      if (game.type === 'external') {
        openGameEmbed(game);
        return;
      }

      window.location.href = game.entry;
    });
  });
}

async function initArcade() {
  const root = document.getElementById('arcade-root');
  if (!root) return;

  root.innerHTML = '<div class="arcade-empty">Loading arcade...</div>';
  const games = await loadGameRegistry();
  arcadeState = { games, visibleGames: games, activeTag: 'all', search: '' };
  createShell(root, games);
  attachLobbyEvents(root);
  filterGames();
  renderGames(root);
}

window.addEventListener('DOMContentLoaded', initArcade);
