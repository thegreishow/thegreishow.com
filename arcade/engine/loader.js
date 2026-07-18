// Grei Arcade Engine - Loader Layer
// Builds the Arcade interface dynamically from games.json

import { loadGameRegistry } from './registry.js';
import { openGameEmbed } from './embed.js';
import {
  ARCADE_AVATARS,
  hasPlayerProfile,
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
        <div class="community-identity">
          <div class="community-avatar" id="community-player-avatar" aria-hidden="true">${escapeHtml(profile.avatar)}</div>
          <div>
            <p class="arcade-kicker">Player identity</p>
            <h2 id="community-player-name">${escapeHtml(profile.name)}</h2>
            <p class="community-muted">Arcade Level ${level} · ${profile.xp} XP · ${profile.gamesPlayed} launches</p>
          </div>
        </div>
        <button class="filter" id="edit-profile" type="button">Edit profile</button>
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

function profileModalMarkup(profile, firstVisit) {
  return `
    <div class="player-profile-modal" role="dialog" aria-modal="true" aria-labelledby="player-profile-title">
      <div class="player-profile-backdrop"></div>
      <form class="player-profile-card" id="player-profile-form">
        <p class="arcade-kicker">${firstVisit ? 'Welcome, player' : 'Player settings'}</p>
        <h2 id="player-profile-title">${firstVisit ? 'Create your Arcade identity' : 'Edit your Arcade identity'}</h2>
        <p class="player-profile-copy">Choose once and every game will remember you on this device.</p>
        <label class="player-profile-label" for="player-profile-name">Arcade name</label>
        <input id="player-profile-name" class="player-profile-input" name="name" value="${firstVisit ? '' : escapeHtml(profile.name)}" maxlength="18" minlength="3" pattern="[A-Za-z0-9 _-]{3,18}" autocomplete="nickname" required placeholder="Enter 3–18 characters" />
        <fieldset class="player-avatar-fieldset">
          <legend>Choose an avatar</legend>
          <div class="player-avatar-grid">
            ${ARCADE_AVATARS.map((avatar, index) => `
              <label class="player-avatar-choice">
                <input type="radio" name="avatar" value="${avatar}" ${avatar === profile.avatar || (firstVisit && index === 0) ? 'checked' : ''} />
                <span>${avatar}</span>
              </label>
            `).join('')}
          </div>
        </fieldset>
        <p class="player-profile-error" id="player-profile-error" aria-live="polite"></p>
        <div class="player-profile-actions">
          ${firstVisit ? '' : '<button class="profile-secondary" type="button" id="cancel-profile">Cancel</button>'}
          <button class="profile-primary" type="submit">Save profile</button>
        </div>
      </form>
    </div>
  `;
}

function updateProfileDisplay(root, profile) {
  const name = root.querySelector('#community-player-name');
  const avatar = root.querySelector('#community-player-avatar');
  if (name) name.textContent = profile.name;
  if (avatar) avatar.textContent = profile.avatar;
}

function openProfileEditor(root, { firstVisit = false } = {}) {
  document.querySelector('.player-profile-modal')?.remove();
  const profile = getPlayerProfile();
  document.body.insertAdjacentHTML('beforeend', profileModalMarkup(profile, firstVisit));
  document.body.classList.add('profile-modal-open');

  const modal = document.querySelector('.player-profile-modal');
  const form = modal?.querySelector('#player-profile-form');
  const input = modal?.querySelector('#player-profile-name');
  const error = modal?.querySelector('#player-profile-error');

  const close = () => {
    modal?.remove();
    document.body.classList.remove('profile-modal-open');
  };

  modal?.querySelector('#cancel-profile')?.addEventListener('click', close);
  input?.focus();

  form?.addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(form);
    const cleanName = String(formData.get('name') || '')
      .replace(/[^a-zA-Z0-9 _-]/g, '')
      .trim()
      .slice(0, 18);

    if (cleanName.length < 3) {
      if (error) error.textContent = 'Use at least 3 letters or numbers.';
      input?.focus();
      return;
    }

    const saved = savePlayerProfile({
      ...profile,
      name: cleanName,
      avatar: String(formData.get('avatar') || ARCADE_AVATARS[0])
    });
    updateProfileDisplay(root, saved);
    close();
  });
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
    openProfileEditor(root);
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

      if (!hasPlayerProfile()) {
        openProfileEditor(document.getElementById('arcade-root'), { firstVisit: true });
        return;
      }

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

  if (!hasPlayerProfile()) {
    openProfileEditor(root, { firstVisit: true });
  }
}

window.addEventListener('DOMContentLoaded', initArcade);
