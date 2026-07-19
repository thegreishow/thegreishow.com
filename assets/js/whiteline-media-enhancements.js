(() => {
  const config = window.WHITE_LINE_SUPABASE || {};
  if (!window.supabase?.createClient || !config.url || !config.anonKey) return;
  const db = window.supabase.createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const ready = (fn) => document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", fn, { once: true })
    : fn();

  ready(() => {
    injectStyles();
    enhanceTalentApplication();
    loadEnhancedDirectory();
    bindProfileModal();
  });

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .wl-upload-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .wl-upload-box{display:grid;gap:8px;padding:16px;border:1px dashed rgba(255,255,255,.22);border-radius:16px;background:rgba(255,255,255,.025)}
      .wl-upload-box strong{color:#f5f7fb}.wl-upload-box small{color:#9eabba;line-height:1.45}
      .wl-social-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .profile-photo-stage{position:relative;margin-top:16px;border-radius:20px;overflow:hidden;background:#101925}
      .profile-photo-stage img{display:block;width:100%;height:min(58vh,560px);object-fit:contain;background:#050a12}
      .profile-photo-switch{display:flex;gap:8px;margin-top:12px}
      .profile-photo-switch button{min-height:42px;padding:0 15px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.04);color:#f5f7fb;font-weight:850;cursor:pointer}
      .profile-photo-switch button.active{border-color:#d8ff63;background:#d8ff63;color:#071018}
      .profile-socials{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:20px}
      .profile-social-card{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 15px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.035);text-decoration:none;font-weight:850}
      .profile-social-card span{color:#9eabba;font-size:.78rem;font-weight:700}
      .talent-card-socials{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}
      .talent-card-socials a{padding:6px 9px;border:1px solid rgba(255,255,255,.12);border-radius:999px;color:#d8ff63;font-size:.7rem;font-weight:850;text-decoration:none}
      @media(max-width:620px){.wl-upload-grid,.wl-social-grid,.profile-socials{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function enhanceTalentApplication() {
    const form = document.getElementById("talent-form");
    const grid = form?.querySelector(".wl-form-grid");
    const bioField = form?.querySelector("#bio")?.closest(".wl-field");
    if (!form || !grid || !bioField || form.dataset.mediaEnhanced) return;
    form.dataset.mediaEnhanced = "true";

    const uploads = document.createElement("div");
    uploads.className = "wl-field full";
    uploads.innerHTML = `
      <label>Profile photos</label>
      <div class="wl-upload-grid">
        <label class="wl-upload-box"><strong>Headshot</strong><input name="headshot_file" type="file" accept="image/jpeg,image/png,image/webp" required><small>Clear face-forward photo. JPG, PNG or WebP, maximum 8 MB.</small></label>
        <label class="wl-upload-box"><strong>Full body shot</strong><input name="bodyshot_file" type="file" accept="image/jpeg,image/png,image/webp" required><small>Full-length photo with good lighting. JPG, PNG or WebP, maximum 8 MB.</small></label>
      </div>`;

    const socials = document.createElement("div");
    socials.className = "wl-field full";
    socials.innerHTML = `
      <label>Social and professional links</label>
      <div class="wl-social-grid">
        <input name="instagram_url" type="url" placeholder="Instagram URL">
        <input name="tiktok_url" type="url" placeholder="TikTok URL">
        <input name="youtube_url" type="url" placeholder="YouTube URL">
        <input name="facebook_url" type="url" placeholder="Facebook URL">
        <input name="x_url" type="url" placeholder="X / Twitter URL">
        <input name="website_url" type="url" placeholder="Website URL">
      </div>`;

    grid.insertBefore(uploads, bioField);
    grid.insertBefore(socials, bioField);
    const portfolio = form.querySelector("#portfolio");
    if (portfolio) {
      portfolio.required = false;
      portfolio.placeholder = "Portfolio, reel, Linktree, EPK or other professional link";
      portfolio.closest(".wl-field")?.querySelector("label")?.replaceChildren(document.createTextNode("Portfolio / reel link"));
    }

    form.onsubmit = submitEnhancedApplication;
  }

  async function submitEnhancedApplication(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.getElementById("talent-message");
    const button = form.querySelector("button[type='submit']");
    const data = new FormData(form);
    const disciplines = [...form.querySelectorAll("[name='discipline']:checked")].map((input) => input.value);
    if (!disciplines.length) return show(message, "Select at least one discipline.", true);

    const headshot = data.get("headshot_file");
    const bodyshot = data.get("bodyshot_file");
    try {
      validateImage(headshot, "Headshot");
      validateImage(bodyshot, "Full body shot");
      setBusy(button, true, "Uploading photos…");
      const submissionId = crypto.randomUUID();
      const headshotPath = await uploadPrivateImage(headshot, submissionId, "headshot");
      const bodyshotPath = await uploadPrivateImage(bodyshot, submissionId, "bodyshot");

      setBusy(button, true, "Submitting application…");
      const location = text(data, "location");
      const { error } = await db.from("talent_applications").insert({
        casting_call_id: uuidOrNull(text(data, "castingInterest")),
        full_name: text(data, "name"),
        stage_name: nullable(data, "stage"),
        email: text(data, "email"),
        phone: text(data, "phone"),
        whatsapp: text(data, "phone"),
        category: disciplines[0],
        secondary_categories: disciplines.slice(1),
        city: location || null,
        experience: text(data, "experience") ? `${text(data, "experience")} year(s)` : null,
        biography: text(data, "bio"),
        skills: text(data, "credits") || null,
        portfolio_url: nullable(data, "portfolio"),
        instagram_url: nullable(data, "instagram_url"),
        tiktok_url: nullable(data, "tiktok_url"),
        youtube_url: nullable(data, "youtube_url"),
        facebook_url: nullable(data, "facebook_url"),
        x_url: nullable(data, "x_url"),
        website_url: nullable(data, "website_url"),
        headshot_url: headshotPath,
        full_body_photo_url: bodyshotPath,
        consent_to_store_data: data.get("consent") === "on",
        consent_to_contact: data.get("consent") === "on",
        status: "new",
        source: "website"
      });
      if (error) throw error;
      form.reset();
      localStorage.removeItem("whiteLineDraft:talent");
      show(message, "Application and photos received. White Line will review your profile and contact you if more information is needed.", false);
    } catch (error) {
      console.error(error);
      show(message, error.message || "The application could not be submitted.", true);
    } finally {
      setBusy(button, false, "Submit application");
    }
  }

  async function uploadPrivateImage(file, submissionId, label) {
    const ext = extension(file.name, file.type);
    const path = `applications/${submissionId}/${label}.${ext}`;
    const { error } = await db.storage.from("talent-submissions").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });
    if (error) throw new Error(`${label} upload failed: ${error.message}`);
    return path;
  }

  async function loadEnhancedDirectory() {
    const { data, error } = await db.from("talent_profiles")
      .select("id,slug,full_name,stage_name,category,secondary_categories,city,parish,country,profile_image_url,body_image_url,short_bio,full_bio,skills,instagram_url,tiktok_url,youtube_url,facebook_url,x_url,website_url,portfolio_url,featured,display_order")
      .eq("status", "approved")
      .order("featured", { ascending: false })
      .order("display_order", { ascending: true });
    if (error) return console.warn("Enhanced roster could not load", error);

    const talent = (data || []).map((row) => ({
      id: row.slug || row.id,
      dbId: row.id,
      name: row.stage_name || row.full_name,
      disciplines: [row.category, ...(row.secondary_categories || [])].filter(Boolean),
      location: [row.city, row.parish, row.country].filter(Boolean).join(", "),
      headshot: row.profile_image_url,
      bodyshot: row.body_image_url,
      bio: row.full_bio || row.short_bio,
      skills: row.skills || [],
      featured: row.featured,
      socials: {
        Instagram: row.instagram_url,
        TikTok: row.tiktok_url,
        YouTube: row.youtube_url,
        Facebook: row.facebook_url,
        X: row.x_url,
        Website: row.website_url,
        "Portfolio / Reel": row.portfolio_url
      }
    }));
    window.WHITE_LINE_ENHANCED_TALENT = talent;
    renderEnhancedCards(talent);
  }

  function renderEnhancedCards(talent) {
    const grid = document.getElementById("talent-grid");
    const count = document.getElementById("talent-count");
    if (!grid) return;
    if (count) count.textContent = `${talent.length} profile${talent.length === 1 ? "" : "s"}`;
    grid.innerHTML = talent.length ? talent.map((item) => {
      const quickSocials = Object.entries(item.socials).filter(([, url]) => url).slice(0, 3);
      return `<article class="talent-card" tabindex="0" role="button" data-enhanced-profile="${esc(item.id)}"><img class="talent-image" src="${esc(item.headshot || item.bodyshot || "assets/img/home-bg.webp")}" alt="${esc(item.name)}"><div class="talent-body"><h3>${esc(item.name)}</h3><div class="talent-meta">${esc(item.location || "Jamaica")}</div><div class="tags">${item.disciplines.map((tag) => `<span class="tag">${esc(tag)}</span>`).join("")}</div>${quickSocials.length ? `<div class="talent-card-socials">${quickSocials.map(([label, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${esc(label)}</a>`).join("")}</div>` : ""}</div></article>`;
    }).join("") : `<div class="empty-state"><strong>The curated roster is being prepared.</strong>Approved talent profiles will appear here.</div>`;
  }

  function bindProfileModal() {
    document.addEventListener("click", (event) => {
      const card = event.target.closest("[data-enhanced-profile]");
      if (!card || event.target.closest("a")) return;
      const item = (window.WHITE_LINE_ENHANCED_TALENT || []).find((x) => x.id === card.dataset.enhancedProfile);
      if (item) openProfile(item);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const card = event.target.closest?.("[data-enhanced-profile]");
      if (!card) return;
      event.preventDefault();
      card.click();
    });
  }

  function openProfile(item) {
    const modal = document.getElementById("profile-modal");
    const host = document.getElementById("modal-content");
    if (!modal || !host) return;
    const photos = [
      item.headshot && { label: "Headshot", url: item.headshot },
      item.bodyshot && { label: "Body shot", url: item.bodyshot }
    ].filter(Boolean);
    const socials = Object.entries(item.socials).filter(([, url]) => url);
    host.innerHTML = `
      <p class="wl-kicker">White Line talent</p><h2 class="wl-heading" style="font-size:clamp(2rem,6vw,4rem)">${esc(item.name)}</h2>
      <p class="talent-meta">${esc(item.location || "Jamaica")} · ${esc(item.disciplines.join(" · "))}</p>
      ${photos.length ? `<div class="profile-photo-stage"><img id="profile-active-photo" src="${esc(photos[0].url)}" alt="${esc(item.name)} ${esc(photos[0].label)}"></div>${photos.length > 1 ? `<div class="profile-photo-switch">${photos.map((photo, i) => `<button class="${i === 0 ? "active" : ""}" data-profile-photo="${esc(photo.url)}" data-label="${esc(photo.label)}">${esc(photo.label)}</button>`).join("")}</div>` : ""}` : ""}
      ${item.bio ? `<p class="wl-copy">${esc(item.bio)}</p>` : ""}
      ${item.skills.length ? `<div class="tags">${item.skills.map((skill) => `<span class="tag">${esc(skill)}</span>`).join("")}</div>` : ""}
      ${socials.length ? `<div class="profile-socials">${socials.map(([label, url]) => `<a class="profile-social-card" href="${esc(url)}" target="_blank" rel="noopener"><strong>${esc(label)}</strong><span>Open ↗</span></a>`).join("")}</div>` : ""}`;
    modal.hidden = false;
    host.querySelectorAll("[data-profile-photo]").forEach((button) => button.addEventListener("click", () => {
      const image = host.querySelector("#profile-active-photo");
      if (image) {
        image.src = button.dataset.profilePhoto;
        image.alt = `${item.name} ${button.dataset.label}`;
      }
      host.querySelectorAll("[data-profile-photo]").forEach((x) => x.classList.toggle("active", x === button));
    }));
  }

  function validateImage(file, label) {
    if (!(file instanceof File) || !file.size) throw new Error(`${label} is required.`);
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error(`${label} must be JPG, PNG or WebP.`);
    if (file.size > 8 * 1024 * 1024) throw new Error(`${label} must be smaller than 8 MB.`);
  }
  function extension(name, type) { return (name.split('.').pop() || ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[type]) || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'; }
  function uuidOrNull(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null; }
  function text(data, name) { return String(data.get(name) || "").trim(); }
  function nullable(data, name) { return text(data, name) || null; }
  function setBusy(button, busy, label) { if (button) { button.disabled = busy; button.textContent = label; } }
  function show(element, message, error) { if (element) { element.hidden = false; element.dataset.state = error ? "error" : "success"; element.textContent = message; element.scrollIntoView({ behavior: "smooth", block: "nearest" }); } }
  function esc(value) { return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
})();