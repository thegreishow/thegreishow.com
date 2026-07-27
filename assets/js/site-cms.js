(()=>{
  const URL='https://dkvbeizjlgxqjuxnlqho.supabase.co';
  const KEY='sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';
  if(!window.supabase){console.warn('Site CMS: Supabase client unavailable; using hardcoded fallbacks.');return;}
  const db=window.supabase.createClient(URL,KEY);
  const pageKey=resolvePageKey(location.pathname);
  init().catch(err=>console.warn('Site CMS fallback active:',err));

  async function init(){
    const [pageRes,navRes,themeRes]=await Promise.all([
      db.from('owner_pages').select('*').eq('page_key',pageKey).eq('status','published').maybeSingle(),
      db.from('owner_navigation').select('*').eq('visible',true).order('location').order('display_order'),
      db.from('owner_theme_settings').select('settings').eq('id',true).maybeSingle()
    ]);
    if(pageRes.data)applyPage(pageRes.data);
    if(navRes.data)applyNavigation(navRes.data);
    if(themeRes.data?.settings)applyTheme(themeRes.data.settings);
    document.documentElement.dataset.cmsReady='true';
  }

  function resolvePageKey(path){
    const clean=String(path||'/').replace(/\/+$/,'')||'/';
    if(clean==='/'||clean.endsWith('/index.html'))return 'home';
    const file=clean.split('/').pop().replace(/\.html$/,'');
    return ({connect:'contact'})[file]||file;
  }

  function applyPage(page){
    if(page.seo_title)document.title=page.seo_title;
    setMeta('description',page.seo_description);
    setProperty('og:title',page.seo_title);
    setProperty('og:description',page.seo_description);
    const map=page.content&&typeof page.content==='object'?page.content:{};
    Object.entries(map).forEach(([selector,change])=>{
      let nodes=[];try{nodes=[...document.querySelectorAll(selector)]}catch{return;}
      nodes.forEach(node=>applyChange(node,change));
    });
  }

  function applyChange(node,change){
    if(change==null)return;
    if(typeof change==='string'){node.textContent=change;return;}
    if(typeof change.text==='string')node.textContent=change.text;
    if(typeof change.html==='string')node.innerHTML=change.html;
    for(const attr of ['href','src','alt','title','aria-label'])if(typeof change[attr]==='string')node.setAttribute(attr,change[attr]);
    if(typeof change.className==='string')node.className=change.className;
    if(typeof change.hidden==='boolean')node.hidden=change.hidden;
  }

  function applyNavigation(items){
    const grouped=Object.groupBy?Object.groupBy(items,x=>x.location):items.reduce((a,x)=>((a[x.location]??=[]).push(x),a),{});
    renderLinks('[data-cms-nav="header"]',grouped.header);
    renderLinks('[data-cms-nav="footer"]',grouped.footer);
    renderLinks('[data-cms-nav="social"]',grouped.social);
  }

  function renderLinks(selector,items){
    if(!items?.length)return;
    document.querySelectorAll(selector).forEach(container=>{
      container.innerHTML=items.map(x=>`<a href="${escapeAttr(x.href)}"${x.opens_new_tab?' target="_blank" rel="noopener"':''}>${escapeHtml(x.label)}</a>`).join('');
    });
  }

  function applyTheme(s){
    const root=document.documentElement;
    const vars={accent:'--cms-accent',background:'--cms-background',surface:'--cms-surface',text:'--cms-text',muted:'--cms-muted',radius:'--cms-radius',headingFont:'--cms-heading-font',bodyFont:'--cms-body-font'};
    Object.entries(vars).forEach(([k,v])=>{if(s[k])root.style.setProperty(v,s[k]);});
    if(s.background)root.style.setProperty('--bg',s.background);
    if(s.surface)root.style.setProperty('--panel',s.surface);
    if(s.text)root.style.setProperty('--text',s.text);
    if(s.muted)root.style.setProperty('--muted',s.muted);
    if(s.accent)root.style.setProperty('--accent',s.accent);
    if(s.bodyFont)document.body.style.fontFamily=s.bodyFont;
  }

  function setMeta(name,value){if(!value)return;let el=document.querySelector(`meta[name="${name}"]`);if(!el){el=document.createElement('meta');el.name=name;document.head.appendChild(el)}el.content=value;}
  function setProperty(property,value){if(!value)return;let el=document.querySelector(`meta[property="${property}"]`);if(!el){el=document.createElement('meta');el.setAttribute('property',property);document.head.appendChild(el)}el.content=value;}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function escapeAttr(v){return escapeHtml(v).replace(/`/g,'&#96;');}
})();