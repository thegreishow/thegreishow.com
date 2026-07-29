(() => {
  const CHECKOUT_URL = "https://dkvbeizjlgxqjuxnlqho.supabase.co/functions/v1/create-music-support-checkout";
  const RELEASE_KEYS = {
    "no-drama": "no-drama",
    "pineapples": "pineapples-and-hot-sauce",
    "ppp-remix": "puff-puff-pass-remix-feat-bay-c",
    "game-hearts": "game-of-hearts",
    "puff-pass": "puff-puff-pass",
    "vibe": "the-vibe",
    "joy": "joy",
  };
  let releases = new Map();
  let selected = null;
  let lastFocus = null;

  const modal = document.getElementById("support-modal");
  const form = document.getElementById("support-form");
  const title = document.getElementById("support-title");
  const amount = document.getElementById("support-amount");
  const message = document.getElementById("support-message");
  const paypal = document.getElementById("support-paypal");
  const free = document.getElementById("support-free");

  if (!modal || !form) return;

  init();

  async function init() {
    try {
      const response = await fetch("/assets/data/promo-releases.json", { cache: "no-store" });
      const data = response.ok ? await response.json() : [];
      releases = new Map(data.filter(isDownloadable).map((release) => [release.slug, release]));
      addCatalogueButtons();
      wireButtons();
      handleReturn();
    } catch (error) {
      console.warn("Music support catalogue unavailable", error);
      wireButtons();
    }
  }

  function isDownloadable(release) {
    const tracks = Array.isArray(release?.tracks) ? release.tracks : [];
    return release?.status === "published" &&
      ((release.audio_url && !String(release.audio_url).includes("/folders/")) || tracks.some((track) => track?.url));
  }

  function addCatalogueButtons() {
    document.querySelectorAll("[data-release]").forEach((card) => {
      const slug = RELEASE_KEYS[card.dataset.release];
      const release = releases.get(slug);
      if (!release || card.querySelector(".support-trigger")) return;
      const button = supportButton(release);
      const row = card.querySelector(".button-row");
      if (row) row.appendChild(button);
      else {
        const portal = card.querySelector(".open-portal");
        if (!portal) return;
        const actions = document.createElement("div");
        actions.className = "catalogue-actions";
        portal.before(actions);
        actions.append(portal, button);
      }
    });
  }

  function supportButton(release) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "music-cta support-trigger";
    button.dataset.slug = release.slug;
    button.dataset.title = release.title || release.slug;
    button.textContent = "Support + download";
    return button;
  }

  function wireButtons() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest(".support-trigger");
      if (trigger) {
        event.preventDefault();
        event.stopPropagation();
        openModal(trigger.dataset.slug, trigger.dataset.title, trigger);
      }
    });
    modal.querySelector(".support-close").addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modal.classList.contains("open")) closeModal(); });
    free.addEventListener("click", () => startDownload(selected));
    form.addEventListener("submit", beginCheckout);
  }

  function openModal(slug, releaseTitle, trigger) {
    selected = releases.get(slug) || { slug, title: releaseTitle || "Music download", audio_url: slug === "no-drama" ? "/assets/audio/music/no-drama.mp3" : "" };
    lastFocus = trigger || document.activeElement;
    title.textContent = selected.title || releaseTitle || "Name your price";
    amount.value = "3";
    message.textContent = "Enter $0 for a free download, or leave a contribution through PayPal.";
    paypal.disabled = false;
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    amount.focus();
  }

  function closeModal() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
    lastFocus?.focus?.();
  }

  async function beginCheckout(event) {
    event.preventDefault();
    const value = Number(amount.value);
    if (!Number.isFinite(value) || value < 0 || value > 500) {
      message.textContent = "Enter an amount from $0 to $500 USD.";
      return;
    }
    if (value === 0) {
      startDownload(selected);
      return;
    }
    if (value < 1) {
      message.textContent = "PayPal contributions start at $1. Choose $0 to download free.";
      return;
    }
    paypal.disabled = true;
    message.textContent = "Opening secure PayPal checkout…";
    try {
      const response = await fetch(CHECKOUT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: selected.slug, amount: value, website: "" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || "PayPal checkout is unavailable.");
      location.href = data.url;
    } catch (error) {
      message.textContent = error.message || "PayPal checkout is unavailable. You can still download free.";
      paypal.disabled = false;
    }
  }

  function startDownload(release) {
    if (!release) return;
    const tracks = Array.isArray(release.tracks) ? release.tracks.filter((track) => track?.url) : [];
    if (tracks.length > 1) {
      location.href = `/promo/${encodeURIComponent(release.slug)}/#project-section`;
      return;
    }
    const href = release.slug === "no-drama" && !releases.has("no-drama")
      ? "/assets/audio/music/no-drama.mp3"
      : `/api/media?slug=${encodeURIComponent(release.slug)}&type=${tracks.length ? "track" : "audio"}&index=0&download=1`;
    const link = document.createElement("a");
    link.href = href;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
    message.textContent = "Download started. Thank you for listening.";
  }

  function handleReturn() {
    const params = new URLSearchParams(location.search);
    const status = params.get("support");
    const slug = params.get("slug");
    if (!status || !slug) return;
    const release = releases.get(slug);
    if (status === "thanks" && release) {
      openModal(slug, release.title, null);
      message.textContent = "Thank you for supporting The Grei Show. Your download is starting.";
      startDownload(release);
    } else if (status === "cancelled") {
      openModal(slug, release?.title || "Music download", null);
      message.textContent = "No payment was made. The free download is still available.";
    }
    history.replaceState({}, "", location.pathname + location.hash);
  }
})();
