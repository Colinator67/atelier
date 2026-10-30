/* =========================================================================
   Contenus tirés de config.js : machines, avis clients, questions fréquentes.
   Un bloc data-render="…" est rempli ; une section data-render-section="reviews"
   reste cachée tant qu'il n'y a aucun avis.
   ========================================================================= */
(function () {
  "use strict";
  const C = window.SITE_CONFIG;
  const { $$, esc } = window.UI;
  const fill = (t) => String(t).replace(/\{(\w+)\}/g, (m, k) => (C.delays || {})[k] || m);

  $$('[data-render="machines"]').forEach(box => {
    box.innerHTML = (C.machines || []).map(m => `
      <article class="machine" data-reveal>
        ${m.photo ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}" loading="lazy">` : ""}
        <p class="machine-kind">${esc(m.kind)}</p>
        <h3>${esc(m.name)}</h3>
        <p>${esc(m.detail || "")}</p>
      </article>`).join("");
  });

  const reviews = C.reviews || [];
  $$('[data-render-section="reviews"]').forEach(s => s.hidden = !reviews.length);
  $$('[data-render="reviews"]').forEach(box => {
    box.innerHTML = reviews.map(r => `
      <figure class="review" data-reveal>
        ${r.photo ? `<img src="${esc(r.photo)}" alt="" loading="lazy">` : ""}
        <blockquote><p>${esc(r.text)}</p></blockquote>
        <figcaption><strong>${esc(r.name)}</strong>${r.city ? `, ${esc(r.city)}` : ""}${r.project ? `<span>${esc(r.project)}</span>` : ""}</figcaption>
      </figure>`).join("");
  });

  $$('[data-render="faq"]').forEach(box => {
    box.innerHTML = (C.faq || []).map((f, i) => `
      <details class="faq-item"${i === 0 ? " open" : ""}>
        <summary>${esc(fill(f.q))}</summary>
        <div class="faq-a"><p>${esc(fill(f.a))}</p></div>
      </details>`).join("");
  });
})();
