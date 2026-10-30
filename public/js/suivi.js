/* =========================================================================
   Page « Suivre ma demande » (/suivi et /en/track) : avancement d'une demande
   à partir de son numéro IA-…, lu sur /api/suivi.
   ========================================================================= */
(function () {
  "use strict";
  const { $, esc } = window.UI;
  const form = $("#svForm");
  if (!form) return;
  const EN = document.documentElement.lang === "en";
  const T = EN ? {
    bad: "This doesn't look like a request number. It looks like IA-261030-ABCD.",
    none: "No request matches this number. Check it in your confirmation email, or reply to that email.",
    down: "Tracking is unavailable right now. Please try again in a moment.",
    loading: "Looking it up…", sent: d => `Sent on ${d}`, note: "Message from the workshop", cancelled: "This request has been cancelled.",
    upd: d => `Updated on ${d}`, help: 'A question? Reply to your confirmation email or write to <a href="mailto:impression.ant.laser@gmail.com">impression.ant.laser@gmail.com</a>.', locale: "en-GB", col: 2
  } : {
    bad: "Ce n'est pas un numéro de demande. Il ressemble à IA-261030-ABCD.",
    none: "Aucune demande ne correspond à ce numéro. Vérifiez-le dans votre email de confirmation, ou répondez à cet email.",
    down: "Le suivi est momentanément indisponible. Réessayez dans un instant.",
    loading: "Recherche…", sent: d => `Envoyée le ${d}`, note: "Message de l'atelier", cancelled: "Cette demande a été annulée.",
    upd: d => `Mise à jour le ${d}`, help: 'Une question ? Répondez à l\'email de confirmation ou écrivez à <a href="mailto:impression.ant.laser@gmail.com">impression.ant.laser@gmail.com</a>.', locale: "fr-FR", col: 1
  };
  const KIND_EN = { "Création de fichier laser": "Custom laser file", "Modélisation 3D": "3D model", "Tampon": "Custom stamp", "Découpe laser": "Laser cutting", "Impression 3D": "3D printing", "Laser (image)": "Laser engraving" };
  const kindTxt = k0 => { const k = String(k0).replace(/( · client anglophone)+$/, ""); return EN ? (KIND_EN[k] || k) : k; };
  const day = t => new Date(t).toLocaleDateString(T.locale, { day: "numeric", month: "long", year: "numeric" });
  const msg = (text, kind) => { const m = $("#svMsg"); m.textContent = text; m.className = "msg" + (kind ? " is-" + kind : ""); m.hidden = !text; };
  const norm = v => v.trim().toUpperCase().replace(/\s+/g, "").replace(/^IA(\d)/, "IA-$1").replace(/^(IA-\d{6})([A-Z0-9])/, "$1-$2");

  async function look(ref, push) {
    ref = norm(ref);
    $("#svRef").value = ref;
    if (!/^IA-\d{6}-[A-Z0-9]{4}$/.test(ref)) { msg(T.bad, "error"); $("#svCard").hidden = true; return; }
    msg(T.loading);
    let res, data = {};
    try { res = await fetch("/api/suivi?ref=" + encodeURIComponent(ref)); data = await res.json(); } catch (e) { res = { status: 0 }; }
    if (!data.ok) { msg(res.status === 404 ? T.none : res.status === 400 ? T.bad : T.down, "error"); $("#svCard").hidden = true; return; }
    msg("");
    if (push) history.replaceState(null, "", "?ref=" + ref);
    render(data);
    window.track && window.track("suivi", data.status, true);
  }

  function render(d) {
    const when = {}; (d.history || []).forEach(([k, t]) => { when[k] = t; });
    const cancelled = d.status === d.cancel[0];
    const cur = d.steps.findIndex(s => s[0] === d.status);
    const steps = d.steps.map((s, i) => {
      const state = cancelled ? (when[s[0]] ? "done" : "todo") : i < cur ? "done" : i === cur ? "now" : "todo";
      return `<li class="sv-step is-${state}"${state === "now" ? ' aria-current="step"' : ""}><strong>${esc(s[T.col])}</strong>${when[s[0]] ? `<span>${esc(day(when[s[0]]))}</span>` : ""}</li>`;
    }).join("");
    $("#svCard").innerHTML = `
      <header class="sv-head"><div><h2>${esc(d.id)}</h2><p>${esc(kindTxt(d.kind))} · ${esc(T.sent(day(d.created)))}</p></div>
        <span class="sv-badge${cancelled ? " is-off" : d.status === "terminee" ? " is-end" : ""}">${esc((cancelled ? d.cancel : d.steps[cur] || d.steps[0])[T.col])}</span></header>
      ${cancelled ? `<p class="sv-cancel">${esc(T.cancelled)}</p>` : ""}
      <ol class="sv-steps">${steps}</ol>
      ${d.note ? `<div class="sv-note"><strong>${esc(T.note)}</strong><p>${esc(d.note)}</p></div>` : ""}
      <p class="sv-help">${T.help}</p>`;
    $("#svCard").hidden = false;
  }

  form.addEventListener("submit", e => { e.preventDefault(); look($("#svRef").value, true); });
  const ref = new URLSearchParams(location.search).get("ref");
  if (ref) look(ref, false); else $("#svRef").focus();
})();
