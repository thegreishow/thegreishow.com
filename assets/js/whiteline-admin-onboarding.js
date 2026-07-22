(() => {
  const config = window.WHITE_LINE_SUPABASE || {};
  if (!window.supabase?.createClient || !config.url || !config.anonKey) return;
  const db = window.WHITE_LINE_DB || window.supabase.createClient(config.url, config.anonKey);
  const signedCache = new Map();

  document.addEventListener("click", async (event) => {
    const button = event.target.closest('[data-table="talent_applications"][data-status="approved"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!confirm("Approve this application, create the talent profile and enable portal signup?")) return;

    button.disabled = true;
    const original = button.textContent;
    button.textContent = "Approving…";

    try {
      const { data: profileId, error } = await db.rpc("approve_talent_application", { p_application_id: button.dataset.id });
      if (error) throw error;

      const { data: profile, error: profileError } = await db
        .from("talent_profiles")
        .select("slug,stage_name,full_name")
        .eq("id", profileId)
        .single();
      if (profileError) throw profileError;

      const name = profile.stage_name || profile.full_name || "Talent";
      const publicUrl = `${window.location.origin}/${profile.slug}`;
      alert(`${name} approved. Public profile: ${publicUrl}\n\nThe applicant can now create a portal account using the approved email.`);
      window.location.reload();
    } catch (error) {
      alert(error.message || "Could not approve this application.");
      button.disabled = false;
      button.textContent = original;
    }
  }, true);

  const observer = new MutationObserver(enhanceApplicationCards);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", enhanceApplicationCards, { once: true });

  async function enhanceApplicationCards() {
    document.querySelectorAll("#applications .card .actions button").forEach((button) => {
      if (button.textContent.trim() === "Approve + create draft profile") button.remove();
    });

    const cards = [...document.querySelectorAll("#applications .card")].filter((card) => !card.dataset.privateMediaLoaded);
    for (const card of cards) {
      const applicationId = card.querySelector('[data-table="talent_applications"][data-id]')?.dataset.id;
      if (!applicationId) continue;
      card.dataset.privateMediaLoaded = "true";

      try {
        const { data, error } = await db
          .from("talent_applications")
          .select("headshot_url,full_body_photo_url,resume_url,commission_rate,terms_version,terms_accepted_at")
          .eq("id", applicationId)
          .single();
        if (error) throw error;

        const links = [];
        for (const [path, label] of [
          [data.headshot_url, "Private headshot"],
          [data.full_body_photo_url, "Private full-body photo"],
          [data.resume_url, "Private résumé / EPK"]
        ]) {
          if (!path) continue;
          const url = await signedUrl(path);
          if (url) links.push(`<a class="button" target="_blank" rel="noopener noreferrer" href="${escapeHtml(url)}">${label}</a>`);
        }

        const contactLinks = card.querySelector(".contact-links");
        if (contactLinks && links.length) contactLinks.insertAdjacentHTML("beforeend", links.join(""));
        const meta = document.createElement("p");
        meta.className = "meta";
        meta.textContent = `Terms: ${data.terms_version || "not recorded"} · Commission: ${Number(data.commission_rate || 15)}%${data.terms_accepted_at ? ` · Accepted ${new Date(data.terms_accepted_at).toLocaleString()}` : ""}`;
        card.querySelector(".actions")?.before(meta);
      } catch (error) {
        console.warn("[White Line admin onboarding]", error);
      }
    }
  }

  async function signedUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    if (signedCache.has(path)) return signedCache.get(path);
    const { data, error } = await db.storage.from("talent-submissions").createSignedUrl(path, 3600);
    if (error) return "";
    signedCache.set(path, data.signedUrl);
    return data.signedUrl;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }
})();
