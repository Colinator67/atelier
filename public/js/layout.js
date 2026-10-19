/* =========================================================================
   Outils communs à toutes les pages (formats, dépôt de fichier, onglets).
   ========================================================================= */
(function () {
  "use strict";
  const C = window.SITE_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------------------------------------------------------- Formats
  const nf = (d) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const eur = (v) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);
  const mm = (v) => nf(v >= 100 ? 0 : 1).format(v);
  const fmtSize = (s) => s.map(mm).join(" × ") + " mm";
  const fmtDuration = (h) => {
    const totalMin = Math.max(1, Math.round(h * 60));
    const hh = Math.floor(totalMin / 60), m = totalMin % 60;
    return hh ? `${hh} h ${String(m).padStart(2, "0")} min` : `${m} min`;
  };
  const fmtMinutes = (m) => m < 1 ? `${nf(0).format(m * 60)} s` : (m >= 60 ? fmtDuration(m / 60) : `${nf(1).format(m)} min`);
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const setLines = (root, data) => { for (const [k, v] of Object.entries(data)) { const el = root.querySelector(`[data-k="${k}"]`); if (el) el.textContent = v; } };
  const showMsg = (el, text, kind) => { el.textContent = text; el.className = "msg" + (kind ? " is-" + kind : ""); el.hidden = !text; };
  const clampQty = (input) => Math.max(1, Math.min(+input.max || 999, Math.round(+input.value || 1)));


  // ---------------------------------------------------------- Dépôt de fichier
  function bindDrop(label, input, onFile) {
    ["dragenter", "dragover"].forEach(ev => label.addEventListener(ev, e => { e.preventDefault(); label.classList.add("is-over"); }));
    ["dragleave", "drop"].forEach(ev => label.addEventListener(ev, e => { e.preventDefault(); label.classList.remove("is-over"); }));
    label.addEventListener("drop", e => { const f = e.dataTransfer.files[0]; if (f) onFile(f); });
    input.addEventListener("change", () => { const f = input.files[0]; if (f) onFile(f); input.value = ""; });
  }

  // ---------------------------------------------------------- Filtres (onglets)
  function bindChips(selector, attr, onChange) {
    const chips = $$(selector);
    chips.forEach(ch => ch.addEventListener("click", () => {
      chips.forEach(c => { c.classList.toggle("is-on", c === ch); c.setAttribute("aria-selected", c === ch ? "true" : "false"); });
      onChange(ch.dataset[attr]);
    }));
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Impossible de charger " + src));
      document.head.appendChild(s);
    });
  }

  // Nom affiché (réglable dans config.js)
  $$("[data-brand]").forEach(el => el.textContent = C.brand);

  window.UI = { $, $$, nf, eur, mm, fmtSize, fmtDuration, fmtMinutes, esc, setLines, showMsg, clampQty, bindDrop, bindChips, loadScript };
})();
