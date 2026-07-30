(() => {
  const CHECKOUT_URL = "https://dkvbeizjlgxqjuxnlqho.supabase.co/functions/v1/create-music-support-checkout";
  const RELEASE_KEYS = {"no-drama":"no-drama","dark-side":"dark-side-of-the-moon","psy-phi":"psy-phi","pineapples":"pineapples-and-hot-sauce","ppp-remix":"puff-puff-pass-remix-feat-bay-c","game-hearts":"game-of-hearts","puff-pass":"puff-puff-pass","vibe":"the-vibe","joy":"joy"};
  const DRIVE_ART_BY_ID = {
    "1849838344":"1ic726hm4mwgjFKsPt6fEAbPfdMXoBn5G",
    "1826791782":"1_FCY_ZWpT47H5uTtzN82YYv7Pl6-yOIA",
    "1651749104":"1Ahb6Lay3S-PzXQSElnW4mAz_Amlr3ziU",
    "1541447654":"1qJ0iArViNT_1AmOf8IUiqKkFa-XQJ6Q7",
    "1844975652":"1AJ9ystzxnq-byfQ6OC2Y1YnztP9dbeT-",
    "1831857830":"1KUUxrmjPlpXXlvf6S63J_TVnCF-Zzxdl",
    "1767170663":"1aEG5YkNeHgHiHta5Zerz3IMAQ1pwBrDg",
    "1760518363":"1ndUC7e02uZylbhdTs8IjAc6P2EvPLqCY",
    "1742100290":"1T2AEorwOTeBJOHbqYXYW0AaU6lXz8osN",
    "1587832103":"16Wlva1x_tQJGbXYkZj3ddik9Mw2S0VXg",
    "1563429468":"156YVBZ7Koxc_G2lftDxykftcSRNYPJs5"
  };
  const DRIVE_ART_BY_TITLE = {
    "pineapples & hot sauce":"1laXEuSSVq4wWNQpAGfeoc5A9CCJKFebz",
    "a love alone":"10dsD1gYOYFoe-5HwvD6OLrhmtm6Df_wO",
    "game of hearts":"127SpeX5EyUgBavdk5xpI6pGk6eKa7u0K",
    "puff puff pass":"1MuSYnDIqswVonT1QID7MHzCdR7F6ZG3f",
    "puff puff pass (remix)":"1aEG5YkNeHgHiHta5Zerz3IMAQ1pwBrDg",
    "the flame":"16Wlva1x_tQJGbXYkZj3ddik9Mw2S0VXg",
    "the vibe":"156YVBZ7Koxc_G2lftDxykftcSRNYPJs5",
    "blind without shades":"1SLOsUsxSe2jJMaeW3-aI3WYC83A8f3Mz",
    "friends":"1IMO5H_5xbrPC2tf7AmasZM5OPq08JQvj",
    "squad people":"1EPMg0oyk1ndnJE3qcCCa7rQmSxuxafmU"
  };
  let releases = new Map(), selected = null, lastFocus = null;
  const modal=document.getElementById("support-modal"),form=document.getElementById("support-form"),title=document.getElementById("support-title"),amount=document.getElementById("support-amount"),message=document.getElementById("support-message"),paypal=document.getElementById("support-paypal"),free=document.getElementById("support-free");

  restoreOfficialArtwork();
  setTimeout(restoreOfficialArtwork,400);
  setTimeout(restoreOfficialArtwork,1400);
  watchForLegacyArtworkOverrides();
  if (modal && form) init();

  async function restoreOfficialArtwork(){
    const images=[...document.querySelectorAll("img[data-art-id],img[data-search-art]")];
    await Promise.allSettled(images.map(loadArtwork));
  }

  function watchForLegacyArtworkOverrides(){
    const observer=new MutationObserver(records=>{
      records.forEach(record=>{
        const img=record.target;
        if(!(img instanceof HTMLImageElement))return;
        if(!img.matches("img[data-art-id],img[data-search-art]"))return;
        if(img.dataset.artLoading==="true")return;
        const src=img.getAttribute("src")||"";
        if(src.includes("assets/img/no-drama.webp")||src.includes("00000000-0000-0000-0000-000000000000"))loadArtwork(img);
      });
    });
    document.querySelectorAll("img[data-art-id],img[data-search-art]").forEach(img=>observer.observe(img,{attributes:true,attributeFilter:["src"]}));
    const catalogue=document.getElementById("single-catalogue");
    if(catalogue)new MutationObserver(()=>{
      catalogue.querySelectorAll("img[data-art-id],img[data-search-art]").forEach(img=>{
        observer.observe(img,{attributes:true,attributeFilter:["src"]});
        loadArtwork(img);
      });
    }).observe(catalogue,{childList:true,subtree:true});
  }

  async function loadArtwork(img){
    if(img.dataset.artLoading==="true")return;
    img.dataset.artLoading="true";
    const artId=img.dataset.artId?.trim();
    const explicitSearch=img.dataset.searchArt?.trim();
    const altTitle=(img.alt||"").replace(/\s+(album|ep|single)?\s*cover( art)?$/i,"").trim();
    const title=(explicitSearch||altTitle).replace(/^The Grei Show\s+/i,"").trim();
    const driveId=DRIVE_ART_BY_ID[artId]||DRIVE_ART_BY_TITLE[title.toLowerCase()];
    try{
      if(driveId){
        const loaded=await setImageSource(img,`https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1200`);
        if(loaded){img.dataset.officialArtwork="drive";return;}
      }
      await loadAppleArtwork(img,artId,explicitSearch||(`The Grei Show ${altTitle}`.trim()));
    }finally{delete img.dataset.artLoading;}
  }

  function setImageSource(img,src){
    return new Promise(resolve=>{
      const probe=new Image();
      probe.onload=()=>{img.src=src;resolve(true)};
      probe.onerror=()=>resolve(false);
      probe.src=src;
    });
  }

  async function loadAppleArtwork(img,artId,searchArt){
    if(!artId&&!searchArt){showArtworkPlaceholder(img);return;}
    const params=new URLSearchParams();
    if(artId)params.set("id",artId);
    if(searchArt)params.set("term",searchArt);
    params.set("v","20260729-7");
    try{
      const response=await fetch(`/api/artwork?${params}`,{cache:"no-store"});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.artwork)throw new Error(data.error||"Artwork unavailable");
      const loaded=await setImageSource(img,data.artwork);
      if(!loaded)throw new Error("Artwork image could not be displayed");
      img.dataset.officialArtwork="apple";
    }catch(error){showArtworkPlaceholder(img);console.warn("Official artwork unavailable",artId||searchArt,error)}
  }

  function showArtworkPlaceholder(img){
    const label=(img.alt||"Official release artwork").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="100%" height="100%" fill="#11151d"/><text x="50%" y="47%" fill="#fff" font-family="Arial,sans-serif" font-size="34" text-anchor="middle">THE GREI SHOW</text><text x="50%" y="54%" fill="#9da7b8" font-family="Arial,sans-serif" font-size="24" text-anchor="middle">${label}</text></svg>`;
    img.onerror=null;img.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;delete img.dataset.officialArtwork;
  }

  async function init(){
    try{const response=await fetch(`/assets/data/promo-releases.json?v=${Date.now()}`,{cache:"no-store"});const data=response.ok?await response.json():[];releases=new Map(data.filter(isDownloadable).map(r=>[r.slug,r]));addCatalogueButtons();wireButtons();handleReturn()}catch(error){console.warn("Music support catalogue unavailable",error);wireButtons()}
  }
  function isDownloadable(release){const tracks=Array.isArray(release?.tracks)?release.tracks:[];return release?.status==="published"&&((release.audio_url&&!String(release.audio_url).includes("/folders/"))||tracks.some(t=>t?.url))}
  function addCatalogueButtons(){document.querySelectorAll("[data-release]").forEach(card=>{const slug=RELEASE_KEYS[card.dataset.release],release=releases.get(slug);if(!release||card.querySelector(".support-trigger"))return;const button=supportButton(release),row=card.querySelector(".button-row");if(row)row.appendChild(button);else{const portal=card.querySelector(".open-portal");if(!portal)return;const actions=document.createElement("div");actions.className="catalogue-actions";portal.before(actions);actions.append(portal,button)}})}
  function supportButton(release){const button=document.createElement("button");button.type="button";button.className="music-cta support-trigger";button.dataset.slug=release.slug;button.dataset.title=release.title||release.slug;button.textContent="Name your price · download";return button}
  function wireButtons(){if(!modal||!form||modal.dataset.wired==="true")return;modal.dataset.wired="true";document.addEventListener("click",event=>{const trigger=event.target.closest(".support-trigger");if(!trigger)return;event.preventDefault();event.stopPropagation();openModal(trigger.dataset.slug,trigger.dataset.title,trigger)});modal.querySelector(".support-close")?.addEventListener("click",closeModal);modal.addEventListener("click",event=>{if(event.target===modal)closeModal()});document.addEventListener("keydown",event=>{if(event.key==="Escape"&&modal.classList.contains("open"))closeModal()});free?.addEventListener("click",()=>startDownload(selected));form.addEventListener("submit",beginCheckout)}
  function openModal(slug,releaseTitle,trigger){selected=releases.get(slug)||{slug,title:releaseTitle||"Music download",audio_url:slug==="no-drama"?"/assets/audio/music/no-drama.mp3":""};lastFocus=trigger||document.activeElement;title.textContent=selected.title||releaseTitle||"Name your price";amount.value="3";message.textContent="Enter $0 for a free download, or leave a contribution through PayPal.";paypal.disabled=false;modal.classList.add("open");document.body.style.overflow="hidden";amount.focus()}
  function closeModal(){modal.classList.remove("open");document.body.style.overflow="";lastFocus?.focus?.()}
  async function beginCheckout(event){event.preventDefault();const value=Number(amount.value);if(!Number.isFinite(value)||value<0||value>500){message.textContent="Enter an amount from $0 to $500 USD.";return}if(value===0)return startDownload(selected);if(value<1){message.textContent="PayPal contributions start at $1. Choose $0 to download free.";return}paypal.disabled=true;message.textContent="Opening secure PayPal checkout…";try{const response=await fetch(CHECKOUT_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:selected.slug,amount:value,website:""})});const data=await response.json().catch(()=>({}));if(!response.ok||!data.url)throw new Error(data.error||"PayPal checkout is unavailable.");location.href=data.url}catch(error){message.textContent=error.message||"PayPal checkout is unavailable. You can still download free.";paypal.disabled=false}}
  function startDownload(release){if(!release)return;const tracks=Array.isArray(release.tracks)?release.tracks.filter(t=>t?.url):[];if(tracks.length>1){location.href=`/promo/${encodeURIComponent(release.slug)}/#project-section`;return}const href=release.slug==="no-drama"&&!releases.has("no-drama")?"/assets/audio/music/no-drama.mp3":`/api/media?slug=${encodeURIComponent(release.slug)}&type=${tracks.length?"track":"audio"}&index=0&download=1`;const link=document.createElement("a");link.href=href;link.download="";document.body.appendChild(link);link.click();link.remove();message.textContent="Download started. Thank you for listening."}
  function handleReturn(){const params=new URLSearchParams(location.search),status=params.get("support"),slug=params.get("slug");if(!status||!slug)return;const release=releases.get(slug);if(status==="thanks"&&release){openModal(slug,release.title,null);message.textContent="Thank you for supporting The Grei Show. Your download is starting.";startDownload(release)}else if(status==="cancelled"){openModal(slug,release?.title||"Music download",null);message.textContent="No payment was made. The free download is still available."}history.replaceState({},"",location.pathname+location.hash)}
})();