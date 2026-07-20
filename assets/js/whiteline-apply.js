(() => {
  const config = window.WHITE_LINE_SUPABASE || {};
  if (!window.supabase?.createClient || !config.url || !config.anonKey || !window.WhiteLineUpload) return;
  const db = window.supabase.createClient(config.url, config.anonKey);
  const form = document.getElementById('talent-form');
  const message = document.getElementById('talent-message');
  const params = new URLSearchParams(location.search);
  const castingTitle = params.get('title');

  if (castingTitle) {
    document.getElementById('application-type').value = `Casting: ${castingTitle}`;
    const context = document.getElementById('application-context');
    context.hidden = false;
    context.textContent = `You are applying for: ${castingTitle}`;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    const data = new FormData(form);
    const disciplines = [...form.querySelectorAll('[name="discipline"]:checked')].map((input) => input.value);
    if (!disciplines.length) return show('Select at least one discipline.');

    button.disabled = true;
    show('Uploading your application securely…');
    try {
      const applicationKey = crypto.randomUUID();
      const [headshot, bodyPhoto, resume] = await Promise.all([
        window.WhiteLineUpload(db, data.get('headshot_file'), applicationKey, 'headshot', true),
        window.WhiteLineUpload(db, data.get('body_file'), applicationKey, 'full-body', true),
        window.WhiteLineUpload(db, data.get('resume_file'), applicationKey, 'resume', false)
      ]);
      const portfolioText = text(data, 'portfolio');
      const links = portfolioText.split(/\s+/).filter((value) => /^https?:\/\//i.test(value));
      const payload = {
        full_name: text(data, 'name'),
        stage_name: nullable(data, 'stage'),
        email: text(data, 'email').toLowerCase(),
        phone: text(data, 'phone'),
        whatsapp: text(data, 'phone'),
        category: disciplines[0],
        secondary_categories: disciplines.slice(1),
        city: text(data, 'city'),
        country: text(data, 'country'),
        biography: text(data, 'bio'),
        experience: text(data, 'experience'),
        skills: disciplines.join(', '),
        portfolio_url: links[0] || null,
        instagram_url: nullable(data, 'instagram'),
        tiktok_url: nullable(data, 'tiktok'),
        youtube_url: nullable(data, 'youtube'),
        headshot_url: headshot,
        full_body_photo_url: bodyPhoto,
        resume_url: resume,
        available_for_travel: data.get('available_for_travel') === 'on',
        has_passport: data.get('has_passport') === 'on',
        consent_to_store_data: true,
        consent_to_contact: true,
        consent_to_marketing: false,
        media_consent: true,
        rights_confirmation: true,
        age_confirmation: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: '2026-07-19-v1',
        commission_rate: 15,
        source: text(data, 'application_type') || 'General talent profile',
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        status: 'new'
      };
      const { error } = await db.from('talent_applications').insert(payload);
      if (error) throw error;
      form.reset();
      show('Application received. White Line will review your profile and contact you by email or WhatsApp.');
    } catch (error) {
      show(error.message || 'Your application could not be submitted.');
    } finally {
      button.disabled = false;
    }
  });

  function text(data, name) { return String(data.get(name) || '').trim(); }
  function nullable(data, name) { return text(data, name) || null; }
  function show(value) { message.hidden = false; message.textContent = value; }
})();