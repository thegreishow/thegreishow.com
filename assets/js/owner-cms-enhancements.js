(()=>{
const URL='https://dkvbeizjlgxqjuxnlqho.supabase.co';
const KEY='sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';
const db=window.supabase.createClient(URL,KEY);
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let dirty=false;

function integrateOwner(){
  const website=document.querySelector('#section-website .page-grid');
  if(website&&!document.querySelector('[data-owner-cms-card]')){
    const card=document.createElement('article');card.className='panel page-card';card.dataset.ownerCmsCard='true';
    card.innerHTML='<div class="eyebrow">Publishing</div><h3>Website CMS</h3><p>Edit public wording, SEO, navigation, theme, media, releases, revisions and Resend operations.</p><div class="actions"><a class="button" href="/owner-cms.html">Open CMS</a></div>';
    website.prepend(card);
  }
  const side=document.querySelector('.sidebar-foot');
  if(side&&!side.querySelector('[href="/owner-cms.html"]')){
    const link=document.createElement('a');link.className='button';link.href='/owner-cms.html';link.textContent='Website CMS';side.prepend(link);
  }
}

function installCms(){
  if(!$('#app')||document.querySelector('[data-tab="overview"]'))return;
  const tabs=document.querySelector('.tabs');
  tabs.insertAdjacentHTML('afterbegin','<button class="button secondary" data-tab="overview">Overview</button>');
  tabs.insertAdjacentHTML('afterend',overviewMarkup());
  installVisualMapper();installFilters();installMediaActions();installDirtyTracking();
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-tab="overview"]'))loadOverview();
    const copy=e.target.closest('[data-copy-url]');if(copy)copyText(copy.dataset.copyUrl,copy);
    const del=e.target.closest('[data-delete-media]');if(del)deleteMedia(del.dataset.deleteMedia,del.dataset.path||'');
    if(e.target.closest('#mapper-add'))addMapperRow();
    const remove=e.target.closest('[data-remove-map]');if(remove){remove.closest('.mapper-row').remove();syncJsonFromMapper()}
    if(e.target.closest('#overview-refresh'))loadOverview();
  });
  loadOverview(false);
  setInterval(()=>{if($('#view-overview')?.classList.contains('active'))loadOverview(false)},60000);
}
function overviewMarkup(){return `<section id="view-overview" class="view"><div class="section-head"><div><h2>System overview</h2><p class="muted">Publishing health, catalogue readiness and recent owner activity.</p></div><button class="button secondary" id="overview-refresh">Refresh</button></div><div class="grid three"><article class="panel"><span class="muted">Published pages</span><h2 id="metric-pages">—</h2></article><article class="panel"><span class="muted">Published releases</span><h2 id="metric-releases">—</h2></article><article class="panel"><span class="muted">Media assets</span><h2 id="metric-assets">—</h2></article><article class="panel"><span class="muted">Visible navigation</span><h2 id="metric-nav">—</h2></article><article class="panel"><span class="muted">Draft content</span><h2 id="metric-drafts">—</h2></article><article class="panel"><span class="muted">Incomplete releases</span><h2 id="metric-incomplete">—</h2></article></div><div class="grid" style="margin-top:14px"><article class="panel"><h3>Readiness checks</h3><div id="readiness-list" class="list"></div></article><article class="panel"><h3>Recent owner activity</h3><div id="activity-list" class="list"></div></article></div></section>`}
async function loadOverview(showStatus=true){
  try{
    const [pages,releases,assets,nav,activity]=await Promise.all([
      db.from('owner_pages').select('id,title,status,path'),db.from('owner_releases').select('id,title,status,artwork_url,audio_url,description,release_date,featured,homepage_banner'),db.from('owner_media_assets').select('id,title,alt_text,file_url'),db.from('owner_navigation').select('id,label,visible'),db.from('owner_activity_log').select('id,entity_type,action,label,created_at').order('created_at',{ascending:false}).limit(15)
    ]);for(const r of [pages,releases,assets,nav,activity])if(r.error)throw r.error;
    const p=pages.data||[],r=releases.data||[],a=assets.data||[],n=nav.data||[];
    const incomplete=r.filter(x=>x.status==='published'&&(!x.artwork_url||!x.audio_url||!x.description||!x.release_date));
    $('#metric-pages').textContent=p.filter(x=>x.status==='published').length;$('#metric-releases').textContent=r.filter(x=>x.status==='published').length;$('#metric-assets').textContent=a.length;$('#metric-nav').textContent=n.filter(x=>x.visible).length;$('#metric-drafts').textContent=p.filter(x=>x.status==='draft').length+r.filter(x=>x.status==='draft').length;$('#metric-incomplete').textContent=incomplete.length;
    const checks=[];p.filter(x=>x.status==='draft').forEach(x=>checks.push(`Page draft: ${x.title}`));incomplete.forEach(x=>checks.push(`Published release missing essentials: ${x.title}`));a.filter(x=>!x.alt_text&&/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(x.file_url||'')).slice(0,8).forEach(x=>checks.push(`Image needs alt text: ${x.title}`));if(!r.some(x=>x.featured&&x.status==='published'))checks.push('No published release is marked Featured.');if(!r.some(x=>x.homepage_banner&&x.status==='published'))checks.push('No published release is selected for the homepage banner.');
    $('#readiness-list').innerHTML=checks.map(x=>`<div class="panel">${esc(x)}</div>`).join('')||'<p class="success">Core publishing checks passed.</p>';
    $('#activity-list').innerHTML=(activity.data||[]).map(x=>`<div class="panel"><strong>${esc((x.action||'change').toUpperCase())} · ${esc(x.label||x.entity_type)}</strong><div class="muted">${esc(x.entity_type)} · ${new Date(x.created_at).toLocaleString('en-JM')}</div></div>`).join('')||'<p class="muted">No activity recorded yet.</p>';
  }catch(e){if(showStatus&&$('#activity-list'))$('#activity-list').innerHTML=`<p class="error">${esc(e.message)}</p>`}
}

function installVisualMapper(){
  const area=$('#page-form [name="content"]');if(!area||$('#visual-mapper'))return;
  area.closest('label').insertAdjacentHTML('afterend',`<section id="visual-mapper" class="field full panel" style="padding:16px"><div class="section-head"><div><strong>Visual content fields</strong><div class="muted">Edit common text, links and images without writing JSON.</div></div><button type="button" class="button secondary" id="mapper-add">Add field</button></div><div id="mapper-rows" class="list"></div><p class="muted">Advanced attributes remain available in the JSON box above.</p></section>`);
  area.addEventListener('input',()=>{dirty=true;renderMapperFromJson()});$('#page-form [name="page_key"]')?.addEventListener('change',()=>setTimeout(renderMapperFromJson,150));$('#mapper-rows').addEventListener('input',()=>{dirty=true;syncJsonFromMapper()});setTimeout(renderMapperFromJson,500)
}
function parseMap(){try{return JSON.parse($('#page-form [name="content"]').value||'{}')}catch{return {}}}
function renderMapperFromJson(){const rows=$('#mapper-rows');if(!rows)return;const map=parseMap();rows.innerHTML=Object.entries(map).map(([selector,value])=>mapperRow(selector,value)).join('')||'<p class="muted">No mapped fields yet. Add one to begin.</p>'}
function mapperRow(selector,value={}){const type=value.href!==undefined?'href':value.src!==undefined?'src':value.html!==undefined?'html':'text',val=value[type]??'';return `<div class="mapper-row row" style="grid-template-columns:1.2fr .6fr 1.5fr auto"><input aria-label="CSS selector" data-map-selector value="${esc(selector)}" placeholder=".hero-title"><select data-map-type><option${type==='text'?' selected':''}>text</option><option${type==='html'?' selected':''}>html</option><option${type==='href'?' selected':''}>href</option><option${type==='src'?' selected':''}>src</option></select><input aria-label="Value" data-map-value value="${esc(val)}" placeholder="New wording or URL"><button type="button" class="button ghost" data-remove-map>Remove</button></div>`}
function addMapperRow(){const rows=$('#mapper-rows');if(rows.querySelector('p.muted'))rows.innerHTML='';rows.insertAdjacentHTML('beforeend',mapperRow('',{text:''}));rows.lastElementChild.querySelector('input').focus()}
function syncJsonFromMapper(){const current=parseMap(),next={...current},selectors=new Set();document.querySelectorAll('.mapper-row').forEach(row=>{const selector=row.querySelector('[data-map-selector]').value.trim(),type=row.querySelector('[data-map-type]').value,value=row.querySelector('[data-map-value]').value;if(!selector)return;selectors.add(selector);const existing=next[selector]||{};delete existing.text;delete existing.html;delete existing.href;delete existing.src;next[selector]={...existing,[type]:value}});Object.keys(next).forEach(k=>{if(['text','html','href','src'].some(x=>Object.hasOwn(next[k]||{},x))&&!selectors.has(k))delete next[k]});$('#page-form [name="content"]').value=JSON.stringify(next,null,2)}

function installFilters(){const head=$('#view-releases .section-head');if(head&&!$('#release-search'))head.insertAdjacentHTML('afterend','<div class="panel actions"><input id="release-search" placeholder="Search releases" style="min-width:260px;padding:11px;border-radius:999px;border:1px solid var(--line);background:#070c13;color:var(--text)"><select id="release-filter" style="padding:11px;border-radius:999px;border:1px solid var(--line);background:#070c13;color:var(--text)"><option value="all">All statuses</option><option>published</option><option>draft</option><option>archived</option></select><span id="release-visible-count" class="muted"></span></div>');const apply=()=>{const q=($('#release-search')?.value||'').toLowerCase(),status=$('#release-filter')?.value||'all';let count=0;document.querySelectorAll('[data-release]').forEach(x=>{const text=x.textContent.toLowerCase(),match=text.includes(q)&&(status==='all'||text.includes(status));x.hidden=!match;if(match)count++});if($('#release-visible-count'))$('#release-visible-count').textContent=`${count} shown`};$('#release-search')?.addEventListener('input',apply);$('#release-filter')?.addEventListener('change',apply);if($('#release-list'))new MutationObserver(apply).observe($('#release-list'),{childList:true})}
function installMediaActions(){const list=$('#media-list');if(!list)return;new MutationObserver(()=>{list.querySelectorAll('.row.media').forEach(row=>{if(row.querySelector('[data-copy-url]'))return;const open=row.querySelector('a[href]'),edit=row.querySelector('[data-edit-media]');if(!open||!edit)return;const id=edit.dataset.editMedia,url=open.href,path=url.includes('/cms-media/')?decodeURIComponent(url.split('/cms-media/')[1].split('?')[0]):'';edit.parentElement.insertAdjacentHTML('beforeend',`<button class="button ghost" data-copy-url="${esc(url)}">Copy URL</button><button class="button ghost" data-delete-media="${esc(id)}" data-path="${esc(path)}">Delete</button>`)})}).observe(list,{childList:true})}
async function deleteMedia(id,path){if(!confirm('Delete this media record? The stored file will also be removed when it belongs to the CMS bucket.'))return;const {error}=await db.from('owner_media_assets').delete().eq('id',id);if(error)return alert(error.message);if(path)await db.storage.from('cms-media').remove([path]);location.reload()}
async function copyText(text,button){try{await navigator.clipboard.writeText(text);const old=button.textContent;button.textContent='Copied';setTimeout(()=>button.textContent=old,1000)}catch{prompt('Copy URL',text)}}
function installDirtyTracking(){document.querySelectorAll('#page-form,#theme-form,#media-form').forEach(form=>{form.addEventListener('input',()=>dirty=true);form.addEventListener('submit',()=>dirty=false)});$('#page-publish')?.addEventListener('click',()=>dirty=false);window.addEventListener('beforeunload',e=>{if(!dirty)return;e.preventDefault();e.returnValue=''})}

async function hydrateReleases(){if(!document.querySelector('#release-list'))return;const {data:{session}}=await db.auth.getSession();if(!session)return;const r=await fetch(`${URL}/rest/v1/owner_releases?select=*`,{headers:{apikey:KEY,authorization:`Bearer ${session.access_token}`}});if(!r.ok)return;const releases=await r.json();const apply=()=>releases.forEach(release=>{const box=document.querySelector(`[data-release="${release.id}"]`);if(!box)return;box.querySelectorAll('[data-r]').forEach(input=>{const value=release[input.dataset.r];if(input.type==='checkbox')input.checked=Boolean(value);else if(value!==null&&value!==undefined&&input.value==='')input.value=value})});apply();new MutationObserver(apply).observe(document.querySelector('#release-list'),{childList:true,subtree:true})}
async function waitForCms(){for(let i=0;i<40;i++){const {data}=await db.auth.getSession();if(data.session&&$('#app')&&!$('#app').hidden){installCms();hydrateReleases();return}await new Promise(r=>setTimeout(r,250))}}
function start(){integrateOwner();waitForCms()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();