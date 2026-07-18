const PROFILE_KEY = 'grei_arcade_profile';
const ACTIVITY_KEY = 'grei_arcade_activity';
const LEGACY_NAME_KEY = 'grei_arcade_player_name';
const ACCOUNT_KEY = 'grei_arcade_account';
export const ARCADE_API_BASE = 'https://grei-arcade-api.thegreishow.workers.dev';
export const ARCADE_AVATARS = ['🌌','⚡','🔥','🎮','🪐','👾','🎧','🧿'];

const communityStyles = new URL('./community.css', import.meta.url);
if (!document.querySelector('link[data-arcade-community]')) {
  const link=document.createElement('link'); link.rel='stylesheet'; link.href=communityStyles.href; link.dataset.arcadeCommunity='true'; document.head.appendChild(link);
}
function safeParse(value,fallback){try{return JSON.parse(value)??fallback}catch{return fallback}}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

export function hasPlayerProfile(){const saved=safeParse(localStorage.getItem(PROFILE_KEY),null);return Boolean(saved&&String(saved.name||'').trim())}
export function getArcadeAccount(){return safeParse(localStorage.getItem(ACCOUNT_KEY),null)}
export function hasSyncedAccount(){const account=getArcadeAccount();return Boolean(account?.playerCode&&account?.pin)}
export function getScoreCredentials(){const account=getArcadeAccount();return account?{playerCode:account.playerCode,playerPin:account.pin}:{}}

export function getPlayerProfile(){
  const saved=safeParse(localStorage.getItem(PROFILE_KEY),{});
  const legacyName=String(localStorage.getItem(LEGACY_NAME_KEY)||'').trim();
  const account=getArcadeAccount();
  return {
    name:String(saved.name||account?.name||legacyName||'Guest Dreamer').slice(0,18),
    avatar:ARCADE_AVATARS.includes(saved.avatar)?saved.avatar:(ARCADE_AVATARS.includes(account?.avatar)?account.avatar:ARCADE_AVATARS[0]),
    joinedAt:saved.joinedAt||account?.joinedAt||new Date().toISOString(),
    xp:Number(saved.xp??account?.xp)||0,
    gamesPlayed:Number(saved.gamesPlayed??account?.gamesPlayed)||0
  };
}
export function savePlayerProfile(profile){
  const clean={
    name:String(profile.name||'Guest Dreamer').replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,18)||'Guest Dreamer',
    avatar:ARCADE_AVATARS.includes(profile.avatar)?profile.avatar:ARCADE_AVATARS[0],
    joinedAt:profile.joinedAt||new Date().toISOString(),
    xp:Math.max(0,Number(profile.xp)||0), gamesPlayed:Math.max(0,Number(profile.gamesPlayed)||0)
  };
  localStorage.setItem(PROFILE_KEY,JSON.stringify(clean)); localStorage.setItem(LEGACY_NAME_KEY,clean.name); return clean;
}
function saveAccount(player,pin){
  const account={playerCode:player.playerCode,pin:String(pin),name:player.name,avatar:player.avatar,joinedAt:player.joinedAt,xp:Number(player.xp)||0,gamesPlayed:Number(player.gamesPlayed)||0};
  localStorage.setItem(ACCOUNT_KEY,JSON.stringify(account));
  savePlayerProfile(account);
  return account;
}
async function profileRequest(payload){
  const response=await fetch(`${ARCADE_API_BASE}/api/profile`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error||'Profile sync failed.');
  return data;
}
export async function createSyncedAccount({name,avatar,pin}){const data=await profileRequest({action:'create',name,avatar,pin});return saveAccount(data.player,pin)}
export async function loginSyncedAccount({playerCode,pin}){const data=await profileRequest({action:'login',playerCode,pin});return saveAccount(data.player,pin)}
export async function updateSyncedAccount({name,avatar}){
  const account=getArcadeAccount(); if(!account) return null;
  const data=await profileRequest({action:'update',playerCode:account.playerCode,pin:account.pin,name,avatar});
  return saveAccount(data.player,account.pin);
}
export function disconnectSyncedAccount(){localStorage.removeItem(ACCOUNT_KEY)}

export function recordGameLaunch(game){
  const activity=safeParse(localStorage.getItem(ACTIVITY_KEY),[]); activity.unshift({id:game.id,title:game.title,playedAt:new Date().toISOString()}); localStorage.setItem(ACTIVITY_KEY,JSON.stringify(activity.slice(0,12)));
  const profile=getPlayerProfile(); profile.gamesPlayed+=1; profile.xp+=5; savePlayerProfile(profile);
}
export function getRecentActivity(){return safeParse(localStorage.getItem(ACTIVITY_KEY),[]).slice(0,3)}
export function getDailyChallenge(games){
  const d=new Date(),key=`${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`; let seed=0; for(const c of key)seed=(seed*31+c.charCodeAt(0))>>>0;
  const game=games.length?games[seed%games.length]:null; const challenges=['Set a new personal best','Play twice without leaving the Arcade','Reach the next level','Share your score with a friend','Try a game you have not played today'];
  return {dayKey:key,game,objective:challenges[seed%challenges.length],reward:25};
}
export function getArcadeLevel(xp){return Math.max(1,Math.floor(Math.sqrt(Math.max(0,xp)/25))+1)}
function localTopThree(gameId){
  if(gameId==='signal-runner'){const score=Number(localStorage.getItem('grei-signal-runner-best')||0),name=localStorage.getItem(LEGACY_NAME_KEY)||'You';return score?[{name,score}]:[]}
  return safeParse(localStorage.getItem(`grei_arcade_scores_${gameId}`),[]).filter(e=>e&&Number.isFinite(Number(e.score))).sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,3);
}
async function getTopThree(gameId){try{const r=await fetch(`${ARCADE_API_BASE}/api/leaderboard?game=${encodeURIComponent(gameId)}`);if(!r.ok)throw 0;const d=await r.json();return{scores:Array.isArray(d.scores)?d.scores.slice(0,3):[],global:true}}catch{return{scores:localTopThree(gameId),global:false}}}
async function decorateGameCard(card){
  if(card.dataset.podiumReady==='true')return; const button=card.querySelector('.play-btn'),info=card.querySelector('.arcade-info'),gameId=button?.dataset.id;if(!gameId||!info)return;card.dataset.podiumReady='true';
  const panel=document.createElement('div');panel.className='card-podium';panel.innerHTML='<strong>Top 3</strong><span class="card-podium-status">Loading…</span>';info.appendChild(panel);
  const{scores,global}=await getTopThree(gameId);if(!scores.length){panel.innerHTML='<strong>Top 3</strong><span class="card-podium-empty">No scores yet—claim first place.</span>';return}
  panel.innerHTML=`<div class="card-podium-head"><strong>Top 3</strong><small>${global?'Global':'This device'}</small></div>${scores.map((e,i)=>`<div class="card-podium-row"><span>${i+1}</span><b>${escapeHtml(e.name||'Dreamer')}</b><em>${Number(e.score)||0}</em></div>`).join('')}`;
}
function decorateVisibleCards(){document.querySelectorAll('.arcade-card').forEach(decorateGameCard)}
const observer=new MutationObserver(decorateVisibleCards);observer.observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('DOMContentLoaded',decorateVisibleCards);
