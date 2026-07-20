(() => {
  const cfg = window.WHITE_LINE_SUPABASE || {};
  if (!window.supabase?.createClient || !cfg.url || !cfg.anonKey) return;
  const db = window.supabase.createClient(cfg.url, cfg.anonKey);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let initialized = false;

  const observer = new MutationObserver(() => {
    if (!document.getElementById('dashboard')?.hidden && !initialized) {
      initialized = true;
      install();
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });

  function install() {
    const tabs = document.querySelector('.tabs');
    const dashboard = document.getElementById('dashboard');
    if (!tabs || !dashboard) return;
    const button = document.createElement('button');
    button.className = 'tab';
    button.type = 'button';
    button.textContent = 'Emails';
    button.dataset.emailView = 'true';
    tabs.appendChild(button);

    const view = document.createElement('section');
    view.id = 'view-emails';
    view.className = 'view';
    view.hidden = true;
    view.innerHTML = `<section class="panel"><div class="section-head"><div><h2>Email automation</h2><p class="muted">Transactional messages for applications, bookings, payments and payouts.</p></div><div class="actions"><button id="email-process" class="primary">Process queue</button><button id="email-refresh">Refresh</button></div></div><div id="email-summary" class="finance-summary"></div></section><section class="panel"><div class="section-head"><h2>Delivery log</h2><label>Status<select id="email-filter"><option value="">All</option><option>pending</option><option>processing</option><option>sent</option><option>failed</option><option>cancelled</option></select></label></div><div id="email-log"></div></section>`;
    dashboard.appendChild(view);

    button.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item === button));
      document.querySelectorAll('.view').forEach((item) => { item.hidden = item !== view; });
      loadEmails();
    });
    document.getElementById('email-refresh').onclick = loadEmails;
    document.getElementById('email-process').onclick = processQueue;
    document.getElementById('email-filter').onchange = loadEmails;
  }

  async function loadEmails() {
    const host = document.getElementById('email-log');
    const summary = document.getElementById('email-summary');
    if (!host || !summary) return;
    host.innerHTML = '<p class="muted">Loading…</p>';
    let query = db.from('whiteline_email_outbox').select('id,template_key,recipient_email,recipient_name,status,attempts,last_error,provider_message_id,created_at,sent_at').order('created_at', { ascending: false }).limit(100);
    const filter = document.getElementById('email-filter')?.value;
    if (filter) query = query.eq('status', filter);
    const { data, error } = await query;
    if (error) { host.innerHTML = `<p class="muted">${esc(error.message)}</p>`; return; }
    const rows = data || [];
    const counts = rows.reduce((acc, row) => { acc[row.status] = (acc[row.status] || 0) + 1; return acc; }, {});
    summary.innerHTML = ['pending','sent','failed','cancelled'].map((status) => `<div class="mini-stat"><span>${status}</span><strong>${counts[status] || 0}</strong></div>`).join('');
    host.innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Recipient</th><th>Template</th><th>Status</th><th>Attempts</th><th>Created</th><th>Action</th></tr></thead><tbody>${rows.map((row) => `<tr><td><strong>${esc(row.recipient_name || row.recipient_email)}</strong><small>${esc(row.recipient_email)}</small></td><td>${esc(row.template_key)}</td><td><span class="pill">${esc(row.status)}</span>${row.last_error ? `<small>${esc(row.last_error)}</small>` : ''}</td><td>${row.attempts}</td><td>${new Date(row.created_at).toLocaleString()}</td><td>${['failed','cancelled'].includes(row.status) ? `<button data-email-retry="${row.id}">Retry</button>` : row.provider_message_id ? `<small>${esc(row.provider_message_id)}</small>` : '—'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><strong>No email events yet.</strong><p class="muted">New applications and booking activity will populate this log.</p></div>';
    host.querySelectorAll('[data-email-retry]').forEach((retry) => retry.onclick = () => retryEmail(retry.dataset.emailRetry));
  }

  async function retryEmail(id) {
    const { error } = await db.from('whiteline_email_outbox').update({ status: 'pending', attempts: 0, available_at: new Date().toISOString(), last_error: null }).eq('id', id);
    if (error) return alert(error.message);
    await processQueue();
  }

  async function processQueue() {
    const button = document.getElementById('email-process');
    if (button) { button.disabled = true; button.textContent = 'Sending…'; }
    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session?.access_token) throw new Error('Admin session expired. Sign in again.');
      const response = await fetch(`${cfg.url}/functions/v1/process-whiteline-email-queue`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 50 }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not process email queue.');
      await loadEmails();
    } catch (error) { alert(error.message || 'Could not process email queue.'); }
    finally { if (button) { button.disabled = false; button.textContent = 'Process queue'; } }
  }
})();
