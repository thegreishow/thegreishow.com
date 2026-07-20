(function () {
  const form = document.getElementById('project-inquiry');
  const interest = document.getElementById('interest');
  const date = document.getElementById('date');
  const prepared = document.getElementById('prepared-inquiry');
  const emailLink = document.getElementById('prepared-email-link');
  const serviceCards = [...document.querySelectorAll('[data-interest]')];
  if (!form || !interest || !date || !prepared || !emailLink) return;

  const SUPABASE_URL = 'https://dkvbeizjlgxqjuxnlqho.supabase.co';
  const SUPABASE_KEY = 'sb_publishable__oa3dCkTrm635ZbAtZTSww_FgVlYGwS';
  let dbPromise;

  const interestAliases = {
    'creative-project': 'creative-direction',
    production: 'music-production',
    performance: 'live-performance',
    'The Grei Show — Live Performance': 'live-performance',
    'DJ Set': 'dj-set',
    'Music Production / Studio Session': 'studio-session',
    'Studio Session / Production Consultation': 'studio-session',
    'Photography / Video': 'photo-video',
    'Talent Booking — White Line Entertainment': 'talent-booking',
    'Kingston Experience / Tour': 'kingston-experience'
  };

  const hasInterest = value => [...interest.options].some(option => option.value === value);

  function syncServiceCards(value) {
    serviceCards.forEach(card => card.setAttribute('aria-pressed', String(card.dataset.interest === value)));
  }

  function selectInterest(value, scrollToForm) {
    if (!hasInterest(value)) return;
    interest.value = value;
    syncServiceCards(value);
    if (scrollToForm) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      interest.focus({ preventScroll: true });
    }
  }

  const params = new URLSearchParams(window.location.search);
  const requestedInterest = params.get('interest') || params.get('service');
  const selectedInterest = interestAliases[requestedInterest] || requestedInterest;
  if (selectedInterest) selectInterest(selectedInterest, false);

  serviceCards.forEach(card => card.addEventListener('click', () => selectInterest(card.dataset.interest, true)));
  interest.addEventListener('change', () => syncServiceCards(interest.value));

  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  date.min = today.toISOString().split('T')[0];

  document.querySelector('.connect-hero p:last-child')?.replaceChildren(document.createTextNode('Choose what you need, share the essential details, and submit one clear request for review. You will receive an automatic confirmation by email.'));
  document.querySelector('.form-note')?.replaceChildren(document.createTextNode('Your request is submitted securely to White Line Entertainment.'));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const button = form.querySelector('[type="submit"]');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Submitting securely…';
    prepared.hidden = true;

    const fields = new FormData(form);
    const serviceLabel = interest.options[interest.selectedIndex].text;
    const details = [
      fields.get('brief'),
      `Timeline: ${fields.get('timeline')}`,
      `Budget range: ${fields.get('budget')}`,
      `Preferred date: ${fields.get('date') || 'Not applicable'}`,
      `Location / venue: ${fields.get('location') || 'Not applicable'}`,
      `WhatsApp / phone: ${fields.get('phone') || 'Not provided'}`
    ].join('\n\n');

    try {
      const db = await getDatabase();
      if (interest.value === 'press') {
        const { error } = await db.from('whiteline_contact_inquiries').insert({
          inquiry_type: 'press',
          name: String(fields.get('name')).trim(),
          email: String(fields.get('email')).trim().toLowerCase(),
          subject: `Press inquiry — ${serviceLabel}`,
          message: details,
          source: 'thegreishow.com/connect',
          user_agent: navigator.userAgent,
          referrer: document.referrer || null
        });
        if (error) throw error;
      } else if (['sync-licensing', 'partnership', 'other'].includes(interest.value)) {
        const { error } = await db.from('whiteline_contact_inquiries').insert({
          inquiry_type: 'general',
          name: String(fields.get('name')).trim(),
          email: String(fields.get('email')).trim().toLowerCase(),
          subject: `${serviceLabel} inquiry`,
          message: details,
          source: 'thegreishow.com/connect',
          user_agent: navigator.userAgent,
          referrer: document.referrer || null
        });
        if (error) throw error;
      } else {
        const { error } = await db.from('client_requests').insert({
          client_name: String(fields.get('name')).trim(),
          email: String(fields.get('email')).trim().toLowerCase(),
          phone: String(fields.get('phone') || '').trim() || null,
          whatsapp: String(fields.get('phone') || '').trim() || null,
          project_type: serviceLabel,
          project_name: serviceLabel,
          project_description: details,
          event_date: fields.get('date') || null,
          location: String(fields.get('location') || '').trim() || null,
          currency: 'USD',
          preferred_contact_method: fields.get('phone') ? 'WhatsApp' : 'Email',
          consent_to_store_data: true,
          consent_to_contact: true,
          source: 'thegreishow.com/connect',
          user_agent: navigator.userAgent,
          referrer: document.referrer || null
        });
        if (error) throw error;
      }

      form.reset();
      syncServiceCards('');
      prepared.hidden = false;
      prepared.querySelector('p').textContent = 'Request received. Check your inbox for an automatic confirmation from White Line Entertainment.';
      emailLink.hidden = true;
      prepared.focus();
      window.greiTrack?.('grei_lead_submitted', { service: interest.value });
    } catch (error) {
      const subject = `Inquiry - ${serviceLabel}`;
      const body = `Name: ${fields.get('name')}\nEmail: ${fields.get('email')}\n\n${details}`;
      emailLink.href = `mailto:bookings@thegreishow.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      emailLink.hidden = false;
      emailLink.textContent = 'Send by email instead';
      prepared.hidden = false;
      prepared.querySelector('p').textContent = 'The secure form could not submit this request. Your information has not been lost; use the email option below.';
      prepared.focus();
      console.error('White Line inquiry submission failed', error);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });

  function getDatabase() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const connect = () => {
        try { resolve(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)); }
        catch (error) { reject(error); }
      };
      if (window.supabase?.createClient) return connect();
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.crossOrigin = 'anonymous';
      script.onload = connect;
      script.onerror = () => reject(new Error('Could not load secure form service.'));
      document.head.appendChild(script);
    });
    return dbPromise;
  }
})();
