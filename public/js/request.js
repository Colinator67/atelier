/* =========================================================================
   Fenêtre de demande : envoi vers /api/demande (Discord + email),
   avec repli « récapitulatif à copier » si l'envoi échoue.
   ========================================================================= */
(function () {
  "use strict";
  const C = window.SITE_CONFIG;
  const { $, $$, showMsg } = window.UI;
  const modal = $("#modal");
  if (!modal) return;
  let current = null; // { kind, summary, file, allowFile, needMessage }

  const DEFAULT_PH = $("#reqMsg").placeholder;
  function openRequest(req) {
    current = req;
    $("#reqSummary").textContent = req.summary;
    $("#reqForm").hidden = false; $("#reqSent").hidden = true; $("#reqFallback").hidden = true;
    $("#reqFileWrap").hidden = !req.allowFile;
    $("#reqFile").value = "";
    $("#reqMsgLabel").innerHTML = req.needMessage ? "Décrivez votre projet" : 'Précisions <span class="opt-label">(facultatif)</span>';
    $("#reqMsg").placeholder = req.placeholder || DEFAULT_PH;
    showMsg($("#reqMsgBox"), "");
    if (typeof modal.showModal === "function") modal.showModal(); else modal.setAttribute("open", "");
    setTimeout(() => $("#reqEmail").focus(), 50);
    loadTurnstile();
  }
  const closeModal = () => { if (modal.close) modal.close(); else modal.removeAttribute("open"); };
  ["#closeModal", "#cancelModal", "#closeSent", "#closeFb"].forEach(s => $(s).addEventListener("click", closeModal));

  // Demandes « sans fichier » : modélisation 3D ou création de fichier laser
  const PROJECTS = {
    "3d": {
      kind: "Modélisation 3D",
      summary: "Demande de modélisation 3D\nLe client n'a pas encore de fichier : pièce à concevoir.",
      placeholder: "À quoi sert la pièce ? Dimensions, contraintes (chaleur, efforts, extérieur), quantité, matière ou couleur souhaitée…"
    },
    "laser": {
      kind: "Création de fichier laser",
      summary: "Demande de création de fichier de découpe laser\nLe client n'a pas encore de fichier : dessin à réaliser.",
      placeholder: "Votre idée : logo, texte, motif, dimensions, matériau, multicouche ? Découpe par mes soins ou fichier seul pour votre machine ?"
    }
  };
  $$("[data-project]").forEach(b => b.addEventListener("click", () => {
    const p = PROJECTS[b.dataset.project];
    openRequest({ ...p, file: null, allowFile: true, needMessage: true });
  }));

  let tsLoaded = false;
  function loadTurnstile() {
    if (!C.turnstileSiteKey || tsLoaded) return;
    tsLoaded = true;
    window.onTurnstileLoad = () => window.turnstile.render("#turnstile", { sitekey: C.turnstileSiteKey });
    window.UI.loadScript("https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit").catch(() => {});
  }

  $("#reqForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const box = $("#reqMsgBox");
    const email = $("#reqEmail").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { showMsg(box, "Saisissez une adresse email valide, par exemple vous@exemple.fr.", "error"); $("#reqEmail").focus(); return; }
    if (!$("#reqConsent").checked) { showMsg(box, "Cochez la case d'accord pour que je puisse vous répondre.", "error"); return; }
    if ($("#reqWebsite").value) return; // robot
    if (current.needMessage && $("#reqMsg").value.trim().length < 10) { showMsg(box, "Décrivez votre projet en quelques mots pour que je puisse vous répondre.", "error"); $("#reqMsg").focus(); return; }
    const extra = $("#reqFile").files[0];
    if (extra && extra.size > 8 * 1024 * 1024) { showMsg(box, "Le fichier dépasse 8 Mo. Choisissez un fichier plus léger ou envoyez-le par email après ma réponse.", "error"); return; }
    const fd = new FormData();
    fd.append("kind", current.kind);
    fd.append("email", email);
    fd.append("message", $("#reqMsg").value.trim());
    fd.append("summary", current.summary);
    // fichiers joints par la page (ex. tampon : aperçu + SVG prêt à graver), puis celui du client
    const files = [...(current.files || []), ...(current.file ? [current.file] : []), ...(extra && !current.file ? [extra] : [])];
    files.forEach(f => fd.append("file", f, f.name));
    const ts = document.querySelector('[name="cf-turnstile-response"]');
    if (ts) fd.append("cf-turnstile-response", ts.value);

    const btn = $("#sendReq");
    btn.disabled = true; btn.textContent = "Envoi…";
    try {
      if (!C.requestEndpoint) throw new Error("no endpoint");
      const res = await fetch(C.requestEndpoint, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data.error && res.status === 400) { showMsg(box, data.error, "error"); return; }
        throw new Error("HTTP " + res.status);
      }
      $("#reqForm").hidden = true; $("#reqSent").hidden = false;
      window.track && window.track("devis_demande", current.kind);
      const mark = $("#reqMark");
      if (mark) { mark.dataset.fx = window.UI.pageFx(); window.UI.replay(mark); }
      const delay = (C.delays && C.delays.reply) || "48 h";
      $("#reqSent p").innerHTML = `Numéro de demande <strong class="mono">${window.UI.esc(data.id || "—")}</strong>. Je vous réponds par email sous ${window.UI.esc(delay)}.` +
        (data.confirmation ? ` Une confirmation vient de partir à <strong>${window.UI.esc(email)}</strong>.` : "");
      $("#reqMsg").value = "";
    } catch (err) {
      showFallback(email);
    } finally {
      btn.disabled = false; btn.textContent = "Envoyer";
    }
  });

  function showFallback(email) {
    $("#reqForm").hidden = true; $("#reqFallback").hidden = false;
    const to = C.contactEmail || C.legal.email;
    const valid = to && !/^\[/.test(to);
    $("#fbEmailWrap").hidden = !valid;
    if (valid) $("#fbEmail").textContent = to;
    $("#fbText").value = `${current.summary}\n\nEmail : ${email}\nPrécisions : ${$("#reqMsg").value.trim() || "—"}`;
  }
  $("#copyFb").addEventListener("click", () => {
    const t = $("#fbText");
    const done = () => { $("#copyFb").textContent = "Copié"; setTimeout(() => $("#copyFb").textContent = "Copier le récapitulatif", 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(done, () => { t.select(); });
    else t.select();
  });

  // vérification de l'email à la sortie du champ, sans attendre l'envoi
  $("#reqEmail").addEventListener("blur", () => {
    const v = $("#reqEmail").value.trim();
    const bad = v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    $("#reqEmail").setAttribute("aria-invalid", bad ? "true" : "false");
    showMsg($("#reqMsgBox"), bad ? "Cette adresse semble incomplète, par exemple vous@exemple.fr." : "", bad ? "error" : "");
  });
  $("#copyFb").addEventListener("click", () => window.UI.toast("Récapitulatif copié"));

  window.AskModal = { open: openRequest };
})();
