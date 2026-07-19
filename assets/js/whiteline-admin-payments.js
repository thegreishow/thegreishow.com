(() => {
  const config = window.WHITE_LINE_PAYMENTS || {};
  const supabaseConfig = window.WHITE_LINE_SUPABASE || {};
  if (!window.supabase?.createClient || !supabaseConfig.url || !supabaseConfig.anonKey) return;

  const db = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
  const providers = {
    paypal: { label: 'PayPal', url: config.paypalUrl || '' },
    wise: { label: 'Wise', url: config.wiseUrl || '' },
    payoneer: { label: 'Payoneer', url: config.payoneerUrl || '' },
    bank: { label: 'Bank transfer', url: '' }
  };
  let initialized = false;

  const observer = new MutationObserver(decorateRequests);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', decorateRequests, { once: true });

  function decorateRequests() {
    if (!document.getElementById('requests')) return;
    if (!initialized) {
      initialized = true;
      injectStyles();
    }

    document.querySelectorAll('#requests .card').forEach((card) => {
      if (card.dataset.paymentControls) return;
      const source = card.querySelector('[data-table="client_requests"][data-id]');
      if (!source?.dataset.id) return;
      card.dataset.paymentControls = 'true';
      addPaymentControls(card, source.dataset.id);
    });
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .payment-panel{margin-top:14px;padding:14px;border:1px solid rgba(216,255,99,.22);border-radius:14px;background:rgba(216,255,99,.04)}
      .payment-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:10px}
      .payment-grid label{font-size:.76rem}.payment-grid input,.payment-grid select{padding:10px}
      .payment-summary{display:grid;gap:4px;margin-top:10px;font-size:.86rem;color:#c7d1dc}
      .payment-message{width:100%;min-height:170px;margin-top:10px}
      .payment-provider-note{margin-top:8px;font-size:.76rem;color:#9eabba}
      @media(max-width:860px){.payment-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:560px){.payment-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  async function addPaymentControls(card, requestId) {
    const panel = document.createElement('section');
    panel.className = 'payment-panel';
    panel.innerHTML = `
      <strong>Payment gateway</strong>
      <p class="payment-provider-note">Create professional payment instructions for PayPal, Wise, Payoneer or bank transfer. Payments are confirmed manually in this dashboard.</p>
      <div class="payment-summary" data-payment-summary><span>Loading payment details…</span></div>
      <div class="payment-grid">
        <label>Quote amount<input data-quote type="number" min="1" step="0.01" placeholder="1000"></label>
        <label>Deposit %<input data-deposit type="number" min="1" max="100" step="0.01" value="50"></label>
        <label>Currency<select data-currency><option value="USD">USD</option><option value="JMD">JMD</option><option value="GBP">GBP</option><option value="EUR">EUR</option><option value="CAD">CAD</option></select></label>
        <label>Method<select data-provider><option value="paypal">PayPal</option><option value="wise">Wise</option><option value="payoneer">Payoneer</option><option value="bank">Bank transfer</option></select></label>
      </div>
      <div class="actions">
        <button type="button" class="primary" data-create-deposit>Prepare deposit request</button>
        <button type="button" data-create-balance>Prepare balance request</button>
        <button type="button" data-mark-deposit>Mark deposit received</button>
        <button type="button" data-mark-paid>Mark fully paid</button>
        <button type="button" data-refresh-payments>Refresh</button>
      </div>
      <textarea class="payment-message" data-payment-message readonly hidden aria-label="Prepared payment message"></textarea>
      <div class="actions" data-message-actions hidden>
        <button type="button" data-copy-message>Copy instructions</button>
        <button type="button" data-open-provider>Open payment provider</button>
      </div>
    `;
    card.appendChild(panel);

    panel.querySelector('[data-create-deposit]').onclick = () => prepareRequest(panel, requestId, 'deposit');
    panel.querySelector('[data-create-balance]').onclick = () => prepareRequest(panel, requestId, 'balance');
    panel.querySelector('[data-mark-deposit]').onclick = () => markReceived(panel, requestId, 'deposit');
    panel.querySelector('[data-mark-paid]').onclick = () => markReceived(panel, requestId, 'paid');
    panel.querySelector('[data-refresh-payments]').onclick = () => loadPaymentState(panel, requestId);
    panel.querySelector('[data-copy-message]').onclick = () => copyPreparedMessage(panel);
    panel.querySelector('[data-open-provider]').onclick = () => openProvider(panel);
    await loadPaymentState(panel, requestId);
  }

  async function loadPaymentState(panel, requestId) {
    const summary = panel.querySelector('[data-payment-summary]');
    const { data: request, error } = await db
      .from('client_requests')
      .select('quoted_amount,currency,deposit_percent,amount_paid,payment_status,name,email,event_type,event_date')
      .eq('id', requestId)
      .single();

    if (error) {
      summary.innerHTML = `<span>${escapeHtml(error.message || 'Could not load payment details.')}</span>`;
      return;
    }

    panel.dataset.clientName = request.name || 'Client';
    panel.dataset.clientEmail = request.email || '';
    panel.dataset.eventType = request.event_type || 'booking';
    panel.dataset.eventDate = request.event_date || '';
    panel.querySelector('[data-quote]').value = request.quoted_amount ?? '';
    panel.querySelector('[data-deposit]').value = request.deposit_percent ?? 50;
    panel.querySelector('[data-currency]').value = request.currency || 'USD';

    const quote = Number(request.quoted_amount || 0);
    const paid = Number(request.amount_paid || 0);
    const balance = Math.max(quote - paid, 0);
    summary.innerHTML = `<span>Status: <strong>${escapeHtml(request.payment_status || 'unpaid')}</strong></span><span>Paid: ${money(paid, request.currency)} · Balance: ${money(balance, request.currency)}</span>`;
  }

  async function prepareRequest(panel, requestId, paymentType) {
    const quote = Number(panel.querySelector('[data-quote]').value);
    const depositPercent = Number(panel.querySelector('[data-deposit]').value || 50);
    const currency = panel.querySelector('[data-currency]').value;
    const providerKey = panel.querySelector('[data-provider]').value;
    const provider = providers[providerKey];

    if (!Number.isFinite(quote) || quote <= 0) return alert('Enter a valid quote amount first.');
    if (!Number.isFinite(depositPercent) || depositPercent <= 0 || depositPercent > 100) return alert('Deposit percentage must be between 1 and 100.');

    const { data: current, error: readError } = await db
      .from('client_requests')
      .select('amount_paid')
      .eq('id', requestId)
      .single();
    if (readError) return alert(readError.message);

    const paid = Number(current.amount_paid || 0);
    const amount = paymentType === 'deposit'
      ? Math.max((quote * depositPercent) / 100 - paid, 0)
      : Math.max(quote - paid, 0);
    if (amount <= 0) return alert('There is no outstanding amount for this payment request.');

    const update = await db.from('client_requests').update({
      quoted_amount: quote,
      currency,
      deposit_percent: depositPercent,
      payment_status: paid > 0 ? 'partially_paid' : 'payment_requested'
    }).eq('id', requestId);
    if (update.error) return alert(update.error.message);

    const reference = `WLE-${String(requestId).slice(0, 8).toUpperCase()}`;
    const methodDetails = providerKey === 'bank'
      ? (config.bankInstructions || 'Reply to this message to receive the appropriate bank-transfer details.')
      : (provider.url ? `Payment link: ${provider.url}` : `Reply to this message for the current ${provider.label} payment details.`);
    const label = paymentType === 'deposit' ? 'booking deposit' : 'remaining balance';
    const message = [
      `Hello ${panel.dataset.clientName || 'there'},`,
      '',
      `Your White Line Entertainment ${label} is ${money(amount, currency)}.`,
      `Booking reference: ${reference}`,
      `Payment method: ${provider.label}`,
      methodDetails,
      '',
      `Please include the booking reference with your payment and send the receipt or transaction confirmation to ${config.confirmationEmail || 'the White Line booking team'}.`,
      '',
      'Your booking is confirmed only after White Line verifies the payment. Thank you.'
    ].join('\n');

    panel.dataset.providerUrl = provider.url || '';
    const field = panel.querySelector('[data-payment-message]');
    field.value = message;
    field.hidden = false;
    panel.querySelector('[data-message-actions]').hidden = false;
    await copyPreparedMessage(panel);
    await loadPaymentState(panel, requestId);
    alert(`${provider.label} ${label} instructions prepared and copied.`);
  }

  async function markReceived(panel, requestId, status) {
    const quote = Number(panel.querySelector('[data-quote]').value);
    const depositPercent = Number(panel.querySelector('[data-deposit]').value || 50);
    const currency = panel.querySelector('[data-currency]').value;
    if (!Number.isFinite(quote) || quote <= 0) return alert('Enter the confirmed quote amount first.');

    const amountPaid = status === 'paid' ? quote : (quote * depositPercent) / 100;
    const paymentStatus = status === 'paid' ? 'paid' : 'deposit_paid';
    if (!confirm(`Mark this booking as ${paymentStatus.replace('_', ' ')} for ${money(amountPaid, currency)}?`)) return;

    const { error } = await db.from('client_requests').update({
      quoted_amount: quote,
      currency,
      deposit_percent: depositPercent,
      amount_paid: amountPaid,
      payment_status: paymentStatus
    }).eq('id', requestId);
    if (error) return alert(error.message);
    await loadPaymentState(panel, requestId);
  }

  async function copyPreparedMessage(panel) {
    const message = panel.querySelector('[data-payment-message]').value;
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      panel.querySelector('[data-payment-message]').select();
      document.execCommand('copy');
    }
  }

  function openProvider(panel) {
    const url = panel.dataset.providerUrl;
    if (!url) return alert('No direct link is configured for this method. Use the copied instructions instead.');
    window.open(url, '_blank', 'noopener');
  }

  function money(value, currency) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(value || 0));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }
})();