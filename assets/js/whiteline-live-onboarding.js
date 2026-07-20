(() => {
  if (!/\bwhiteline\.html$/.test(location.pathname) && !location.pathname.endsWith('/whiteline')) return;

  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  let db;
  let liveTalent = [];

  boot().catch((error) => console.error('[White Line onboarding]', error));

  async function boot() {
    await ensureScript(SUPABASE_CDN, () => window.supabase?.createClient);
    await ensureScript('assets/js/whiteline-supabase-config.js', () => window.WHITE_LINE_SUPABASE?.url);
    const config = window.WHITE_LINE_SUPABASE || {};
    if (!config.url || !config.anonKey) throw new Error('Supabase configuration is unavailable.');
    db = window.supabase.createClient(config.url, config.anonKey);
    enhanceApplicationForm();
    await loadLiveRoster();
  }

  function ensureScript(src, ready) {
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find((script) => script.src.includes(src));
      if (existing) {
        const timer = setInterval(() => { if (ready()) { clearInterval(timer); resolve(); } }, 30);
        setTimeout(() => { clearInterval(timer); ready() ? resolve() : reject(new Error(`Could not load ${src}`)); }, 10000);
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => ready() ? resolve() : reject(new Error(`Could not initialize ${src}`));
      script.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.appendChild(script);
    });
  }

  function enhanceApplicationForm() {
    const form = document.getElementById('talent-form');
    if (!form || form.dataset.liveOnboarding === 'true') return;
    form.dataset.liveOnboarding = 'true';
    const submitWrap = form.querySelector('.wl-submit')?.closest('.wl-field');
    if (!submitWrap) return;

    const fields = document.createElement('div');
    fields.className = 'wl-field full';
    fields.innerHTML = `
      <div class="wl-form-grid">
        <div class="wl-field"><label for="talent-headshot">Headshot</label><input id="talent-headshot" name="headshot_file" type="file" accept="image/jpeg,image/png,image/webp" required><span class="wl-note">JPG, PNG or WebP · maximum 8 MB.</span></div>
        <div class="wl-field"><label for="talent-body-photo">Full-body photo</label><input id="talent-body-photo" name="body_file" type="file" accept="image/jpeg,image/png,image/webp" required><span class="wl-note">JPG, PNG or WebP · maximum 8 MB.</span></div>
        <div class="wl-field full"><label for="talent-resume">Résumé, EPK or comp card (optional)</label><input id="talent-resume" name="resume_file" type="file" accept="application/pdf,.doc,.docx"></div>
      </div>
      <div class="wl-checks" style="margin-top:16px">
        <label class="wl-check"><input name="media_consent" type="checkbox" required> I authorize White Line to display approved profile information and submitted media.</label>
        <label class="wl-check"><input name="rights_confirmation" type="checkbox" required> I confirm I own or have permission to submit this media.</label>
        <label class="wl-check"><input name="data_consent" type="checkbox" required> I consent to White Line storing my application and contacting me.</label>
        <label class="wl-check"><input name="age_confirmation" type="checkbox" required> I am 18 or older, or I have authorization from a parent or legal guardian.</label>
        <label class="wl-check" style="grid-column:1/-1"><input name="terms_accepted" type="checkbox" required> I accept the <a href="whiteline-talent-terms.html" target="_blank" rel="noopener"><strong>White Line Talent Terms</strong></a>, including the standard 15% agency commission on bookings secured or negotiated through White Line.</label>
      </div>`;
    submitWrap.before(fields);
    form.querySelector('.wl-submit').textContent = 'Submit application';
    const oldNote = submitWrap.querySelector('.wl-note');
    if (oldNote) oldNote.textContent = 'Your application and files are submitted securely for private White Line review.';
    form.onsubmit = submitApplication;
  }

  async function submitApplication(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.getElementById('talent-message');
    const button = form.querySelector('[type="submit"]');
    const data = new FormData(form);
    const disciplines = [...form.querySelectorAll('[name="discipline"]:checked')].map((input) => input.value);
    if (!disciplines.length) return show(message, 'Select at least one discipline.');
    button.disabled = true;
    show(message, 'Uploading your application securely…');

    try {
      const applicationKey = crypto.randomUUID();
      const [headshotPath, bodyPath, resumePath] = await Promise.all([
        upload(data.get('headshot_file'), applicationKey, 'headshot', true),
        upload(data.get('body_file'), applicationKey, 'full-body', true),
        upload(data.get('resume_file'), applicationKey, 'resume', false)
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
        city: text(data, 'location'),
        country: 'Jamaica',
        biography: text(data, 'bio'),
        experience: text(data, 'experience'),
        skills: disciplines.join(', '),
        portfolio_url: links[0] || null,
        headshot_url: headshotPath,
        full_body_photo_url: bodyPath,
        resume_url: resumePath,
        available_for_travel: false,
        has_passport: false,
        consent_to_store_data: true,
        consent_to_contact: true,
        consent_to_marketing: false,
        media_consent: true,
        rights_confirmation: true,
        age_confirmation: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: '2026-07-19-v1',
        commission_rate: 15,
        source: text(data, 'castingInterest') || 'General talent profile',
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        status: 'new'
      };
      const { error } = await db.from('talent_applications').insert(payload);
      if (error) throw error;
      form.reset();
      show(message, 'Application received. White Line will review your profile and contact you by email or WhatsApp.');
      window.greiTrack?.('whiteline_talent_application', { category: disciplines[0] });
    } catch (error) {
      show(message, error.message || 'Your application could not be submitted. Please try again.');
    } finally {
      button.disabled = false;
    }
  }

  async function upload(file, key, label, required) {
    if (!(file instanceof File) || !file.size) {
      if (required) throw new Error(`Please select your ${label} file.`);
      return null;
    }
    const image = label !== 'resume';
    const allowed = image
      ? ['image/jpeg', 'image/png', 'image/webp']
      : ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) throw new Error(`${label} has an unsupported file type.`);
    if (file.size > 8 * 1024 * 1024) throw new Error(`${label} must be smaller than 8 MB.`);
    const extension = (file.name.split('.').pop() || (image ? 'jpg' : 'pdf')).toLowerCase();
    const path = `applications/${key}/${label}-${crypto.randomUUID()}.${extension}`;
    const { error } = await db.storage.from('talent-submissions').upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    return path;
  }

  async function loadLiveRoster() {
    const { data, error } = await db.from('talent_profiles')
      .select('id,full_name,stage_name,slug,category,secondary_categories,short_bio,city,country,profile_image_url,body_image_url,instagram_url,tiktok_url,youtube_url,facebook_url,x_url,website_url,portfolio_url,skills,featured,display_order,availability_status')
      .eq('status', 'approved')
      .order('featured', { ascending: false })
      .order('display_order', { ascending: true });
    if (error) throw error;
    liveTalent = data || [];
    renderLiveRoster();
    bindLiveRoster();
  }

  function renderLiveRoster() {
    const grid = document.getElementById('talent-grid');
    const count = document.getElementById('talent-count');
    const filters = document.getElementById('talent-filters');
    if (!grid || !count || !filters) return;
    const categories = ['All', ...new Set(liveTalent.flatMap((talent) => [talent.category, ...(talent.secondary_categories || [])]).filter(Boolean))];
    filters.innerHTML = categories.map((category, index) => `<button class="wl-filter${index === 0 ? ' active' : ''}" data-live-filter="${esc(category)}">${esc(category)}</button>`).join('');
    draw('All');
    filters.addEventListener('click', (event) => {
      const button = event.target.closest('[data-live-filter]');
      if (!button) return;
      event.stopImmediatePropagation();
      filters.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
      draw(button.dataset.liveFilter);
    }, true);
  }

  function draw(category) {
    const grid = document.getElementById('talent-grid');
    const count = document.getElementById('talent-count');
    const query = document.getElementById('talent-search')?.value.trim().toLowerCase() || '';
    let rows = liveTalent.filter((talent) => category === 'All' || [talent.category, ...(talent.secondary_categories || [])].includes(category));
    rows = rows.filter((talent) => [talent.full_name, talent.stage_name, talent.city, talent.country, talent.category, talent.short_bio, ...(talent.skills || [])].join(' ').toLowerCase().includes(query));
    count.textContent = `${rows.length} profile${rows.length === 1 ? '' : 's'}`;
    grid.innerHTML = rows.length ? rows.map((talent) => {
      const name = talent.stage_name || talent.full_name;
      const categories = [talent.category, ...(talent.secondary_categories || [])].filter(Boolean);
      return `<article class="talent-card" tabindex="0" role="button" data-live-talent="${talent.id}"><img class="talent-image" src="${esc(talent.profile_image_url || 'assets/img/home-bg.webp')}" alt="${esc(name)}"><div class="talent-body"><h3>${esc(name)}</h3><div class="talent-meta">${esc([talent.city, talent.country].filter(Boolean).join(', ') || 'Jamaica')} · ${esc(talent.availability_status || 'available')}</div><div class="tags">${categories.map((item) => `<span class="tag">${esc(item)}</span>`).join('')}</div></div></article>`;
    }).join('') : '<div class="empty-state"><strong>The founding roster is being curated.</strong>Approved profiles will appear here automatically.</div>';
  }

  function bindLiveRoster() {
    document.getElementById('talent-search')?.addEventListener('input', () => draw(document.querySelector('[data-live-filter].active')?.dataset.liveFilter || 'All'), true);
    document.getElementById('talent-grid')?.addEventListener('click', (event) => {
      const card = event.target.closest('[data-live-talent]');
      if (!card) return;
      event.stopImmediatePropagation();
      openLiveProfile(card.dataset.liveTalent);
    }, true);
  }

  function openLiveProfile(id) {
    const talent = liveTalent.find((item) => item.id === id);
    const modal = document.getElementById('profile-modal');
    const host = document.getElementById('modal-content');
    if (!talent || !modal || !host) return;
    const name = talent.stage_name || talent.full_name;
    host.innerHTML = `<img class="modal-photo" src="${esc(talent.body_image_url || talent.profile_image_url || 'assets/img/home-bg.webp')}" alt="${esc(name)}"><p class="wl-kicker" style="margin-top:22px">${esc([talent.category, ...(talent.secondary_categories || [])].filter(Boolean).join(' · '))}</p><h2 class="wl-heading">${esc(name)}</h2><p class="wl-copy">${esc(talent.short_bio || '')}</p><div class="modal-links">${socialButton(talent.instagram_url, 'Instagram')}${socialButton(talent.tiktok_url, 'TikTok')}${socialButton(talent.youtube_url, 'YouTube')}${socialButton(talent.portfolio_url, 'Portfolio / reel')}<button class="wl-button primary" data-request-live="${esc(name)}">Request talent</button></div>`;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    host.querySelector('[data-request-live]')?.addEventListener('click', (event) => {
      const requested = document.getElementById('needed');
      if (requested) requested.value = event.currentTarget.dataset.requestLive;
      document.getElementById('client-tab')?.click();
      document.getElementById('modal-close')?.click();
      document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  function socialButton(url, label) { return url ? `<a class="wl-button" target="_blank" rel="noopener" href="${esc(url)}">${label}</a>` : ''; }
  function text(data, name) { return String(data.get(name) || '').trim(); }
  function nullable(data, name) { return text(data, name) || null; }
  function show(element, value) { if (element) { element.hidden = false; element.textContent = value; } }
  function esc(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char])); }
})();