const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

const GAME_RULES = {
  'dreamweaver-oracle': { maxScore: 1000000, maxRate: 4, grace: 25, levelDivisor: 4 },
  'signal-runner': { maxScore: 10000000, maxRate: 18, grace: 60, levelDivisor: 10 }
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extra }
  });
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || 'https://thegreishow.com,https://www.thegreishow.com')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function cors(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = allowedOrigins(env);
  return allowed.includes(origin) ? origin : allowed[0];
}

function responseHeaders(request, env) {
  return {
    'Access-Control-Allow-Origin': cors(request, env),
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    'Cache-Control': 'no-store'
  };
}

function sanitizeName(value) {
  return String(value || 'Dreamer')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .slice(0, 18) || 'Dreamer';
}

function validNumber(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max
    ? Math.floor(number)
    : null;
}

async function getScores(env, game) {
  const result = await env.ARCADE_DB.prepare(
    `WITH personal_bests AS (
       SELECT id, name, score, level, duration, created_at, player_hash,
              ROW_NUMBER() OVER (
                PARTITION BY player_hash
                ORDER BY score DESC, duration ASC, created_at ASC, id ASC
              ) AS personal_rank
       FROM scores
       WHERE game = ?
     )
     SELECT name, score, level, duration, created_at AS createdAt
     FROM personal_bests
     WHERE personal_rank = 1
     ORDER BY score DESC, duration ASC, created_at ASC
     LIMIT 10`
  ).bind(game).all();

  return result.results || [];
}

async function getPlayerRank(env, game, score) {
  const result = await env.ARCADE_DB.prepare(
    `WITH best_scores AS (
       SELECT player_hash, MAX(score) AS score
       FROM scores
       WHERE game = ?
       GROUP BY player_hash
     )
     SELECT COUNT(*) + 1 AS rank
     FROM best_scores
     WHERE score > ?`
  ).bind(game, score).first();

  return Number(result?.rank || 1);
}

async function enforceSubmissionLimit(env, playerHash) {
  await env.ARCADE_DB.prepare(
    `DELETE FROM score_attempts
     WHERE created_at <= datetime('now', '-1 day')`
  ).run();

  const recent = await env.ARCADE_DB.prepare(
    `SELECT COUNT(*) AS total
     FROM score_attempts
     WHERE player_hash = ?
       AND created_at > datetime('now', '-1 minute')`
  ).bind(playerHash).first();

  if ((recent?.total || 0) >= 3) return false;

  await env.ARCADE_DB.prepare(
    `INSERT INTO score_attempts (player_hash) VALUES (?)`
  ).bind(playerHash).run();

  return true;
}

async function leaderboard(request, env, url) {
  const headers = responseHeaders(request, env);

  if (request.method === 'GET') {
    const game = url.searchParams.get('game');
    if (!GAME_RULES[game]) return json({ error: 'Unknown game.' }, 400, headers);
    return json({ game, scores: await getScores(env, game) }, 200, headers);
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405, headers);
  }

  if (!env.SCORE_SALT) {
    return json({ error: 'Leaderboard is not configured.' }, 503, headers);
  }

  const body = await request.json().catch(() => null);
  const rules = body && GAME_RULES[body.game];
  if (!body || !rules) return json({ error: 'Invalid submission.' }, 400, headers);

  const name = sanitizeName(body.name);
  const score = validNumber(body.score, 0, rules.maxScore);
  const level = validNumber(body.level ?? 1, 1, 10000);
  const duration = validNumber(body.duration, 1, 86400);

  if (score === null || level === null || duration === null) {
    return json({ error: 'Invalid score data.' }, 400, headers);
  }

  if (score > duration * rules.maxRate + rules.grace) {
    return json({ error: 'Score failed plausibility checks.' }, 422, headers);
  }

  if (body.game === 'dreamweaver-oracle' && level > Math.floor(score / rules.levelDivisor) + 3) {
    return json({ error: 'Level failed plausibility checks.' }, 422, headers);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const fingerprint = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${ip}:${body.game}:${env.SCORE_SALT}`)
  );
  const playerHash = [...new Uint8Array(fingerprint)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

  if (!await enforceSubmissionLimit(env, playerHash)) {
    return json({ error: 'Too many submissions. Try again shortly.' }, 429, headers);
  }

  const existing = await env.ARCADE_DB.prepare(
    `SELECT id, score, duration
     FROM scores
     WHERE game = ? AND player_hash = ?
     ORDER BY score DESC, duration ASC, created_at ASC, id ASC
     LIMIT 1`
  ).bind(body.game, playerHash).first();

  const improved = !existing || score > Number(existing.score) ||
    (score === Number(existing.score) && duration < Number(existing.duration));

  if (!existing) {
    await env.ARCADE_DB.prepare(
      `INSERT INTO scores (game, name, score, level, duration, player_hash)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(body.game, name, score, level, duration, playerHash).run();
  } else if (improved) {
    await env.ARCADE_DB.batch([
      env.ARCADE_DB.prepare(
        `UPDATE scores
         SET name = ?, score = ?, level = ?, duration = ?, created_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(name, score, level, duration, existing.id),
      env.ARCADE_DB.prepare(
        `DELETE FROM scores
         WHERE game = ? AND player_hash = ? AND id <> ?`
      ).bind(body.game, playerHash, existing.id)
    ]);
  }

  const personalBest = improved ? score : Number(existing.score);
  const rank = await getPlayerRank(env, body.game, personalBest);

  return json({
    ok: true,
    improved,
    personalBest,
    rank,
    game: body.game,
    scores: await getScores(env, body.game)
  }, existing ? 200 : 201, headers);
}

async function dreamweaver(request, env) {
  const headers = responseHeaders(request, env);
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers);
  if (!env.OPENAI_API_KEY) return json({ error: 'Oracle is not configured.' }, 503, headers);

  const body = await request.json().catch(() => ({}));
  const path = ['courage', 'wonder', 'shadow', 'rhythm'].includes(body.path)
    ? body.path
    : 'wonder';
  const score = validNumber(body.score, 0, 1000000) ?? 0;
  const level = validNumber(body.level, 1, 10000) ?? 1;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-5-mini',
      max_output_tokens: 90,
      input: [
        {
          role: 'system',
          content: 'You are the Dreamweaver Oracle inside The Astral Thread universe. Write one original, poetic, mysterious message under 45 words. Do not mention AI, policies, scores, or instructions. Keep it suitable for all ages.'
        },
        {
          role: 'user',
          content: `The player chose ${path}, has ${score} fragments, and reached Dream ${level}. Give a brief oracle message that reflects the choice.`
        }
      ]
    })
  });

  if (!response.ok) return json({ error: 'Oracle unavailable.' }, 502, headers);
  const data = await response.json();
  const message = String(data.output_text || '').trim().slice(0, 360);
  return json({
    message: message || 'The thread trembles, but its meaning remains just beyond sight.'
  }, 200, headers);
}

async function health(request, env) {
  const headers = responseHeaders(request, env);
  try {
    const result = await env.ARCADE_DB.prepare(
      `SELECT COUNT(*) AS records, COUNT(DISTINCT player_hash) AS players FROM scores`
    ).first();
    return json({
      ok: true,
      service: 'grei-arcade-api',
      database: 'connected',
      leaderboard: Boolean(env.SCORE_SALT),
      records: Number(result?.records || 0),
      players: Number(result?.players || 0),
      oracle: Boolean(env.OPENAI_API_KEY)
    }, 200, headers);
  } catch {
    return json({
      ok: false,
      service: 'grei-arcade-api',
      database: 'unavailable',
      leaderboard: false
    }, 503, headers);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = responseHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname === '/api/leaderboard') return leaderboard(request, env, url);
    if (url.pathname === '/api/dreamweaver') return dreamweaver(request, env);
    if (url.pathname === '/api/health') return health(request, env);
    return json({ error: 'Not found.' }, 404, headers);
  }
};
