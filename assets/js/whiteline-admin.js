(() => {
  const config = window.WHITE_LINE_SUPABASE || {};
  const db = window.supabase.createClient(config.url, config.anonKey);
  const loginPanel = document.getElementById("login-panel");
  const dashboard = document.getElementById("dashboard");
  const loginForm = document.getElementById("login-form");
  const loginStatus = document.getElementById("login-status");
  const applicationsHost = document.getElementById("applications");
  const requestsHost = document.getElementById("requests");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(loginForm);
    showLogin("Signing in…");
    const { error } = await db.auth.signInWithPassword({
      email: String(data.get("email") || "").trim(),
      password: String(data.get("password") || "")
    });
    if (error) return showLogin(error.message);
    await openDashboard();
  });

  document.getElementById("logout").addEventListener("click", async () => {
    await db.auth.signOut();
    dashboard.hidden = true;
    loginPanel.hidden = false;
    loginForm.reset();
  });

  document.querySelectorAll("[data-refresh]").forEach((button) => button.addEventListener("click", loadData));

  db.auth.getSession().then(({ data }) => {
    if (data.session) openDashboard();
  });

  async function openDashboard() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;
    const { data: membership, error } = await db.from("whiteline_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (error || !membership) {
      await db.auth.signOut();
      return showLogin("This account is not authorized as a White Line administrator.");
    }
    document.getElementById("admin-email").textContent = user.email || "White Line administrator";
    loginPanel.hidden = true;
    dashboard.hidden = false;
    await loadData();
  }

  async function loadData() {
    applicationsHost.innerHTML = "<p class='muted'>Loading applications…</p>";
    requestsHost.innerHTML = "<p class='muted'>Loading requests…</p>";
    const [applications, requests] = await Promise.all([
      db.from("talent_applications").select("id,full_name,stage_name,email,phone,category,city,biography,experience,status,created_at").order("created_at", { ascending: false }),
      db.from("client_requests").select("id,client_name,company_name,email,phone,project_type,talent_category,project_description,requirements,event_date,location,status,created_at").order("created_at", { ascending: false })
    ]);
    applicationsHost.innerHTML = applications.error ? errorCard(applications.error) : renderApplications(applications.data || []);
    requestsHost.innerHTML = requests.error ? errorCard(requests.error) : renderRequests(requests.data || []);
    bindStatusButtons();
  }

  function renderApplications(rows) {
    if (!rows.length) return "<p class='muted'>No talent applications yet.</p>";
    return rows.map((row) => `<article class="card"><h3>${esc(row.stage_name || row.full_name)}</h3><div class="meta">${esc(row.category)} · ${esc(row.city || "Location not provided")} · ${date(row.created_at)}</div><p>${esc(row.biography || "No biography supplied.")}</p><p class="meta">${esc(row.email)} · ${esc(row.phone)}</p><div class="actions"><button data-table="talent_applications" data-id="${row.id}" data-status="reviewing">Reviewing</button><button class="primary" data-table="talent_applications" data-id="${row.id}" data-status="approved">Approve</button><button class="danger" data-table="talent_applications" data-id="${row.id}" data-status="rejected">Reject</button><span class="meta">Current: ${esc(row.status)}</span></div></article>`).join("");
  }

  function renderRequests(rows) {
    if (!rows.length) return "<p class='muted'>No client requests yet.</p>";
    return rows.map((row) => `<article class="card"><h3>${esc(row.client_name)}${row.company_name ? ` · ${esc(row.company_name)}` : ""}</h3><div class="meta">${esc(row.project_type)} · ${esc(row.location || "Location not provided")} · ${date(row.created_at)}</div><p>${esc(row.project_description)}</p><p class="meta">${esc(row.email)} · ${esc(row.phone || "No phone")}</p><div class="actions"><button data-table="client_requests" data-id="${row.id}" data-status="contacted">Contacted</button><button class="primary" data-table="client_requests" data-id="${row.id}" data-status="confirmed">Confirmed</button><button class="danger" data-table="client_requests" data-id="${row.id}" data-status="cancelled">Cancelled</button><span class="meta">Current: ${esc(row.status)}</span></div></article>`).join("");
  }

  function bindStatusButtons() {
    document.querySelectorAll("[data-table][data-id][data-status]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        const { error } = await db.from(button.dataset.table).update({ status: button.dataset.status }).eq("id", button.dataset.id);
        button.disabled = false;
        if (error) return window.alert(error.message);
        await loadData();
      });
    });
  }

  function showLogin(message) {
    loginStatus.hidden = false;
    loginStatus.textContent = message;
  }
  function errorCard(error) { return `<p class="muted">${esc(error.message || "Could not load data.")}</p>`; }
  function date(value) { return new Date(value).toLocaleString(); }
  function esc(value) { return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
})();