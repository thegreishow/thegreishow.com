window.WHITE_LINE_DATA = {
  talent: [],
  castingCalls: []
};

/*
  WHITE LINE CONTENT MANAGEMENT
  --------------------------------
  Approved talent and casting calls now load from Supabase when configured.
  The arrays above remain as a safe fallback while the database is being connected.
*/

(() => {
  const STORAGE_PREFIX = "whiteLineDraft:";
  const WHATSAPP_NUMBER = "18768832197";

  const ready = (callback) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  };

  ready(() => {
    const talentForm = document.getElementById("talent-form");
    const clientForm = document.getElementById("client-form");
    if (!talentForm || !clientForm) return;

    injectStyles();
    addAgencyNotice();
    addFormUtilities(talentForm, "talent");
    addFormUtilities(clientForm, "client");
    addConsent(talentForm, "I confirm that the information and media I submit are mine to share and may be reviewed by White Line Entertainment.");
    addConsent(clientForm, "I confirm that this is a genuine project enquiry and that final rates, usage, availability and terms must be agreed in writing.");
    addTalentChecklist(talentForm);
    addClientGuidance(clientForm);
    addFloatingContact();
    removeExpiredCastingCalls();
    improveExternalLinks();
  });

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .wl-agency-notice{margin:0 0 26px;padding:18px 20px;border:1px solid rgba(216,255,99,.32);border-radius:18px;background:rgba(216,255,99,.08);color:#cbd6df;line-height:1.6}
      .wl-agency-notice strong{color:#f5f7fb}
      .wl-form-tools{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
      .wl-mini-button{min-height:40px;padding:0 14px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.04);color:#f5f7fb;font-weight:800;cursor:pointer}
      .wl-mini-button:hover{border-color:rgba(216,255,99,.55);background:rgba(216,255,99,.1)}
      .wl-save-status{display:flex;align-items:center;color:#9eabba;font-size:.82rem}
      .wl-consent{display:flex;align-items:flex-start;gap:10px;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:14px;color:#b9c4cf;line-height:1.5}
      .wl-consent input{width:auto!important;margin-top:4px;accent-color:#d8ff63}
      .wl-checklist{margin:16px 0 0;padding:18px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(255,255,255,.025)}
      .wl-checklist h4{margin:0 0 9px}.wl-checklist ul{margin:0;padding-left:20px;color:#9eabba;line-height:1.7}
      .wl-floating-contact{position:fixed;right:18px;bottom:18px;z-index:950;display:flex;align-items:center;gap:9px;min-height:50px;padding:0 18px;border-radius:999px;background:#d8ff63;color:#071018;font-weight:950;text-decoration:none;box-shadow:0 12px 35px rgba(0,0,0,.35)}
      .wl-floating-contact:hover{transform:translateY(-2px)}
      .wl-required-note{margin:10px 0 0;color:#9eabba;font-size:.82rem}
      .wl-database-status{display:grid;gap:4px;margin:0 0 20px;padding:15px 17px;border:1px solid rgba(255,255,255,.12);border-radius:15px;background:rgba(255,255,255,.025)}
      .wl-database-status strong{color:#f5f7fb}.wl-database-status span{color:#9eabba;line-height:1.5}
      .wl-database-status[data-state="success"]{border-color:rgba(216,255,99,.4);background:rgba(216,255,99,.08)}
      .wl-database-status[data-state="warning"]{border-color:rgba(255,215,145,.4)}
      .wl-database-status[data-state="error"],.wl-message[data-state="error"]{border-color:rgba(255,115,115,.5);background:rgba(255,90,90,.08)}
      .wl-message[data-state="success"]{border-color:rgba(216,255,99,.45);background:rgba(216,255,99,.08)}
      .wl-submit:disabled{opacity:.65;cursor:wait}
      @media(max-width:620px){.wl-floating-contact{right:11px;bottom:11px;padding:0 15px}.wl-floating-contact span{display:none}}
    `;
    document.head.appendChild(style);
  }

  function addAgencyNotice() {
    const section = document.querySelector("#join .wl-wrap");
    const tabs = document.querySelector("#join .wl-tabs");
    if (!section || !tabs) return;
    const notice = document.createElement("div");
    notice.className = "wl-agency-notice";
    notice.innerHTML = "<strong>Agency notice:</strong> Submitting a profile does not guarantee representation or work. Booking requests are subject to talent availability, agreed fees, usage terms and written confirmation.";
    section.insertBefore(notice, tabs);
  }

  function addFormUtilities(form, key) {
    const storageKey = STORAGE_PREFIX + key;
    const panel = form.querySelector(".wl-form-grid");
    if (!panel) return;
    restoreDraft(form, storageKey);

    const tools = document.createElement("div");
    tools.className = "wl-field full wl-form-tools";
    tools.innerHTML = `<button class="wl-mini-button" type="button" data-save>Save draft</button><button class="wl-mini-button" type="button" data-clear>Clear form</button><span class="wl-save-status" aria-live="polite">Drafts are stored only on this device.</span>`;
    panel.appendChild(tools);

    const status = tools.querySelector(".wl-save-status");
    let timer;
    form.addEventListener("input", () => {
      clearTimeout(timer);
      status.textContent = "Unsaved changes…";
      timer = setTimeout(() => {
        saveDraft(form, storageKey);
        status.textContent = "Draft saved on this device.";
      }, 700);
    });

    tools.querySelector("[data-save]").addEventListener("click", () => {
      saveDraft(form, storageKey);
      status.textContent = "Draft saved on this device.";
    });

    tools.querySelector("[data-clear]").addEventListener("click", () => {
      if (!window.confirm("Clear this form and remove its saved draft?")) return;
      form.reset();
      localStorage.removeItem(storageKey);
      status.textContent = "Form and saved draft cleared.";
    });
  }

  function saveDraft(form, storageKey) {
    const values = {};
    form.querySelectorAll("input, select, textarea").forEach((field) => {
      if (!field.name || field.type === "submit") return;
      if (field.type === "checkbox") {
        values[field.name] ||= [];
        if (field.checked) values[field.name].push(field.value || true);
      } else {
        values[field.name] = field.value;
      }
    });
    try { localStorage.setItem(storageKey, JSON.stringify(values)); } catch (error) { console.warn("White Line draft could not be saved.", error); }
  }

  function restoreDraft(form, storageKey) {
    let values;
    try { values = JSON.parse(localStorage.getItem(storageKey) || "null"); } catch { localStorage.removeItem(storageKey); return; }
    if (!values) return;
    form.querySelectorAll("input, select, textarea").forEach((field) => {
      if (!field.name || !(field.name in values)) return;
      if (field.type === "checkbox") field.checked = Array.isArray(values[field.name]) && values[field.name].includes(field.value || true);
      else field.value = values[field.name];
    });
  }

  function addConsent(form, text) {
    const submit = form.querySelector("button[type='submit']")?.closest(".wl-field");
    if (!submit) return;
    const field = document.createElement("div");
    field.className = "wl-field full";
    field.innerHTML = `<label class="wl-consent"><input type="checkbox" name="consent" required><span>${text}</span></label><p class="wl-required-note">Required before submitting.</p>`;
    submit.parentElement.insertBefore(field, submit);
  }

  function addTalentChecklist(form) {
    const submit = form.querySelector("button[type='submit']")?.closest(".wl-field");
    if (!submit) return;
    const checklist = document.createElement("div");
    checklist.className = "wl-field full wl-checklist";
    checklist.innerHTML = "<h4>Prepare these materials</h4><ul><li>Clear headshot and full-body image links</li><li>Résumé, EPK or model comp card where applicable</li><li>Performance reel, portfolio or social links</li><li>Guardian contact for applicants under 18</li></ul>";
    submit.parentElement.insertBefore(checklist, submit);
  }

  function addClientGuidance(form) {
    const brief = form.querySelector("#brief");
    if (brief) brief.placeholder = "Include deliverables, call time, expected duration, wardrobe, transport, usage period, territories and any exclusivity.";
    const budget = form.querySelector("#budget");
    if (budget) budget.placeholder = "Example: JMD $50,000 total or negotiable";
    const usage = form.querySelector("#usage");
    if (usage) usage.placeholder = "Example: Instagram + YouTube, Jamaica, 3 months";
  }

  function addFloatingContact() {
    const message = encodeURIComponent("Hello White Line Entertainment, I would like to discuss talent or a casting project.");
    const link = document.createElement("a");
    link.className = "wl-floating-contact";
    link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "Contact White Line Entertainment on WhatsApp");
    link.innerHTML = "◉ <span>WhatsApp White Line</span>";
    document.body.appendChild(link);
  }

  function removeExpiredCastingCalls() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    window.WHITE_LINE_DATA.castingCalls = window.WHITE_LINE_DATA.castingCalls.filter((call) => {
      if (String(call.status).toLowerCase() === "closed") return false;
      if (!call.deadline) return true;
      const deadline = new Date(`${call.deadline}T23:59:59`);
      return Number.isNaN(deadline.getTime()) || deadline >= today;
    });
  }

  function improveExternalLinks() {
    document.querySelectorAll("a[target='_blank']").forEach((link) => {
      const rel = new Set((link.rel || "").split(/\s+/).filter(Boolean));
      rel.add("noopener"); rel.add("noreferrer"); link.rel = [...rel].join(" ");
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  Promise.resolve()
    .then(() => loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"))
    .then(() => loadScript("assets/js/whiteline-supabase-config.js"))
    .then(() => loadScript("assets/js/whiteline-database.js"))
    .catch((error) => console.error("White Line database scripts failed to load", error));
})();
