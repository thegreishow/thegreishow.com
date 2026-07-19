(() => {
  const config = window.WHITE_LINE_SUPABASE || {};
  const db = window.supabase.createClient(config.url, config.anonKey);
  const $ = (id) => document.getElementById(id);
  let user = null;
  let profile = null;

  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('active', item === button));
    document.querySelectorAll('.view').forEach((view) => { view.hidden = view.id !== `view-${button.dataset.view}`; });
  }));

  $('logout').addEventListener('click', async () => {
    await db.auth.signOut();
    location.href = 'whiteline-talent-login.html';
  });

  $('profile-form').addEventListener('submit', submitProfileChanges);

  init();

  async function init() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return location.href = 'whiteline-talent-login.html';
    user = session.user;

    let { data: account } = await db.from('talent_accounts').select('talent_profile_id,status').eq('user_id', user.id).maybeSingle();
    if (!account) {
      const { error } = await db.rpc('claim_talent_portal');
      if (error) return setPortalStatus(`Portal access is not enabled for ${user.email}. Ask White Line to enable your profile email.`);
      ({ data: account } = await db.from('talent_accounts').select('talent_profile_id,status').eq('user_id', user.id).single());
    }
    if (!account || account.status !== 'active') return setPortalStatus('Your talent portal account is pending or suspended.');

    const { data, error } = await db.from('talent_profiles').select('*').eq('id', account.talent_profile_id).single();
    if (error) return setPortalStatus(error.message);
    profile = data;
    setPortalStatus('Portal connected. Profile updates require White Line approval.');
    populateProfile();
    await Promise.all([loadChanges(), loadCastings(), loadBookings()]);
  }

  function populateProfile() {
    $('welcome-name').textContent = `Welcome, ${profile.stage_name || profile.full_name}`;
    $('profile-summary').innerHTML = `<span class="pill">${esc(profile.status || 'draft')}</span><p><strong>${esc(profile.category || 'Talent')}</strong> · ${esc(profile.city || 'Jamaica')}</p><p class="muted">Availability: ${esc(profile.availability_status || 'available')}</p><div class="photos">${profile.profile_image_url ? `<img src="${esc(profile.profile_image_url)}" alt="Current headshot">` : ''}${profile.body_image_url ? `<img src="${esc(profile.body_image_url)}" alt="Current body shot">` : ''}</div>`;
    const form = $('profile-form');
    const values = {
      full_name: profile.full_name,
      stage_name: profile.stage_name,
      category: profile.category,
      city: profile.city,
      short_bio: profile.short_bio,
      skills: Array.isArray(profile.skills) ? profile.skills.join('\n') : '',
      instagram_url: profile.instagram_url,
      tiktok_url: profile.tiktok_url,
      youtube_url: profile.youtube_url,
      facebook_url: profile.facebook_url,
      x_url: profile.x_url,
      website_url: profile.website_url,
      portfolio_url: profile.portfolio_url,
      availability_status: profile.availability_status || 'available'
    };
    Object.entries(values).forEach(([name, value]) => { if (form.elements[name]) form.elements[name].value = value || ''; });
  }

  async function submitProfileChanges(event) {
    event.preventDefault();
    const button = event.submitter;
    const message = $('profile-message');
    button.disabled = true;
    show(message, 'Preparing your submission…');
    try {
      const form = new FormData(event.currentTarget);
      const proposed = {
        full_name: text(form, 'full_name'),
        stage_name: nullable(form, 'stage_name'),
        category: text(form, 'category'),
        city: nullable(form, 'city'),
        short_bio: text(form, 'short_bio'),
        skills: text(form, 'skills').split(/\n+/).map((x) => x.trim()).filter(Boolean),
        instagram_url: nullable(form, 'instagram_url'),
        tiktok_url: nullable(form, 'tiktok_url'),
        youtube_url: nullable(form, 'youtube_url'),
        facebook_url: nullable(form, 'facebook_url'),
        x_url: nullable(form, 'x_url'),
        website_url: nullable(form, 'website_url'),
        portfolio_url: nullable(form, 'portfolio_url'),
        availability_status: text(form, 'availability_status') || 'available'
      };

      const headshot = $('headshot-file').files?.[0];
      const body = $('body-file').files?.[0];
      if (headshot) proposed.proposed_headshot_path = await uploadPrivate(headshot, 'headshot');
      if (body) proposed.proposed_body_image_path = await uploadPrivate(body, 'body-shot');

      await db.from('talent_profile_changes').update({ status: 'superseded' }).eq('talent_profile_id', profile.id).eq('submitted_by', user.id).eq('status', 'pending');
      const { error } = await db.from('talent_profile_changes').insert({
        talent_profile_id: profile.id,
        submitted_by: user.id,
        proposed_data: proposed,
        status: 'pending'
      });
      if (error) throw error;
      event.currentTarget.reset();
      populateProfile();
      show(message, 'Changes submitted. White Line will review them before your public profile is updated.');
      await loadChanges();
    } catch (error) {
      show(message, error.message || 'Could not submit changes.');
    } finally {
      button.disabled = false;
    }
  }

  async function uploadPrivate(file, type) {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Photos must be JPG, PNG or WebP.');
    if (file.size > 8 * 1024 * 1024) throw new Error('Each photo must be smaller than 8 MB.');
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `portal/${user.id}/${type}-${crypto.randomUUID()}.${extension}`;
    const { error } = await db.storage.from('talent-submissions').upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return path;
  }

  async function loadChanges() {
    const { data, error } = await db.from('talent_profile_changes').select('status,admin_notes,created_at').eq('talent_profile_id', profile.id).order('created_at', { ascending: false }).limit(1);
    $('change-status').innerHTML = error || !data?.length ? '<p class="muted">No profile changes submitted yet.</p>' : `<article class="card"><span class="pill">${esc(data[0].status)}</span><p>Submitted ${date(data[0].created_at)}</p>${data[0].admin_notes ? `<p class="muted">White Line note: ${esc(data[0].admin_notes)}</p>` : ''}</article>`;
  }

  async function loadCastings() {
    const [calls, applications] = await Promise.all([
      db.from('casting_calls').select('id,title,category,location,event_date,application_deadline,compensation,description').eq('status','open').order('application_deadline', { ascending: true }),
      db.from('talent_casting_applications').select('casting_call_id,status').eq('talent_profile_id', profile.id)
    ]);
    if (calls.error) return $('casting-list').innerHTML = `<p class="muted">${esc(calls.error.message)}</p>`;
    const applied = new Map((applications.data || []).map((x) => [x.casting_call_id, x.status]));
    $('casting-list').innerHTML = (calls.data || []).length ? calls.data.map((call) => `<article class="card"><span class="pill">${esc(applied.get(call.id) || 'open')}</span><h3>${esc(call.title)}</h3><p class="meta">${esc(call.category || 'Casting')} · ${esc(call.location || 'Jamaica')}${call.event_date ? ` · ${dateOnly(call.event_date)}` : ''}</p><p>${esc(call.description || '')}</p><p><strong>${esc(call.compensation || 'Compensation in brief')}</strong></p>${applied.has(call.id) ? '<p class="muted">Application already submitted.</p>' : `<textarea data-casting-message="${call.id}" placeholder="Optional note to White Line"></textarea><button class="primary" data-apply-casting="${call.id}">Apply</button>`}</article>`).join('') : '<p class="muted">No open casting calls right now.</p>';
    document.querySelectorAll('[data-apply-casting]').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      const id = button.dataset.applyCasting;
      const message = document.querySelector(`[data-casting-message="${id}"]`)?.value || null;
      const { error } = await db.from('talent_casting_applications').insert({ casting_call_id: id, talent_profile_id: profile.id, user_id: user.id, message });
      if (error) alert(error.message); else await loadCastings();
      button.disabled = false;
    }));
  }

  async function loadBookings() {
    const [requests, responses] = await Promise.all([
      db.from('client_requests').select('id,client_name,company_name,project_type,project_description,event_date,location,requirements,booking_stage').contains('assigned_talent_ids', [profile.id]).order('created_at', { ascending: false }),
      db.from('talent_booking_responses').select('client_request_id,response,message').eq('talent_profile_id', profile.id)
    ]);
    if (requests.error) return $('booking-list').innerHTML = `<p class="muted">${esc(requests.error.message)}</p>`;
    const responseMap = new Map((responses.data || []).map((x) => [x.client_request_id, x]));
    $('booking-list').innerHTML = (requests.data || []).length ? requests.data.map((job) => {
      const current = responseMap.get(job.id);
      return `<article class="card"><span class="pill">${esc(current?.response || 'response needed')}</span><h3>${esc(job.project_type || 'Booking request')}</h3><p class="meta">${esc(job.company_name || job.client_name || 'Client')} · ${esc(job.location || 'Location TBC')}${job.event_date ? ` · ${dateOnly(job.event_date)}` : ''}</p><p>${esc(job.project_description || '')}</p><p class="muted">${esc(job.requirements || '')}</p><select data-booking-response="${job.id}"><option value="available">Available</option><option value="tentative">Tentative</option><option value="unavailable">Unavailable</option></select><textarea data-booking-note="${job.id}" placeholder="Optional note">${esc(current?.message || '')}</textarea><button class="primary" data-save-booking="${job.id}">Save response</button></article>`;
    }).join('') : '<p class="muted">No booking requests have been assigned to you yet.</p>';

    (requests.data || []).forEach((job) => {
      const current = responseMap.get(job.id);
      const select = document.querySelector(`[data-booking-response="${job.id}"]`);
      if (select && current?.response) select.value = current.response;
    });

    document.querySelectorAll('[data-save-booking]').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      const id = button.dataset.saveBooking;
      const payload = {
        client_request_id: id,
        talent_profile_id: profile.id,
        user_id: user.id,
        response: document.querySelector(`[data-booking-response="${id}"]`).value,
        message: document.querySelector(`[data-booking-note="${id}"]`).value || null,
        updated_at: new Date().toISOString()
      };
      const { error } = await db.from('talent_booking_responses').upsert(payload, { onConflict: 'client_request_id,talent_profile_id' });
      if (error) alert(error.message); else await loadBookings();
      button.disabled = false;
    }));
  }

  function setPortalStatus(message) { $('portal-status').textContent = message; }
  function show(element, message) { element.hidden = false; element.textContent = message; }
  function text(data, name) { return String(data.get(name) || '').trim(); }
  function nullable(data, name) { return text(data, name) || null; }
  function date(value) { return value ? new Date(value).toLocaleString() : ''; }
  function dateOnly(value) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString() : ''; }
  function esc(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char])); }
})();