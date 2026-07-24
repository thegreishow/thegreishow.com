(()=>{
  const URL='https://dkvbeizjlgxqjuxnlqho.supabase.co',KEY='sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';
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
  async function hydrateReleases(){
    if(!document.querySelector('#release-list'))return;
    const {data:{session}}=await window.supabase.createClient(URL,KEY).auth.getSession();
    if(!session)return;
    const r=await fetch(`${URL}/rest/v1/owner_releases?select=*`,{headers:{apikey:KEY,authorization:`Bearer ${session.access_token}`}});
    if(!r.ok)return;
    const releases=await r.json();
    const apply=()=>releases.forEach(release=>{
      const box=document.querySelector(`[data-release="${release.id}"]`);if(!box)return;
      box.querySelectorAll('[data-r]').forEach(input=>{
        const value=release[input.dataset.r];
        if(input.type==='checkbox')input.checked=Boolean(value);
        else if(value!==null&&value!==undefined&&input.value==='')input.value=value;
      });
    });
    apply();new MutationObserver(apply).observe(document.querySelector('#release-list'),{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{integrateOwner();hydrateReleases()},{once:true});else{integrateOwner();hydrateReleases()}
})();