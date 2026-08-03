const LOGO_URL = "https://drive.google.com/thumbnail?id=1P3YUzpVek_ybKq_8Kii8uRjH5gsbJ6JZ&sz=w1000";

const RELEASE_META = {
  "dinero-code": {
    artist: "WiggWard & Poseck Jr.",
    genre: "Modern Dancehall",
    released: "October 22, 2025",
    type: "Single",
    label: "Wheel It! Records",
    description: "A modern dancehall collaboration by WiggWard and Poseck Jr., released through Wheel It! Records."
  },
  "dancehall-stylee": {
    artist: "Swnkah & Sugar Minott",
    genre: "Modern Dancehall",
    released: "May 20, 2025",
    type: "Single",
    label: "Wheel It! Records",
    description: "A cross-generational tribute to Jamaican dancehall heritage, performed by Swnkah and Sugar Minott.",
    credits: [
      ["Producer", "The Grei Show"],
      ["Synthesizer", "The Grei Show"],
      ["Executive Producer", "Maxine Stowe"],
      ["Songwriters", "Lincoln ‘Sugar’ Minott & Candice Minott"]
    ]
  }
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
  if (!container || !href) return;
  const link = document.createElement("a");
  link.className = `btn${primary ? " primary" : ""}`;
  link.href = href;
  link.textContent = label;
  if (!href.startsWith("/api/")) {
    link.target = "_blank";
    link.rel = "noopener";
  }
  container.appendChild(link);
}

function applyMetadata() {
  const slug = slugFromPath();
  const meta = RELEASE_META[slug];
  const title = document.querySelector(".hero h1")?.textContent.trim() || document.title.split("—")[0].trim();
  const cover = document.querySelector(".cover");
  const audioButton = document.querySelector("[data-audio]");
  const pressActions = document.querySelector(".grid .card:last-child .actions");

  if (audioButton && pressActions) {
    addButton(pressActions, "Download mastered audio", proxiedMediaUrl(audioButton.dataset.audio, title, "audio", true), true);
  }
  if (cover && pressActions) {
    addButton(pressActions, "Download cover art", proxiedMediaUrl(cover.src, `${title}-cover`, "artwork", true));
  }

  if (!meta) return;

  const heroLead = document.querySelector(".hero .lede");
  if (heroLead) heroLead.textContent = meta.description;

  const trackInfo = document.querySelector(".track div");
  if (trackInfo) trackInfo.innerHTML = `<strong>${title}</strong><br><small>${meta.artist}</small>`;

  const aboutCard = document.querySelector(".grid .card:first-child");
  if (aboutCard) {
    aboutCard.innerHTML = `
      <p class="eyebrow">Release details</p>
      <h2>${meta.artist}</h2>
      <p class="muted">${meta.genre} · ${meta.type}<br>${meta.released}<br>${meta.label}</p>
      ${Array.isArray(meta.credits) ? `<div class="credit-list">${meta.credits.map(([role, name]) => `<p><strong>${role}:</strong> ${name}</p>`).join("")}</div>` : ""}
    `;
  }

  document.title = `${title} — ${meta.artist} | Wheel It! Records`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", `${title} — ${meta.artist}`);

  const schema = document.createElement("script");
  schema.type = "application/ld+json";
  schema.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: title,
    byArtist: { "@type": "MusicGroup", name: meta.artist },
    genre: meta.genre,
    datePublished: meta.released,
    recordLabel: { "@type": "Organization", name: meta.label }
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
    setStatus("Unable to start playback. Tap play again or use the audio download.");
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
  audio.addEventListener("error", () => { setStatus("Preview unavailable. Use the mastered-audio download below."); syncButtons(); });
}

document.querySelector("#share")?.addEventListener("click", async () => {
  const data = { title: document.title, url: location.href };
  try {
    if (navigator.share) await navigator.share(data);
    else if (navigator.clipboard) { await navigator.clipboard.writeText(location.href); alert("Link copied"); }
    else window.prompt("Copy this link:", location.href);
  } catch (_) {}
});