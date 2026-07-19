(() => {
  const config = window.WHITE_LINE_SUPABASE || {};
  const db = window.supabase.createClient(config.url, config.anonKey);
  let observer;

  document.addEventListener('DOMContentLoaded', () => {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;
    injectReviewPanel(dashboard);
    observer = new MutationObserver(addPortalButtons);
    observer.observe(dashboard, { childList: true, subtree: true });
    addPortalButtons();
    db.auth.onAuthStateChange((_event, session) => { if (session) loadPendingChanges(); });
  });

  function injectReviewPanel(dashboard) {
    if (document.getElementById('portal-review-panel')) return;
    const panel = document.createElement('section');
    panel.id = 'portal-review-panel';
    panel.className = 'panel';
    panel.innerHTML = '<div class="section-head"><div><h2>Talent portal submissions</h2><p class="muted">Review changes submitted by signed-in talent before updating the public roster.</p></div><button id="refresh-portal-changes">Refresh</button></div><div id="portal-change-list" class="cards"><p class="muted">Sign in to load submissions.</p></div>';
    dashboard.appendChild(panel);
    document.getElementById('refresh-portal-changes').addEventListener('click', loadPendingChanges);
  }

  function addPortalButtons() {
    document.querySelectorAll('#talent-profiles .card').forEach((card) => {
      if (card.querySelector('[data-enable-portal]')) return;
      const idSource = card.querySelector('[data-id]');
      if (!idSource?.dataset.id) return;
      const button = document.createElement('button');
      button.dataset.enablePortal = idSource.dataset.id;
      button.textContent = 'Enable portal';
      button.addEventListener('click', enablePortal);
      (card.querySelector('.actions') || card).appendChild(button);
    });
  }

  async function enablePortal(event) {
    const profileId = event.currentTarget.dataset.enablePortal;
    const email = window.prompt('Enter the exact email this talent will use to create their portal account:');
    if (!email) return;
    event.currentTarget.disabled = true;
    const { error } = await db.from('talent_profiles').update({ contact_email: email.trim().toLowerCase(), portal_enabled: true }).eq('id', profileId);
    event.currentTarget.disabled = false;
    if (error) return alert(error.message);
    alert(`Portal access enabled for ${email}. Send them the talent portal login link.`);
  }

  async function loadPendingChanges() {
    const host = document.getElementById('portal-change-list');
    if (!host) return;
    host.innerHTML = '<p class="muted">Loading…</p>';
    const { data, error } = await db.from('talent_profile_changes').select('id,talent_profile_id,submitted_by,proposed_data,status,created_at,talent_profiles(full_name,stage_name)').eq('status','pending').order('created_at', { ascending: false });
    if (error) return host.innerHTML = `<p class="muted">${esc(error.message)}</p>`;
    if (!data?.length) return host.innerHTML = '<p class="muted">No pending talent profile changes.</p>';
    host.innerHTML = data.map((row) => {
      const p = row.proposed_data || {};
      const name = row.talent_profiles?.stage_name || row.talent_profiles?.full_name || p.stage_name || p.full_name || 'Talent';
      return `<article class="card"><span class="pill">pending review</span><h3>${esc(name)}</h3><p class="meta">Submitted ${new Date(row.created_at).toLocaleString()}</p><p>${esc(p.short_bio || '')}</p><div class="contact-links">${p.proposed_headshot_path ? `<button data-preview-path="${esc(p.proposed_headshot_path)}">Preview headshot</button>` : ''}${p.proposed_body_image_path ? `<button data-preview-path="${esc(p.proposed_body_image_path)}">Preview body shot</button>` : ''}</div><label>Admin note<textarea data-review-note="${row.id}" placeholder="Optional note to talent"></textarea></label><div class="actions"><button class="primary" data-approve-change="${row.id}" data-profile-id="${row.talent_profile_id}">Approve changes</button><button class="danger" data-reject-change="${row.id}">Reject</button></div></article>`;
    }).join('');
    bindReviewActions(data);
  }

  function bindReviewActions(rows) {
    document.querySelectorAll('[data-preview-path]').forEach((button) => button.addEventListener('click', async () => {
      const { data, error } = await db.storage.from('talent-submissions').createSignedUrl(button.dataset.previewPath, 600);
      if (error) return alert(error.message);
      window.open(data.signedUrl, '_blank', 'noopener');
    }));
    document.querySelectorAll('[data-reject-change]').forEach((button) => button.addEventListener('click', async () => {
      const id = button.dataset.rejectChange;
      const note = document.querySelector(`[data-review-note="${id}"]`)?.value || null;
      const { error } = await db.from('talent_profile_changes').update({ status:'rejected', admin_notes:note, reviewed_at:new Date().toISOString() }).eq('id',id);
      if (error) alert(error.message); else loadPendingChanges();
    }));
    document.querySelectorAll('[data-approve-change]').forEach((button) => button.addEventListener('click', async () => {
      const row = rows.find((item) => item.id === button.dataset.approveChange);
      if (!row) return;
      button.disabled = true;
      try {
        const proposed = { ...(row.proposed_data || {}) };
        if (proposed.proposed_headshot_path) proposed.profile_image_url = await publishImage(proposed.proposed_headshot_path, row.talent_profile_id, 'headshot');
        if (proposed.proposed_body_image_path) proposed.body_image_url = await publishImage(proposed.proposed_body_image_path, row.talent_profile_id, 'body-shot');
        delete proposed.proposed_headshot_path;
        delete proposed.proposed_body_image_path;
        const allowed = ['full_name','stage_name','category','city','short_bio','skills','instagram_url','tiktok_url','youtube_url','facebook_url','x_url','website_url','portfolio_url','availability_status','profile_image_url','body_image_url'];
        const payload = Object.fromEntries(Object.entries(proposed).filter(([key]) => allowed.includes(key)));
        const update = await db.from('talent_profiles').update(payload).eq('id', row.talent_profile_id);
        if (update.error) throw update.error;
        const note = document.querySelector(`[data-review-note="${row.id}"]`)?.value || null;
        const review = await db.from('talent_profile_changes').update({ status:'approved', admin_notes:note, reviewed_at:new Date().toISOString() }).eq('id',row.id);
        if (review.error) throw review.error;
        await loadPendingChanges();
        document.querySelector('[data-refresh]')?.click();
      } catch (error) { alert(error.message); }
      finally { button.disabled = false; }
    }));
  }

  async function publishImage(privatePath, profileId, type) {
    const signed = await db.storage.from('talent-submissions').createSignedUrl(privatePath, 600);
    if (signed.error) throw signed.error;
    const response = await fetch(signed.data.signedUrl);
    if (!response.ok) throw new Error('Could not read submitted image.');
    const blob = await response.blob();
    const extension = privatePath.split('.').pop() || 'jpg';
    const publicPath = `profiles/${profileId}-${type}-${crypto.randomUUID()}.${extension}`;
    const upload = await db.storage.from('talent-media').upload(publicPath, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
    if (upload.error) throw upload.error;
    return db.storage.from('talent-media').getPublicUrl(publicPath).data.publicUrl;
  }

  function esc(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char])); }
})();