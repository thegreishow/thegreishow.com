(() => {
  const cfg = window.WHITE_LINE_SUPABASE || {};
  const host = document.getElementById("profile-host");
  if (!host || !window.supabase?.createClient || !cfg.url || !cfg.anonKey) return;

  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("id");
  const pathSlug = decodeURIComponent(window.location.pathname.replace(/^\/+|\/+$/g, ""));
  const requestedSlug = params.get("slug") || (
    pathSlug && !["whiteline-profile", "whiteline-profile.html"].includes(pathSlug)
      ? pathSlug.toLowerCase()
      : null
  );

  if (!requestedId && !requestedSlug) {
    host.innerHTML = '<div class="empty">This profile is unavailable.</div>';
    return;
  }

  const db = window.supabase.createClient(cfg.url, cfg.anonKey);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

  const setMeta = (property, content) => {
    let node = document.head.querySelector(`[property="${property}"],meta[name="${property}"]`);
    if (!node) {
      node = document.createElement("meta");
      if (property.startsWith("og:")) node.setAttribute("property", property);
      else node.name = property;
      document.head.appendChild(node);
    }
    node.content = content;
  };

  const normalizeExternalUrl = (value, network = "") => {
    let raw = String(value || "").trim();
    if (!raw) return null;

    const username = raw.replace(/^@/, "").replace(/^\/+|\/+$/g, "");
    if (!/^https?:\/\//i.test(raw)) {
      if (network === "TikTok") raw = `https://www.tiktok.com/@${username}`;
      else if (network === "Instagram") raw = `https://www.instagram.com/${username}`;
      else if (network === "X") raw = `https://x.com/${username}`;
      else if (network === "YouTube" && !raw.includes("/")) raw = `https://www.youtube.com/@${username}`;
      else raw = `https://${raw}`;
    }

    try {
      const url = new URL(raw);
      if (!['http:', 'https:'].includes(url.protocol)) return null;
      if (network === "TikTok" && /(^|\.)tiktok\.com$/i.test(url.hostname)) url.hostname = "www.tiktok.com";
      return url.toString();
    } catch {
      return null;
    }
  };

  let query = db.from("talent_profiles").select("*").eq("status", "approved");
  query = requestedId ? query.eq("id", requestedId) : query.eq("slug", requestedSlug);

  query.maybeSingle().then(({ data, error }) => {
    if (error || !data) {
      host.innerHTML = '<div class="empty">This profile is unavailable.</div>';
      return;
    }

    const name = data.stage_name || data.full_name;
    const image = normalizeExternalUrl(data.body_image_url || data.profile_image_url) || "https://thegreishow.xo.je/photos/jamaica1.jpg";
    const category = [data.category, ...(data.secondary_categories || [])].filter(Boolean).join(" · ");
    const description = data.short_bio || "Professional talent represented by White Line Entertainment.";
    const canonicalPath = data.slug ? `/${encodeURIComponent(data.slug)}` : `/whiteline-profile?id=${encodeURIComponent(data.id)}`;
    const canonicalUrl = `${window.location.origin}${canonicalPath}`;

    if (data.slug && window.location.pathname !== canonicalPath) {
      window.history.replaceState({}, "", canonicalPath);
    }

    document.title = `${name} | White Line Entertainment`;
    const canonical = document.querySelector('link[rel="canonical"]') || document.head.appendChild(document.createElement("link"));
    canonical.rel = "canonical";
    canonical.href = canonicalUrl;

    setMeta("description", `View ${name}, an approved White Line Entertainment talent profile.`);
    setMeta("og:title", `${name} | White Line Entertainment`);
    setMeta("og:description", description);
    setMeta("og:type", "profile");
    setMeta("og:image", image);
    setMeta("og:url", canonicalUrl);
    setMeta("twitter:card", "summary_large_image");

    const socialItems = [
      ["Instagram", data.instagram_url],
      ["TikTok", data.tiktok_url],
      ["YouTube", data.youtube_url],
      ["Facebook", data.facebook_url],
      ["X", data.x_url],
      ["Website", data.website_url],
      ["Portfolio / reel", data.portfolio_url]
    ];
    const sameAs = socialItems.map(([label, url]) => normalizeExternalUrl(url, label)).filter(Boolean);

    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      name,
      description,
      image,
      url: canonicalUrl,
      sameAs,
      jobTitle: category,
      affiliation: { "@type": "Organization", name: "White Line Entertainment" }
    });
    document.head.appendChild(schema);

    const links = socialItems.map(([label, url]) => externalLink(url, label)).join("");
    const bookingUrl = `/whiteline?talent=${encodeURIComponent(name)}&talent_id=${encodeURIComponent(data.id)}#book`;

    host.innerHTML = `
      <div class="profile-hero">
        <img class="profile-portrait" src="${escapeHtml(image)}" alt="${escapeHtml(name)}">
        <div>
          <p class="kicker">${escapeHtml(category)}</p>
          <h1 class="title">${escapeHtml(name)}</h1>
          <p class="lead">${escapeHtml(description)}</p>
          <div class="profile-facts">
            <div class="profile-fact"><span>Based in</span><strong>${escapeHtml([data.city, data.country].filter(Boolean).join(", ") || "On request")}</strong></div>
            <div class="profile-fact"><span>Availability</span><strong>${escapeHtml(data.availability_status || "Available")}</strong></div>
            <div class="profile-fact"><span>Representation</span><strong>White Line Entertainment</strong></div>
            <div class="profile-fact"><span>Agency commission</span><strong>15%</strong></div>
          </div>
          <div class="profile-links">
            ${links}
            <a class="button primary" href="${bookingUrl}">Request talent</a>
          </div>
        </div>
      </div>`;
  });

  function externalLink(value, label) {
    const url = normalizeExternalUrl(value, label);
    return url
      ? `<a class="button" target="_blank" rel="noopener noreferrer" href="${escapeHtml(url)}">${escapeHtml(label)}</a>`
      : "";
  }
})();
