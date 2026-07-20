(() => {
  const cfg = window.WHITE_LINE_SUPABASE || {};
  if (!window.supabase?.createClient || !cfg.url || !cfg.anonKey) return;
  const db = window.supabase.createClient(cfg.url, cfg.anonKey);
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = (v, c='USD') => new Intl.NumberFormat('en-US',{style:'currency',currency:c}).format(Number(v||0));
  const when = (v) => v ? new Intl.DateTimeFormat('en',{dateStyle:'medium'}).format(new Date(v)) : '—';
  let started = false;

  const observer = new MutationObserver(() => {
    if (!$('dashboard')?.hidden && !started) { started = true; bind(); refresh(); }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});

  function bind() {
    document.querySelectorAll('[data-command-refresh]').forEach(b => b.addEventListener('click', refresh));
  }

  async function refresh() {
    ['command-actions','command-bookings','command-finance','command-activity'].forEach(id => { if ($(id)) $(id).innerHTML='<p class="muted">Loading…</p>'; });
    const [apps, requests, profiles, castings, payments, payouts] = await Promise.all([
      db.from('talent_applications').select('id,full_name,stage_name,category,city,status,created_at').order('created_at',{ascending:false}),
      db.from('client_requests').select('id,client_name,company_name,project_type,event_date,status,booking_stage,payment_status,quoted_amount,amount_paid,currency,created_at').order('created_at',{ascending:false}),
      db.from('talent_profiles').select('id,status,payout_email').order('created_at',{ascending:false}),
      db.from('casting_calls').select('id,status').order('created_at',{ascending:false}),
      db.from('booking_payments').select('id,amount,currency,status,paid_at,created_at').order('created_at',{ascending:false}),
      db.from('talent_payouts').select('id,gross_amount,commission_amount,payout_amount,currency,status,created_at,paid_at').order('created_at',{ascending:false})
    ]);
    const d={apps:apps.data||[],requests:requests.data||[],profiles:profiles.data||[],castings:castings.data||[],payments:payments.data||[],payouts:payouts.data||[]};
    renderStats(d); renderActions(d); renderBookings(d); renderFinance(d); renderActivity(d);
  }

  function renderStats(d) {
    set('stat-revenue', money(d.payments.filter(x=>['paid','completed'].includes(x.status)).reduce((s,x)=>s+Number(x.amount||0),0), currency(d.payments)));
    set('stat-commission', money(d.payouts.reduce((s,x)=>s+Number(x.commission_amount||0),0), currency(d.payouts)));
    set('stat-payouts', d.payouts.filter(x=>['eligible','failed','held','unclaimed'].includes(x.status)).length);
    set('stat-upcoming', d.requests.filter(x=>x.event_date && new Date(x.event_date)>=new Date() && !['completed','cancelled'].includes(x.booking_stage)).length);
  }

  function renderActions(d) {
    const items=[];
    d.apps.filter(x=>x.status==='new').forEach(x=>items.push(['Talent application',x.stage_name||x.full_name,`${x.category||'Talent'} · ${x.city||'Location pending'}`]));
    d.requests.filter(x=>['new','contacted','quoted','negotiating'].includes(x.booking_stage||x.status)).forEach(x=>items.push(['Booking',x.client_name,`${x.project_type||'Project'} · ${x.payment_status||'unpaid'}`]));
    d.payouts.filter(x=>['eligible','failed','held','unclaimed'].includes(x.status)).forEach(x=>items.push(['Payout',money(x.payout_amount,x.currency),x.status]));
    $('command-actions').innerHTML=items.length?items.slice(0,10).map(i=>`<article class="command-item"><div><span class="pill">${esc(i[0])}</span><h3>${esc(i[1])}</h3><p class="meta">${esc(i[2])}</p></div></article>`).join(''):'<div class="empty-state"><strong>All clear.</strong><p class="muted">Nothing currently requires attention.</p></div>';
  }

  function renderBookings(d) {
    $('command-bookings').innerHTML=d.requests.length?`<div class="table-wrap"><table><thead><tr><th>Client</th><th>Project</th><th>Stage</th><th>Payment</th><th>Value</th><th>Event</th></tr></thead><tbody>${d.requests.map(x=>`<tr><td><strong>${esc(x.client_name)}</strong><small>${esc(x.company_name||'')}</small></td><td>${esc(x.project_type||'Booking')}</td><td>${esc(x.booking_stage||x.status||'new')}</td><td>${esc(x.payment_status||'unpaid')}</td><td>${money(x.quoted_amount,x.currency||'USD')}</td><td>${when(x.event_date)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty-state"><strong>No bookings yet.</strong><p class="muted">Client enquiries will appear here.</p></div>';
  }

  function renderFinance(d) {
    const c=currency([...d.payments,...d.payouts]);
    const gross=d.payments.filter(x=>['paid','completed'].includes(x.status)).reduce((s,x)=>s+Number(x.amount||0),0);
    const commission=d.payouts.reduce((s,x)=>s+Number(x.commission_amount||0),0);
    const talent=d.payouts.reduce((s,x)=>s+Number(x.payout_amount||0),0);
    $('finance-summary').innerHTML=`<div class="mini-stat"><span>Collected</span><strong>${money(gross,c)}</strong></div><div class="mini-stat"><span>Agency commission</span><strong>${money(commission,c)}</strong></div><div class="mini-stat"><span>Talent earnings</span><strong>${money(talent,c)}</strong></div><div class="mini-stat"><span>Action needed</span><strong>${d.payouts.filter(x=>['eligible','failed','held','unclaimed'].includes(x.status)).length}</strong></div>`;
    $('command-finance').innerHTML=d.payouts.length?d.payouts.map(x=>`<article class="command-item"><div><span class="pill">${esc(x.status)}</span><h3>${money(x.payout_amount,x.currency)} talent payout</h3><p class="meta">Gross ${money(x.gross_amount,x.currency)} · Commission ${money(x.commission_amount,x.currency)}</p></div></article>`).join(''):'<p class="muted">No payout ledger yet.</p>';
  }

  function renderActivity(d) {
    const rows=[...d.apps.map(x=>[x.created_at,`Application: ${x.stage_name||x.full_name}`]),...d.requests.map(x=>[x.created_at,`Booking: ${x.client_name}`]),...d.payments.map(x=>[x.paid_at||x.created_at,`Payment ${x.status}: ${money(x.amount,x.currency)}`]),...d.payouts.map(x=>[x.paid_at||x.created_at,`Payout ${x.status}: ${money(x.payout_amount,x.currency)}`])].sort((a,b)=>new Date(b[0])-new Date(a[0])).slice(0,10);
    $('command-activity').innerHTML=rows.length?rows.map(x=>`<div class="activity-row"><span>${esc(x[1])}</span><time>${when(x[0])}</time></div>`).join(''):'<p class="muted">Activity will appear as the platform is used.</p>';
  }

  function currency(rows){return rows.find(x=>x.currency)?.currency||'USD'}
  function set(id,v){if($(id))$(id).textContent=v}
})();