(()=>{
  'use strict';

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

  function markExternalOwnerLinks(){
    document.querySelectorAll('a[href="/owner-cms.html"]').forEach(link=>{
      link.setAttribute('aria-label','Open Website CMS');
    });
  }

  function boot(){
    try{
      addCmsEntryPoints();
      markExternalOwnerLinks();
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
