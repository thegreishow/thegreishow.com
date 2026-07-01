// Grei Arcade Engine - Loader Layer (Clean Modern UI)
// Builds the Arcade interface dynamically from games.json

import { loadGameRegistry } from './registry.js';

function createGameCard(game) {
  const card = document.createElement('div');
  card.className = 'arcade-card';

  card.innerHTML = `
    <div class="arcade-card-inner">
      <div class="arcade-thumb">
        <img src="${game.thumbnail || ''}" alt="${game.title}" />
      </div>
      <div class="arcade-info">
        <h3>${game.title}</h3>
        <p>${game.description || ''}</p>
        <div class="arcade-tags">
          ${(game.tags || []).map(tag => `<span class='tag'>${tag}</span>`).join('')}
        </div>
      </div>
      <button class="play-btn" data-id="${game.id}">Play</button>
    </div>
  `;

  return card;
}

function attachGameEvents(container, games) {
  container.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const game = games.find(g => g.id === id);

      if (!game) return;

      window.location.href = game.entry;
    });
  });
}

function renderFilters(container, games) {
  const allTags = [...new Set(games.flatMap(g => g.tags || []))];

  const filterBar = document.createElement('div');
  filterBar.className = 'arcade-filters';

  filterBar.innerHTML = `
    <button class="filter active" data-tag="all">All</button>
    ${allTags.map(tag => `<button class='filter' data-tag='${tag}'>${tag}</button>`).join('')}
  `;

  filterBar.querySelectorAll('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;

      container.querySelectorAll('.arcade-card').forEach(card => {
        if (tag === 'all') {
          card.style.display = 'block';
        } else {
          const match = card.innerHTML.includes(tag);
          card.style.display = match ? 'block' : 'none';
        }
      });
    });
  });

  return filterBar;
}

async function initArcade() {
  const root = document.getElementById('arcade-root');
  if (!root) return;

  const games = await loadGameRegistry();

  const grid = document.createElement('div');
  grid.className = 'arcade-grid';

  const filterBar = renderFilters(grid, games);
  root.appendChild(filterBar);

  games.forEach(game => {
    grid.appendChild(createGameCard(game));
  });

  root.appendChild(grid);

  attachGameEvents(grid, games);
}

// Auto-init
window.addEventListener('DOMContentLoaded', initArcade);
