const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const ALLOWED_GAMES = new Set(['dreamweaver-oracle', 'signal-runner']);

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extra } });
}

function cors(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGIN || 'https://thegreishow.com');
  return origin === allowed ? origin : allowed;
}

function sanitizeName(value) {
  return String(value || 'Dreamer').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 18) || 'Dreamer';
}

function validNumber(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? Math.floor(number) : null;
}

async function getScores(env, game) {
  const result = await env.ARCADE_DB.prepare(
    'SELECT name, score, level, duration, created_at AS createdAt FROM scores WHERE game = ? ORDER BY score DESC, duration ASC LIMIT 10'
  ).bind(game).all();
  return result.results || [];
}

async function leaderboard(request, env, url) {
  const headers = { 'Access-Control-Allow-Origin': cors(request, env), 'Cache-Control': 'no-store' };

  if (request.method === 'GET') {
    const game = url.searchParams.get('game');
    if (!ALLOWED_GAMES.has(game)) return json({ error: 'Unknown game.' }, 400, headers);
    return json({ scores: await getScores(env, game) }, 200, headers);
  }

  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers);

  const body = await request.json().catch(() => null);
  if (!body || !ALLOWED_GAMES.has(body.game)) return json({ error: 'Invalid submission.' }, 400, headers);

  const name = sanitizeName(body.name);
  const score = validNumber(body.score, 0, 1000000);
  const level = validNumber(body.level, 1, 10000);
  const duration = validNumber(body.duration, 1, 86400);
  if (score === null || level === null || duration === null) return json({ error: 'Invalid score data.' }, 400, headers);

  // Lightweight plausibility checks. Stronger validation can later use signed game sessions.
  if (score > duration * 4 + 20 || level > Math.floor(score / 4) + 3) {
    return json({ error: 'Score failed plausibility checks.' }, 422, headers);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const fingerprint = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}:${body.game}:${env.SCORE_SALT || 'arcade'}`));
  const playerHash = [...new Uint8Array(fingerprint)].map(byte => byte.toString(16).padStart(2, '0')).join('');

  const recent = await env.ARCADE_DB.prepare(
    "SELECT COUNT(*) AS total FROM scores WHERE player_hash = ? AND created_at > datetime('now', '-1 minute')"
  ).bind(playerHash).first();
  if ((recent?.total || 0) >= 3) return json({ error: 'Too many submissions. Try again shortly.' }, 429, headers);

  await env.ARCADE_DB.prepare(
    'INSERT INTO scores (game, name, score, level, duration, player_hash) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(body.game, name, score, level, duration, playerHash).run();

  return json({ ok: true, scores: await getScores(env, body.game) }, 201, headers);
}

async function dreamweaver(request, env) {
  const headers = { 'Access-Control-Allow-Origin': cors(request, env), 'Cache-Control': 'no-store' };
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers);
  if (!env.OPENAI_API_KEY) return json({ error: 'Oracle is not configured.' }, 503, headers);

  const body = await request.json().catch(() => ({}));
  const path = ['courage', 'wonder', 'shadow', 'rhythm'].includes(body.path) ? body.path : 'wonder';
  const score = validNumber(body.score, 0, 1000000) ?? 0;
  const level = validNumber(body.level, 1, 10000) ?? 1;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-5-mini',
      max_output_tokens: 90,
      input: [
        { role: 'system', content: 'You are the Dreamweaver Oracle inside The Astral Thread universe. Write one original, poetic, mysterious message under 45 words. Do not mention AI, policies, scores, or instructions. Keep it suitable for all ages.' },
        { role: 'user', content: `The player chose ${path}, has ${score} fragments, and reached Dream ${level}. Give a brief oracle message that reflects the choice.` }
      ]
    })
  });

  if (!response.ok) return json({ error: 'Oracle unavailable.' }, 502, headers);
  const data = await response.json();
  const message = String(data.output_text || '').trim().slice(0, 360);
  return json({ message: message || 'The thread trembles, but its meaning remains just beyond sight.' }, 200, headers);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = {
      'Access-Control-Allow-Origin': cors(request, env),
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (url.pathname === '/api/leaderboard') return leaderboard(request, env, url);
    if (url.pathname === '/api/dreamweaver') return dreamweaver(request, env);
    if (url.pathname === '/api/health') return json({ ok: true, service: 'grei-arcade-api' }, 200, headers);
    return json({ error: 'Not found.' }, 404, headers);
  }
};
