(() => {
  const cfg = window.WHITE_LINE_SUPABASE || {};
  if (!window.supabase?.createClient || !cfg.url || !cfg.anonKey) return;

  const db = window.supabase.createClient(cfg.url, cfg.anonKey);
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

  const urlParams = new URLSearchParams(window.location.search);
  const requestedTalentName = String(urlParams.get("talent") || "").trim();
  const requestedTalentId = validUuid(urlParams.get("talent_id")) ? urlParams.get("talent_id") : null;
  const neededInput = $("needed");
  if (neededInput && requestedTalentName) neededInput.value = requestedTalentName;

  let roster = [];
  let active = "All";

  async function load() {
    const { data, error } = await db
      .from("talent_profiles")
      .select("id,slug,full_name,stage_name,category,secondary_categories,short_bio,city,country,profile_image_url,body_image_url,instagram_url,tiktok_url,youtube_url,portfolio_url,featured,availability_status")
      .eq("status", "approved")
      .order("featured", { ascending: false });

    if (error) {
      $("talent-grid").innerHTML = '<div class="empty">Could not load the roster.</div>';
      return;
    }

    roster = data || [];
    const categories = ["All", ...new Set(roster.flatMap((item) => [item.category, ...(item.secondary_categories || [])]).filter(Boolean))];
    $("talent-filters").innerHTML = categories
      .map((category, index) => `<button class="filter${index ? "" : " active"}" data-filter="${esc(category)}">${esc(category)}</button>`)
      .join("");
    draw();
  }

  function draw() {
    const query = $("talent-search").value.toLowerCase().trim();
    const rows = roster
      .filter((item) => active === "All" || [item.category, ...(item.secondary_categories || [])].includes(active))
      .filter((item) => [
        item.full_name,
        item.stage_name,
        item.city,
        item.country,
        item.category,
        item.short_bio,
        ...(item.secondary_categories || [])
      ].join(" ").toLowerCase().includes(query));

    $("talent-count").textContent = `${rows.length} profile${rows.length === 1 ? "" : "s"}`;
    $("talent-grid").innerHTML = rows.length
      ? rows.map((item) => {
          const name = item.stage_name || item.full_name;
          return `
            <article class="card talent-card" tabindex="0" role="link" data-id="${esc(item.id)}" data-slug="${esc(item.slug || "")}">
              <img class="talent-image" src="${esc(item.profile_image_url || "https://thegreishow.xo.je/photos/jamaica1.jpg")}" alt="${esc(name)}">
              <div class="card-body">
                <h3>${esc(name)}</h3>
                <div class="meta">${esc([item.city, item.country].filter(Boolean).join(", ") || "Location available on request")} · ${esc(item.availability_status || "available")}</div>
                <div class="tags">${[item.category, ...(item.secondary_categories || [])].filter(Boolean).map((tag) => `<span class="tag">${esc(tag)}</span>`).join("")}</div>
              </div>
            </article>`;
        }).join("")
      : '<div class="empty">The founding roster is being curated. Approved profiles will appear here automatically.</div>';
  }

  function openProfile(card) {
    const slug = String(card.dataset.slug || "").trim();
    window.location.href = slug
      ? `/${encodeURIComponent(slug)}`
      : `/whiteline-profile?id=${encodeURIComponent(card.dataset.id)}`;
  }

  $("talent-search").oninput = draw;
  $("talent-filters").onclick = (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    active = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
    draw();
  };
  $("talent-grid").onclick = (event) => {
    const card = event.target.closest("[data-id]");
    if (card) openProfile(card);
  };
  $("talent-grid").onkeydown = (event) => {
    const card = event.target.closest("[data-id]");
    if (card && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openProfile(card);
    }
  };

  $("client-form").onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const message = $("client-message");
    const data = new FormData(form);

    button.disabled = true;
    message.hidden = false;
    message.textContent = "Submitting your request…";

    const payload = {
      client_name: String(data.get("client_name") || "").trim(),
      company_name: String(data.get("company_name") || "").trim() || null,
      email: String(data.get("email") || "").trim().toLowerCase(),
      phone: String(data.get("phone") || "").trim(),
      whatsapp: String(data.get("phone") || "").trim(),
      project_type: String(data.get("project_type") || "").trim(),
      talent_category: String(data.get("talent_category") || "").trim(),
      requested_talent_id: requestedTalentId,
      requested_talent_name: requestedTalentName || null,
      project_description: String(data.get("project_description") || "").trim(),
      requirements: String(data.get("requirements") || "").trim() || null,
      event_date: data.get("event_date") || null,
      location: String(data.get("location") || "").trim(),
      budget_min: data.get("budget_min") ? Number(data.get("budget_min")) : null,
      budget_max: data.get("budget_max") ? Number(data.get("budget_max")) : null,
      currency: String(data.get("currency") || "USD"),
      preferred_contact_method: String(data.get("preferred_contact") || "Email"),
      consent_to_store_data: true,
      consent_to_contact: true,
      source: requestedTalentId ? "talent_profile" : "whiteline_website",
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
      status: "new",
      booking_stage: "new",
      payment_status: "unpaid"
    };

    const { error } = await db.from("client_requests").insert(payload);
    button.disabled = false;

    if (error) {
      message.textContent = "We could not submit the request. Please check the form and try again.";
      console.error("[White Line booking]", error);
      return;
    }

    form.reset();
    if (requestedTalentName && neededInput) neededInput.value = requestedTalentName;
    message.textContent = requestedTalentName
      ? `Request received for ${requestedTalentName}. White Line will contact you by email or WhatsApp.`
      : "Request received. White Line will contact you by email or WhatsApp.";
  };

  function validUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  load();
})();
