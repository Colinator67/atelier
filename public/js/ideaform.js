/* =========================================================================
   Page Découpe laser : formulaire « une idée, pas de fichier ».
   Envoie la demande au même point que les devis (/api/demande).
   ========================================================================= */
(function () {
  "use strict";
  const C = window.SITE_CONFIG;
  const { $, $$, showMsg } = window.UI;
  const form = $("#ideaForm");
  if (!form) return;

  const MAX_TOTAL = 8 * 1024 * 1024;

  // Matériaux repris de la configuration laser
  $("#ideaMat").innerHTML = ['<option>Je ne sais pas, conseillez-moi</option>']
    .concat(C.laser.materials.map(m => `<option>${m.label}</option>`))
    .concat(['<option>Autre (à préciser)</option>']).join("");

  // Choix : fichier + découpe / fichier seul
  let need = "Fichier + découpe";
  $("#ideaNeed").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    need = b.dataset.v;
    $$("#ideaNeed button").forEach(x => { const on = x === b; x.setAttribute("aria-pressed", on); x.setAttribute("aria-checked", on); });
  });

  function summary() {
    return [
      "Création de fichier de découpe laser",
      `Besoin : ${need}`,
      `Dimensions : ${$("#ideaSize").value.trim() || "non précisées"}`,
      `Matériau : ${$("#ideaMat").value}`,
      `Quantité : ${Math.max(1, +$("#ideaQty").value || 1)}`,
      `Délai : ${$("#ideaWhen").value}`
    ].join("\n");
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const box = $("#ideaMsg");
    const desc = $("#ideaDesc").value.trim();
    const email = $("#ideaEmail").value.trim();
    const files = Array.from($("#ideaFiles").files).slice(0, 5);

    if (desc.length < 10) { showMsg(box, "Décrivez votre idée en quelques mots pour que je puisse vous répondre.", "error"); $("#ideaDesc").focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { showMsg(box, "Saisissez une adresse email valide, par exemple vous@exemple.fr.", "error"); $("#ideaEmail").focus(); return; }
    if (files.reduce((s, f) => s + f.size, 0) > MAX_TOTAL) { showMsg(box, "Vos images dépassent 8 Mo au total. Retirez-en une ou envoyez des versions plus légères.", "error"); return; }
    if (!$("#ideaConsent").checked) { showMsg(box, "Cochez la case d'accord pour que je puisse vous répondre.", "error"); return; }
    if ($("#ideaWebsite").value) return; // robot

    const fd = new FormData();
    fd.append("kind", "Création de fichier laser");
    fd.append("email", email);
    fd.append("message", desc);
    fd.append("summary", summary());
    files.forEach(f => fd.append("file", f, f.name));

    const btn = $("#ideaSend");
    btn.disabled = true; btn.textContent = "Envoi…";
    showMsg(box, "");
    try {
      const res = await fetch(C.requestEndpoint, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data.error && res.status === 400) { showMsg(box, data.error, "error"); return; }
        throw new Error("HTTP " + res.status);
      }
      $$(".field, .opt-row, .opt, .field-check, #ideaSend", form).forEach(el => el.hidden = true);
      $("#ideaDone").hidden = false;
    } catch (err) {
      $("#ideaFbText").value = `${summary()}\n\nIdée : ${desc}\nEmail : ${email}`;
      $("#ideaFallback").hidden = false;
    } finally {
      btn.disabled = false; btn.textContent = "Envoyer mon idée";
    }
  });
})();
