const LOGO_URL = "https://drive.google.com/thumbnail?id=1P3YUzpVek_ybKq_8Kii8uRjH5gsbJ6JZ&sz=w1000";

function directDriveMedia(url) {
  const match = url.match(/[?&]id=([^&]+)/);
  if (!match) return url;
  return `https://drive.usercontent.google.com/download?id=${match[1]}&export=download&confirm=t`;
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

// Present each release as a polished commercial label page.
document.querySelectorAll(".hero .lede").forEach(el => {
  el.textContent = "An official Wheel It! Records release—crafted in Kingston, Jamaica and presented for media, DJs, selectors and industry partners.";
});
document.querySelectorAll(".grid .card").forEach((card, index) => {
  if (index % 2 === 0) {
    const eyebrow = card.querySelector(".eyebrow");
    const heading = card.querySelector("h2");
    const body = card.querySelector(".muted");
    if (eyebrow) eyebrow.textContent = "Release Overview";
    if (heading) heading.textContent = "Forward sound. Global intent.";
    if (body) body.textContent = "Wheel It! Records develops distinctive Jamaican music for audiences worldwide, combining authentic creative direction with professional release execution.";
  } else {
    const eyebrow = card.querySelector(".eyebrow");
    const heading = card.querySelector("h2");
    if (eyebrow) eyebrow.textContent = "Label Credits";
    if (heading) heading.textContent = "Wheel It! Records";
    card.querySelectorAll(".actions").forEach(actions => actions.remove());
  }
});

const audio = document.querySelector("#audio");
let currentButton = null;

document.querySelectorAll("[data-audio]").forEach(btn => {
  btn.dataset.audio = directDriveMedia(btn.dataset.audio);
  btn.addEventListener("click", async () => {
    const src = btn.dataset.audio;
    const title = btn.dataset.title;
    if (!audio) return;

    if (audio.src !== src) {
      audio.src = src;
      audio.load();
      const nowPlaying = document.querySelector("#now-playing");
      if (nowPlaying) nowPlaying.textContent = title;
      if (currentButton) currentButton.textContent = "▶";
      currentButton = btn;
    }

    try {
      if (audio.paused) {
        await audio.play();
        btn.textContent = "❚❚";
      } else {
        audio.pause();
      }
    } catch (error) {
      btn.textContent = "▶";
      const status = document.querySelector("#player-status");
      if (status) status.textContent = "Playback unavailable. Please refresh and try again.";
      console.error("Audio playback failed", error);
    }
  });
});

if (audio) {
  audio.addEventListener("pause", () => { if (currentButton) currentButton.textContent = "▶"; });
  audio.addEventListener("play", () => { if (currentButton) currentButton.textContent = "❚❚"; });
  audio.addEventListener("error", () => {
    const status = document.querySelector("#player-status");
    if (status) status.textContent = "Playback unavailable. Please refresh and try again.";
  });
}

document.querySelector("#share")?.addEventListener("click", async () => {
  const data = { title: document.title, url: location.href };
  try {
    if (navigator.share) await navigator.share(data);
    else {
      await navigator.clipboard.writeText(location.href);
      alert("Link copied");
    }
  } catch (_) {}
});