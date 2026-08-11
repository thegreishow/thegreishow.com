(() => {
  const CREATE_URL = 'https://dkvbeizjlgxqjuxnlqho.supabase.co/functions/v1/create-tour-checkout';
  const CAPTURE_URL = 'https://dkvbeizjlgxqjuxnlqho.supabase.co/functions/v1/capture-tour-booking';

  const confirmation = document.getElementById('tour-confirmation-status');
  if (confirmation) confirmReturn();

  document.querySelectorAll('form.experience-booking-card').forEach(form => enhanceForm(form));

  function enhanceForm(form) {
    if (form.dataset.directBooking === 'true') return;
    const experienceInput = form.querySelector('input[name="experience"]');
    if (!experienceInput) return;
    form.dataset.directBooking = 'true';

    const firstLabel = form.querySelector('label');
    const identity = document.createElement('div');
    identity.className = 'experience-guest-fields';
    identity.innerHTML = `
      <label>Name<input type="text" name="name" autocomplete="name" placeholder="Your name"></label>
      <label>Email<input type="email" name="email" autocomplete="email" placeholder="you@example.com"></label>
      <label>WhatsApp / phone<input type="tel" name="phone" autocomplete="tel" placeholder="Optional"></label>
      <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
    `;
    firstLabel?.before(identity);

    const button = form.querySelector('button[type="submit"]');
    if (button) button.textContent = 'Continue with PayPal';
    let status = form.querySelector('.experience-checkout-status');
    if (!status) {
      status = document.createElement('p');
      status.className = 'experience-checkout-status experience-fineprint';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      button?.after(status);
    }

    const guests = form.querySelector('[name="guests"]');
    const price = form.querySelector('.experience-price strong');
    if (experienceInput.value === 'judgement-yard' && guests && price) {
      const update = () => { price.textContent = `US$${Number(guests.value || 1) * 50}`; };
      guests.addEventListener('change', update);
      update();
      const small = form.querySelector('.experience-price small');
      if (small) small.textContent = 'total · US$50 per person';
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data.date) return setStatus(status, 'Choose a date first.', true);
      if (experienceInput.value === 'kingston-dub-club') {
        const chosen = new Date(`${data.date}T12:00:00`);
        if (chosen.getDay() !== 0) return setStatus(status, 'Kingston Dub Club bookings are for Sunday nights.', true);
      }
      button && (button.disabled = true);
      setStatus(status, 'Holding your date and opening secure PayPal checkout…');
      try {
        const response = await fetch(CREATE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.url) throw new Error(payload.error || 'Checkout could not be created.');
        try {
          sessionStorage.setItem('ilovekingston_booking', JSON.stringify({ id: payload.bookingId, reference: payload.reference }));
        } catch {}
        window.greiTrack?.('tour_checkout_created', { experience: experienceInput.value, reference: payload.reference });
        location.href = payload.url;
      } catch (error) {
        const message = String(error?.message || error);
        if (/not enabled/i.test(message) && experienceInput.value === 'kingston-dub-club') {
          setStatus(status, 'Sunday dates are ready; the Dub Club direct fare is awaiting publication. Use “Build a private route” for this booking for now.', true);
        } else {
          setStatus(status, message, true);
        }
        button && (button.disabled = false);
      }
    });
  }

  async function confirmReturn() {
    const params = new URLSearchParams(location.search);
    const bookingId = params.get('booking');
    const reference = params.get('ref');
    const orderId = params.get('token');
    if (!bookingId || !orderId) {
      confirmation.innerHTML = '<h2>Booking details missing.</h2><p>Your PayPal payment was not confirmed on this page. If you completed payment, contact us with your PayPal receipt.</p>';
      return;
    }
    confirmation.innerHTML = '<div class="confirmation-spinner" aria-hidden="true"></div><h2>Confirming your booking…</h2><p>We’re verifying the PayPal payment and locking your place.</p>';
    try {
      const response = await fetch(CAPTURE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, reference, orderId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.confirmed) throw new Error(payload.error || 'Payment could not be confirmed.');
      confirmation.innerHTML = `<p class="experience-kicker">Confirmed</p><h2>You're booked.</h2><p>Your iLoveKingston experience is locked in. A confirmation has been sent to the email connected to your PayPal payment.</p><div class="confirmation-details"><strong>${escapeHtml(payload.title)}</strong><span>${escapeHtml(payload.date)} · ${Number(payload.guests)} guest${Number(payload.guests) === 1 ? '' : 's'}</span><span>${escapeHtml(payload.currency)} ${Number(payload.amount).toFixed(2)} paid</span><span>Reference ${escapeHtml(payload.reference)}</span></div><a class="experience-primary-cta" href="/ilovekingston.html">Explore more Kingston</a>`;
      window.greiTrack?.('tour_booking_confirmed', { reference: payload.reference, title: payload.title });
      history.replaceState({}, '', `/experiences/booking-confirmation.html?ref=${encodeURIComponent(payload.reference)}`);
    } catch (error) {
      confirmation.innerHTML = `<p class="experience-kicker">Payment check</p><h2>We need to verify this one.</h2><p>${escapeHtml(error?.message || 'Your payment could not be verified automatically.')}</p><p>If PayPal shows the payment as completed, keep your receipt and contact us. We can reconcile it using your booking reference.</p><a class="experience-primary-cta" href="/connect.html?interest=kingston-experience">Contact iLoveKingston</a>`;
    }
  }

  function setStatus(el, message, error = false) {
    if (!el) return;
    el.textContent = message;
    el.dataset.tone = error ? 'error' : 'info';
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }
})();
