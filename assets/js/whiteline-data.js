window.WHITE_LINE_DATA = window.WHITE_LINE_DATA || { talent: [], castingCalls: [] };

(() => {
  const STORAGE_PREFIX = "whiteLineDraft:";
  const ready = (fn) => document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", fn, { once: true })
    : fn();

  ready(() => {
    const talentForm = document.getElementById("talent-form");
    const clientForm = document.getElementById("client-form");
    injectStyles();
    addNotice();
    if (talentForm) {
      addConsent(talentForm, "I confirm that the information and media I submit are mine to share and may be reviewed by White Line Entertainment.");
      addDraftTools(talentForm, "talent");
    }
    if (clientForm) {
      addConsent(clientForm, "I confirm that this is a genuine project enquiry and that final rates, usage, availability and terms must be agreed in writing.");
      addDraftTools(clientForm, "client");
    }
    addFloatingContact();
  });

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .wl-agency-notice{margin:0 0 26px;padding:18px 20px;border:1px solid rgba(216,255,99,.32);border-radius:18px;background:rgba(216,255,99,.08);color:#cbd6df;line-height:1.6}
      .wl-agency-notice strong{color:#f5f7fb}.wl-form-tools{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
      .wl-mini-button{min-height:40px;padding:0 14px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.04);color:#f5f7fb;font-weight:800;cursor:pointer}
      .wl-save-status{display:flex;align-items:center;color:#9eabba;font-size:.82rem}.wl-consent{display:flex;align-items:flex-start;gap:10px;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:14px;color:#b9c4cf;line-height:1.5}
      .wl-consent input{width:auto!important;margin-top:4px;accent-color:#d8ff63}.wl-floating-contact{position:fixed;right:18px;bottom:18px;z-index:950;display:flex;align-items:center;gap:9px;min-height:50px;padding:0 18px;border-radius:999px;background:#d8ff63;color:#071018;font-weight:950;text-decoration:none;box-shadow:0 12px 35px rgba(0,0,0,.35)}
      .wl-database-status{display:grid;gap:4px;margin:0 0 20px;padding:15px 17px;border:1px solid rgba(255,255,255,.12);border-radius:15px;background:rgba(255,255,255,.025)}
      .wl-database-status[data-state="success"]{border-color:rgba(216,255,99,.4);background:rgba(216,255,99,.08)}.wl-message[data-state="error"]{border-color:rgba(255,115,115,.5);background:rgba(255,90,90,.08)}
      @media(max-width:620px){.wl-floating-contact span{display:none}}
    `;
    document.head.appendChild(style);
  }

  function addNotice() {
    const section = document.querySelector("#join .wl-wrap");
    const tabs = document.querySelector("#join .wl-tabs");
    if (!section || !tabs || section.querySelector(".wl-agency-notice")) return;
    const notice = document.createElement("div");
    notice.className = "wl-agency-notice";
    notice.innerHTML = "<strong>Agency notice:</strong> Submitting a profile does not guarantee representation or work. Applications and uploaded media remain private until White Line approves and publishes a roster profile.";
    section.insertBefore(notice, tabs);
  }

  function addConsent(form, text) {
    if (form.querySelector("[name='consent']")) return;
    const submit = form.querySelector("button[type='submit']")?.closest(".wl-field");
    if (!submit) return;
    const field = document.createElement("div");
    field.className = "wl-field full";
    field.innerHTML = `<label class="wl-consent"><input type="checkbox" name="consent" required><span>${text}</span></label>`;
    submit.parentElement.insertBefore(field, submit);
  }

  function addDraftTools(form, key) {
    const grid = form.querySelector(".wl-form-grid");
    if (!grid || grid.querySelector(".wl-form-tools")) return;
    restore(form, STORAGE_PREFIX + key);
    const tools = document.createElement("div");
    tools.className = "wl-field full wl-form-tools";
    tools.innerHTML = `<button class="wl-mini-button" type="button" data-save>Save draft</button><button class="wl-mini-button" type="button" data-clear>Clear form</button><span class="wl-save-status">Drafts stay on this device.</span>`;
    grid.appendChild(tools);
    tools.querySelector("[data-save]").onclick = () => save(form, STORAGE_PREFIX + key);
    tools.querySelector("[data-clear]").onclick = () => { form.reset(); localStorage.removeItem(STORAGE_PREFIX + key); };
  }

  function save(form, key) {
    const values = {};
    form.querySelectorAll("input:not([type='file']),select,textarea").forEach((field) => {
      if (!field.name) return;
      if (field.type === "checkbox") { values[field.name] ||= []; if (field.checked) values[field.name].push(field.value || true); }
      else values[field.name] = field.value;
    });
    localStorage.setItem(key, JSON.stringify(values));
  }

  function restore(form, key) {
    let values;
    try { values = JSON.parse(localStorage.getItem(key) || "null"); } catch { return; }
    if (!values) return;
    form.querySelectorAll("input:not([type='file']),select,textarea").forEach((field) => {
      if (!field.name || !(field.name in values)) return;
      if (field.type === "checkbox") field.checked = Array.isArray(values[field.name]) && values[field.name].includes(field.value || true);
      else field.value = values[field.name];
    });
  }

  function addFloatingContact() {
    if (document.querySelector(".wl-floating-contact")) return;
    const link = document.createElement("a");
    link.className = "wl-floating-contact";
    link.href = "https://wa.me/18768832197?text=Hello%20White%20Line%20Entertainment%2C%20I%20would%20like%20to%20discuss%20talent%20or%20a%20casting%20project.";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.innerHTML = "◉ <span>WhatsApp White Line</span>";
    document.body.appendChild(link);
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
    .then(() => loadScript("assets/js/whiteline-media-enhancements.js"))
    .catch((error) => console.error("White Line scripts failed to load", error));
})();