// Grei Arcade Engine - Registry Layer (Clean Modern Build)
// Loads and manages all arcade games from games.json

export async function loadGameRegistry() {
  try {
    const res = await fetch('./games/games.json');
    if (!res.ok) throw new Error('Failed to load games.json');

    const games = await res.json();

    // Clean validation for scalability (future external dev support)
    return games.filter(game => 
      game && 
      typeof game.id === 'string' && 
      typeof game.title === 'string' && 
      typeof game.entry === 'string'
    );

  } catch (error) {
    console.error('[Arcade Engine] Registry load failed:', error);
    return [];
  }
}

export function getGameById(games, id) {
  return games.find(game => game.id === id);
}

export function filterGamesByTag(games, tag) {
  return games.filter(game => Array.isArray(game.tags) && game.tags.includes(tag));
}

export function sortGamesByTitle(games) {
  return [...games].sort((a, b) => a.title.localeCompare(b.title));
}