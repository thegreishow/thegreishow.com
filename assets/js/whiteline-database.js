(() => {
  const PHONE = "18768832197";
  const CONFIG = window.WHITE_LINE_SUPABASE || {};
  const configured = /^https:\/\/.+\.supabase\.co$/i.test(CONFIG.url || "") && CONFIG.anonKey && !CONFIG.anonKey.includes("PASTE_");
  let db = null;

  const ready = (fn) => document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", fn, { once: true })
    : fn();

  ready(async () => {
    addWhatsAppButton();
    addConnectionStatus();

    if (!configured || !window.supabase?.createClient) {
      setStatus("Setup required", "Database files are installed. Add the Supabase project URL and anon key to activate storage.", "warning");
      return;
    }

    db = window.supabase.createClient(CONFIG.url, CONFIG.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });

    try {
      await loadPublicDirectory();
      connectForms();
      setStatus("Database connected", "Applications are securely stored and public listings are synced from Supabase.", "success");
    } catch (error) {
      console.error("White Line database initialization failed", error);
      connectForms();
      setStatus("Database connection issue", "The page is available, but live listings may not have loaded. Please try again later.", "error");
    }
  });

  function addWhatsAppButton() {
    if (document.querySelector(".wl-floating-contact")) return;
    const text = encodeURIComponent("Hello White Line Entertainment, I would like to discuss talent, representation or a casting project.");
    const link = document.createElement("a");
    link.className = "wl-floating-contact";
    link.href = `https://wa.me/${PHONE}?text=${text}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "Contact White Line Entertainment on WhatsApp");
    link.innerHTML = "◉ <span>WhatsApp White Line</span>";
    document.body.appendChild(link);
  }

  function addConnectionStatus() {
    const host = document.querySelector("#join .wl-wrap");
    const tabs = document.querySelector("#join .wl-tabs");
    if (!host || !tabs || document.getElementById("database-status")) return;
    const box = document.createElement("div");
    box.id = "database-status";
    box.className = "wl-database-status";
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    box.innerHTML = "<strong>Checking database…</strong><span>Preparing secure application storage.</span>";
    host.insertBefore(box, tabs);
  }

  function setStatus(title, message, state) {
    const box = document.getElementById("database-status");
    if (!box) return;
    box.dataset.state = state;
    box.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
  }

  async function loadPublicDirectory() {
    const [talentResult, castingResult] = await Promise.all([
      db.from("talent_profiles")
        .select("slug,professional_name,disciplines,location,image_url,bio,credits,instagram_url,reel_url,featured")
        .eq("status", "approved")
        .order("featured", { ascending: false })
        .order("professional_name", { ascending: true }),
      db.from("casting_calls")
        .select("slug,title,project_type,location,project_date,deadline,compensation,summary,requirements,status")
        .eq("status", "open")
        .order("deadline", { ascending: true, nullsFirst: false })
    ]);

    if (talentResult.error) throw talentResult.error;
    if (castingResult.error) throw castingResult.error;

    const talent = (talentResult.data || []).map((row) => ({
      id: row.slug,
      name: row.professional_name,
      disciplines: row.disciplines || [],
      location: row.location,
      image: row.image_url,
      bio: row.bio,
      credits: row.credits || [],
      instagram: row.instagram_url,
      reel: row.reel_url,
      featured: row.featured
    }));

    const castingCalls = (castingResult.data || []).map((row) => ({
      id: row.slug,
      title: row.title,
      type: row.project_type,
      location: row.location,
      date: row.project_date,
      deadline: row.deadline,
      compensation: row.compensation,
      status: row.status,
      summary: row.summary,
      requirements: row.requirements || []
    }));

    window.WHITE_LINE_DATA = { talent, castingCalls };
    renderTalent(talent);
    renderCasting(castingCalls);
    refreshCastingOptions(castingCalls);
  }

  function renderTalent(talent) {
    const grid = document.getElementById("talent-grid");
    const filters = document.getElementById("talent-filters");
    const count = document.getElementById("talent-count");
    if (!grid || !filters) return;

    const categories = ["All", ...new Set(talent.flatMap((item) => item.disciplines || []))];
    filters.innerHTML = categories.map((category, index) => `<button class="wl-filter${index === 0 ? " active" : ""}" data-db-filter="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("");

    let active = "All";
    const search = document.getElementById("talent-search");
    const sort = document.getElementById("talent-sort");

    const draw = () => {
      const query = (search?.value || "").trim().toLowerCase();
      let list = talent.filter((item) => active === "All" || (item.disciplines || []).includes(active));
      list = list.filter((item) => [item.name, item.location, item.bio, ...(item.disciplines || []), ...(item.credits || [])].join(" ").toLowerCase().includes(query));
      if (sort?.value === "name") list.sort((a, b) => a.name.localeCompare(b.name));
      if (sort?.value === "location") list.sort((a, b) => String(a.location || "").localeCompare(String(b.location || "")));
      if (!sort || sort.value === "featured") list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.name.localeCompare(b.name));
      if (count) count.textContent = `${list.length} profile${list.length === 1 ? "" : "s"}`;
      grid.innerHTML = list.length ? list.map(profileCard).join("") : `<div class="empty-state"><strong>${talent.length ? "No profiles match your search." : "The curated roster is being prepared."}</strong>${talent.length ? "Try another name, location or discipline." : "Approved talent profiles will appear here."}</div>`;
    };

    filters.onclick = (event) => {
      const button = event.target.closest("[data-db-filter]");
      if (!button) return;
      active = button.dataset.dbFilter;
      filters.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
      draw();
    };
    search?.addEventListener("input", draw);
    sort?.addEventListener("change", draw);
    draw();
  }

  function profileCard(item) {
    const image = item.image || "assets/img/home-bg.webp";
    return `<article class="talent-card" tabindex="0" role="button" data-id="${escapeHtml(item.id)}"><img class="talent-image" src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}"><div class="talent-body"><h3>${escapeHtml(item.name)}</h3><div class="talent-meta">${escapeHtml(item.location || "Jamaica")}</div><div class="tags">${(item.disciplines || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div></div></article>`;
  }

  function renderCasting(calls) {
    const grid = document.getElementById("casting-grid");
    const count = document.getElementById("casting-count");
    const search = document.getElementById("casting-search");
    if (!grid) return;

    const draw = () => {
      const query = (search?.value || "").trim().toLowerCase();
      const list = calls.filter((item) => [item.title, item.type, item.location, item.summary, item.compensation, ...(item.requirements || [])].join(" ").toLowerCase().includes(query));
      if (count) count.textContent = `${list.length} open call${list.length === 1 ? "" : "s"}`;
      grid.innerHTML = list.length ? list.map((item) => `<article class="casting-card"><span class="casting-status">Open</span><h3>${escapeHtml(item.title)}</h3><div class="casting-meta">${escapeHtml(item.type)} · ${escapeHtml(item.location)}${item.date ? ` · ${escapeHtml(formatDate(item.date))}` : ""}</div>${item.deadline ? `<div class="casting-deadline">Deadline ${escapeHtml(formatDate(item.deadline))}</div>` : ""}<p>${escapeHtml(item.summary)}</p><div class="tags">${(item.requirements || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div><strong>${escapeHtml(item.compensation || "Compensation provided in brief")}</strong><button class="wl-button primary apply-casting" data-casting="${escapeHtml(item.title)}">Apply to this casting</button></article>`).join("") : `<div class="empty-state"><strong>${calls.length ? "No casting calls match your search." : "No public casting calls are open right now."}</strong>${calls.length ? "Try a broader search." : "New opportunities will appear here when published."}</div>`;
    };
    search?.addEventListener("input", draw);
    draw();
  }

  function refreshCastingOptions(calls) {
    const select = document.getElementById("casting-interest");
    if (!select) return;
    select.innerHTML = `<option value="General talent profile">General talent profile</option>${calls.map((call) => `<option value="Casting: ${escapeHtml(call.title)}">Casting: ${escapeHtml(call.title)}</option>`).join("")}`;
  }

  function connectForms() {
    const talentForm = document.getElementById("talent-form");
    const clientForm = document.getElementById("client-form");
    if (talentForm) talentForm.onsubmit = submitTalent;
    if (clientForm) clientForm.onsubmit = submitClient;
  }

  async function submitTalent(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.getElementById("talent-message");
    const button = form.querySelector("button[type='submit']");
    const disciplines = [...form.querySelectorAll("[name='discipline']:checked")].map((input) => input.value);
    if (!disciplines.length) return showMessage(message, "Select at least one discipline.", true);
    if (!db) return showMessage(message, "Database setup is not complete yet. Please contact White Line on WhatsApp.", true);

    setBusy(button, true, "Submitting securely…");
    const values = new FormData(form);
    const { error } = await db.from("talent_applications").insert({
      application_type: text(values, "castingInterest") || "General talent profile",
      full_name: text(values, "name"),
      professional_name: text(values, "stage") || null,
      email: text(values, "email"),
      phone: text(values, "phone"),
      location: text(values, "location"),
      years_experience: Number(text(values, "experience") || 0),
      disciplines,
      portfolio_links: text(values, "portfolio"),
      bio: text(values, "bio"),
      credits: text(values, "credits") || null,
      consent: values.get("consent") === "on",
      status: "new",
      source: "website"
    });
    setBusy(button, false, "Submit application");
    if (error) return showMessage(message, friendlyError(error), true);
    form.reset();
    localStorage.removeItem("whiteLineDraft:talent");
    showMessage(message, "Application received. White Line will review your profile and contact you if more information is needed.", false);
  }

  async function submitClient(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.getElementById("client-message");
    const button = form.querySelector("button[type='submit']");
    if (!db) return showMessage(message, "Database setup is not complete yet. Please contact White Line on WhatsApp.", true);

    setBusy(button, true, "Sending request…");
    const values = new FormData(form);
    const { error } = await db.from("client_requests").insert({
      client_name: text(values, "name"),
      company: text(values, "company") || null,
      email: text(values, "email"),
      phone: text(values, "phone"),
      project_type: text(values, "project"),
      talent_requested: text(values, "needed"),
      project_date: text(values, "date") || null,
      location: text(values, "location"),
      budget: text(values, "budget"),
      usage: text(values, "usage"),
      brief: text(values, "brief"),
      consent: values.get("consent") === "on",
      status: "new",
      source: "website"
    });
    setBusy(button, false, "Submit talent request");
    if (error) return showMessage(message, friendlyError(error), true);
    form.reset();
    localStorage.removeItem("whiteLineDraft:client");
    showMessage(message, "Request received. White Line will review the brief and follow up about availability, rates and next steps.", false);
  }

  function text(formData, name) {
    return String(formData.get(name) || "").trim();
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    button.disabled = busy;
    button.textContent = label;
  }

  function showMessage(element, text, error) {
    if (!element) return;
    element.hidden = false;
    element.dataset.state = error ? "error" : "success";
    element.textContent = text;
    element.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function friendlyError(error) {
    console.error(error);
    if (error?.code === "23505") return "This submission appears to have already been received.";
    if (error?.code === "42501") return "The submission was blocked by a security rule. Check the required consent box and try again.";
    return "The submission could not be stored. Please try again or contact White Line on WhatsApp.";
  }

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  }
})();
