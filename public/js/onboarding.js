/* =========================================================================
   Page « Décrire mon projet » : demande en 5 écrans, une tâche par écran.
   type → description → fichiers → contact → récapitulatif → envoi.
   Le texte saisi est gardé en brouillon sur l'appareil (pas les fichiers).
   ========================================================================= */
(function () {
  "use strict";
  const C = window.SITE_CONFIG;
  const { $, $$, esc, toast, loadScript } = window.UI;
  const form = $("#ob");
  if (!form) return;

  const STEPS = ["type", "desc", "files", "contact", "recap"];
  const DRAFT_KEY = "atelier-demande-v1";
  const MAX_FILES = 5, MAX_TOTAL = 8 * 1024 * 1024;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const TYPES = {
    "3d": { kind: "Modélisation 3D", label: "Impression 3D", placeholder: "Ex. : un support de téléphone pour mon vélo, guidon de 32 mm de diamètre, en noir, résistant au soleil." },
    "laser": { kind: "Création de fichier laser", label: "Découpe laser", placeholder: "Ex. : un panneau prénom « Léa » en 3 couches de contreplaqué, environ 40 × 15 cm, pour une chambre d'enfant." }
  };

  const state = { step: 0, type: null, desc: "", need: "Le fichier et la pièce découpée", when: "", files: [], contact: ["email"], email: "", phone: "", name: "", callTime: "" };

  // ------------------------------------------------------------ brouillon
  const save = () => {
    try {
      const { files, ...rest } = state;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
      $("#obDraft").hidden = !(state.desc || state.email || state.phone);
    } catch (e) { /* stockage indisponible : pas de brouillon */ }
  };
  const loadDraft = () => {
    try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); if (d && typeof d === "object") return d; } catch (e) {}
    return null;
  };
  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} };

  // ------------------------------------------------------------ affichage d'une étape
  const sections = $$(".ob-step", form);
  function show(i, opts = {}) {
    state.step = Math.max(0, Math.min(STEPS.length - 1, i));
    sections.forEach(s => {
      const on = s.dataset.step === STEPS[state.step];
      s.hidden = !on;
      s.classList.toggle("is-back", !!opts.back);
    });
    $("#obCount").textContent = `Étape ${state.step + 1} sur ${STEPS.length}`;
    $("#obBar").style.transform = `scaleX(${(state.step + 1) / STEPS.length})`;
    $("#obBack").hidden = state.step === 0;
    // à l'étape 1, choisir une carte suffit : pas de bouton « Continuer »
    $("#obNext").hidden = state.step === 0;
    $("#obNext").textContent = state.step === STEPS.length - 1 ? "Envoyer ma demande" : (STEPS[state.step] === "files" && !state.files.length ? "Continuer sans fichier" : "Continuer");
    if (STEPS[state.step] === "recap") renderRecap();
    window.track && window.track("demande_etape", STEPS[state.step], true);
    if (STEPS[state.step] === "recap") loadTurnstile();
    if (!opts.silent) {
      const h = sections[state.step].querySelector(".ob-title");
      h.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (opts.replace) history.replaceState({ step: state.step, idx: histIdx }, "", "#" + STEPS[state.step]);
      else if (!opts.fromHistory) history.pushState({ step: state.step, idx: ++histIdx }, "", "#" + STEPS[state.step]);
    }
    if (STEPS[state.step] === "desc") setTimeout(() => $("#obDesc").focus(), 60);
  }
  let histIdx = 0; // nombre d'écrans empilés dans l'historique depuis l'arrivée sur la page
  window.addEventListener("popstate", e => {
    if (e.state && typeof e.state.idx === "number") histIdx = e.state.idx;
    const i = e.state && typeof e.state.step === "number" ? e.state.step : STEPS.indexOf(location.hash.slice(1));
    if (i >= 0 && i <= furthestAllowed()) show(i, { fromHistory: true, back: i < state.step });
  });
  // on ne peut pas sauter une étape non remplie
  function furthestAllowed() {
    if (!state.type) return 0;
    if (state.desc.trim().length < 10) return 1;
    return STEPS.length - 1;
  }

  // ------------------------------------------------------------ 1. type
  function setType(t) {
    state.type = t;
    $$(".ob-choice").forEach(b => b.setAttribute("aria-checked", b.dataset.type === t ? "true" : "false"));
    $("#obDesc").placeholder = TYPES[t].placeholder;
    $("#obNeedWrap").hidden = t !== "laser";
    save();
  }
  // le logo de la carte s'imprime ou se grave, puis on passe à l'écran suivant
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let choosing = false;
  $$(".ob-choice").forEach(b => b.addEventListener("click", () => {
    if (choosing) return;
    setType(b.dataset.type);
    const m = b.querySelector(".logo-morph");
    if (still || !m) { setTimeout(() => show(1), 140); return; }
    choosing = true;
    window.UI.replay(m);
    setTimeout(() => { choosing = false; show(1); }, 900);
  }));

  // ------------------------------------------------------------ 2. description
  const desc = $("#obDesc");
  desc.addEventListener("input", () => {
    state.desc = desc.value;
    $("#obChars").textContent = `${desc.value.length} / 3000`;
    if (desc.value.trim().length >= 10) fieldErr("obDescErr", "");
    save();
  });
  desc.addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); next(); } });
  $$(".chips[data-group]", form).forEach(g => g.addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b) return;
    const key = g.dataset.group;
    const wasOn = b.getAttribute("aria-pressed") === "true";
    $$(".chip", g).forEach(c => { c.classList.remove("is-on"); c.setAttribute("aria-pressed", "false"); });
    // le délai peut être désélectionné, le besoin non
    if (!(wasOn && key === "when")) { b.classList.add("is-on"); b.setAttribute("aria-pressed", "true"); state[key] = b.dataset.v; }
    else state[key] = "";
    save();
  }));

  // ------------------------------------------------------------ 3. fichiers
  const drop = $("#obDrop"), input = $("#obFiles");
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("is-over"); }));
  drop.addEventListener("drop", e => addFiles(e.dataTransfer.files));
  input.addEventListener("change", () => { addFiles(input.files); input.value = ""; });

  const sizeTxt = (b) => b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} Ko` : `${(b / 1048576).toFixed(1).replace(".", ",")} Mo`;
  function addFiles(list) {
    let added = 0, refused = "";
    for (const f of Array.from(list)) {
      const total = state.files.reduce((s, x) => s + x.size, 0);
      if (state.files.length >= MAX_FILES) { refused = `5 fichiers au maximum : « ${f.name} » n'a pas été ajouté.`; break; }
      if (total + f.size > MAX_TOTAL) { refused = `« ${f.name} » dépasse les 8 Mo au total. Ajoutez une version plus légère, ou envoyez-le par email après ma réponse.`; continue; }
      if (state.files.some(x => x.name === f.name && x.size === f.size)) continue;
      state.files.push(f); added++;
    }
    fieldErr("obFilesErr", refused);
    if (added) toast(added > 1 ? `${added} fichiers ajoutés` : "Fichier ajouté");
    renderFiles();
  }
  function renderFiles() {
    const ul = $("#obList");
    ul.innerHTML = state.files.map((f, i) => `
      <li class="ob-file">
        <span class="ob-thumb" data-i="${i}" aria-hidden="true">${/^image\//.test(f.type) ? "" : esc((f.name.split(".").pop() || "").slice(0, 4).toUpperCase())}</span>
        <span class="ob-file-name">${esc(f.name)}<small>${sizeTxt(f.size)}</small></span>
        <button type="button" class="icon-btn" data-rm="${i}" aria-label="Retirer ${esc(f.name)}">×</button>
      </li>`).join("");
    state.files.forEach((f, i) => {
      if (!/^image\//.test(f.type)) return;
      const url = URL.createObjectURL(f);
      const t = ul.querySelector(`.ob-thumb[data-i="${i}"]`);
      t.style.backgroundImage = `url("${url}")`;
    });
    if (STEPS[state.step] === "files") $("#obNext").textContent = state.files.length ? "Continuer" : "Continuer sans fichier";
  }
  $("#obList").addEventListener("click", e => {
    const b = e.target.closest("[data-rm]"); if (!b) return;
    state.files.splice(+b.dataset.rm, 1); renderFiles(); fieldErr("obFilesErr", "");
  });

  // ------------------------------------------------------------ 4. contact
  const PHONE_C = ["phone", "sms", "whatsapp"];
  const LABELS = { email: "Email", phone: "Appel", sms: "SMS", whatsapp: "WhatsApp" };
  function renderContact() {
    $$(".ob-opt").forEach(b => b.setAttribute("aria-pressed", state.contact.includes(b.dataset.c) ? "true" : "false"));
    $("#obEmailWrap").hidden = !state.contact.includes("email");
    $("#obPhoneWrap").hidden = !state.contact.some(c => PHONE_C.includes(c));
    $("#obWhenWrap").hidden = !state.contact.includes("phone");
  }
  $$(".ob-opt").forEach(b => b.addEventListener("click", () => {
    const c = b.dataset.c, on = state.contact.includes(c);
    if (on && state.contact.length === 1) { toast("Gardez au moins un moyen de contact"); return; }
    state.contact = on ? state.contact.filter(x => x !== c) : [...state.contact, c];
    renderContact(); save();
  }));
  const normPhone = (v) => v.replace(/[\s.\-()]/g, "");
  const phoneOk = (v) => /^(\+\d{8,15}|0\d{9})$/.test(normPhone(v));
  [["#obEmail", "email"], ["#obPhone", "phone"], ["#obName", "name"], ["#obCallTime", "callTime"]].forEach(([sel, key]) => {
    const el = $(sel);
    el.addEventListener("input", () => { state[key] = el.value; save(); if (el.getAttribute("aria-invalid") === "true") validateContact(true); });
    el.addEventListener("blur", () => { if (el.value) validateContact(true, key); });
  });
  function validateContact(quiet, only) {
    let ok = true;
    if (state.contact.includes("email") && (!only || only === "email")) {
      const v = state.email.trim();
      const bad = !EMAIL_RE.test(v);
      fieldErr("obEmailErr", bad ? (v ? "Cette adresse semble incomplète, par exemple vous@exemple.fr." : "Indiquez votre email.") : "", "#obEmail");
      if (bad) ok = false;
    }
    if (state.contact.some(c => PHONE_C.includes(c)) && (!only || only === "phone")) {
      const v = state.phone.trim();
      const bad = !phoneOk(v);
      fieldErr("obPhoneErr", bad ? (v ? "Ce numéro semble incomplet : 10 chiffres, ou l'indicatif international (+33…)." : "Indiquez votre numéro.") : "", "#obPhone");
      if (bad) ok = false;
    }
    return ok;
  }

  // ------------------------------------------------------------ 5. récapitulatif
  function contactLine() {
    const parts = [];
    if (state.contact.includes("email")) parts.push(`Email : ${state.email.trim()}`);
    const tel = state.contact.filter(c => PHONE_C.includes(c)).map(c => LABELS[c]);
    if (tel.length) parts.push(`${tel.join(", ")} : ${state.phone.trim()}`);
    return parts;
  }
  function renderRecap() {
    const t = TYPES[state.type];
    const rows = [
      ["Demande", esc(t.label) + (state.type === "laser" ? ` · ${esc(state.need)}` : ""), 0],
      ["Projet", esc(state.desc.trim()).replace(/\n/g, "<br>") + (state.when ? `<br><span class="hint">Délai : ${esc(state.when)}</span>` : ""), 1],
      ["Fichiers", state.files.length ? state.files.map(f => esc(f.name)).join("<br>") : "Aucun", 2],
      ["Contact", (state.name.trim() ? esc(state.name.trim()) + "<br>" : "") + contactLine().map(esc).join("<br>") + (state.callTime.trim() && state.contact.includes("phone") ? `<br><span class="hint">${esc(state.callTime.trim())}</span>` : ""), 3]
    ];
    $("#obRecap").innerHTML = rows.map(([k, v, s]) => `
      <div><dt>${k}</dt><dd>${v}</dd><dd class="ob-edit"><button type="button" class="link-btn" data-goto="${s}">Modifier<span class="sr-only"> : ${k}</span></button></dd></div>`).join("");
  }
  $("#obRecap").addEventListener("click", e => { const b = e.target.closest("[data-goto]"); if (b) show(+b.dataset.goto, { back: true }); });
  $("#obConsent").addEventListener("change", () => { if ($("#obConsent").checked) fieldErr("obConsentErr", ""); });

  function summaryText() {
    return [
      `${TYPES[state.type].kind}`,
      state.type === "laser" ? `Besoin : ${state.need}` : null,
      state.when ? `Délai : ${state.when}` : null,
      `Contact préféré : ${state.contact.map(c => LABELS[c]).join(", ")}`,
      ...contactLine(),
      state.name.trim() ? `Prénom : ${state.name.trim()}` : null,
      state.callTime.trim() && state.contact.includes("phone") ? `Disponibilités : ${state.callTime.trim()}` : null,
      `Fichiers : ${state.files.length ? state.files.map(f => f.name).join(", ") : "aucun"}`
    ].filter(Boolean).join("\n");
  }

  // ------------------------------------------------------------ navigation
  function fieldErr(id, text, inputSel) {
    const el = $("#" + id);
    el.textContent = text; el.hidden = !text;
    if (inputSel) $(inputSel).setAttribute("aria-invalid", text ? "true" : "false");
  }
  function next() {
    const s = STEPS[state.step];
    if (s === "desc") {
      if (state.desc.trim().length < 10) { fieldErr("obDescErr", "Quelques mots de plus : à quoi sert la pièce, ses dimensions, la matière souhaitée…"); desc.focus(); return; }
    }
    if (s === "contact" && !validateContact()) { const bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
    if (s === "recap") return send();
    show(state.step + 1);
  }
  $("#obNext").addEventListener("click", next);
  // « Retour » revient à l'écran précédent, jamais à la page d'avant
  $("#obBack").addEventListener("click", () => {
    if (state.step === 0) return;
    if (histIdx > 0) history.back();
    else show(state.step - 1, { back: true, replace: true });
  });
  form.addEventListener("submit", e => { e.preventDefault(); next(); });
  form.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox") { e.preventDefault(); next(); } });
  $("#obReset").addEventListener("click", () => {
    clearDraft();
    Object.assign(state, { type: null, desc: "", need: "Le fichier et la pièce découpée", when: "", files: [], contact: ["email"], email: "", phone: "", name: "", callTime: "" });
    syncInputs(); renderFiles(); $("#obDraft").hidden = true; show(0);
    toast("Demande effacée");
  });

  // ------------------------------------------------------------ envoi
  let tsLoaded = false;
  function loadTurnstile() {
    if (!C.turnstileSiteKey || tsLoaded) return;
    tsLoaded = true;
    window.onTurnstileLoad = () => window.turnstile.render("#turnstile", { sitekey: C.turnstileSiteKey });
    loadScript("https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit").catch(() => {});
  }
  async function send() {
    if (!$("#obConsent").checked) { fieldErr("obConsentErr", "Cochez la case pour que je puisse utiliser vos coordonnées et vous répondre."); $("#obConsent").focus(); return; }
    if ($("#obWebsite").value) return; // robot
    const fd = new FormData();
    fd.append("kind", TYPES[state.type].kind);
    if (state.contact.includes("email")) fd.append("email", state.email.trim());
    if (state.contact.some(c => PHONE_C.includes(c))) fd.append("phone", normPhone(state.phone));
    fd.append("contact", state.contact.join(","));
    fd.append("name", state.name.trim());
    fd.append("message", state.desc.trim());
    fd.append("summary", summaryText());
    state.files.forEach(f => fd.append("file", f, f.name));
    const ts = document.querySelector('[name="cf-turnstile-response"]');
    if (ts) fd.append("cf-turnstile-response", ts.value);

    const btn = $("#obNext");
    btn.disabled = true; btn.classList.add("is-busy"); btn.textContent = "Envoi en cours…";
    $("#obSendErr").hidden = true;
    try {
      const res = await fetch(C.requestEndpoint, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data.error && res.status === 400) { $("#obSendErr").textContent = data.error; $("#obSendErr").hidden = false; return; }
        throw new Error("HTTP " + res.status);
      }
      clearDraft();
      window.track && window.track("demande_envoyee", state.type === "laser" ? "Découpe laser" : "Impression 3D");
      form.hidden = true; $("#obDone").hidden = false;
      $("#obRef").textContent = data.id || "—";
      const mark = $("#obMark");
      mark.dataset.fx = state.type === "laser" ? "engrave" : "print";
      window.UI.replay(mark);
      if (data.confirmation) $("#obDoneText").insertAdjacentHTML("beforeend", ` Un email de confirmation vient de partir à <strong>${esc(state.email.trim())}</strong>.`);
      window.scrollTo({ top: 0 });
      $("#ob-done-t").focus({ preventScroll: true });
      $(".ob-progress").hidden = true; $("#obCount").hidden = true;
      history.replaceState({ done: true }, "", "#envoyee");
    } catch (err) {
      const text = `${summaryText()}\n\nProjet :\n${state.desc.trim()}`;
      form.hidden = true; $("#obFail").hidden = false;
      $("#obFailText").value = text;
      const to = C.contactEmail || C.legal.email;
      $("#obMail").href = `mailto:${to}?subject=${encodeURIComponent("Demande de projet · " + TYPES[state.type].label)}&body=${encodeURIComponent(text)}`;
      window.scrollTo({ top: 0 });
      $("#ob-fail-t").focus({ preventScroll: true });
    } finally {
      btn.disabled = false; btn.classList.remove("is-busy"); btn.textContent = "Envoyer ma demande";
    }
  }
  $("#obCopy").addEventListener("click", () => {
    const t = $("#obFailText");
    const done = () => toast("Récapitulatif copié");
    if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(done, () => t.select()); else t.select();
  });

  // ------------------------------------------------------------ démarrage
  function syncInputs() {
    desc.value = state.desc; $("#obChars").textContent = `${state.desc.length} / 3000`;
    $("#obEmail").value = state.email; $("#obPhone").value = state.phone; $("#obName").value = state.name; $("#obCallTime").value = state.callTime;
    $$(".chips[data-group]", form).forEach(g => $$(".chip", g).forEach(c => { const on = c.dataset.v === state[g.dataset.group]; c.classList.toggle("is-on", on); c.setAttribute("aria-pressed", on); }));
    $$(".ob-choice").forEach(b => b.setAttribute("aria-checked", b.dataset.type === state.type ? "true" : "false"));
    if (state.type) { $("#obDesc").placeholder = TYPES[state.type].placeholder; $("#obNeedWrap").hidden = state.type !== "laser"; }
    renderContact();
  }

  const draft = loadDraft();
  const hasDraft = !!(draft && draft.desc && draft.desc.trim().length >= 10);
  if (hasDraft) { Object.assign(state, draft, { files: [] }); if (!Array.isArray(state.contact) || !state.contact.length) state.contact = ["email"]; }
  // un type passé dans l'adresse (bouton « Décrire mon projet » d'une page atelier) est présélectionné,
  // mais le client le confirme lui-même : on commence toujours par l'écran 1
  const param = new URLSearchParams(location.search).get("type");
  if (TYPES[param] && !hasDraft) state.type = param;
  syncInputs();
  history.replaceState({ step: 0, idx: 0 }, "", "#" + STEPS[0]);
  show(0, { silent: true });

  // brouillon : on propose de reprendre, sans sauter d'écran à la place du client
  if (hasDraft) {
    const box = document.createElement("div");
    box.className = "ob-resume";
    box.innerHTML = `<p>Vous aviez commencé une demande${draft.type ? ` (${esc(TYPES[draft.type] ? TYPES[draft.type].label : "")})` : ""}.</p>
      <div><button type="button" class="btn btn-small" data-resume>Reprendre</button> <button type="button" class="btn btn-small btn-ghost" data-restart>Recommencer</button></div>`;
    sections[0].insertBefore(box, sections[0].querySelector(".ob-choices"));
    box.querySelector("[data-resume]").addEventListener("click", () => { box.remove(); show(Math.min(Math.max(1, draft.step || 1), 3)); if (draft.step >= 2) toast("Ajoutez à nouveau vos fichiers"); });
    box.querySelector("[data-restart]").addEventListener("click", () => { box.remove(); $("#obReset").click(); });
    $("#obDraft").hidden = false;
  }
})();
