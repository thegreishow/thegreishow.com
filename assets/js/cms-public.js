(()=>{
  const URL='https://dkvbeizjlgxqjuxnlqho.supabase.co';
  const KEY='sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';
  const currentPath=location.pathname.replace(/\/index\.html$/,'/');
  const pageKey=(()=>{
    if(currentPath==='/'||currentPath==='/Index.html')return 'home';
    const name=currentPath.split('/').filter(Boolean).pop()||'home';
    return name.replace(/\.html$/,'').replace(/^connect$/,'contact');
  })();
  const safeSelector=s=>{try{return document.querySelectorAll(s)}catch{return []}};
  const setMeta=(name,value,property=false)=>{
    if(!value)return;
    let el=document.head.querySelector(`meta[${property?'property':'name'}="${name}"]`);
    if(!el){el=document.createElement('meta');el.setAttribute(property?'property':'name',name);document.head.appendChild(el)}
    el.setAttribute('content',value);
  };
  const applyNode=(node,config)=>{
    if(config==null)return;
    if(node===document.documentElement||node===document.head||node===document.body||node.tagName==='MAIN')return;
    if(typeof config==='string'){node.textContent=config;return}
    if(Object.prototype.hasOwnProperty.call(config,'text'))node.textContent=config.text??'';
    if(Object.prototype.hasOwnProperty.call(config,'html'))node.innerHTML=config.html??'';
    for(const key of ['href','src','alt','title','aria-label'])if(Object.prototype.hasOwnProperty.call(config,key))node.setAttribute(key,config[key]??'');
    if(Object.prototype.hasOwnProperty.call(config,'hidden'))node.hidden=Boolean(config.hidden);
    if(config.className)node.className=config.className;
  };
  const applyTheme=(settings={})=>{
    const root=document.documentElement.style;
    const map={accent:'--cms-accent',background:'--cms-background',surface:'--cms-surface',text:'--cms-text',muted:'--cms-muted',radius:'--cms-radius',headingFont:'--cms-heading-font',bodyFont:'--cms-body-font'};
    Object.entries(map).forEach(([k,v])=>settings[k]&&root.setProperty(v,settings[k]));
    if(settings.accent)root.setProperty('--home-lime',settings.accent);
    if(settings.background)document.body.style.backgroundColor=settings.background;
    if(settings.text)document.body.style.color=settings.text;
    if(settings.bodyFont)document.body.style.fontFamily=settings.bodyFont;
  };
  const applyNavigation=items=>{
    const visible=(items||[]).filter(x=>x.visible).sort((a,b)=>(a.display_order||0)-(b.display_order||0));
    document.querySelectorAll('[data-cms-nav]').forEach(container=>{
      const location=container.dataset.cmsNav;
      const links=visible.filter(x=>x.location===location);
      if(!links.length)return;
      container.innerHTML=links.map(x=>`<a href="${String(x.href||'#').replace(/"/g,'&quot;')}"${x.opens_new_tab?' target="_blank" rel="noopener"':''}>${String(x.label||'Link').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</a>`).join('');
    });
  };
  async function run(){
    try{
      const headers={apikey:KEY,Authorization:`Bearer ${KEY}`};
      const [pageRes,themeRes,navRes]=await Promise.all([
        fetch(`${URL}/rest/v1/owner_pages?page_key=eq.${encodeURIComponent(pageKey)}&status=eq.published&select=*`,{headers}),
        fetch(`${URL}/rest/v1/owner_theme_settings?id=eq.true&select=settings`,{headers}),
        fetch(`${URL}/rest/v1/owner_navigation?visible=eq.true&select=*&order=location.asc,display_order.asc`,{headers})
      ]);
      if(pageRes.ok){const rows=await pageRes.json(),page=rows[0];if(page){
        if(page.seo_title)document.title=page.seo_title;
        setMeta('description',page.seo_description);
        setMeta('og:title',page.seo_title,true);
        setMeta('og:description',page.seo_description,true);
        Object.entries(page.content||{}).forEach(([selector,config])=>safeSelector(selector).forEach(node=>applyNode(node,config)));
        document.documentElement.dataset.cmsPage=page.page_key;
      }}
      if(themeRes.ok){const rows=await themeRes.json();applyTheme(rows[0]?.settings||{})}
      if(navRes.ok)applyNavigation(await navRes.json());
      document.dispatchEvent(new CustomEvent('cms:ready',{detail:{pageKey}}));
    }catch(error){console.warn('CMS fallback active:',error)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
