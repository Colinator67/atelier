/* =========================================================================
   Encadré de devis commun aux simulateurs (impression 3D, découpe laser, tampon).
   - plusieurs pièces dans un même devis : la pièce en cours + celles déjà ajoutées ;
   - réception : retrait gratuit à Strasbourg ou Colissimo (prix fixe par commande) ;
   - date de fabrication et de livraison estimées (jours ouvrés) ;
   - envoi de toutes les pièces et de leurs fichiers dans une seule demande.
   Chaque simulateur fournit current() → pièce en cours ou null, et reset() → vide le dépôt.
   ========================================================================= */
(function () {
  "use strict";
  const C = window.SITE_CONFIG;
  const { $, esc, eur, toast } = window.UI;
  const D = C.delays || {};
  const PREP = D.prepDays || 4, SHIP_DAYS = D.shipDays || 2, SHIP_PRICE = D.shippingPrice != null ? D.shippingPrice : 5;

  // jours ouvrés (lundi → vendredi) à partir d'aujourd'hui
  function addWorkdays(n, from = new Date()) {
    const d = new Date(from); d.setHours(12, 0, 0, 0);
    while (n > 0) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) n--; }
    return d;
  }
  const fmtDay = d => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  function create(opts) {
    const root = opts.root, k = opts.key;
    const el = id => root.querySelector(`[data-dv="${id}"]`);
    const items = [];
    let ship = "retrait";

    // la réception choisie est retenue d'une page à l'autre
    try { const s = localStorage.getItem("atelier-reception"); if (s === "colissimo" || s === "retrait") ship = s; } catch (e) {}
    root.querySelectorAll(`input[name="ship-${k}"]`).forEach(r => {
      r.checked = r.value === ship;
      r.addEventListener("change", () => { ship = r.value; try { localStorage.setItem("atelier-reception", ship); } catch (e) {} refresh(); });
    });
    if (opts.addText) { const ad = root.querySelector('[data-dv="add"]'); if (ad) ad.innerHTML = `<span aria-hidden="true">+</span> ${esc(opts.addText)}`; }
    const shipPrice = root.querySelector('[data-dv="shipprice"]'); if (shipPrice) shipPrice.textContent = eur(SHIP_PRICE);

    const lineHTML = (it, i) => `
      <li class="dv-item">
        <div class="dv-item-t"><strong>${esc(it.name)}</strong><span>${esc(it.meta)}</span><span>${it.unit == null ? "Prix sur devis" : `${eur(it.unit)} × ${it.qty}`}</span></div>
        <span class="dv-item-p mono">${it.unit == null ? "—" : eur(it.unit * it.qty)}</span>
        ${i == null ? "" : `<button type="button" class="icon-btn dv-rm" data-rm="${i}" aria-label="Retirer ${esc(it.name)} du devis">×</button>`}
      </li>`;

    function all() { const c = opts.current(); return c ? [...items, c] : [...items]; }

    function refresh() {
      const cur = opts.current(), list = all();
      const priced = list.filter(it => it.unit != null), custom = list.length - priced.length;
      const parts = priced.reduce((s, it) => s + it.unit * it.qty, 0);
      const setup = priced.length && opts.setupFee ? opts.setupFee : 0;
      const shipCost = list.length && ship === "colissimo" ? SHIP_PRICE : 0;

      // pièces déjà ajoutées
      const ul = el("items");
      ul.innerHTML = items.map((it, i) => lineHTML(it, i)).join("");
      ul.hidden = !items.length;
      // pièce en cours
      const curBox = el("current");
      if (cur) curBox.innerHTML = `<ul class="dv-items dv-cur">${lineHTML(cur, null)}</ul>`;
      else curBox.innerHTML = `<p class="dv-empty">${items.length ? (opts.nextText || "Pièce suivante : déposez son fichier, ou envoyez la demande telle quelle.") : (opts.emptyText || "Déposez votre fichier : le prix s'affiche ici.")}</p>`;
      const add = el("add"); if (add) add.hidden = !cur || opts.multi === false;
      const head = el("count"); if (head) head.textContent = list.length > 1 ? `${list.length} pièces` : "";

      // récapitulatif
      const sum = el("sum");
      const rows = [];
      if (list.length) rows.push([list.length > 1 ? "Pièces" : (opts.partLabel || "Pièce"), priced.length ? eur(parts) : "—"]);
      if (setup) rows.push(["Préparation (une fois par commande)", eur(setup)]);
      if (list.length) rows.push([ship === "colissimo" ? "Colissimo" : "Retrait à Strasbourg", shipCost ? eur(shipCost) : "Gratuit"]);
      sum.innerHTML = rows.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd class="mono">${esc(b)}</dd></div>`).join("");
      sum.hidden = !rows.length;

      const total = el("total");
      if (!list.length) total.textContent = "—";
      else if (!priced.length) total.textContent = "Sur devis";
      else total.textContent = eur(parts + setup + shipCost);
      el("totalLabel").textContent = custom && priced.length ? "Total estimé, hors pièces sur devis" : "Total estimé";

      // dates estimées
      const ready = addWorkdays(PREP), arrive = addWorkdays(PREP + SHIP_DAYS);
      el("date").innerHTML = !list.length ? "" : ship === "colissimo"
        ? `Livraison estimée vers le <strong>${fmtDay(arrive)}</strong> si vous validez le devis aujourd'hui.`
        : `Prête au plus tard le <strong>${fmtDay(ready)}</strong> si vous validez le devis aujourd'hui, à retirer à Strasbourg (quartier Aristide-Briand).`;

      const ask = el("ask");
      ask.disabled = !list.length;
      if (opts.onRefresh) opts.onRefresh({ list, cur });
    }

    root.addEventListener("click", e => {
      const rm = e.target.closest("[data-rm]");
      if (rm) { const it = items.splice(+rm.dataset.rm, 1)[0]; refresh(); toast(`${it.name} retiré du devis`); return; }
      if (e.target.closest('[data-dv="add"]')) {
        const cur = opts.current(); if (!cur) return;
        items.push({ ...cur });
        opts.reset();
        refresh();
        toast("Pièce ajoutée au devis : déposez la suivante");
        window.track && window.track("devis_piece_ajoutee", opts.kind);
        const drop = opts.dropEl && opts.dropEl();
        if (drop) { drop.scrollIntoView({ behavior: "smooth", block: "center" }); }
      }
    });

    el("ask").addEventListener("click", () => {
      const list = all(); if (!list.length) return;
      const priced = list.filter(it => it.unit != null);
      const parts = priced.reduce((s, it) => s + it.unit * it.qty, 0);
      const setup = priced.length && opts.setupFee ? opts.setupFee : 0;
      const shipCost = ship === "colissimo" ? SHIP_PRICE : 0;
      const ready = addWorkdays(PREP), arrive = addWorkdays(PREP + SHIP_DAYS);
      const blocks = list.map((it, i) => (list.length > 1 ? `— Pièce ${i + 1} —\n` : "") + it.summary.join("\n"));
      const summary = [
        ...blocks,
        "",
        `Réception : ${ship === "colissimo" ? `Colissimo (${eur(SHIP_PRICE)}), livraison estimée vers le ${fmtDay(arrive)}` : `retrait gratuit à Strasbourg, prête au plus tard le ${fmtDay(ready)}`}`,
        setup ? `Préparation : ${eur(setup)}` : null,
        priced.length ? `Total estimé : ${eur(parts + setup + shipCost)}${priced.length < list.length ? " (hors pièces sur devis)" : ""} · TVA non applicable, art. 293 B du CGI` : "Total : sur devis"
      ].filter(x => x !== null).join("\n");
      const files = list.map(it => it.file).filter(Boolean);
      window.AskModal.open({ kind: list.length > 1 ? `${opts.kind} · ${list.length} pièces` : opts.kind, files, summary, allowFile: !files.length });
    });

    refresh();
    return { refresh, items };
  }

  window.Devis = { create, addWorkdays, fmtDay };
})();
