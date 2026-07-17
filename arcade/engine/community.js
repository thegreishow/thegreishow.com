const PROFILE_KEY = 'grei_arcade_profile';
const ACTIVITY_KEY = 'grei_arcade_activity';

const communityStyles = new URL('./community.css', import.meta.url);
if (!document.querySelector('link[data-arcade-community]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = communityStyles.href;
  link.dataset.arcadeCommunity = 'true';
  document.head.appendChild(link);
}

function safeParse(value, fallback) {
  try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
}

export function getPlayerProfile() {
  const saved = safeParse(localStorage.getItem(PROFILE_KEY), {});
  return {
    name: String(saved.name || 'Guest Dreamer').slice(0, 18),
    joinedAt: saved.joinedAt || new Date().toISOString(),
    xp: Number(saved.xp) || 0,
    gamesPlayed: Number(saved.gamesPlayed) || 0
  };
}

export function savePlayerProfile(profile) {
  const clean = {
    name: String(profile.name || 'Guest Dreamer').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 18) || 'Guest Dreamer',
    joinedAt: profile.joinedAt || new Date().toISOString(),
    xp: Math.max(0, Number(profile.xp) || 0),
    gamesPlayed: Math.max(0, Number(profile.gamesPlayed) || 0)
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(clean));
  localStorage.setItem('grei_arcade_player_name', clean.name);
  return clean;
}

export function recordGameLaunch(game) {
  const activity = safeParse(localStorage.getItem(ACTIVITY_KEY), []);
  activity.unshift({ id: game.id, title: game.title, playedAt: new Date().toISOString() });
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity.slice(0, 12)));

  const profile = getPlayerProfile();
  profile.gamesPlayed += 1;
  profile.xp += 5;
  savePlayerProfile(profile);
}

export function getRecentActivity() {
  return safeParse(localStorage.getItem(ACTIVITY_KEY), []).slice(0, 3);
}

export function getDailyChallenge(games) {
  const date = new Date();
  const dayKey = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
  let seed = 0;
  for (const char of dayKey) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  const game = games.length ? games[seed % games.length] : null;
  const challenges = [
    'Set a new personal best',
    'Play twice without leaving the Arcade',
    'Reach the next level',
    'Share your score with a friend',
    'Try a game you have not played today'
  ];
  return { dayKey, game, objective: challenges[seed % challenges.length], reward: 25 };
}

export function getArcadeLevel(xp) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 25)) + 1);
}
