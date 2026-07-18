import { loadGameRegistry } from './registry.js';
import { openGameEmbed } from './embed.js';
import {
  ARCADE_AVATARS, hasPlayerProfile, hasSyncedAccount, getArcadeAccount,
  getPlayerProfile, savePlayerProfile, createSyncedAccount, loginSyncedAccount,
  updateSyncedAccount, recordGameLaunch, getRecentActivity, getDailyChallenge, getArcadeLevel
} from './community.js';

let arcadeState={games:[],visibleGames:[],activeTag:'all',search:''};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const tagsOf=g=>Array.isArray(g.tags)?g.tags:[];

function card(game){
  const el=document.createElement('article');el.className='arcade-card';el.dataset.tags=tagsOf(game).join('|').toLowerCase();el.dataset.title=String(game.title||'').toLowerCase();
  el.innerHTML=`<div class="arcade-card-inner"><div class="arcade-thumb"><img src="${esc(game.thumbnail||'')}" alt="${esc(game.title)} thumbnail" loading="lazy"></div><div class="arcade-info"><div class="arcade-meta"><span>${game.type==='external'?'External':'Native'}</span><span>v${esc(game.version||'1.0')}</span></div><h3>${esc(game.title)}</h3><p>${esc(game.description||'')}</p><div class="arcade-tags">${tagsOf(game).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div></div><button class="play-btn" type="button" data-id="${esc(game.id)}">Play</button></div>`;
  el.querySelector('img')?.addEventListener('error',e=>{e.currentTarget.removeAttribute('src');e.currentTarget.alt=''});return el;
}

function community(games){
  const p=getPlayerProfile(),level=getArcadeLevel(p.xp),challenge=getDailyChallenge(games),recent=getRecentActivity(),account=getArcadeAccount();
  return `<section class="arcade-community"><div class="community-profile"><div class="community-identity"><div class="community-avatar" id="community-player-avatar">${esc(p.avatar)}</div><div><p class="arcade-kicker">Player identity</p><h2 id="community-player-name">${esc(p.name)}</h2><p class="community-muted">Arcade Level ${level} · ${p.xp} XP · ${p.gamesPlayed} launches</p><p class="community-sync-status">${account?`Synced · Code <strong>${esc(account.playerCode)}</strong>`:'This profile is saved on this device only.'}</p></div></div><button class="filter" id="edit-profile" type="button">${account?'Account':'Sync profile'}</button></div><div class="community-challenge"><p class="arcade-kicker">Daily challenge</p><h3>${challenge.game?esc(challenge.game.title):'Arcade challenge'}</h3><p>${esc(challenge.objective)}</p><span class="community-reward">+${challenge.reward} XP</span></div><div class="community-recent"><p class="arcade-kicker">Recently played</p><div class="community-pills">${recent.length?recent.map(i=>`<span class="community-pill">${esc(i.title)}</span>`).join(''):'<span class="community-muted">Your recent games will appear here.</span>'}</div></div></section>`;
}

function shell(root,games){
  const tags=[...new Set(games.flatMap(tagsOf))].sort(),native=games.filter(g=>g.type!=='external').length;
  root.innerHTML=`<main class="arcade-shell"><section class="arcade-hero"><div><p class="arcade-kicker">The Grei Show</p><h1>Arcade</h1><p>Play original games, chase personal bests, and carry one synced identity across devices.</p></div><div class="arcade-stats"><div class="stat"><strong>${games.length}</strong><span>Total games</span></div><div class="stat"><strong>${native}</strong><span>Native builds</span></div><div class="stat"><strong>${games.length-native}</strong><span>External embeds</span></div><div class="stat"><strong>${tags.length}</strong><span>Tags</span></div></div></section>${community(games)}<section class="arcade-controls"><input class="arcade-search" type="search" placeholder="Search arcade" aria-label="Search arcade games"><div class="arcade-filters"><button class="filter active" data-tag="all">All</button>${tags.map(t=>`<button class="filter" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div></section><div class="arcade-status"></div><section class="arcade-grid"></section></main>`;
}

function avatarChoices(selected){return ARCADE_AVATARS.map(a=>`<label class="player-avatar-choice"><input type="radio" name="avatar" value="${a}" ${a===selected?'checked':''}><span>${a}</span></label>`).join('')}
function modalMarkup(mode='create'){
  const p=getPlayerProfile(),account=getArcadeAccount(),linked=Boolean(account);
  return `<div class="player-profile-modal"><div class="player-profile-backdrop"></div><div class="player-profile-card"><p class="arcade-kicker">Cross-device Arcade account</p><h2>${mode==='login'?'Link this device':linked?'Your synced account':'Create synced identity'}</h2><p class="player-profile-copy">${mode==='login'?'Enter the player code and PIN from your other device.':'Your player code and PIN restore this profile anywhere.'}</p><div class="profile-mode-switch"><button type="button" data-mode="create" class="profile-secondary">${linked?'Edit account':'Create account'}</button><button type="button" data-mode="login" class="profile-secondary">Link existing</button></div><form id="player-profile-form">${mode==='login'?`<label class="player-profile-label">Player code</label><input class="player-profile-input" name="playerCode" maxlength="12" required placeholder="GREIXXXXXXX">`:`<label class="player-profile-label">Arcade name</label><input class="player-profile-input" name="name" value="${esc(p.name==='Guest Dreamer'?'':p.name)}" minlength="3" maxlength="18" required><fieldset class="player-avatar-fieldset"><legend>Avatar</legend><div class="player-avatar-grid">${avatarChoices(p.avatar)}</div></fieldset>`}<label class="player-profile-label">${mode==='login'?'PIN':'Choose a 4–8 digit PIN'}</label><input class="player-profile-input" name="pin" inputmode="numeric" pattern="[0-9]{4,8}" minlength="4" maxlength="8" required placeholder="••••"><p class="player-profile-error" id="player-profile-error"></p><div class="player-profile-actions"><button class="profile-secondary" type="button" id="cancel-profile">Cancel</button><button class="profile-primary" type="submit">${mode==='login'?'Link device':linked?'Save changes':'Create account'}</button></div></form>${linked?`<div class="profile-proof"><span>Your player code</span><strong>${esc(account.playerCode)}</strong><small>Keep this code and PIN private.</small></div>`:''}</div></div>`;
}

function updateDisplay(root,p){root.querySelector('#community-player-name').textContent=p.name;root.querySelector('#community-player-avatar').textContent=p.avatar}
function openProfile(root,mode='create'){
  document.querySelector('.player-profile-modal')?.remove();document.body.insertAdjacentHTML('beforeend',modalMarkup(mode));document.body.classList.add('profile-modal-open');
  const modal=document.querySelector('.player-profile-modal'),form=modal.querySelector('#player-profile-form'),error=modal.querySelector('#player-profile-error');
  const close=()=>{modal.remove();document.body.classList.remove('profile-modal-open')};
  modal.querySelector('#cancel-profile').onclick=close;modal.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>openProfile(root,b.dataset.mode));
  form.onsubmit=async e=>{e.preventDefault();error.textContent='Saving…';const d=Object.fromEntries(new FormData(form));try{let account;if(mode==='login')account=await loginSyncedAccount({playerCode:d.playerCode,pin:d.pin});else if(hasSyncedAccount())account=await updateSyncedAccount({name:d.name,avatar:d.avatar});else account=await createSyncedAccount({name:d.name,avatar:d.avatar,pin:d.pin});updateDisplay(root,account);close();shell(root,arcadeState.games);attach(root);render(root)}catch(err){error.textContent=err.message||'Could not sync profile.'}};
}

function filter(){const q=arcadeState.search.trim().toLowerCase(),tag=arcadeState.activeTag.toLowerCase();arcadeState.visibleGames=arcadeState.games.filter(g=>(tag==='all'||tagsOf(g).map(t=>t.toLowerCase()).includes(tag))&&(!q||[g.title,g.description,g.creator,...tagsOf(g)].join(' ').toLowerCase().includes(q)))}
function render(root){const grid=root.querySelector('.arcade-grid'),status=root.querySelector('.arcade-status');grid.innerHTML='';status.textContent=`${arcadeState.visibleGames.length} of ${arcadeState.games.length} games shown`;arcadeState.visibleGames.forEach(g=>grid.appendChild(card(g)));grid.querySelectorAll('.play-btn').forEach(btn=>btn.onclick=()=>{const g=arcadeState.games.find(x=>x.id===btn.dataset.id);if(!g)return;if(!hasPlayerProfile()){openProfile(root);return}recordGameLaunch(g);g.type==='external'?openGameEmbed(g):location.href=g.entry})}
function attach(root){root.querySelector('#edit-profile').onclick=()=>openProfile(root,hasSyncedAccount()?'create':'create');root.querySelector('.arcade-search').oninput=e=>{arcadeState.search=e.target.value;filter();render(root)};root.querySelector('.arcade-filters').onclick=e=>{const b=e.target.closest('[data-tag]');if(!b)return;arcadeState.activeTag=b.dataset.tag;root.querySelectorAll('[data-tag]').forEach(x=>x.classList.toggle('active',x===b));filter();render(root)}}
async function init(){const root=document.getElementById('arcade-root');root.innerHTML='<div class="arcade-empty">Loading arcade...</div>';const games=await loadGameRegistry();arcadeState={games,visibleGames:games,activeTag:'all',search:''};shell(root,games);attach(root);filter();render(root);if(!hasPlayerProfile())openProfile(root)}
window.addEventListener('DOMContentLoaded',init);
