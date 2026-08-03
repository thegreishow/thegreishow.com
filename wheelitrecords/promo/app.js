const LOGO_URL = "https://drive.google.com/thumbnail?id=1P3YUzpVek_ybKq_8Kii8uRjH5gsbJ6JZ&sz=w1000";

function getDriveId(url = "") {
  const queryMatch = url.match(/[?&]id=([^&]+)/);
  if (queryMatch) return queryMatch[1];

  const pathMatch = url.match(/\/file\/d\/([^/]+)/);
  return pathMatch ? pathMatch[1] : "";
}

function audioCandidates(url) {
  const id = getDriveId(url);
  if (!id) return [url];

  return [
    `https://drive.google.com/uc?export=download&id=${id}`,
    `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
    `https://lh3.googleusercontent.com/d/${id}`
  ];
}

function setStatus(message, isError = false) {
  let status = document.querySelector("#player-status");
  const player = document.querySelector(".player");

  if (!status && player) {
    status = document.createElement("p");
    status.id = "player-status";
    status.setAttribute("aria-live", "polite");
    status.style.margin = "12px 0 0";
    status.style.fontSize = ".82rem";
    player.appendChild(status);
  }

  if (status) {
    status.textContent = message;
    status.style.color = isError ? "#ff9a9a" : "rgba(255,255,255,.7)";
  }
}

// Keep all Wheel It! Records navigation on established public routes.
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
const buttons = [...document.querySelectorAll("[data-audio]")];
let currentButton = null;
let currentSources = [];
let sourceIndex = 0;
let pendingPlay = false;

function resetButtons() {
  buttons.forEach(button => {
    button.textContent = "▶";
    button.setAttribute("aria-label", `Play ${button.dataset.title || "track"}`);
  });
}

function loadSource(index) {
  if (!audio || !currentSources[index]) return false;
  sourceIndex = index;
  audio.src = currentSources[index];
  audio.load();
  return true;
}

async function attemptPlayback() {
  if (!audio) return;

  try {
    setStatus("Loading audio…");
    await audio.play();
    pendingPlay = false;
    setStatus("Playing");
  } catch (error) {
    if (sourceIndex + 1 < currentSources.length) {
      loadSource(sourceIndex + 1);
      return attemptPlayback();
    }

    pendingPlay = false;
    resetButtons();
    setStatus("This audio could not be streamed. Confirm the Google Drive file is shared with anyone who has the link.", true);
    console.error("Audio playback failed across all Drive URL formats", error);
  }
}

buttons.forEach(button => {
  button.addEventListener("click", async () => {
    if (!audio) return;

    const originalUrl = button.dataset.audio;
    const title = button.dataset.title || "Track";
    const isCurrent = currentButton === button;

    if (isCurrent && !audio.paused) {
      audio.pause();
      return;
    }

    if (!isCurrent) {
      currentButton = button;
      currentSources = audioCandidates(originalUrl);
      sourceIndex = 0;
      resetButtons();

      const nowPlaying = document.querySelector("#now-playing");
      if (nowPlaying) nowPlaying.textContent = title;

      loadSource(0);
    }

    pendingPlay = true;
    await attemptPlayback();
  });
});

if (audio) {
  audio.setAttribute("playsinline", "");

  audio.addEventListener("play", () => {
    if (currentButton) {
      currentButton.textContent = "❚❚";
      currentButton.setAttribute("aria-label", `Pause ${currentButton.dataset.title || "track"}`);
    }
  });

  audio.addEventListener("pause", () => {
    if (currentButton) {
      currentButton.textContent = "▶";
      currentButton.setAttribute("aria-label", `Play ${currentButton.dataset.title || "track"}`);
    }
    if (!audio.ended && !pendingPlay) setStatus("Paused");
  });

  audio.addEventListener("ended", () => {
    resetButtons();
    setStatus("Playback complete");
  });

  audio.addEventListener("canplay", () => {
    if (pendingPlay && audio.paused) attemptPlayback();
  });

  audio.addEventListener("error", () => {
    if (sourceIndex + 1 < currentSources.length) {
      loadSource(sourceIndex + 1);
      if (pendingPlay) attemptPlayback();
      return;
    }

    pendingPlay = false;
    resetButtons();
    setStatus("Playback unavailable. Check that the Drive audio file is public and is a supported MP3, WAV, M4A or AAC file.", true);
  });
}

document.querySelector("#share")?.addEventListener("click", async () => {
  const data = { title: document.title, url: location.href };

  try {
    if (navigator.share) {
      await navigator.share(data);
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(location.href);
      setStatus("Page link copied");
    } else {
      window.prompt("Copy this page link:", location.href);
    }
  } catch (_) {}
});

setStatus(buttons.length ? "Ready to play" : "No audio has been added to this release yet.", buttons.length === 0);