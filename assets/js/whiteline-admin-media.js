(() => {
  const config = window.WHITE_LINE_SUPABASE || {};
  if (!window.supabase?.createClient) return;
  const db = window.WHITE_LINE_DB || window.supabase.createClient(config.url, config.anonKey);
  const form = document.getElementById("talent-profile-form");
  if (!form) return;

  const old = form.cloneNode(true);
  form.replaceWith(old);
  const profileForm = document.getElementById("talent-profile-form");
  const headshotInput = profileForm.elements.profile_image_file;
  const bodyshotInput = profileForm.elements.body_image_file;
  const preview = document.getElementById("profile-image-preview");
  const bodyPreview = document.getElementById("body-image-preview");

  headshotInput?.addEventListener("change", () => previewFile(headshotInput, preview));
  bodyshotInput?.addEventListener("change", () => previewFile(bodyshotInput, bodyPreview));
  profileForm.addEventListener("submit", saveProfile);

  const applications = document.getElementById("applications");
  const roster = document.getElementById("talent-profiles");
  const refresh = () => setTimeout(decorate, 250);
  document.querySelectorAll("[data-refresh]").forEach((button) => button.addEventListener("click", refresh));
  new MutationObserver(refresh).observe(applications, { childList: true });
  new MutationObserver(refresh).observe(roster, { childList: true });
  setTimeout(decorate, 800);

  async function saveProfile(event) {
    event.preventDefault();
    const submitButton = profileForm.querySelector('[type="submit"]');
    const originalLabel = submitButton?.textContent || "Save talent profile";
    const data = new FormData(profileForm);
    const fullName = text(data, "full_name");
    const slug = slugify(text(data, "stage_name") || fullName) + "-" + Date.now().toString().slice(-5);
    const headshot = data.get("profile_image_file");
    const bodyshot = data.get("body_image_file");
    const status = document.getElementById("talent-profile-status");

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Saving…";
      }
      await requireAdminSession();
      show(status, headshot?.size || bodyshot?.size ? "Uploading photos…" : "Saving talent profile…");
      const headshotUrl = headshot?.size ? await upload(headshot, slug, "headshot") : nullable(data, "profile_image_url");
      const bodyshotUrl = bodyshot?.size ? await upload(bodyshot, slug, "bodyshot") : nullable(data, "body_image_url");
      const { error } = await db.from("talent_profiles").insert({
        full_name: fullName,
        stage_name: nullable(data, "stage_name"),
        slug,
        category: text(data, "category"),
        short_bio: text(data, "short_bio"),
        city: nullable(data, "city"),
        profile_image_url: headshotUrl,
        body_image_url: bodyshotUrl,
        instagram_url: nullable(data, "instagram_url"),
        tiktok_url: nullable(data, "tiktok_url"),
        youtube_url: nullable(data, "youtube_url"),
        facebook_url: nullable(data, "facebook_url"),
        x_url: nullable(data, "x_url"),
        website_url: nullable(data, "website_url"),
        portfolio_url: nullable(data, "portfolio_url"),
        status: text(data, "status") || "draft",
        featured: text(data, "featured") === "true"
      });
      if (error) throw error;
      profileForm.reset();
      preview.hidden = true;
      preview.removeAttribute("src");
      bodyPreview.hidden = true;
      bodyPreview.removeAttribute("src");
      show(status, "Talent profile and both photo slots saved.");
      document.querySelector("[data-refresh]")?.click();
    } catch (error) {
      show(status, friendlyError(error));
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  }

  async function requireAdminSession() {
    const { data: { session }, error: sessionError } = await db.auth.getSession();
    if (sessionError || !session?.user) throw new Error("ADMIN_SESSION_REQUIRED");
    const { data: membership, error: membershipError } = await db
      .from("whiteline_admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (membershipError || !membership) throw new Error("ADMIN_ACCESS_REQUIRED");
    return session;
  }

  async function upload(file, slug, label) {
    validate(file, label);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `profiles/${slug}/${label}.${ext}`;
    const { error } = await db.storage.from("talent-media").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
    if (error) throw error;
    return db.storage.from("talent-media").getPublicUrl(path).data.publicUrl;
  }

  async function decorate() {
    const { data: apps } = await db.from("talent_applications").select("full_name,stage_name,headshot_url,full_body_photo_url,instagram_url,tiktok_url,youtube_url,facebook_url,x_url,website_url").order("created_at", { ascending: false });
    const appCards = [...applications.querySelectorAll(".card")];
    for (let i = 0; i < Math.min(appCards.length, apps?.length || 0); i++) {
      if (appCards[i].dataset.mediaDecorated) continue;
      appCards[i].dataset.mediaDecorated = "true";
      const links = appCards[i].querySelector(".contact-links") || appCards[i];
      const head = await signed(apps[i].headshot_url);
      const body = await signed(apps[i].full_body_photo_url);
      if (head) links.insertAdjacentHTML("beforeend", button(head, "Headshot"));
      if (body) links.insertAdjacentHTML("beforeend", button(body, "Body shot"));
      links.insertAdjacentHTML("beforeend", socials(apps[i]));
    }

    const { data: profiles } = await db.from("talent_profiles").select("profile_image_url,body_image_url,instagram_url,tiktok_url,youtube_url,facebook_url,x_url,website_url").order("created_at", { ascending: false });
    const rosterCards = [...roster.querySelectorAll(".card")];
    for (let i = 0; i < Math.min(rosterCards.length, profiles?.length || 0); i++) {
      if (rosterCards[i].dataset.mediaDecorated) continue;
      rosterCards[i].dataset.mediaDecorated = "true";
      const links = rosterCards[i].querySelector(".contact-links") || rosterCards[i];
      if (profiles[i].profile_image_url) links.insertAdjacentHTML("beforeend", button(profiles[i].profile_image_url, "Headshot"));
      if (profiles[i].body_image_url) links.insertAdjacentHTML("beforeend", button(profiles[i].body_image_url, "Body shot"));
      links.insertAdjacentHTML("beforeend", socials(profiles[i]));
    }
  }

  async function signed(path) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const { data } = await db.storage.from("talent-submissions").createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  }

  function friendlyError(error) {
    const message = String(error?.message || error || "");
    if (message === "ADMIN_SESSION_REQUIRED" || /jwt|session|not authenticated/i.test(message)) {
      return "Your admin session expired. Sign out, sign back in, and try again.";
    }
    if (message === "ADMIN_ACCESS_REQUIRED" || /row-level security|rls|42501/i.test(message)) {
      return "Supabase did not recognize this save as an authorized admin action. Sign out, sign back in, then retry. Your form was not published.";
    }
    return message || "Could not save profile.";
  }

  function socials(row) {
    return [["Instagram",row.instagram_url],["TikTok",row.tiktok_url],["YouTube",row.youtube_url],["Facebook",row.facebook_url],["X",row.x_url],["Website",row.website_url]].filter(([,url]) => url).map(([label,url]) => button(url,label)).join("");
  }
  function button(url, label) { return `<a class="button" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`; }
  function previewFile(input, image) { const file = input.files?.[0]; if (!file) { image.hidden = true; image.removeAttribute("src"); return; } image.src = URL.createObjectURL(file); image.hidden = false; }
  function validate(file, label) { if (!["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error(`${label} must be JPG, PNG or WebP.`); if (file.size > 8*1024*1024) throw new Error(`${label} must be under 8 MB.`); }
  function show(element, message) { element.hidden = false; element.textContent = message; }
  function text(data, name) { return String(data.get(name) || "").trim(); }
  function nullable(data, name) { return text(data, name) || null; }
  function slugify(value) { return String(value || "item").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item"; }
  function esc(value) { return String(value || "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[char])); }
})();