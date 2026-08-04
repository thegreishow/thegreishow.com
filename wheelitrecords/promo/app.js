const LOGO_URL = "https://drive.google.com/thumbnail?id=1P3YUzpVek_ybKq_8Kii8uRjH5gsbJ6JZ&sz=w1000";

const RELEASE_META = {
  "dinero-code": {
    artist: "WiggWard & Poseck Jr.",
    genre: "Modern Dancehall",
    released: "October 22, 2025",
    duration: "2:33",
    type: "Single",
    label: "Wheel It! Records",
    country: "Jamaica",
    copyright: "℗ 2025 Wheel It! Records",
    description: "WiggWard and Poseck Jr. join forces on “Dinero Code,” a compact modern dancehall single released through Wheel It! Records.",
    platforms: {
      apple: "https://music.apple.com/jm/album/dinero-code-single/1846468509",
      amazon: "https://music.amazon.co.jp/albums/B0FWH7J1D1"
    },
    credits: [
      ["Primary Artists", "WiggWard & Poseck Jr."],
      ["Record Label", "Wheel It! Records"]
    ]
  },
  "dancehall-stylee": {
    artist: "Swnkah & Sugar Minott",
    genre: "Modern Dancehall",
    released: "May 20, 2025",
    duration: "3:03",
    bpm: "144",
    language: "English",
    type: "Single",
    label: "Wheel It! Records",
    country: "Jamaica",
    copyright: "℗ 2025 Wheel It! Records",
    description: "Swnkah honours her father Sugar Minott and the living spirit of Jamaican dancehall on a cross-generational release that connects heritage with a new era.",
    platforms: {
      apple: "https://music.apple.com/us/album/dancehall-stylee-single/1811688370",
      amazon: "https://music.amazon.com/tracks/B0F72Q9ZD9"
    },
    credits: [
      ["Performing Artists", "Swnkah & Lincoln “Sugar” Minott"],
      ["Songwriters", "Lincoln “Sugar” Minott & Candice Minott"],
      ["Producer", "The Grei Show"],
      ["Synthesizer", "The Grei Show"],
      ["Executive Producer", "Maxine Stowe"],
      ["Record Label", "Wheel It! Records"]
    ]
  },
  "skill-riddim-vol-1": {
    artist: "Various Artists",
    genre: "Modern Dancehall",
    released: "June 21, 2024",
    duration: "12 minutes",
    type: "Riddim Project · 5 Tracks",
    label: "Wheel It! Records",
    country: "Jamaica",
    copyright: "℗ 2024 Wheel It! Records",
    description: "A five-track riddim project bringing together 1Prayz, Brown Chops, Jco Don and Prezidential across a shared Wheel It! Records production.",
    platforms: {
      amazon: "https://music.amazon.com/albums/B0DCF4LQ21"
    },
    tracklist: [
      "Isolation — 1Prayz — 2:27",
      "Vladamir — Brown Chops — 2:26",
      "Hit Sound — Jco Don — 2:27",
      "Money — Prezidential — 2:29",
      "Skill Riddim, Vol. 1 — 1Prayz, Brown Chops, Jco Don & Prezidential — 2:53"
    ],
    credits: [
      ["Featured Artists", "1Prayz, Brown Chops, Jco Don & Prezidential"],
      ["Record Label", "Wheel It! Records"]
    ]
  },
  "cash-out": {
    artist: "Swnkah",
    genre: "Hip-Hop/Rap",
    released: "June 22, 2021",
    duration: "2 minutes",
    type: "Single",
    label: "Wheel It! Records",
    country: "Jamaica",
    copyright: "℗ 2021 Wheel It! Records",
    description: "“Cash Out” is a concise solo release from Jamaican artist Swnkah, issued through Wheel It! Records in 2021.",
    platforms: {
      apple: "https://music.apple.com/us/album/cash-out-single/1571833861"
    },
    credits: [
      ["Primary Artist", "Swnkah"],
      ["Record Label", "Wheel It! Records"]
    ]
  }
};

const PLATFORM_LABELS = {
  spotify: "Spotify", apple: "Apple Music", youtube: "YouTube",
  tidal: "TIDAL", deezer: "Deezer", amazon: "Amazon Music",
  soundcloud: "SoundCloud", bandcamp: "Bandcamp"
};

function slugFromPath() {
  const parts = location.pathname.split("/").filter(Boolean);
  const index = parts.indexOf("promo");
  return index >= 0 ? (parts[index + 1] || "") : "";
}

function driveId(url) {
  const value = String(url || "");
  return (value.match(/[?&]id=([\w-]+)/) || value.match(/\/d\/([\w-]+)/) || [])[1] || "";
}

function safeName(value) {
  return String(value || "wheel-it-records-media").normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "wheel-it-records-media";
}

function proxiedMediaUrl(source, title, type = "audio", download = false) {
  const id = driveId(source);
  if (!id) return source;
  const params = new URLSearchParams({ id, type, filename: safeName(title) });
  if (download) params.set("download", "1");
  return `/api/media?${params.toString()}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}

function addButton(container, label, href, primary = false) {
  if (!container || !href) return;
  const link = document.createElement("a");
  link.className = `btn${primary ? " primary" : ""}`;
  link.href = href;
  link.textContent = label;
  if (!href.startsWith("/api/")) { link.target = "_blank"; link.rel = "noopener"; }
  container.appendChild(link);
}

function platformModal(meta, title, artist) {
  document.querySelector("#platform-modal")?.remove();
  const query = encodeURIComponent(`${artist} ${title}`);
  const fallback = {
    spotify:`https://open.spotify.com/search/${query}`,
    apple:`https://music.apple.com/us/search?term=${query}`,
    youtube:`https://www.youtube.com/results?search_query=${query}`,
    tidal:`https://listen.tidal.com/search?q=${query}`,
    deezer:`https://www.deezer.com/search/${query}`,
    amazon:`https://music.amazon.com/search/${query}`
  };
  const urls = {...fallback, ...(meta.platforms || {})};
  const links = Object.entries(PLATFORM_LABELS).filter(([key]) => urls[key]);
  const modal = document.createElement("div");
  modal.id = "platform-modal";
  modal.className = "platform-modal";
  modal.hidden = true;
  modal.innerHTML = `<div class="platform-dialog" role="dialog" aria-modal="true"><button class="platform-close" aria-label="Close">×</button><p class="eyebrow">Listen your way</p><h2>Choose a Platform</h2><div class="platform-links">${links.map(([key,label])=>`<a href="${escapeHtml(urls[key])}" target="_blank" rel="noopener">${label}<span>↗</span></a>`).join("")}</div></div>`;
  document.body.appendChild(modal);
  const close = () => { modal.hidden = true; document.body.classList.remove("modal-open"); };
  modal.querySelector(".platform-close").onclick = close;
  modal.onclick = event => { if (event.target === modal) close(); };
  return modal;
}

function injectStyles() {
  if (document.querySelector("#wheelit-press-styles")) return;
  const style = document.createElement("style");
  style.id = "wheelit-press-styles";
  style.textContent = `
  .release-summary{margin-top:20px}.release-meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;margin-top:22px}.release-meta-row{padding:13px 0;border-top:1px solid rgba(255,255,255,.1)}.release-meta-row span{display:block;color:rgba(255,255,255,.42);font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.release-meta-row strong{display:block;margin-top:6px}.credit-list{margin-top:22px}.credit-line{display:flex;justify-content:space-between;gap:18px;padding:11px 0;border-top:1px solid rgba(255,255,255,.1)}.credit-line span{color:rgba(255,255,255,.45)}.tracklist-copy{margin-top:20px}.tracklist-copy p{padding:10px 0;border-top:1px solid rgba(255,255,255,.08);margin:0!important}.platform-modal{position:fixed;inset:0;z-index:2000;display:grid;place-items:end center;padding:20px;background:rgba(0,0,0,.72);backdrop-filter:blur(18px)}.platform-modal[hidden]{display:none}.platform-dialog{position:relative;width:min(520px,100%);padding:28px;border:1px solid rgba(255,255,255,.14);border-radius:24px;background:#0b0d11}.platform-close{position:absolute;right:18px;top:18px;width:42px;height:42px;border:1px solid rgba(255,255,255,.15);border-radius:50%;background:rgba(255,255,255,.06);color:#fff;font-size:1.35rem}.platform-links{display:grid;gap:10px;margin-top:20px}.platform-links a{display:flex;justify-content:space-between;align-items:center;min-height:56px;padding:0 17px;border:1px solid rgba(255,255,255,.11);border-radius:14px;color:#fff;text-decoration:none}.platform-links a:hover{border-color:rgba(216,255,99,.35)}body.modal-open{overflow:hidden}@media(max-width:620px){.release-meta-grid{grid-template-columns:1fr}.credit-line{display:block}.credit-line strong{display:block;margin-top:4px}}
  `;
  document.head.appendChild(style);
}

function metadataRows(meta, title) {
  const values = [
    ["Artist", meta.artist], ["Title", title], ["Release Date", meta.released],
    ["Release Type", meta.type], ["Genre", meta.genre], ["Duration", meta.duration],
    ["BPM", meta.bpm], ["Language", meta.language], ["Country", meta.country],
    ["Record Label", meta.label], ["Copyright", meta.copyright]
  ].filter(([,value]) => value);
  return values.map(([label,value]) => `<div class="release-meta-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
}

function applyPresentation() {
  injectStyles();
  const slug = slugFromPath();
  const meta = RELEASE_META[slug] || {};
  const title = document.querySelector(".hero h1")?.textContent.trim() || document.title.split("—")[0].trim();
  const artist = meta.artist || "Artist information forthcoming";
  const cover = document.querySelector(".cover");
  const audioButton = document.querySelector("[data-audio]");
  const heroActions = document.querySelector(".hero .actions");
  const aboutCard = document.querySelector(".grid .card:first-child");
  const assetsCard = document.querySelector(".grid .card:last-child");
  const assetActions = assetsCard?.querySelector(".actions");

  const eyebrow = document.querySelector(".hero .eyebrow");
  if (eyebrow) eyebrow.textContent = "Official Release · Wheel It! Records";
  const lead = document.querySelector(".hero .lede");
  if (lead) lead.textContent = meta.description || `Official release information, audio and artwork for “${title}”.`;

  const trackInfo = document.querySelector(".track div");
  if (trackInfo) trackInfo.innerHTML = `<strong>${escapeHtml(title)}</strong><br><small>${escapeHtml(artist)}</small>`;

  if (aboutCard) {
    aboutCard.innerHTML = `<p class="eyebrow">Release Information</p><h2>${escapeHtml(artist)}</h2><p class="muted release-summary">${escapeHtml(meta.description || "Additional verified release information will be added as it becomes available.")}</p><div class="release-meta-grid">${metadataRows(meta,title)}</div>${Array.isArray(meta.tracklist)?`<div class="tracklist-copy"><p class="eyebrow">Tracklist</p>${meta.tracklist.map(item=>`<p>${escapeHtml(item)}</p>`).join("")}</div>`:""}${Array.isArray(meta.credits)?`<div class="credit-list">${meta.credits.map(([role,name])=>`<div class="credit-line"><span>${escapeHtml(role)}</span><strong>${escapeHtml(name)}</strong></div>`).join("")}</div>`:""}`;
  }

  if (assetsCard) {
    assetsCard.querySelector(".eyebrow").textContent = "Professional Assets";
    assetsCard.querySelector("h2").textContent = "Release Materials";
    assetsCard.querySelector(".muted").textContent = "Approved mastered audio and artwork for DJs, radio, press and industry partners.";
  }
  if (assetActions) {
    assetActions.innerHTML = "";
    if (audioButton) addButton(assetActions,"Download Audio",proxiedMediaUrl(audioButton.dataset.audio,title,"audio",true),true);
    if (cover) addButton(assetActions,"Download Artwork",proxiedMediaUrl(cover.src,`${title}-artwork`,"artwork",true));
  }

  const modal = platformModal(meta,title,meta.artist || title);
  if (heroActions) {
    let choose = heroActions.querySelector("#choose-platform");
    if (!choose) { choose = document.createElement("button"); choose.id="choose-platform"; choose.className="btn"; choose.type="button"; choose.textContent="Choose a Platform"; heroActions.insertBefore(choose,heroActions.querySelector("#share")); }
    choose.onclick=()=>{modal.hidden=false;document.body.classList.add("modal-open")};
  }

  document.title = `${title} — ${meta.artist || "Wheel It! Records"}`;
  const description = meta.description || `Official release page for ${title} from Wheel It! Records.`;
  document.querySelector('meta[name="description"]')?.setAttribute("content",description);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content",`${title} — ${meta.artist || "Wheel It! Records"}`);

  const schema = document.createElement("script");
  schema.type="application/ld+json";
  schema.textContent=JSON.stringify({"@context":"https://schema.org","@type":meta.type?.includes("Tracks")?"MusicAlbum":"MusicRecording",name:title,byArtist:meta.artist?{"@type":"MusicGroup",name:meta.artist}:undefined,genre:meta.genre,datePublished:meta.released,duration:meta.duration,recordLabel:{"@type":"Organization",name:meta.label||"Wheel It! Records"}});
  document.head.appendChild(schema);
}

document.querySelectorAll(".brand").forEach(link=>{link.href="/wheelitrecords/";link.innerHTML=`<img class="brand-logo" src="${LOGO_URL}" alt="Wheel It! Records">`});
document.querySelectorAll(".nav a").forEach(link=>{if(link.textContent.trim().toLowerCase().includes("all releases"))link.href="/wheelitrecords/promo/"});
applyPresentation();

const audio=document.querySelector("#audio");let currentButton=null,currentTitle="";
function ensureStatus(){let status=document.querySelector("#player-status");if(!status){status=document.createElement("div");status.id="player-status";status.className="player-status";status.setAttribute("aria-live","polite");document.querySelector(".player")?.appendChild(status)}return status}
function setStatus(message){const status=ensureStatus();if(status)status.textContent=message}
function syncButtons(){document.querySelectorAll("[data-audio]").forEach(button=>button.textContent=button===currentButton&&audio&&!audio.paused?"❚❚":"▶")}
async function playButton(button){if(!audio)return;const source=button.dataset.audioOriginal||button.dataset.audio,title=button.dataset.title||"Wheel It! Records",proxy=proxiedMediaUrl(source,title),isNew=currentButton!==button||audio.dataset.source!==proxy;if(isNew){audio.pause();audio.dataset.source=proxy;audio.src=proxy;audio.load();currentButton=button;currentTitle=title;const now=document.querySelector("#now-playing");if(now)now.textContent=title}if(!audio.paused&&!isNew){audio.pause();return}setStatus("Loading audio…");try{await audio.play()}catch(error){console.error(error);setStatus("Unable to start playback. Tap play again or use Download Audio.");syncButtons()}}
document.querySelectorAll("[data-audio]").forEach(button=>{button.dataset.audioOriginal=button.dataset.audio;button.type="button";button.addEventListener("click",()=>playButton(button))});
if(audio){audio.preload="metadata";audio.setAttribute("playsinline","");audio.addEventListener("loadstart",()=>setStatus("Loading audio…"));audio.addEventListener("loadedmetadata",()=>setStatus("Ready to play"));audio.addEventListener("canplay",()=>setStatus(audio.paused?"Ready to play":"Playing"));audio.addEventListener("waiting",()=>setStatus("Buffering…"));audio.addEventListener("playing",()=>{setStatus(`Playing ${currentTitle}`);syncButtons()});audio.addEventListener("pause",()=>{setStatus(audio.currentTime?"Paused":"Ready to play");syncButtons()});audio.addEventListener("ended",()=>{setStatus("Finished");syncButtons()});audio.addEventListener("error",()=>{setStatus("Preview unavailable. Use Download Audio below.");syncButtons()})}
document.querySelector("#share")?.addEventListener("click",async()=>{const data={title:document.title,url:location.href};try{if(navigator.share)await navigator.share(data);else if(navigator.clipboard){await navigator.clipboard.writeText(location.href);alert("Link copied")}else window.prompt("Copy this link:",location.href)}catch(_){}});
