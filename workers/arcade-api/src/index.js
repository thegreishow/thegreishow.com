const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const AVATARS = ['🌌','⚡','🔥','🎮','🪐','👾','🎧','🧿'];
const GAME_RULES = {
  'dreamweaver-oracle': { maxScore: 1000000, maxRate: 4, grace: 25, levelDivisor: 4 },
  'signal-runner': { maxScore: 10000000, maxRate: 18, grace: 60, levelDivisor: 10 }
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extra } });
}
function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || 'https://thegreishow.com,https://www.thegreishow.com').split(',').map(v=>v.trim()).filter(Boolean);
}
function responseHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = allowedOrigins(env);
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    'Cache-Control': 'no-store'
  };
}
function sanitizeName(value) {
  return String(value || 'Dreamer').replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,18) || 'Dreamer';
}
function validNumber(value,min,max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? Math.floor(number) : null;
}
async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function cleanCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
}
function cleanPin(value) {
  return String(value || '').replace(/\D/g,'').slice(0,8);
}
function publicPlayer(row) {
  return {
    playerCode: row.player_code,
    name: row.name,
    avatar: row.avatar,
    xp: Number(row.xp || 0),
    gamesPlayed: Number(row.games_played || 0),
    joinedAt: row.created_at
  };
}
async function hashPin(pin, env) {
  return sha256(`${cleanPin(pin)}:${env.SCORE_SALT}`);
}
async function findPlayer(env, playerCode, pin) {
  const code = cleanCode(playerCode);
  const clean = cleanPin(pin);
  if (!code || clean.length < 4) return null;
  const pinHash = await hashPin(clean, env);
  return env.ARCADE_DB.prepare('SELECT * FROM players WHERE player_code = ? AND pin_hash = ?').bind(code,pinHash).first();
}
async function generatePlayerCode(env) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt=0; attempt<8; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(7));
    const code = 'GREI' + [...bytes].map(b=>alphabet[b % alphabet.length]).join('');
    const exists = await env.ARCADE_DB.prepare('SELECT id FROM players WHERE player_code = ?').bind(code).first();
    if (!exists) return code;
  }
  throw new Error('Could not create player code');
}

async function profile(request, env) {
  const headers = responseHeaders(request, env);
  if (request.method !== 'POST') return json({error:'Method not allowed.'},405,headers);
  if (!env.SCORE_SALT) return json({error:'Profiles are not configured.'},503,headers);
  const body = await request.json().catch(()=>null);
  if (!body) return json({error:'Invalid request.'},400,headers);
  const action = String(body.action || '');

  if (action === 'create') {
    const name = sanitizeName(body.name);
    const avatar = AVATARS.includes(body.avatar) ? body.avatar : AVATARS[0];
    const pin = cleanPin(body.pin);
    if (name.length < 3 || pin.length < 4) return json({error:'Use a 3–18 character name and a 4–8 digit PIN.'},400,headers);
    const playerCode = await generatePlayerCode(env);
    const pinHash = await hashPin(pin,env);
    await env.ARCADE_DB.prepare(
      'INSERT INTO players (player_code,pin_hash,name,avatar) VALUES (?,?,?,?)'
    ).bind(playerCode,pinHash,name,avatar).run();
    const row = await env.ARCADE_DB.prepare('SELECT * FROM players WHERE player_code = ?').bind(playerCode).first();
    return json({ok:true, created:true, player:publicPlayer(row)},201,headers);
  }

  if (action === 'login') {
    const row = await findPlayer(env,body.playerCode,body.pin);
    if (!row) return json({error:'Player code or PIN is incorrect.'},401,headers);
    return json({ok:true, player:publicPlayer(row)},200,headers);
  }

  if (action === 'update') {
    const row = await findPlayer(env,body.playerCode,body.pin);
    if (!row) return json({error:'Player code or PIN is incorrect.'},401,headers);
    const name = sanitizeName(body.name || row.name);
    const avatar = AVATARS.includes(body.avatar) ? body.avatar : row.avatar;
    await env.ARCADE_DB.prepare(
      'UPDATE players SET name=?, avatar=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).bind(name,avatar,row.id).run();
    await env.ARCADE_DB.prepare('UPDATE scores SET name=? WHERE player_hash=?').bind(name,`account:${row.id}`).run();
    const updated = await env.ARCADE_DB.prepare('SELECT * FROM players WHERE id=?').bind(row.id).first();
    return json({ok:true, player:publicPlayer(updated)},200,headers);
  }

  return json({error:'Unknown profile action.'},400,headers);
}

async function getScores(env,game) {
  const result = await env.ARCADE_DB.prepare(
    `WITH personal_bests AS (
      SELECT id,name,score,level,duration,created_at,player_hash,
      ROW_NUMBER() OVER (PARTITION BY player_hash ORDER BY score DESC,duration ASC,created_at ASC,id ASC) AS personal_rank
      FROM scores WHERE game=?
    )
    SELECT name,score,level,duration,created_at AS createdAt FROM personal_bests
    WHERE personal_rank=1 ORDER BY score DESC,duration ASC,created_at ASC LIMIT 10`
  ).bind(game).all();
  return result.results || [];
}
async function getPlayerRank(env,game,score) {
  const result = await env.ARCADE_DB.prepare(
    `WITH best_scores AS (SELECT player_hash,MAX(score) AS score FROM scores WHERE game=? GROUP BY player_hash)
     SELECT COUNT(*)+1 AS rank FROM best_scores WHERE score>?`
  ).bind(game,score).first();
  return Number(result?.rank || 1);
}
async function enforceSubmissionLimit(env,playerHash) {
  await env.ARCADE_DB.prepare("DELETE FROM score_attempts WHERE created_at <= datetime('now','-1 day')").run();
  const recent = await env.ARCADE_DB.prepare(
    "SELECT COUNT(*) AS total FROM score_attempts WHERE player_hash=? AND created_at > datetime('now','-1 minute')"
  ).bind(playerHash).first();
  if ((recent?.total || 0) >= 3) return false;
  await env.ARCADE_DB.prepare('INSERT INTO score_attempts (player_hash) VALUES (?)').bind(playerHash).run();
  return true;
}
async function leaderboard(request,env,url) {
  const headers = responseHeaders(request,env);
  if (request.method === 'GET') {
    const game = url.searchParams.get('game');
    if (!GAME_RULES[game]) return json({error:'Unknown game.'},400,headers);
    return json({game,scores:await getScores(env,game)},200,headers);
  }
  if (request.method !== 'POST') return json({error:'Method not allowed.'},405,headers);
  if (!env.SCORE_SALT) return json({error:'Leaderboard is not configured.'},503,headers);
  const body = await request.json().catch(()=>null);
  const rules = body && GAME_RULES[body.game];
  if (!body || !rules) return json({error:'Invalid submission.'},400,headers);
  const score = validNumber(body.score,0,rules.maxScore);
  const level = validNumber(body.level ?? 1,1,10000);
  const duration = validNumber(body.duration,1,86400);
  if (score===null || level===null || duration===null) return json({error:'Invalid score data.'},400,headers);
  if (score > duration*rules.maxRate + rules.grace) return json({error:'Score failed plausibility checks.'},422,headers);
  if (body.game==='dreamweaver-oracle' && level > Math.floor(score/rules.levelDivisor)+3) return json({error:'Level failed plausibility checks.'},422,headers);

  const account = await findPlayer(env,body.playerCode,body.playerPin);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const playerHash = account ? `account:${account.id}` : await sha256(`${ip}:${body.game}:${env.SCORE_SALT}`);
  const name = account ? account.name : sanitizeName(body.name);
  if (!await enforceSubmissionLimit(env,playerHash)) return json({error:'Too many submissions. Try again shortly.'},429,headers);
  const existing = await env.ARCADE_DB.prepare(
    'SELECT id,score,duration FROM scores WHERE game=? AND player_hash=? ORDER BY score DESC,duration ASC,created_at ASC,id ASC LIMIT 1'
  ).bind(body.game,playerHash).first();
  const improved = !existing || score>Number(existing.score) || (score===Number(existing.score) && duration<Number(existing.duration));
  if (!existing) {
    await env.ARCADE_DB.prepare('INSERT INTO scores (game,name,score,level,duration,player_hash) VALUES (?,?,?,?,?,?)')
      .bind(body.game,name,score,level,duration,playerHash).run();
  } else if (improved) {
    await env.ARCADE_DB.batch([
      env.ARCADE_DB.prepare('UPDATE scores SET name=?,score=?,level=?,duration=?,created_at=CURRENT_TIMESTAMP WHERE id=?').bind(name,score,level,duration,existing.id),
      env.ARCADE_DB.prepare('DELETE FROM scores WHERE game=? AND player_hash=? AND id<>?').bind(body.game,playerHash,existing.id)
    ]);
  }
  const personalBest = improved ? score : Number(existing.score);
  return json({ok:true,improved,personalBest,rank:await getPlayerRank(env,body.game,personalBest),synced:Boolean(account),game:body.game,scores:await getScores(env,body.game)},existing?200:201,headers);
}

async function health(request,env) {
  const headers = responseHeaders(request,env);
  try {
    const scores = await env.ARCADE_DB.prepare('SELECT COUNT(*) AS records,COUNT(DISTINCT player_hash) AS players FROM scores').first();
    const accounts = await env.ARCADE_DB.prepare('SELECT COUNT(*) AS total FROM players').first();
    return json({ok:true,service:'grei-arcade-api',database:'connected',leaderboard:Boolean(env.SCORE_SALT),crossDeviceProfiles:true,accounts:Number(accounts?.total||0),records:Number(scores?.records||0),players:Number(scores?.players||0),oracle:Boolean(env.OPENAI_API_KEY)},200,headers);
  } catch {
    return json({ok:false,service:'grei-arcade-api',database:'unavailable',leaderboard:false,crossDeviceProfiles:false},503,headers);
  }
}

export default {
  async fetch(request,env) {
    const url = new URL(request.url);
    const headers = responseHeaders(request,env);
    if (request.method==='OPTIONS') return new Response(null,{status:204,headers});
    if (url.pathname==='/api/profile') return profile(request,env);
    if (url.pathname==='/api/leaderboard') return leaderboard(request,env,url);
    if (url.pathname==='/api/health') return health(request,env);
    return json({error:'Not found.'},404,headers);
  }
};
