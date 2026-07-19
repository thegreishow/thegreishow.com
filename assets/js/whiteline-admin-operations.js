(() => {
  const config = window.WHITE_LINE_SUPABASE || {};
  if (!window.supabase?.createClient || !config.url || !config.anonKey) return;
  const db = window.supabase.createClient(config.url, config.anonKey);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const slugify = (value) => String(value || "talent").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "talent";

  let initialized = false;
  let profileCache = new Map();

  const observer = new MutationObserver(() => decorate());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", decorate, { once: true });

  function decorate() {
    if (!document.getElementById("dashboard")) return;
    if (!initialized) {
      initialized = true;
      injectStyles();
      injectEditor();
    }
    decorateApplications();
    decorateProfiles();
    decorateRequests();
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .ops-modal{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.82)}
      .ops-modal[hidden]{display:none!important}.ops-dialog{width:min(850px,100%);max-height:92vh;overflow:auto;padding:24px;border:1px solid rgba(255,255,255,.14);border-radius:22px;background:#09131f;color:#f5f7fb}
      .ops-head{display:flex;justify-content:space-between;gap:18px;align-items:center;margin-bottom:18px}.ops-head h2{margin:0}.ops-close{font-size:1.5rem}
      .ops-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ops-grid .full{grid-column:1/-1}.ops-grid label{display:grid;gap:6px;color:#aab6c3;font-size:.84rem}.ops-grid input,.ops-grid textarea,.ops-grid select{width:100%;padding:12px;border:1px solid rgba(255,255,255,.13);border-radius:12px;background:#03070d;color:#fff}.ops-grid textarea{min-height:110px}.ops-footer{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.ops-note{padding:11px 13px;border:1px solid rgba(216,255,99,.28);border-radius:12px;background:rgba(216,255,99,.07);color:#c7d1dc}.ops-stage{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.ops-stage button{font-size:.78rem;padding:8px 10px}.ops-danger{border-color:#ff8585!important}.ops-editing{outline:2px solid rgba(216,255,99,.45)}
      @media(max-width:680px){.ops-grid{grid-template-columns:1fr}.ops-grid .full{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  function injectEditor() {
    const modal = document.createElement("div");
    modal.id = "ops-modal";
    modal.className = "ops-modal";
    modal.hidden = true;
    modal.innerHTML = `<section class="ops-dialog" role="dialog" aria-modal="true" aria-labelledby="ops-title"><div class="ops-head"><h2 id="ops-title">Edit talent profile</h2><button id="ops-close" class="ops-close" type="button">×</button></div><form id="ops-profile-form" class="ops-grid"><input name="id" type="hidden"><label>Full name<input name="full_name" required></label><label>Stage name<input name="stage_name"></label><label>Category<input name="category" required></label><label>City<input name="city"></label><label class="full">Short bio<textarea name="short_bio"></textarea></label><label>Headshot URL<input name="profile_image_url" type="url"></label><label>Body-shot URL<input name="body_image_url" type="url"></label><label>Instagram<input name="instagram_url" type="url"></label><label>TikTok<input name="tiktok_url" type="url"></label><label>YouTube<input name="youtube_url" type="url"></label><label>Facebook<input name="facebook_url" type="url"></label><label>X / Twitter<input name="x_url" type="url"></label><label>Website<input name="website_url" type="url"></label><label class="full">Portfolio / reel<input name="portfolio_url" type="url"></label><label>Status<select name="status"><option value="draft">Draft</option><option value="approved">Approved</option><option value="inactive">Inactive</option></select></label><label>Featured<select name="featured"><option value="false">No</option><option value="true">Yes</option></select></label><label class="full">Private notes<textarea name="internal_notes"></textarea></label><div class="full ops-footer"><button class="primary" type="submit">Save changes</button><button id="ops-delete" class="ops-danger" type="button">Delete profile</button><span id="ops-status" class="muted"></span></div></form></section>`;
    document.body.appendChild(modal);
    document.getElementById("ops-close").onclick = closeEditor;
    modal.addEventListener("click", (event) => { if (event.target === modal) closeEditor(); });
    document.getElementById("ops-profile-form").addEventListener("submit", saveProfile);
    document.getElementById("ops-delete").addEventListener("click", deleteProfile);
  }

  function decorateApplications() {
    document.querySelectorAll('#applications .card').forEach((card) => {
      if (card.dataset.opsApplication) return;
      const source = card.querySelector('[data-table="talent_applications"][data-id]');
      if (!source) return;
      card.dataset.opsApplication = source.dataset.id;
      const actions = card.querySelector(".actions") || card;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary";
      button.textContent = "Approve + create draft profile";
      button.onclick = () => convertApplication(source.dataset.id, button);
      actions.appendChild(button);
    });
  }

  function decorateProfiles() {
    document.querySelectorAll('#talent-profiles .card').forEach((card) => {
      if (card.dataset.opsProfile) return;
      const source = card.querySelector('[data-feature][data-id], [data-table="talent_profiles"][data-id]');
      if (!source) return;
      card.dataset.opsProfile = source.dataset.id;
      const actions = card.querySelector(".actions") || card;
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Edit";
      edit.onclick = () => openEditor(source.dataset.id, card);
      actions.appendChild(edit);
    });
  }

  function decorateRequests() {
    document.querySelectorAll('#requests .card').forEach((card) => {
      if (card.dataset.opsRequest) return;
      const source = card.querySelector('[data-table="client_requests"][data-id]');
      if (!source) return;
      const id = source.dataset.id;
      card.dataset.opsRequest = id;
      const stage = document.createElement("div");
      stage.className = "ops-stage";
      stage.innerHTML = `<button type="button" data-stage="new">New</button><button type="button" data-stage="contacted">Contacted</button><button type="button" data-stage="quoted">Quote sent</button><button type="button" data-stage="negotiating">Negotiating</button><button type="button" data-stage="confirmed">Confirmed</button><button type="button" data-stage="completed">Completed</button><button type="button" data-stage="cancelled">Cancelled</button><button type="button" data-note>Private note</button>`;
      stage.querySelectorAll("[data-stage]").forEach((button) => button.onclick = () => setBookingStage(id, button.dataset.stage, button));
      stage.querySelector("[data-note]").onclick = () => editRequestNote(id);
      card.appendChild(stage);
    });
  }

  async function convertApplication(id, button) {
    button.disabled = true;
    button.textContent = "Creating draft…";
    try {
      const { data: application, error } = await db.from("talent_applications").select("*").eq("id", id).single();
      if (error) throw error;
      const existing = await db.from("talent_profiles").select("id").eq("source_application_id", id).maybeSingle();
      if (existing.data) throw new Error("A roster profile has already been created from this application.");

      const payload = {
        source_application_id: id,
        full_name: application.full_name,
        stage_name: application.stage_name || null,
        slug: `${slugify(application.stage_name || application.full_name)}-${Date.now().toString().slice(-5)}`,
        category: application.category,
        secondary_categories: application.secondary_categories || [],
        city: application.city || null,
        short_bio: application.biography || "",
        instagram_url: application.instagram_url || null,
        tiktok_url: application.tiktok_url || null,
        youtube_url: application.youtube_url || null,
        facebook_url: application.facebook_url || null,
        x_url: application.x_url || null,
        portfolio_url: application.portfolio_url || null,
        status: "draft",
        featured: false,
        internal_notes: `Created from application ${id}. Review photos and details before publishing.`
      };
      const { error: insertError } = await db.from("talent_profiles").insert(payload);
      if (insertError) throw insertError;
      await db.from("talent_applications").update({ status: "approved" }).eq("id", id);
      alert("Draft roster profile created. Open Talent roster to review and publish it.");
      document.querySelector('[data-view="talent"]')?.click();
      document.querySelector('[data-refresh]')?.click();
    } catch (error) {
      alert(error.message || "Could not create the roster profile.");
    } finally {
      button.disabled = false;
      button.textContent = "Approve + create draft profile";
    }
  }

  async function openEditor(id, card) {
    card?.classList.add("ops-editing");
    const status = document.getElementById("ops-status");
    status.textContent = "Loading…";
    const { data, error } = await db.from("talent_profiles").select("*").eq("id", id).single();
    if (error) { card?.classList.remove("ops-editing"); return alert(error.message); }
    profileCache.set(id, data);
    const form = document.getElementById("ops-profile-form");
    Object.entries(data).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (!field) return;
      field.value = typeof value === "boolean" ? String(value) : (value ?? "");
    });
    status.textContent = "";
    document.getElementById("ops-modal").hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeEditor() {
    document.getElementById("ops-modal").hidden = true;
    document.body.style.overflow = "";
    document.querySelectorAll(".ops-editing").forEach((node) => node.classList.remove("ops-editing"));
  }

  async function saveProfile(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const id = String(values.get("id") || "");
    const payload = {};
    ["full_name","stage_name","category","city","short_bio","profile_image_url","body_image_url","instagram_url","tiktok_url","youtube_url","facebook_url","x_url","website_url","portfolio_url","status","internal_notes"].forEach((name) => {
      const value = String(values.get(name) || "").trim();
      payload[name] = value || null;
    });
    payload.featured = values.get("featured") === "true";
    const status = document.getElementById("ops-status");
    status.textContent = "Saving…";
    const { error } = await db.from("talent_profiles").update(payload).eq("id", id);
    if (error) return status.textContent = error.message;
    status.textContent = "Saved.";
    setTimeout(() => { closeEditor(); document.querySelector('[data-refresh]')?.click(); }, 450);
  }

  async function deleteProfile() {
    const form = document.getElementById("ops-profile-form");
    const id = form.elements.namedItem("id").value;
    const name = form.elements.namedItem("stage_name").value || form.elements.namedItem("full_name").value;
    if (!confirm(`Delete ${name}? This removes the database profile but does not automatically delete stored image files.`)) return;
    const { error } = await db.from("talent_profiles").delete().eq("id", id);
    if (error) return alert(error.message);
    closeEditor();
    document.querySelector('[data-refresh]')?.click();
  }

  async function setBookingStage(id, stage, button) {
    button.disabled = true;
    const { error } = await db.from("client_requests").update({ booking_stage: stage }).eq("id", id);
    button.disabled = false;
    if (error) return alert(error.message);
    button.closest(".card")?.querySelectorAll(".ops-stage [data-stage]").forEach((item) => item.classList.toggle("primary", item.dataset.stage === stage));
  }

  async function editRequestNote(id) {
    const current = await db.from("client_requests").select("internal_notes").eq("id", id).single();
    if (current.error) return alert(current.error.message);
    const note = prompt("Private White Line note for this booking request:", current.data?.internal_notes || "");
    if (note === null) return;
    const { error } = await db.from("client_requests").update({ internal_notes: note.trim() || null }).eq("id", id);
    if (error) alert(error.message);
  }
})();
