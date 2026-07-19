(() => {
  const config = window.WHITE_LINE_SUPABASE || {};
  const db = window.supabase.createClient(config.url, config.anonKey);
  const $ = (id) => document.getElementById(id);
  const loginPanel = $("login-panel");
  const dashboard = $("dashboard");
  const loginForm = $("login-form");
  const loginStatus = $("login-status");
  const applicationsHost = $("applications");
  const requestsHost = $("requests");
  const talentHost = $("talent-profiles");
  const castingHost = $("casting-calls");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(loginForm);
    show(loginStatus, "Signing in…");
    const { error } = await db.auth.signInWithPassword({
      email: text(data, "email"),
      password: String(data.get("password") || "")
    });
    if (error) return show(loginStatus, error.message);
    await openDashboard();
  });

  $("logout").addEventListener("click", async () => {
    await db.auth.signOut();
    dashboard.hidden = true;
    loginPanel.hidden = false;
    loginForm.reset();
  });

  document.querySelectorAll("[data-refresh]").forEach((button) => button.addEventListener("click", loadData));
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
  $("talent-profile-form").addEventListener("submit", saveTalentProfile);
  $("casting-form").addEventListener("submit", saveCastingCall);

  db.auth.getSession().then(({ data }) => { if (data.session) openDashboard(); });

  async function openDashboard() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;
    const { data: membership, error } = await db.from("whiteline_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (error || !membership) {
      await db.auth.signOut();
      return show(loginStatus, "This account is not authorized as a White Line administrator.");
    }
    $("admin-email").textContent = user.email || "White Line administrator";
    loginPanel.hidden = true;
    dashboard.hidden = false;
    await loadData();
  }

  async function loadData() {
    setLoading();
    const [applications, requests, talent, castings] = await Promise.all([
      db.from("talent_applications").select("id,full_name,stage_name,email,phone,whatsapp,category,city,biography,experience,portfolio_url,status,created_at").order("created_at", { ascending: false }),
      db.from("client_requests").select("id,client_name,company_name,email,phone,whatsapp,project_type,talent_category,project_description,requirements,event_date,location,budget_min,budget_max,currency,status,created_at").order("created_at", { ascending: false }),
      db.from("talent_profiles").select("id,full_name,stage_name,category,city,status,featured,created_at").order("created_at", { ascending: false }),
      db.from("casting_calls").select("id,title,category,location,event_date,application_deadline,compensation,status,created_at").order("created_at", { ascending: false })
    ]);

    applicationsHost.innerHTML = applications.error ? errorCard(applications.error) : renderApplications(applications.data || []);
    requestsHost.innerHTML = requests.error ? errorCard(requests.error) : renderRequests(requests.data || []);
    talentHost.innerHTML = talent.error ? errorCard(talent.error) : renderTalentProfiles(talent.data || []);
    castingHost.innerHTML = castings.error ? errorCard(castings.error) : renderCastings(castings.data || []);

    if (!applications.error) $("stat-applications").textContent = (applications.data || []).filter((x) => x.status === "new").length;
    if (!requests.error) $("stat-requests").textContent = (requests.data || []).filter((x) => x.status === "new").length;
    if (!talent.error) $("stat-talent").textContent = (talent.data || []).filter((x) => x.status === "approved").length;
    if (!castings.error) $("stat-castings").textContent = (castings.data || []).filter((x) => x.status === "open").length;
    bindActions();
  }

  function setLoading() {
    applicationsHost.innerHTML = requestsHost.innerHTML = talentHost.innerHTML = castingHost.innerHTML = "<p class='muted'>Loading…</p>";
  }

  function renderApplications(rows) {
    if (!rows.length) return "<p class='muted'>No talent applications yet.</p>";
    return rows.map((row) => {
      const phone = row.whatsapp || row.phone;
      return `<article class="card"><span class="pill">${esc(row.status)}</span><h3>${esc(row.stage_name || row.full_name)}</h3><div class="meta">${esc(row.category)} · ${esc(row.city || "Location not provided")} · ${date(row.created_at)}</div><p>${esc(row.biography || "No biography supplied.")}</p>${row.experience ? `<p class="meta">Experience: ${esc(row.experience)}</p>` : ""}<div class="contact-links"><a class="button" href="mailto:${encodeURIComponent(row.email)}">Email</a>${phone ? `<a class="button" target="_blank" rel="noopener" href="https://wa.me/${digits(phone)}">WhatsApp</a>` : ""}${row.portfolio_url ? `<a class="button" target="_blank" rel="noopener" href="${esc(row.portfolio_url)}">Portfolio</a>` : ""}</div><div class="actions"><button data-table="talent_applications" data-id="${row.id}" data-status="reviewing">Reviewing</button><button class="primary" data-table="talent_applications" data-id="${row.id}" data-status="approved">Approve</button><button class="danger" data-table="talent_applications" data-id="${row.id}" data-status="rejected">Reject</button></div></article>`;
    }).join("");
  }

  function renderRequests(rows) {
    if (!rows.length) return "<p class='muted'>No client requests yet.</p>";
    return rows.map((row) => {
      const phone = row.whatsapp || row.phone;
      const budget = [row.budget_min, row.budget_max].filter((x) => x != null).join("–");
      return `<article class="card"><span class="pill">${esc(row.status)}</span><h3>${esc(row.client_name)}${row.company_name ? ` · ${esc(row.company_name)}` : ""}</h3><div class="meta">${esc(row.project_type)} · ${esc(row.location || "Location not provided")} · ${date(row.created_at)}</div><p>${esc(row.project_description)}</p>${row.requirements ? `<p class="meta">Requirements: ${esc(row.requirements)}</p>` : ""}${row.event_date ? `<p class="meta">Event: ${dateOnly(row.event_date)}</p>` : ""}${budget ? `<p class="meta">Budget: ${esc(row.currency || "JMD")} ${esc(budget)}</p>` : ""}<div class="contact-links"><a class="button" href="mailto:${encodeURIComponent(row.email)}">Email</a>${phone ? `<a class="button" target="_blank" rel="noopener" href="https://wa.me/${digits(phone)}">WhatsApp</a>` : ""}</div><div class="actions"><button data-table="client_requests" data-id="${row.id}" data-status="contacted">Contacted</button><button data-table="client_requests" data-id="${row.id}" data-status="quoted">Quoted</button><button class="primary" data-table="client_requests" data-id="${row.id}" data-status="confirmed">Confirmed</button><button class="danger" data-table="client_requests" data-id="${row.id}" data-status="cancelled">Cancelled</button></div></article>`;
    }).join("");
  }

  function renderTalentProfiles(rows) {
    if (!rows.length) return "<p class='muted'>No roster profiles yet.</p>";
    return rows.map((row) => `<article class="card"><span class="pill">${esc(row.status)}</span><h3>${esc(row.stage_name || row.full_name)}</h3><div class="meta">${esc(row.category)} · ${esc(row.city || "Jamaica")}${row.featured ? " · Featured" : ""}</div><div class="actions">${row.status === "approved" ? `<button data-table="talent_profiles" data-id="${row.id}" data-status="inactive">Unpublish</button>` : `<button class="primary" data-table="talent_profiles" data-id="${row.id}" data-status="approved">Publish</button>`}<button data-feature="${row.featured ? "false" : "true"}" data-id="${row.id}">${row.featured ? "Remove feature" : "Feature"}</button></div></article>`).join("");
  }

  function renderCastings(rows) {
    if (!rows.length) return "<p class='muted'>No casting calls yet.</p>";
    return rows.map((row) => `<article class="card"><span class="pill">${esc(row.status)}</span><h3>${esc(row.title)}</h3><div class="meta">${esc(row.category || "Casting")} · ${esc(row.location || "Jamaica")}</div>${row.event_date ? `<p class="meta">Event: ${dateOnly(row.event_date)}</p>` : ""}${row.application_deadline ? `<p class="meta">Deadline: ${date(row.application_deadline)}</p>` : ""}<div class="actions">${row.status === "open" ? `<button data-table="casting_calls" data-id="${row.id}" data-status="closed">Close</button>` : `<button class="primary" data-table="casting_calls" data-id="${row.id}" data-status="open">Open publicly</button>`}<button data-table="casting_calls" data-id="${row.id}" data-status="draft">Draft</button></div></article>`).join("");
  }

  function bindActions() {
    document.querySelectorAll("[data-table][data-id][data-status]").forEach((button) => button.addEventListener("click", async () => {
      button.disabled = true;
      const { error } = await db.from(button.dataset.table).update({ status: button.dataset.status }).eq("id", button.dataset.id);
      button.disabled = false;
      if (error) return alert(error.message);
      await loadData();
    }));
    document.querySelectorAll("[data-feature][data-id]").forEach((button) => button.addEventListener("click", async () => {
      const { error } = await db.from("talent_profiles").update({ featured: button.dataset.feature === "true" }).eq("id", button.dataset.id);
      if (error) return alert(error.message);
      await loadData();
    }));
  }

  async function saveTalentProfile(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const fullName = text(data, "full_name");
    const payload = {
      full_name: fullName,
      stage_name: nullable(data, "stage_name"),
      slug: slugify(text(data, "stage_name") || fullName) + "-" + Date.now().toString().slice(-5),
      category: text(data, "category"),
      short_bio: text(data, "short_bio"),
      city: nullable(data, "city"),
      profile_image_url: nullable(data, "profile_image_url"),
      instagram_url: nullable(data, "instagram_url"),
      portfolio_url: nullable(data, "portfolio_url"),
      status: text(data, "status") || "draft",
      featured: text(data, "featured") === "true"
    };
    show($("talent-profile-status"), "Saving…");
    const { error } = await db.from("talent_profiles").insert(payload);
    if (error) return show($("talent-profile-status"), error.message);
    form.reset();
    show($("talent-profile-status"), "Talent profile saved.");
    await loadData();
  }

  async function saveCastingCall(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = text(data, "title");
    const deadline = text(data, "application_deadline");
    const payload = {
      title,
      slug: slugify(title) + "-" + Date.now().toString().slice(-5),
      category: nullable(data, "category"),
      location: nullable(data, "location"),
      event_date: nullable(data, "event_date"),
      application_deadline: deadline ? new Date(deadline).toISOString() : null,
      description: text(data, "description"),
      requirements: nullable(data, "requirements"),
      compensation: nullable(data, "compensation"),
      status: text(data, "status") || "draft"
    };
    show($("casting-status"), "Saving…");
    const { error } = await db.from("casting_calls").insert(payload);
    if (error) return show($("casting-status"), error.message);
    form.reset();
    show($("casting-status"), "Casting call saved.");
    await loadData();
  }

  function switchView(name) {
    document.querySelectorAll(".view").forEach((view) => view.hidden = view.id !== `view-${name}`);
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === name));
  }

  function show(element, message) { element.hidden = false; element.textContent = message; }
  function text(data, name) { return String(data.get(name) || "").trim(); }
  function nullable(data, name) { return text(data, name) || null; }
  function digits(value) { return String(value || "").replace(/\D/g, ""); }
  function slugify(value) { return String(value || "item").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item"; }
  function errorCard(error) { return `<p class="muted">${esc(error.message || "Could not load data.")}</p>`; }
  function date(value) { return value ? new Date(value).toLocaleString() : ""; }
  function dateOnly(value) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString() : ""; }
  function esc(value) { return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
})();