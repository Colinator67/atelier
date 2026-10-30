/* =========================================================================
   Mesure d'audience sans cookie : une page vue au chargement, et les actions
   qui comptent (fichier analysé, demande envoyée, fiche machine ouverte…).
   Rien n'est envoyé si le navigateur demande à ne pas être suivi.
   Usage : window.track("nom_action", "détail") ; ou attribut data-track="nom:détail".
   ========================================================================= */
(function () {
  "use strict";
  const off = navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true ||
    /^(localhost|127\.|\[::1\])/.test(location.hostname) || location.protocol === "file:";
  const send = (data) => {
    if (off) return;
    const body = JSON.stringify(data);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon("/api/s", new Blob([body], { type: "text/plain" }))) return;
    } catch (e) {}
    fetch("/api/s", { method: "POST", body, keepalive: true }).catch(() => {});
  };
  const path = () => location.pathname.replace(/\.html$/, "").replace(/\/index$/, "/") || "/";
  const sent = new Set();
  window.track = (name, label, once) => {
    const key = name + "|" + (label || "");
    if (once && sent.has(key)) return;
    sent.add(key);
    send({ k: "event", n: name, l: label || "", p: path() });
  };
  const utm = new URLSearchParams(location.search).get("utm_source");
  send({ k: "view", p: path(), r: document.referrer, u: utm });

  // clics marqués data-track="nom:détail", et clics sur l'email
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-track]");
    if (t) { const [n, l] = t.dataset.track.split(":"); window.track(n, l); }
    if (e.target.closest('a[href^="mailto:"]')) window.track("email", path());
  });
})();
