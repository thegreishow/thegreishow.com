(()=>{
  'use strict';

  const SUPABASE_URL='https://dkvbeizjlgxqjuxnlqho.supabase.co';
  const SUPABASE_KEY='sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';

  function addCmsEntryPoints(){
    const websiteGrid=document.querySelector('#section-website .page-grid');
    if(websiteGrid&&!websiteGrid.querySelector('[data-owner-cms-card]')){
      const card=document.createElement('article');
      card.className='panel page-card';
      card.dataset.ownerCmsCard='true';
      card.innerHTML='<div class="eyebrow">Publishing</div><h3>Website CMS</h3><p>Edit public wording, SEO, navigation, theme, media, releases, revisions and Resend operations.</p><div class="actions"><a class="button" href="/owner-cms.html">Open CMS</a></div>';
      websiteGrid.prepend(card);
    }

    const sidebarFooter=document.querySelector('.sidebar-foot');
    if(sidebarFooter&&!sidebarFooter.querySelector('a[href="/owner-cms.html"]')){
      const link=document.createElement('a');
      link.className='button';
      link.href='/owner-cms.html';
      link.textContent='Website CMS';
      sidebarFooter.prepend(link);
    }
  }

  async function hydrateReleaseEditor(){
    const releaseList=document.querySelector('#release-list');
    if(!releaseList||!window.supabase)return;

    const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    const {data:{session}}=await db.auth.getSession();
    if(!session)return;

    const {data:releases,error}=await db.from('owner_releases').select('*');
    if(error){
      console.error('Unable to hydrate Owner CMS releases:',error);
      return;
    }

    const applyValues=()=>{
      for(const release of releases||[]){
        const box=releaseList.querySelector(`[data-release="${release.id}"]`);
        if(!box)continue;
        box.querySelectorAll('[data-r]').forEach(input=>{
          const value=release[input.dataset.r];
          if(input.type==='checkbox'){
            input.checked=Boolean(value);
          }else if(value!==null&&value!==undefined&&input.value===''){
            input.value=String(value);
          }
        });
      }
    };

    applyValues();
    const observer=new MutationObserver(applyValues);
    observer.observe(releaseList,{childList:true,subtree:true});
  }

  function boot(){
    try{
      addCmsEntryPoints();
      hydrateReleaseEditor().catch(error=>console.error('Owner CMS release hydration failed:',error));
    }catch(error){
      console.error('Owner CMS integration failed:',error);
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
})();
