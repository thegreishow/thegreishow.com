(() => {
  const CHECKOUT_URL = "https://dkvbeizjlgxqjuxnlqho.supabase.co/functions/v1/create-music-support-checkout";
  const RELEASE_KEYS = {
    "no-drama": "no-drama",
    "dark-side": "dark-side-of-the-moon",
    "psy-phi": "psy-phi",
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

  repairArtwork();
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

  function artworkPlaceholder(img) {
    const card = img.closest("[data-release]");
    const releaseTitle = card?.querySelector("h3")?.textContent?.trim() || img.alt?.replace(/\s+(album|ep|single)?\s*cover.*$/i, "").trim() || "The Grei Show";
    const safeTitle = releaseTitle.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#141824"/><stop offset="1" stop-color="#05070b"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/><circle cx="400" cy="330" r="170" fill="none" stroke="#ffffff" stroke-opacity=".16" stroke-width="3"/><text x="400" y="320" fill="#ffffff" font-family="Arial,sans-serif" font-size="34" font-weight="700" text-anchor="middle">THE GREI SHOW</text><text x="400" y="382" fill="#ffffff" fill-opacity=".72" font-family="Arial,sans-serif" font-size="26" text-anchor="middle">${safeTitle}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  async function repairArtwork() {
    const images = [...document.querySelectorAll("img[data-art-id],img[data-search-art]")];
    await Promise.all(images.map(async (img) => {
      const placeholder = artworkPlaceholder(img);
      img.onerror = () => {
        img.onerror = null;
        img.src = placeholder;
      };
      if (!img.src || img.src.includes("assets/img/no-drama.webp") || img.src.includes("00000000-0000-0000")) img.src = placeholder;
      try {
        const query = img.dataset.artId
          ? `https://itunes.apple.com/lookup?id=${encodeURIComponent(img.dataset.artId)}&entity=album`
          : `https://itunes.apple.com/search?term=${encodeURIComponent(img.dataset.searchArt || img.alt)}&entity=album&limit=1`;
        const response = await fetch(query);
        if (!response.ok) return;
        const data = await response.json();
        const item = data.results?.find((result) => result.artworkUrl100);
        if (item?.artworkUrl100) img.src = item.artworkUrl100.replace("100x100bb", "800x800bb");
      } catch (error) {
        console.warn("Artwork lookup unavailable", error);
      }
    }));
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
    button.textContent = "Name your price · download";
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