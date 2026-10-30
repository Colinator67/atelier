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
  // la même page existe en anglais (en/request.html) : seuls les textes changent
  const EN = document.documentElement.lang === "en";
  const L = EN ? {
    step: (a, b) => `Step ${a} of ${b}`, send: "Send my request", cont: "Continue", noFile: "Continue without files", sending: "Sending…",
    kb: "KB", mb: "MB", tooMany: n => `5 files maximum: “${n}” wasn't added.`, tooBig: n => `“${n}” would go over 8 MB in total. Add a lighter version, or email it after my reply.`,
    added: n => n > 1 ? `${n} files added` : "File added", remove: "Remove", keepOne: "Keep at least one way to reach you",
    emailBad: "This address looks incomplete, e.g. you@example.com.", emailNone: "Please enter your email.",
    phoneBad: "This number looks incomplete: please include your country code (+44…).", phoneNone: "Please enter your number.",
    descShort: "A few more words: what it's for, the size, your machine or material…", consent: "Please tick the box so I can use your details to reply.",
    rows: ["Request", "Project", "Files", "Contact"], timeline: "Timeline", none: "None", edit: "Edit", need: "Needs",
    preferred: "Preferred contact", firstName: "First name", avail: "Availability", filesLine: "Files", noneLow: "none",
    confirm: e => ` A confirmation email is on its way to <strong>${e}</strong>.`, subject: "Project request · ", copied: "Summary copied",
    cleared: "Request cleared", resume: l => `You started a request${l ? ` (${l})` : ""}.`, resumeBtn: "Continue it", restart: "Start over", reAdd: "Please add your files again",
    LABELS: { email: "Email", phone: "Call", sms: "SMS", whatsapp: "WhatsApp" }, needDefault: "Only the file"
  } : {
    step: (a, b) => `Étape ${a} sur ${b}`, send: "Envoyer ma demande", cont: "Continuer", noFile: "Continuer sans fichier", sending: "Envoi en cours…",
    kb: "Ko", mb: "Mo", tooMany: n => `5 fichiers au maximum : « ${n} » n'a pas été ajouté.`, tooBig: n => `« ${n} » dépasse les 8 Mo au total. Ajoutez une version plus légère, ou envoyez-le par email après ma réponse.`,
    added: n => n > 1 ? `${n} fichiers ajoutés` : "Fichier ajouté", remove: "Retirer", keepOne: "Gardez au moins un moyen de contact",
    emailBad: "Cette adresse semble incomplète, par exemple vous@exemple.fr.", emailNone: "Indiquez votre email.",
    phoneBad: "Ce numéro semble incomplet : 10 chiffres, ou l'indicatif international (+33…).", phoneNone: "Indiquez votre numéro.",
    descShort: "Quelques mots de plus : à quoi sert la pièce, ses dimensions, la matière souhaitée…", consent: "Cochez la case pour que je puisse utiliser vos coordonnées et vous répondre.",
    rows: ["Demande", "Projet", "Fichiers", "Contact"], timeline: "Délai", none: "Aucun", edit: "Modifier", need: "Besoin",
    preferred: "Contact préféré", firstName: "Prénom", avail: "Disponibilités", filesLine: "Fichiers", noneLow: "aucun",
    confirm: e => ` Un email de confirmation vient de partir à <strong>${e}</strong>.`, subject: "Demande de projet · ", copied: "Récapitulatif copié",
    cleared: "Demande effacée", resume: l => `Vous aviez commencé une demande${l ? ` (${l})` : ""}.`, resumeBtn: "Reprendre", restart: "Recommencer", reAdd: "Ajoutez à nouveau vos fichiers",
    LABELS: { email: "Email", phone: "Appel", sms: "SMS", whatsapp: "WhatsApp" }, needDefault: "Le fichier et la pièce découpée"
  };
  const DRAFT_KEY = "atelier-demande-v1" + (EN ? "-en" : "");
  const MAX_FILES = 5, MAX_TOTAL = 8 * 1024 * 1024;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  // kind reste en français : c'est le titre de la notification que reçoit l'atelier
  const TYPES = EN ? {
    "3d": { kind: "Modélisation 3D", label: "3D model", placeholder: "E.g. a wall mount for my headphones, about 12 cm tall, printed in PETG on a Bambu Lab A1." },
    "laser": { kind: "Création de fichier laser", label: "Laser cutting file", placeholder: "E.g. a 5-layer mountain landscape, 30 × 20 cm, 3 mm plywood, for an xTool S1." }
  } : {
    "3d": { kind: "Modélisation 3D", label: "Impression 3D", placeholder: "Ex. : un support de téléphone pour mon vélo, guidon de 32 mm de diamètre, en noir, résistant au soleil." },
    "laser": { kind: "Création de fichier laser", label: "Découpe laser", placeholder: "Ex. : un panneau prénom « Léa » en 3 couches de contreplaqué, environ 40 × 15 cm, pour une chambre d'enfant." }
  };
  // en anglais, le choix « fichier seul / fichier et pièce » vaut pour les deux types
  const needShown = () => EN || state.type === "laser";

  const state = { step: 0, type: null, desc: "", need: L.needDefault, when: "", files: [], contact: ["email"], email: "", phone: "", name: "", callTime: "" };

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
    $("#obCount").textContent = L.step(state.step + 1, STEPS.length);
    $("#obBar").style.transform = `scaleX(${(state.step + 1) / STEPS.length})`;
    $("#obBack").hidden = state.step === 0;
    // à l'étape 1, choisir une carte suffit : pas de bouton « Continuer »
    $("#obNext").hidden = state.step === 0;
    $("#obNext").textContent = state.step === STEPS.length - 1 ? L.send : (STEPS[state.step] === "files" && !state.files.length ? L.noFile : L.cont);
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
    $("#obNeedWrap").hidden = !needShown();
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

  const sizeTxt = (b) => b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} ${L.kb}` : `${EN ? (b / 1048576).toFixed(1) : (b / 1048576).toFixed(1).replace(".", ",")} ${L.mb}`;
  function addFiles(list) {
    let added = 0, refused = "";
    for (const f of Array.from(list)) {
      const total = state.files.reduce((s, x) => s + x.size, 0);
      if (state.files.length >= MAX_FILES) { refused = L.tooMany(f.name); break; }
      if (total + f.size > MAX_TOTAL) { refused = L.tooBig(f.name); continue; }
      if (state.files.some(x => x.name === f.name && x.size === f.size)) continue;
      state.files.push(f); added++;
    }
    fieldErr("obFilesErr", refused);
    if (added) toast(L.added(added));
    renderFiles();
  }
  function renderFiles() {
    const ul = $("#obList");
    ul.innerHTML = state.files.map((f, i) => `
      <li class="ob-file">
        <span class="ob-thumb" data-i="${i}" aria-hidden="true">${/^image\//.test(f.type) ? "" : esc((f.name.split(".").pop() || "").slice(0, 4).toUpperCase())}</span>
        <span class="ob-file-name">${esc(f.name)}<small>${sizeTxt(f.size)}</small></span>
        <button type="button" class="icon-btn" data-rm="${i}" aria-label="${L.remove} ${esc(f.name)}">×</button>
      </li>`).join("");
    state.files.forEach((f, i) => {
      if (!/^image\//.test(f.type)) return;
      const url = URL.createObjectURL(f);
      const t = ul.querySelector(`.ob-thumb[data-i="${i}"]`);
      t.style.backgroundImage = `url("${url}")`;
    });
    if (STEPS[state.step] === "files") $("#obNext").textContent = state.files.length ? L.cont : L.noFile;
  }
  $("#obList").addEventListener("click", e => {
    const b = e.target.closest("[data-rm]"); if (!b) return;
    state.files.splice(+b.dataset.rm, 1); renderFiles(); fieldErr("obFilesErr", "");
  });

  // ------------------------------------------------------------ 4. contact
  const PHONE_C = ["phone", "sms", "whatsapp"];
  const LABELS = L.LABELS;
  function renderContact() {
    $$(".ob-opt").forEach(b => b.setAttribute("aria-pressed", state.contact.includes(b.dataset.c) ? "true" : "false"));
    $("#obEmailWrap").hidden = !state.contact.includes("email");
    $("#obPhoneWrap").hidden = !state.contact.some(c => PHONE_C.includes(c));
    $("#obWhenWrap").hidden = !state.contact.includes("phone");
  }
  $$(".ob-opt").forEach(b => b.addEventListener("click", () => {
    const c = b.dataset.c, on = state.contact.includes(c);
    if (on && state.contact.length === 1) { toast(L.keepOne); return; }
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
      fieldErr("obEmailErr", bad ? (v ? L.emailBad : L.emailNone) : "", "#obEmail");
      if (bad) ok = false;
    }
    if (state.contact.some(c => PHONE_C.includes(c)) && (!only || only === "phone")) {
      const v = state.phone.trim();
      const bad = !phoneOk(v);
      fieldErr("obPhoneErr", bad ? (v ? L.phoneBad : L.phoneNone) : "", "#obPhone");
      if (bad) ok = false;
    }
    return ok;
  }

  // ------------------------------------------------------------ 5. récapitulatif
  function contactLine() {
    const parts = [];
    if (state.contact.includes("email")) parts.push(`Email${EN ? "" : " "}: ${state.email.trim()}`);
    const tel = state.contact.filter(c => PHONE_C.includes(c)).map(c => LABELS[c]);
    if (tel.length) parts.push(`${tel.join(", ")}${EN ? "" : " "}: ${state.phone.trim()}`);
    return parts;
  }
  function renderRecap() {
    const t = TYPES[state.type];
    const rows = [
      [L.rows[0], esc(t.label) + (needShown() ? ` · ${esc(state.need)}` : ""), 0],
      [L.rows[1], esc(state.desc.trim()).replace(/\n/g, "<br>") + (state.when ? `<br><span class="hint">${L.timeline}${EN ? "" : " "}: ${esc(state.when)}</span>` : ""), 1],
      [L.rows[2], state.files.length ? state.files.map(f => esc(f.name)).join("<br>") : L.none, 2],
      [L.rows[3], (state.name.trim() ? esc(state.name.trim()) + "<br>" : "") + contactLine().map(esc).join("<br>") + (state.callTime.trim() && state.contact.includes("phone") ? `<br><span class="hint">${esc(state.callTime.trim())}</span>` : ""), 3]
    ];
    $("#obRecap").innerHTML = rows.map(([k, v, s]) => `
      <div><dt>${k}</dt><dd>${v}</dd><dd class="ob-edit"><button type="button" class="link-btn" data-goto="${s}">${L.edit}<span class="sr-only"> : ${k}</span></button></dd></div>`).join("");
  }
  $("#obRecap").addEventListener("click", e => { const b = e.target.closest("[data-goto]"); if (b) show(+b.dataset.goto, { back: true }); });
  $("#obConsent").addEventListener("change", () => { if ($("#obConsent").checked) fieldErr("obConsentErr", ""); });

  const sp = EN ? "" : " ";
  function summaryText() {
    return [
      EN ? TYPES[state.type].label : `${TYPES[state.type].kind}`,
      needShown() ? `${L.need}${sp}: ${state.need}` : null,
      state.when ? `${L.timeline}${sp}: ${state.when}` : null,
      `${L.preferred}${sp}: ${state.contact.map(c => LABELS[c]).join(", ")}`,
      ...contactLine(),
      state.name.trim() ? `${L.firstName}${sp}: ${state.name.trim()}` : null,
      state.callTime.trim() && state.contact.includes("phone") ? `${L.avail}${sp}: ${state.callTime.trim()}` : null,
      `${L.filesLine}${sp}: ${state.files.length ? state.files.map(f => f.name).join(", ") : L.noneLow}`
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
      if (state.desc.trim().length < 10) { fieldErr("obDescErr", L.descShort); desc.focus(); return; }
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
    Object.assign(state, { type: null, desc: "", need: L.needDefault, when: "", files: [], contact: ["email"], email: "", phone: "", name: "", callTime: "" });
    syncInputs(); renderFiles(); $("#obDraft").hidden = true; show(0);
    toast(L.cleared);
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
    if (!$("#obConsent").checked) { fieldErr("obConsentErr", L.consent); $("#obConsent").focus(); return; }
    if ($("#obWebsite").value) return; // robot
    const fd = new FormData();
    fd.append("kind", TYPES[state.type].kind);
    if (EN) fd.append("lang", "en");
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
    btn.disabled = true; btn.classList.add("is-busy"); btn.textContent = L.sending;
    $("#obSendErr").hidden = true;
    try {
      const res = await fetch(C.requestEndpoint, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data.error && res.status === 400) { $("#obSendErr").textContent = data.error; $("#obSendErr").hidden = false; return; }
        throw new Error("HTTP " + res.status);
      }
      clearDraft();
      window.track && window.track("demande_envoyee", (state.type === "laser" ? "Découpe laser" : "Impression 3D") + (EN ? " (EN)" : ""));
      form.hidden = true; $("#obDone").hidden = false;
      $("#obRef").textContent = data.id || "—";
      const mark = $("#obMark");
      mark.dataset.fx = state.type === "laser" ? "engrave" : "print";
      window.UI.replay(mark);
      if (data.confirmation) $("#obDoneText").insertAdjacentHTML("beforeend", L.confirm(esc(state.email.trim())));
      window.scrollTo({ top: 0 });
      $("#ob-done-t").focus({ preventScroll: true });
      $(".ob-progress").hidden = true; $("#obCount").hidden = true;
      history.replaceState({ done: true }, "", "#envoyee");
    } catch (err) {
      const text = `${summaryText()}\n\n${L.rows[1]}${sp}:\n${state.desc.trim()}`;
      form.hidden = true; $("#obFail").hidden = false;
      $("#obFailText").value = text;
      const to = C.contactEmail || C.legal.email;
      $("#obMail").href = `mailto:${to}?subject=${encodeURIComponent(L.subject + TYPES[state.type].label)}&body=${encodeURIComponent(text)}`;
      window.scrollTo({ top: 0 });
      $("#ob-fail-t").focus({ preventScroll: true });
    } finally {
      btn.disabled = false; btn.classList.remove("is-busy"); btn.textContent = L.send;
    }
  }
  $("#obCopy").addEventListener("click", () => {
    const t = $("#obFailText");
    const done = () => toast(L.copied);
    if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(done, () => t.select()); else t.select();
  });

  // ------------------------------------------------------------ démarrage
  function syncInputs() {
    desc.value = state.desc; $("#obChars").textContent = `${state.desc.length} / 3000`;
    $("#obEmail").value = state.email; $("#obPhone").value = state.phone; $("#obName").value = state.name; $("#obCallTime").value = state.callTime;
    $$(".chips[data-group]", form).forEach(g => $$(".chip", g).forEach(c => { const on = c.dataset.v === state[g.dataset.group]; c.classList.toggle("is-on", on); c.setAttribute("aria-pressed", on); }));
    $$(".ob-choice").forEach(b => b.setAttribute("aria-checked", b.dataset.type === state.type ? "true" : "false"));
    if (state.type) { $("#obDesc").placeholder = TYPES[state.type].placeholder; $("#obNeedWrap").hidden = !needShown(); }
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
    box.innerHTML = `<p>${L.resume(draft.type && TYPES[draft.type] ? esc(TYPES[draft.type].label) : "")}</p>
      <div><button type="button" class="btn btn-small" data-resume>${L.resumeBtn}</button> <button type="button" class="btn btn-small btn-ghost" data-restart>${L.restart}</button></div>`;
    sections[0].insertBefore(box, sections[0].querySelector(".ob-choices"));
    box.querySelector("[data-resume]").addEventListener("click", () => { box.remove(); show(Math.min(Math.max(1, draft.step || 1), 3)); if (draft.step >= 2) toast(L.reAdd); });
    box.querySelector("[data-restart]").addEventListener("click", () => { box.remove(); $("#obReset").click(); });
    $("#obDraft").hidden = false;
  }
})();
