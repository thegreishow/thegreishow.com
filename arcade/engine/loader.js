// Grei Arcade Engine - Loader Layer
// Builds the Arcade interface dynamically from games.json

import { loadGameRegistry } from './registry.js';
import { openGameEmbed } from './embed.js';

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
          <p>Play experiments, prototypes, and interactive drops from the creative universe. This lobby is built to expand cleanly as new games come online.</p>
        </div>
        <div class="arcade-stats" aria-label="Arcade stats">
          <div class="stat"><strong>${games.length}</strong><span>Total games</span></div>
          <div class="stat"><strong>${nativeCount}</strong><span>Native builds</span></div>
          <div class="stat"><strong>${externalCount}</strong><span>External embeds</span></div>
          <div class="stat"><strong>${tags.length}</strong><span>Tags</span></div>
        </div>
      </section>

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

  arcadeState.visibleGames.forEach(game => {
    grid.appendChild(createGameCard(game));
  });

  attachGameEvents(grid, arcadeState.games);
}

function setActiveFilter(root, tag) {
  arcadeState.activeTag = tag;

  root.querySelectorAll('.filter').forEach(button => {
    button.classList.toggle('active', button.dataset.tag === tag);
  });

  filterGames();
  renderGames(root);
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
    const button = event.target.closest('.filter');
    if (!button) return;
    setActiveFilter(root, button.dataset.tag || 'all');
  });
}

function attachGameEvents(container, games) {
  container.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const game = games.find(g => g.id === id);

      if (!game || !game.entry) return;

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
  arcadeState = {
    games,
    visibleGames: games,
    activeTag: 'all',
    search: ''
  };

  createShell(root, games);
  attachLobbyEvents(root);
  filterGames();
  renderGames(root);
}

window.addEventListener('DOMContentLoaded', initArcade);
