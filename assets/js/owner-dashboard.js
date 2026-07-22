(function(){
  const URL='https://dkvbeizjlgxqjuxnlqho.supabase.co';
  const KEY='sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';
  const db=window.supabase.createClient(URL,KEY);
  const $=id=>document.getElementById(id);
  const loginPanel=$('login-panel'), dashboard=$('dashboard'), form=$('owner-login-form'), status=$('owner-login-status');
  const stages=['new','reviewing','quoted','deposit_paid','confirmed','completed','cancelled'];

  form.addEventListener('submit',async e=>{
    e.preventDefault(); status.textContent='Signing in…'; status.className='muted';
    const data=new FormData(form);
    const {error}=await db.auth.signInWithPassword({email:String(data.get('email')).trim(),password:String(data.get('password'))});
    if(error){status.textContent=error.message;status.className='error';return;}
    await showDashboard();
  });
  $('owner-logout').addEventListener('click',async()=>{await db.auth.signOut();showLogin();});
  $('refresh-dashboard').addEventListener('click',loadDashboard);
  $('bookings-body').addEventListener('change',handleStageChange);
  db.auth.onAuthStateChange((_event,session)=>{if(session) showDashboard(); else showLogin();});
  db.auth.getSession().then(({data})=>data.session?showDashboard():showLogin());

  function showLogin(){loginPanel.hidden=false;dashboard.hidden=true;}
  async function showDashboard(){
    loginPanel.hidden=true; dashboard.hidden=false;
    try{await loadDashboard();}catch(error){dashboard.hidden=true;loginPanel.hidden=false;status.textContent=error.message||String(error);status.className='error';await db.auth.signOut();}
  }

  async function loadDashboard(){
    const closedStages=['completed','cancelled'];
    const [bookingRows,paymentRows,subscriberRows,bookingCount,subscriberCount,openCount,paidRows]=await Promise.all([
      db.from('client_requests').select('id,client_name,company_name,email,phone,whatsapp,project_name,project_type,event_date,booking_stage,status,payment_status,quoted_amount,amount_paid,currency,created_at').order('created_at',{ascending:false}).limit(25),
      db.from('booking_payments').select('id,payment_type,amount,currency,status,description,paid_at,created_at').order('created_at',{ascending:false}).limit(25),
      db.from('release_list_subscribers').select('id,email,first_name,country,status,subscribed_at,welcome_sent_at').order('subscribed_at',{ascending:false}).limit(25),
      db.from('client_requests').select('*',{count:'exact',head:true}),
      db.from('release_list_subscribers').select('*',{count:'exact',head:true}).eq('status','subscribed'),
      db.from('client_requests').select('id,booking_stage,status'),
      db.from('booking_payments').select('amount,currency,status,paid_at')
    ]);
    for(const result of [bookingRows,paymentRows,subscriberRows,bookingCount,subscriberCount,openCount,paidRows]) if(result.error) throw result.error;

    const allBookings=bookingRows.data||[], allPayments=paymentRows.data||[], allSubscribers=subscriberRows.data||[];
    const openBookings=(openCount.data||[]).filter(x=>!closedStages.includes(String(x.booking_stage||x.status||'').toLowerCase())).length;
    const paidTransactions=(paidRows.data||[]).filter(x=>String(x.status).toLowerCase()==='paid'||x.paid_at);
    const revenueByCurrency=paidTransactions.reduce((totals,x)=>{
      const currency=String(x.currency||'USD').toUpperCase();
      totals[currency]=(totals[currency]||0)+Number(x.amount||0);
      return totals;
    },{});

    $('metric-bookings').textContent=bookingCount.count??0;
    $('metric-open').textContent=openBookings;
    $('metric-revenue').textContent=formatRevenue(revenueByCurrency);
    $('metric-subscribers').textContent=subscriberCount.count??0;

    $('bookings-body').innerHTML=allBookings.map(x=>row([
      date(x.created_at),
      esc(x.company_name||x.client_name||'—'),
      esc(x.project_name||x.project_type||'—'),
      esc(x.event_date||'—'),
      stageSelect(x),
      pill(x.payment_status||'unpaid'),
      followUpLinks(x)
    ])).join('')||empty(7);
    $('payments-body').innerHTML=allPayments.map(x=>row([
      date(x.paid_at||x.created_at), esc(x.payment_type||'—'), money(x.amount,x.currency), pill(x.status||'pending'), esc(x.description||'—')
    ])).join('')||empty(5);
    $('subscribers-body').innerHTML=allSubscribers.map(x=>row([
      date(x.subscribed_at), esc(x.first_name||'—'), esc(x.email), esc(x.country||'—'), pill(x.welcome_sent_at?'sent':'pending')
    ])).join('')||empty(5);

    $('bookings-status').textContent=`${allBookings.length} most recent`;
    $('payments-status').textContent=`${allPayments.length} most recent`;
    $('subscribers-status').textContent=`${allSubscribers.length} most recent`;
  }

  async function handleStageChange(event){
    const select=event.target.closest('[data-booking-stage]');
    if(!select) return;
    const previous=select.dataset.previous;
    select.disabled=true;
    select.title='Saving…';
    const {error}=await db.from('client_requests').update({booking_stage:select.value,updated_at:new Date().toISOString()}).eq('id',select.dataset.bookingId);
    if(error){
      select.value=previous;
      select.title=error.message;
      select.classList.add('error');
      window.setTimeout(()=>select.classList.remove('error'),2200);
    }else{
      select.dataset.previous=select.value;
      select.title='Saved';
      select.classList.add('success');
      window.setTimeout(()=>select.classList.remove('success'),1400);
      await loadDashboard();
    }
    select.disabled=false;
  }

  function stageSelect(x){
    const value=String(x.booking_stage||x.status||'new').toLowerCase();
    const options=stages.map(stage=>`<option value="${stage}"${stage===value?' selected':''}>${esc(label(stage))}</option>`).join('');
    return `<select class="pipeline-select" data-booking-stage data-booking-id="${esc(x.id)}" data-previous="${esc(value)}" aria-label="Update booking stage for ${esc(x.client_name||x.company_name||'client')}">${options}</select>`;
  }

  function followUpLinks(x){
    const subject=`The Grei Show booking follow-up — ${x.project_name||x.project_type||'your request'}`;
    const body=`Hello ${x.client_name||'there'},\n\nThank you for your request regarding ${x.project_name||x.project_type||'your project'}. I am following up with the next steps.\n\nBest,\nThe Grei Show`;
    const links=[];
    if(x.email) links.push(`<a class="quick-link" href="mailto:${encodeURIComponent(x.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}">Email</a>`);
    const phone=String(x.whatsapp||x.phone||'').replace(/\D/g,'');
    if(phone) links.push(`<a class="quick-link" href="https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(body)}" target="_blank" rel="noopener">WhatsApp</a>`);
    return `<div class="quick-links">${links.join('')||'<span class="muted">No contact</span>'}</div>`;
  }

  function row(cells){return `<tr>${cells.map(v=>`<td>${v}</td>`).join('')}</tr>`;}
  function empty(cols){return `<tr><td colspan="${cols}" class="muted">No records yet.</td></tr>`;}
  function pill(v){return `<span class="pill">${esc(label(String(v)))}</span>`;}
  function label(v){return String(v||'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
  function date(v){return v?esc(new Date(v).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})):'—';}
  function money(v,c='USD'){return new Intl.NumberFormat(undefined,{style:'currency',currency:c||'USD'}).format(Number(v||0));}
  function formatRevenue(totals){
    const entries=Object.entries(totals);
    if(!entries.length) return money(0,'USD');
    return entries.map(([currency,amount])=>money(amount,currency)).join(' · ');
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
})();
