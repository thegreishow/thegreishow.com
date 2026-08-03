const LOGO_URL = "https://drive.google.com/thumbnail?id=1P3YUzpVek_ybKq_8Kii8uRjH5gsbJ6JZ&sz=w1000";

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

function proxiedAudioUrl(source, title) {
  const id = driveId(source);
  if (!id) return source;
  const params = new URLSearchParams({ id, type: "audio", filename: safeName(title) });
  return `/api/media?${params.toString()}`;
}

// Keep all Wheel It! Records navigation on the established site route.
document.querySelectorAll(".brand").forEach(link => {
  link.href = "/wheelitrecords/";
  link.innerHTML = `<img class="brand-logo" src="${LOGO_URL}" alt="Wheel It! Records">`;
});
document.querySelectorAll(".nav a").forEach(link => {
  if (link.textContent.trim().toLowerCase().includes("all releases")) {
    link.href = "/wheelitrecords/promo/";
  }
});

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
    const player = document.querySelector(".player");
    if (player) player.appendChild(status);
  }
  return status;
}

function setStatus(message) {
  const status = ensureStatus();
  if (status) status.textContent = message;
}

function syncButtons() {
  document.querySelectorAll("[data-audio]").forEach(button => {
    button.textContent = button === currentButton && audio && !audio.paused ? "❚❚" : "▶";
  });
}

async function playButton(button) {
  if (!audio) return;
  const source = button.dataset.audioOriginal || button.dataset.audio;
  const title = button.dataset.title || "Wheel It! Records";
  const proxy = proxiedAudioUrl(source, title);
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

  if (!audio.paused && !isNewTrack) {
    audio.pause();
    return;
  }

  setStatus("Loading audio…");
  try {
    await audio.play();
  } catch (error) {
    console.error("Audio playback failed", error);
    setStatus("Unable to start playback. Tap play again or refresh the page.");
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
  audio.addEventListener("playing", () => {
    setStatus(`Playing ${currentTitle}`);
    syncButtons();
  });
  audio.addEventListener("pause", () => {
    setStatus(audio.currentTime ? "Paused" : "Ready to play");
    syncButtons();
  });
  audio.addEventListener("ended", () => {
    setStatus("Finished");
    syncButtons();
  });
  audio.addEventListener("error", () => {
    const mediaError = audio.error;
    console.error("Promo audio error", mediaError);
    setStatus("Preview unavailable. Please use the press-assets link while this file is checked.");
    syncButtons();
  });
}

document.querySelector("#share")?.addEventListener("click", async () => {
  const data = { title: document.title, url: location.href };
  try {
    if (navigator.share) await navigator.share(data);
    else if (navigator.clipboard) {
      await navigator.clipboard.writeText(location.href);
      alert("Link copied");
    } else {
      window.prompt("Copy this link:", location.href);
    }
  } catch (_) {}
});
