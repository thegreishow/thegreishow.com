(() => {
  const config = window.WHITE_LINE_SUPABASE || {};
  if (!window.supabase?.createClient || !config.url || !config.anonKey) return;
  const db = window.supabase.createClient(config.url, config.anonKey);
  let profileId = null;

  document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelector('.tabs');
    const main = document.querySelector('main.wrap');
    if (!tabs || !main || document.getElementById('view-earnings')) return;
    const button = document.createElement('button');
    button.className = 'tab'; button.dataset.view = 'earnings'; button.textContent = 'Earnings';
    tabs.appendChild(button);
    const section = document.createElement('section');
    section.id = 'view-earnings'; section.className = 'view'; section.hidden = true;
    section.innerHTML = `<div class="grid"><section class="panel"><h2>Payout settings</h2><p class="muted">Your PayPal email stays private. White Line uses it only to release approved talent payouts.</p><form id="payout-settings" class="form-grid"><label class="full">PayPal payout email<input name="email" type="email" required></label><label>Currency<select name="currency"><option value="USD">USD</option><option value="JMD">JMD</option><option value="GBP">GBP</option><option value="EUR">EUR</option><option value="CAD">CAD</option></select></label><div class="full"><button class="primary" type="submit">Save payout settings</button></div></form><div id="payout-settings-status" class="status" hidden></div></section><section class="panel"><h2>Earnings</h2><p class="muted">White Line retains the agreed 15% commission. Eligible payouts are released after the booking is fully paid and completed.</p><div id="earnings-list" class="cards"><p class="muted">Loading…</p></div></section></div>`;
    main.appendChild(section);
    button.addEventListener('click', () => showView(button));
    document.getElementById('payout-settings').addEventListener('submit', saveSettings);
    db.auth.onAuthStateChange((_event, session) => { if (session) load(); });
    db.auth.getSession().then(({ data }) => { if (data.session) load(); });
  });

  function showView(button) {
    document.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('active', x === button));
    document.querySelectorAll('.view').forEach(view => { view.hidden = view.id !== `view-${button.dataset.view}`; });
  }

  async function load() {
    const { data: { user } } = await db.auth.getUser(); if (!user) return;
    const account = await db.from('talent_accounts').select('talent_profile_id').eq('user_id',user.id).eq('status','active').maybeSingle();
    if (!account.data) return;
    profileId = account.data.talent_profile_id;
    const profile = await db.from('talent_profiles').select('payout_email,payout_currency').eq('id',profileId).single();
    if (profile.data) {
      const form = document.getElementById('payout-settings');
      form.elements.email.value = profile.data.payout_email || user.email || '';
      form.elements.currency.value = profile.data.payout_currency || 'USD';
    }
    const result = await db.from('talent_payouts').select('gross_amount,commission_rate,commission_amount,payout_amount,currency,status,created_at,paid_at,client_requests(project_type,event_date,company_name,client_name)').eq('talent_profile_id',profileId).order('created_at',{ascending:false});
    const host = document.getElementById('earnings-list');
    if (result.error) return host.innerHTML = `<p class="muted">${esc(result.error.message)}</p>`;
    host.innerHTML = result.data?.length ? result.data.map(row => `<article class="card"><span class="pill">${esc(row.status)}</span><h3>${money(row.payout_amount,row.currency)}</h3><p class="meta">${esc(row.client_requests?.project_type||'Booking')} · ${esc(row.client_requests?.company_name||row.client_requests?.client_name||'Client')}</p><p class="meta">Gross allocation ${money(row.gross_amount,row.currency)} · White Line ${Number(row.commission_rate).toFixed(0)}% (${money(row.commission_amount,row.currency)})</p>${row.paid_at?`<p class="meta">Paid ${new Date(row.paid_at).toLocaleString()}</p>`:''}</article>`).join('') : '<p class="muted">No earnings records yet.</p>';
  }

  async function saveSettings(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget), status = document.getElementById('payout-settings-status');
    status.hidden=false; status.textContent='Saving…';
    const { error } = await db.rpc('set_my_payout_details',{p_email:String(form.get('email')||''),p_currency:String(form.get('currency')||'USD')});
    status.textContent = error ? error.message : 'Payout settings saved.';
  }
  function money(v,c){try{return new Intl.NumberFormat(undefined,{style:'currency',currency:c||'USD'}).format(Number(v||0));}catch{return `${c||'USD'} ${Number(v||0).toFixed(2)}`;}}
  function esc(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
})();
