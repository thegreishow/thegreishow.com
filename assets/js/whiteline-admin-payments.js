(() => {
  const config = window.WHITE_LINE_SUPABASE || {};
  if (!window.supabase?.createClient || !config.url || !config.anonKey) return;

  const db = window.supabase.createClient(config.url, config.anonKey);
  const functionUrl = `${config.url}/functions/v1/create-booking-checkout`;
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
      .payment-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:10px}
      .payment-grid label{font-size:.76rem}.payment-grid input,.payment-grid select{padding:10px}
      .payment-summary{display:grid;gap:4px;margin-top:10px;font-size:.86rem;color:#c7d1dc}
      .payment-history{display:grid;gap:6px;margin-top:10px}.payment-row{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.035);font-size:.8rem}
      .payment-url{width:100%;margin-top:8px;padding:9px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:#03070d;color:#fff}
      @media(max-width:680px){.payment-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  async function addPaymentControls(card, requestId) {
    const panel = document.createElement('section');
    panel.className = 'payment-panel';
    panel.innerHTML = `
      <strong>Stripe payments</strong>
      <div class="payment-summary" data-payment-summary><span>Loading payment details…</span></div>
      <div class="payment-grid">
        <label>Quote amount<input data-quote type="number" min="1" step="0.01" placeholder="1000"></label>
        <label>Deposit %<input data-deposit type="number" min="1" max="100" step="0.01" value="50"></label>
        <label>Currency<select data-currency><option value="USD">USD</option><option value="JMD">JMD</option></select></label>
      </div>
      <div class="actions">
        <button type="button" class="primary" data-create-deposit>Create deposit checkout</button>
        <button type="button" data-create-balance>Create balance checkout</button>
        <button type="button" data-refresh-payments>Refresh payments</button>
      </div>
      <input class="payment-url" data-payment-url readonly hidden aria-label="Generated Stripe payment link">
      <div class="payment-history" data-payment-history></div>
    `;
    card.appendChild(panel);

    panel.querySelector('[data-create-deposit]').onclick = () => createCheckout(panel, requestId, 'deposit');
    panel.querySelector('[data-create-balance]').onclick = () => createCheckout(panel, requestId, 'balance');
    panel.querySelector('[data-refresh-payments]').onclick = () => loadPayments(panel, requestId);
    await loadPayments(panel, requestId);
  }

  async function loadPayments(panel, requestId) {
    const summary = panel.querySelector('[data-payment-summary]');
    const history = panel.querySelector('[data-payment-history]');
    const [{ data: request, error: requestError }, { data: payments, error: paymentsError }] = await Promise.all([
      db.from('client_requests').select('quoted_amount,currency,deposit_percent,amount_paid,payment_status').eq('id', requestId).single(),
      db.from('booking_payments').select('id,payment_type,amount,currency,status,stripe_payment_link_url,paid_at,created_at').eq('client_request_id', requestId).order('created_at', { ascending: false })
    ]);

    if (requestError || paymentsError) {
      summary.innerHTML = `<span>${escapeHtml(requestError?.message || paymentsError?.message || 'Could not load payments.')}</span>`;
      return;
    }

    panel.querySelector('[data-quote]').value = request.quoted_amount ?? '';
    panel.querySelector('[data-deposit]').value = request.deposit_percent ?? 50;
    panel.querySelector('[data-currency]').value = request.currency || 'USD';

    const quote = Number(request.quoted_amount || 0);
    const paid = Number(request.amount_paid || 0);
    const balance = Math.max(quote - paid, 0);
    summary.innerHTML = `<span>Payment status: <strong>${escapeHtml(request.payment_status || 'unpaid')}</strong></span><span>Paid: ${money(paid, request.currency)} · Balance: ${money(balance, request.currency)}</span>`;

    history.innerHTML = payments?.length
      ? payments.map((payment) => `<div class="payment-row"><span>${escapeHtml(payment.payment_type)} · ${money(payment.amount, payment.currency)}</span><strong>${escapeHtml(payment.status)}</strong></div>`).join('')
      : '<span class="muted">No Stripe payment requests yet.</span>';
  }

  async function createCheckout(panel, requestId, paymentType) {
    const quote = Number(panel.querySelector('[data-quote]').value);
    const depositPercent = Number(panel.querySelector('[data-deposit]').value || 50);
    const currency = panel.querySelector('[data-currency]').value;
    if (!Number.isFinite(quote) || quote <= 0) return alert('Enter a valid quote amount first.');
    if (!Number.isFinite(depositPercent) || depositPercent <= 0 || depositPercent > 100) return alert('Deposit percentage must be between 1 and 100.');

    const button = panel.querySelector(paymentType === 'deposit' ? '[data-create-deposit]' : '[data-create-balance]');
    button.disabled = true;
    button.textContent = 'Creating checkout…';

    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session?.access_token) throw new Error('Your admin session has expired. Sign in again.');

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          clientRequestId: requestId,
          paymentType,
          quoteAmount: quote,
          depositPercent,
          currency
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not create Stripe checkout.');

      const urlField = panel.querySelector('[data-payment-url]');
      urlField.value = payload.url;
      urlField.hidden = false;
      await navigator.clipboard?.writeText(payload.url).catch(() => {});
      await loadPayments(panel, requestId);
      alert('Stripe checkout created. The payment link was copied to your clipboard.');
    } catch (error) {
      alert(error.message || 'Could not create Stripe checkout.');
    } finally {
      button.disabled = false;
      button.textContent = paymentType === 'deposit' ? 'Create deposit checkout' : 'Create balance checkout';
    }
  }

  function money(value, currency) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(value || 0));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }
})();
