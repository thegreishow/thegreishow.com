(()=>{
  'use strict';
  const URL='https://dkvbeizjlgxqjuxnlqho.supabase.co';
  const KEY='sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';
  const db=window.supabase?.createClient(URL,KEY);

  function makeLink(button,href,label){
    if(!button)return;
    const a=document.createElement('a');
    a.className=button.className.replace(/\bdisabled\b/g,'').trim()||'button secondary';
    a.href=href;
    a.textContent=label||button.textContent;
    if(href.startsWith('http')){a.target='_blank';a.rel='noopener'}
    button.replaceWith(a);
  }

  function openCmsTab(tab){
    const target=document.querySelector(`[data-tab="${tab}"]`);
    if(target)target.click();
  }

  function integrateCmsPage(){
    if(!location.pathname.startsWith('/owner-cms'))return;
    const tab=(location.hash||'').replace('#','');
    if(tab)requestAnimationFrame(()=>openCmsTab(tab));
    document.addEventListener('click',e=>{
      const b=e.target.closest('[data-tab]');
      if(b)history.replaceState(null,'',`#${b.dataset.tab}`);
    });
    const resendNote=document.querySelector('#view-resend .section-head p');
    if(resendNote)resendNote.textContent='Contacts, segments, templates, sent-email history and direct delivery through the secured Cloudflare Resend API.';
  }

  function integrateOwner(){
    if(!location.pathname.startsWith('/owner')||location.pathname.startsWith('/owner-cms'))return;
    const website=document.querySelector('#section-website .page-grid');
    if(website&&!document.querySelector('[data-owner-cms-card]')){
      const card=document.createElement('article');
      card.className='panel page-card';
      card.dataset.ownerCmsCard='true';
      card.innerHTML='<div class="eyebrow">Publishing</div><h3>Website CMS</h3><p>Edit public wording, SEO, navigation, theme, media, releases, revisions and Resend operations.</p><div class="actions"><a class="button" href="/owner-cms.html#pages">Open CMS</a></div>';
      website.prepend(card);
    }
    const side=document.querySelector('.sidebar-foot');
    if(side&&!side.querySelector('[href^="/owner-cms.html"]')){
      const link=document.createElement('a');link.className='button';link.href='/owner-cms.html#pages';link.textContent='Website CMS';side.prepend(link);
    }
    const visual=document.querySelector('#section-website .page-card button[disabled]');
    makeLink(visual,'/owner-cms.html#pages','Edit homepage');
    document.querySelectorAll('#section-media .module-card').forEach(card=>{
      const b=card.querySelector('button[disabled]');
      makeLink(b,'/owner-cms.html#media','Open media vault');
    });
    const systemCards=[...document.querySelectorAll('#section-systems .module-card')];
    const routes=['/owner-cms.html#navigation','/owner-cms.html#theme','/owner-cms.html#pages','https://dash.cloudflare.com/'];
    const labels=['Manage navigation','Manage brand theme','Manage SEO','Open Cloudflare'];
    systemCards.forEach((card,i)=>makeLink(card.querySelector('button[disabled]'),routes[i],labels[i]));
    const localDraft=[...document.querySelectorAll('#section-builder .muted')].find(x=>/browser-local/i.test(x.textContent));
    if(localDraft)localDraft.textContent='Release drafts save securely to Supabase and can be published or archived from Owner OS.';
    const driveStatus=[...document.querySelectorAll('.status-item')].find(x=>/Drive media vault/i.test(x.textContent));
    if(driveStatus)driveStatus.innerHTML='<span>CMS media vault</span><span class="success">Connected</span>';
    const audienceHead=document.querySelector('#section-audience .section-head');
    if(audienceHead&&!audienceHead.querySelector('[href*="#resend"]')){
      const a=document.createElement('a');a.className='button';a.href='/owner-cms.html#resend';a.textContent='Open Resend centre';audienceHead.appendChild(a);
    }
    const businessHead=document.querySelector('#section-business > .section-head');
    if(businessHead&&!businessHead.querySelector('[href="/whiteline-admin.html"]')){
      const a=document.createElement('a');a.className='button secondary';a.href='/whiteline-admin.html';a.textContent='Open full business admin';businessHead.appendChild(a);
    }
  }

  async function hydrateReleases(){
    if(!db||!document.querySelector('#release-list'))return;
    const {data:{session}}=await db.auth.getSession();
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
    apply();
    const list=document.querySelector('#release-list');
    if(list)new MutationObserver(apply).observe(list,{childList:true,subtree:true});
  }

  function boot(){integrateCmsPage();integrateOwner();hydrateReleases().catch(console.error)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();