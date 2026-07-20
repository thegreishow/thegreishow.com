(() => {
  const config = window.WHITE_LINE_SUPABASE || {};
  if (!window.supabase?.createClient || !config.url || !config.anonKey) return;
  const db = window.supabase.createClient(config.url, config.anonKey);

  document.addEventListener('DOMContentLoaded', () => {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard || document.getElementById('payout-panel')) return;
    const panel = document.createElement('section');
    panel.id = 'payout-panel';
    panel.className = 'panel';
    panel.innerHTML = '<div class="section-head"><div><h2>Talent payouts</h2><p class="muted">Single-talent bookings calculate automatically at 85% talent / 15% White Line. Payouts become eligible only after full payment and job completion.</p></div><button id="refresh-payouts">Refresh</button></div><div id="payout-list" class="cards"><p class="muted">Sign in to load payouts.</p></div>';
    dashboard.appendChild(panel);
    document.getElementById('refresh-payouts').onclick = load;
    db.auth.onAuthStateChange((_event, session) => { if (session) load(); });
    db.auth.getSession().then(({ data }) => { if (data.session) load(); });
  });

  async function load() {
    const host = document.getElementById('payout-list');
    if (!host) return;
    host.innerHTML = '<p class="muted">Loading payouts…</p>';
    const { data, error } = await db.from('talent_payouts').select('id,gross_amount,commission_rate,commission_amount,payout_amount,currency,status,payout_receiver,eligible_at,paid_at,created_at,talent_profiles(full_name,stage_name,payout_email),client_requests(client_name,company_name,project_type,event_date,booking_stage,payment_status)').order('created_at', { ascending: false }).limit(100);
    if (error) return host.innerHTML = `<p class="muted">${esc(error.message)}</p>`;
    if (!data?.length) return host.innerHTML = '<p class="muted">No payout records yet. A single-talent booking will generate one automatically as payments are recorded.</p>';
    host.innerHTML = data.map(card).join('');
    host.querySelectorAll('[data-send-payout]').forEach((button) => button.onclick = () => send(button));
  }

  function card(row) {
    const talent = row.talent_profiles?.stage_name || row.talent_profiles?.full_name || 'Talent';
    const booking = row.client_requests || {};
    const canSend = row.status === 'eligible';
    return `<article class="card"><span class="pill">${esc(row.status)}</span><h3>${esc(talent)}</h3><p class="meta">${esc(booking.project_type || 'Booking')} · ${esc(booking.company_name || booking.client_name || 'Client')}${booking.event_date ? ` · ${new Date(`${booking.event_date}T12:00:00`).toLocaleDateString()}` : ''}</p><p><strong>${money(row.payout_amount,row.currency)} talent payout</strong></p><p class="meta">Gross allocation ${money(row.gross_amount,row.currency)} · White Line ${Number(row.commission_rate).toFixed(0)}% (${money(row.commission_amount,row.currency)})</p><p class="meta">PayPal: ${esc(row.payout_receiver || row.talent_profiles?.payout_email || 'not supplied')}</p><div class="actions">${canSend ? `<button class="primary" data-send-payout="${row.id}">Release PayPal payout</button>` : ''}<button type="button" onclick="navigator.clipboard.writeText('${row.id}')">Copy ledger ID</button></div></article>`;
  }

  async function send(button) {
    if (!confirm('Release this PayPal payout now? This sends real money when PAYPAL_ENV is live.')) return;
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Sending…';
    const { data, error } = await db.functions.invoke('create-talent-payout', { body: { payout_id: button.dataset.sendPayout } });
    if (error || data?.error) alert(data?.error || error.message);
    else alert(`PayPal accepted the payout batch${data.batch_id ? ` ${data.batch_id}` : ''}. Status will update from the webhook.`);
    button.disabled = false;
    button.textContent = original;
    await load();
  }

  function money(value, currency) { try { return new Intl.NumberFormat(undefined,{style:'currency',currency:currency||'USD'}).format(Number(value||0)); } catch { return `${currency||'USD'} ${Number(value||0).toFixed(2)}`; } }
  function esc(value) { return String(value || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
})();
