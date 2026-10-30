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
    // pendant l'analyse : la zone affiche un état de chargement
    const run = (f) => {
      label.classList.add("is-loading"); label.setAttribute("aria-busy", "true");
      return Promise.resolve().then(() => onFile(f)).finally(() => { label.classList.remove("is-loading"); label.removeAttribute("aria-busy"); });
    };
    label.addEventListener("drop", e => { const f = e.dataTransfer.files[0]; if (f) run(f); });
    input.addEventListener("change", () => { const f = input.files[0]; if (f) run(f); input.value = ""; });
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

  // ---------------------------------------------------------- Notifications brèves
  function toast(text, kind) {
    let box = $(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
    const t = document.createElement("div");
    t.className = "toast" + (kind ? " is-" + kind : "");
    t.textContent = text;
    box.appendChild(t);
    setTimeout(() => { t.classList.add("is-out"); setTimeout(() => t.remove(), 220); }, 2600);
  }

  // ---------------------------------------------------------- Fichier déposé sur l'accueil
  // L'accueil range le fichier dans IndexedDB, la page du simulateur le reprend.
  const IDB = {
    open() { return new Promise((res, rej) => { const r = indexedDB.open("atelier", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
    async set(k, v) { const db = await IDB.open(); return new Promise((res, rej) => { const tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); },
    async take(k) { const db = await IDB.open(); return new Promise((res, rej) => { const tx = db.transaction("kv", "readwrite"); const st = tx.objectStore("kv"); const g = st.get(k); g.onsuccess = () => { st.delete(k); }; tx.oncomplete = () => res(g.result); tx.onerror = () => rej(tx.error); }); }
  };
  function pickUpPendingFile(input) {
    if (!input || !window.indexedDB) return;
    IDB.take("pending-file").then(f => {
      if (!f || !(f instanceof Blob)) return;
      try {
        const dt = new DataTransfer(); dt.items.add(f instanceof File ? f : new File([f], "fichier"));
        input.files = dt.files;
        input.dispatchEvent(new Event("change"));
        const target = input.closest("section"); if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (e) { /* navigateur trop ancien : le client redépose son fichier */ }
    }).catch(() => {});
  }

  // ---------------------------------------------------------- Menu mobile
  const navBtn = $(".nav-toggle");
  if (navBtn) {
    const nav = $("#nav-pages");
    const setOpen = (on) => { navBtn.setAttribute("aria-expanded", on); document.body.classList.toggle("nav-open", on); };
    navBtn.addEventListener("click", () => setOpen(navBtn.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
    nav.addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
  }

  // ---------------------------------------------------------- Logo qui se transforme entre les deux ateliers
  // 3D → laser : le logo est gravé au laser ; laser → 3D : il est imprimé couche par couche.
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]"); if (!a) return;
    const href = a.getAttribute("href");
    let fx = null;
    if (document.body.classList.contains("theme-3d") && /decoupe-laser\.html/.test(href)) fx = "engrave";
    if (document.body.classList.contains("theme-laser") && /impression-3d\.html/.test(href)) fx = "print";
    try { if (fx) sessionStorage.setItem("morph", fx); } catch (err) {}
  });
  $$(".logo-morph").forEach(el => el.addEventListener("click", () => {
    const root = document.documentElement;
    delete root.dataset.morph; void el.offsetWidth;
    root.dataset.morph = el.dataset.fx;
  }));

  // Nom affiché (réglable dans config.js)
  $$("[data-brand]").forEach(el => el.textContent = C.brand);
  // Délais et email affichés (réglables dans config.js)
  $$("[data-delay]").forEach(el => { const v = (C.delays || {})[el.dataset.delay]; if (v) el.textContent = v; });
  $$("[data-contact-email]").forEach(el => { const m = C.contactEmail || (C.legal || {}).email; if (m) { el.textContent = m; el.href = "mailto:" + m; } });

  window.UI = { $, $$, nf, eur, mm, fmtSize, fmtDuration, fmtMinutes, esc, setLines, showMsg, clampQty, bindDrop, bindChips, loadScript, toast, IDB, pickUpPendingFile };
})();
