const LOGO_URL = "https://drive.google.com/thumbnail?id=1P3YUzpVek_ybKq_8Kii8uRjH5gsbJ6JZ&sz=w1000";

const RELEASE_META = {
  "dinero-code": {
    artist: "WiggWard & Poseck Jr.",
    genre: "Modern Dancehall",
    released: "October 22, 2025",
    type: "Single",
    label: "Wheel It! Records",
    description: "A modern dancehall release by WiggWard and Poseck Jr., produced and released through Wheel It! Records.",
    platforms: {
      apple: "https://music.apple.com/jm/album/dinero-code-single/1846468509"
    }
  },
  "dancehall-stylee": {
    artist: "Swnkah & Sugar Minott",
    genre: "Modern Dancehall",
    released: "May 20, 2025",
    type: "Single",
    label: "Wheel It! Records",
    description: "A cross-generational dancehall release connecting Swnkah with the voice and legacy of Sugar Minott, produced by The Grei Show.",
    credits: [
      ["Producer", "The Grei Show"],
      ["Synthesizer", "The Grei Show"],
      ["Executive Producer", "Maxine Stowe"],
      ["Songwriters", "Lincoln ‘Sugar’ Minott & Candice Minott"]
    ]
  }
};

const PLATFORM_LABELS = {
  spotify: "Spotify",
  apple: "Apple Music",
  youtube: "YouTube",
  tidal: "TIDAL",
  deezer: "Deezer",
  amazon: "Amazon Music",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp"
};

function slugFromPath() {
  const parts = location.pathname.split("/").filter(Boolean);
  const promoIndex = parts.indexOf("promo");
  return promoIndex >= 0 ? (parts[promoIndex + 1] || "") : "";
}

function driveId(url) {
  const value = String(url || "");
  return (value.match(/[?&]id=([\w-]+)/) || value.match(/\/d\/([\w-]+)/) || [])[1] || "";
}

function safeName(value) {
  return String(value || "wheel-it-records-audio")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "wheel-it-records-audio";
}

function proxiedMediaUrl(source, title, type = "audio", download = false) {
  const id = driveId(source);
  if (!id) return source;
  const params = new URLSearchParams({ id, type, filename: safeName(title) });
  if (download) params.set("download", "1");
  return `/api/media?${params.toString()}`;
}

function addButton(container, label, href, primary = false) {
  if (!container || !href) return null;
  const link = document.createElement("a");
  link.className = `btn${primary ? " primary" : ""}`;
  link.href = href;
  link.textContent = label;
  if (!href.startsWith("/api/")) {
    link.target = "_blank";
    link.rel = "noopener";
  }
  container.appendChild(link);
  return link;
}

function buildPlatformModal(meta, title, artist) {
  const existing = document.querySelector("#platform-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "platform-modal";
  modal.className = "platform-modal";
  modal.hidden = true;

  const explicit = meta?.platforms || {};
  const query = encodeURIComponent(`${artist || ""} ${title}`.trim());
  const fallback = {
    spotify: `https://open.spotify.com/search/${query}`,
    apple: `https://music.apple.com/us/search?term=${query}`,
    youtube: `https://www.youtube.com/results?search_query=${query}`,
    tidal: `https://listen.tidal.com/search?q=${query}`,
    deezer: `https://www.deezer.com/search/${query}`,
    amazon: `https://music.amazon.com/search/${query}`
  };

  const links = Object.keys(PLATFORM_LABELS)
    .map(key => [PLATFORM_LABELS[key], explicit[key] || fallback[key]])
    .filter(([, url]) => Boolean(url));

  modal.innerHTML = `
    <div class="platform-dialog" role="dialog" aria-modal="true" aria-labelledby="platform-title">
      <button class="platform-close" type="button" aria-label="Close">×</button>
      <p class="eyebrow">Listen your way</p>
      <h2 id="platform-title">Choose a platform</h2>
      <div class="platform-links">
        ${links.map(([label, url]) => `<a href="${url}" target="_blank" rel="noopener">${label}<span>↗</span></a>`).join("")}
      </div>
    </div>`;

  document.body.appendChild(modal);
  const close = () => { modal.hidden = true; document.body.classList.remove("modal-open"); };
  modal.querySelector(".platform-close")?.addEventListener("click", close);
  modal.addEventListener("click", event => { if (event.target === modal) close(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
  return modal;
}

function injectPressReleaseStyles() {
  if (document.querySelector("#wheelit-press-styles")) return;
  const style = document.createElement("style");
  style.id = "wheelit-press-styles";
  style.textContent = `
    .press-release-label{margin-top:18px;color:rgba(255,255,255,.58);font-size:.75rem;letter-spacing:.14em;text-transform:uppercase}
    .credit-list{margin-top:20px;padding-top:14px;border-top:1px solid rgba(255,255,255,.1)}
    .credit-list p{margin:8px 0!important}
    .platform-modal{position:fixed;inset:0;z-index:2000;display:grid;place-items:end center;padding:20px;background:rgba(0,0,0,.72);backdrop-filter:blur(18px)}
    .platform-modal[hidden]{display:none}
    .platform-dialog{position:relative;width:min(520px,100%);padding:28px;border:1px solid rgba(255,255,255,.14);border-radius:24px;background:#0b0d11;box-shadow:0 30px 100px rgba(0,0,0,.7)}
    .platform-dialog h2{margin:0 0 18px}
    .platform-close{position:absolute;right:18px;top:18px;width:42px;height:42px;border:1px solid rgba(255,255,255,.15);border-radius:50%;background:rgba(255,255,255,.06);color:#fff;font-size:1.35rem;cursor:pointer}
    .platform-links{display:grid;gap:10px}.platform-links a{display:flex;align-items:center;justify-content:space-between;min-height:56px;padding:0 17px;border:1px solid rgba(255,255,255,.11);border-radius:14px;background:rgba(255,255,255,.045);color:#fff;text-decoration:none;font-weight:800}.platform-links a:hover{border-color:rgba(216,255,99,.35)}
    body.modal-open{overflow:hidden}
  `;
  document.head.appendChild(style);
}

function applyMetadata() {
  injectPressReleaseStyles();

  const slug = slugFromPath();
  const meta = RELEASE_META[slug] || {};
  const title = document.querySelector(".hero h1")?.textContent.trim() || document.title.split("—")[0].trim();
  const cover = document.querySelector(".cover");
  const audioButton = document.querySelector("[data-audio]");
  const pressCard = document.querySelector(".grid .card:last-child");
  const pressActions = pressCard?.querySelector(".actions");
  const heroActions = document.querySelector(".hero .actions");
  const artist = meta.artist || "Various Artists";

  document.querySelector(".hero .eyebrow")?.replaceChildren(document.createTextNode("Official producer press release"));
  if (pressCard) {
    const eyebrow = pressCard.querySelector(".eyebrow");
    const heading = pressCard.querySelector("h2");
    const copy = pressCard.querySelector(".muted");
    if (eyebrow) eyebrow.textContent = "Professional assets";
    if (heading) heading.textContent = "Release materials";
    if (copy) copy.textContent = "Approved audio, artwork and release information for DJs, radio, press and industry partners.";
  }

  if (pressActions) {
    [...pressActions.querySelectorAll("a")].forEach(link => link.remove());
    if (audioButton) addButton(pressActions, "Download Audio", proxiedMediaUrl(audioButton.dataset.audio, title, "audio", true), true);
    if (cover) addButton(pressActions, "Download Artwork", proxiedMediaUrl(cover.src, `${title}-cover`, "artwork", true));
  }

  const platformModal = buildPlatformModal(meta, title, artist);
  if (heroActions) {
    let platformButton = heroActions.querySelector("#choose-platform");
    if (!platformButton) {
      platformButton = document.createElement("button");
      platformButton.id = "choose-platform";
      platformButton.className = "btn";
      platformButton.type = "button";
      platformButton.textContent = "Choose a Platform";
      heroActions.insertBefore(platformButton, heroActions.querySelector("#share"));
    }
    platformButton.onclick = () => { platformModal.hidden = false; document.body.classList.add("modal-open"); };
  }

  const heroLead = document.querySelector(".hero .lede");
  if (heroLead) {
    heroLead.textContent = meta.description || `${title} is an official Wheel It! Records production, created and released from Kingston, Jamaica.`;
    const label = document.createElement("div");
    label.className = "press-release-label";
    label.textContent = "Produced and released by Wheel It! Records";
    heroLead.insertAdjacentElement("afterend", label);
  }

  const trackInfo = document.querySelector(".track div");
  if (trackInfo) trackInfo.innerHTML = `<strong>${title}</strong><br><small>${artist}</small>`;

  const aboutCard = document.querySelector(".grid .card:first-child");
  if (aboutCard) {
    aboutCard.innerHTML = `
      <p class="eyebrow">Press release</p>
      <h2>${artist}</h2>
      <p class="muted">${meta.genre || "Jamaican Music"} · ${meta.type || "Official Release"}<br>${meta.released || "Release information forthcoming"}<br>${meta.label || "Wheel It! Records"}</p>
      ${Array.isArray(meta.credits) ? `<div class="credit-list">${meta.credits.map(([role, name]) => `<p><strong>${role}:</strong> ${name}</p>`).join("")}</div>` : `<div class="credit-list"><p><strong>Producer:</strong> The Grei Show</p><p><strong>Label:</strong> Wheel It! Records</p></div>`}
    `;
  }

  document.title = `${title} — ${artist} | Wheel It! Records Press Release`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description || `Official press release for ${title}, produced by The Grei Show and released through Wheel It! Records.`);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", `${title} — ${artist}`);

  const schema = document.createElement("script");
  schema.type = "application/ld+json";
  schema.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: title,
    byArtist: { "@type": "MusicGroup", name: artist },
    producer: { "@type": "Person", name: "The Grei Show" },
    genre: meta.genre || "Jamaican Music",
    datePublished: meta.released || undefined,
    recordLabel: { "@type": "Organization", name: meta.label || "Wheel It! Records" }
  });
  document.head.appendChild(schema);
}

// Keep all Wheel It! Records navigation on the established site route.
document.querySelectorAll(".brand").forEach(link => {
  link.href = "/wheelitrecords/";
  link.innerHTML = `<img class="brand-logo" src="${LOGO_URL}" alt="Wheel It! Records">`;
});
document.querySelectorAll(".nav a").forEach(link => {
  if (link.textContent.trim().toLowerCase().includes("all releases")) link.href = "/wheelitrecords/promo/";
});

applyMetadata();

const audio = document.querySelector("#audio");
let currentButton = null;
let currentTitle = "";

function ensureStatus() {
  let status = document.querySelector("#player-status");
  if (!status) {
    status = document.createElement("div");
    status.id = "player-status";
    status.className = "player-status";
    status.setAttribute("aria-live", "polite");
    document.querySelector(".player")?.appendChild(status);
  }
  return status;
}
function setStatus(message) { const status = ensureStatus(); if (status) status.textContent = message; }
function syncButtons() {
  document.querySelectorAll("[data-audio]").forEach(button => {
    button.textContent = button === currentButton && audio && !audio.paused ? "❚❚" : "▶";
  });
}
async function playButton(button) {
  if (!audio) return;
  const source = button.dataset.audioOriginal || button.dataset.audio;
  const title = button.dataset.title || "Wheel It! Records";
  const proxy = proxiedMediaUrl(source, title);
  const isNewTrack = currentButton !== button || audio.dataset.source !== proxy;
  if (isNewTrack) {
    audio.pause();
    audio.dataset.source = proxy;
    audio.src = proxy;
    audio.load();
    currentButton = button;
    currentTitle = title;
    const nowPlaying = document.querySelector("#now-playing");
    if (nowPlaying) nowPlaying.textContent = title;
  }
  if (!audio.paused && !isNewTrack) { audio.pause(); return; }
  setStatus("Loading audio…");
  try { await audio.play(); }
  catch (error) {
    console.error("Audio playback failed", error);
    setStatus("Unable to start playback. Tap play again or use Download Audio.");
    syncButtons();
  }
}

document.querySelectorAll("[data-audio]").forEach(button => {
  button.dataset.audioOriginal = button.dataset.audio;
  button.type = "button";
  button.addEventListener("click", () => playButton(button));
});

if (audio) {
  audio.preload = "metadata";
  audio.setAttribute("playsinline", "");
  audio.addEventListener("loadstart", () => setStatus("Loading audio…"));
  audio.addEventListener("loadedmetadata", () => setStatus("Ready to play"));
  audio.addEventListener("canplay", () => setStatus(audio.paused ? "Ready to play" : "Playing"));
  audio.addEventListener("waiting", () => setStatus("Buffering…"));
  audio.addEventListener("playing", () => { setStatus(`Playing ${currentTitle}`); syncButtons(); });
  audio.addEventListener("pause", () => { setStatus(audio.currentTime ? "Paused" : "Ready to play"); syncButtons(); });
  audio.addEventListener("ended", () => { setStatus("Finished"); syncButtons(); });
  audio.addEventListener("error", () => { setStatus("Preview unavailable. Use Download Audio below."); syncButtons(); });
}

document.querySelector("#share")?.addEventListener("click", async () => {
  const data = { title: document.title, url: location.href };
  try {
    if (navigator.share) await navigator.share(data);
    else if (navigator.clipboard) { await navigator.clipboard.writeText(location.href); alert("Link copied"); }
    else window.prompt("Copy this link:", location.href);
  } catch (_) {}
});