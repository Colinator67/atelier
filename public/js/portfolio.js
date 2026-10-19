/* =========================================================================
   Page Portfolio : grille de projets filtrable + visionneuse.
   Les projets sont dans portfolio/portfolio.json.
   ========================================================================= */
(function () {
  "use strict";
  const { $, $$, esc } = window.UI;
  const grid = $("#pf-grid");
  if (!grid) return;

  let data = { filtres: [], projets: [] };
  let filter = "all";

  function renderFilters() {
    // n'affiche que les filtres qui ont au moins un projet
    const used = data.filtres.filter(f => data.projets.some(p => (p.themes || []).includes(f.id)));
    const chips = [{ id: "all", label: "Tout" }, ...used];
    $("#pf-filters").innerHTML = chips.map(f =>
      `<button class="chip${f.id === filter ? " is-on" : ""}" role="tab" aria-selected="${f.id === filter}" data-f="${f.id}" id="pf-f-${f.id}">${esc(f.label)}</button>`).join("");
  }

  function renderGrid() {
    const list = data.projets.filter(p => filter === "all" || (p.themes || []).includes(filter));
    $("#pf-count").textContent = `${list.length} projet${list.length > 1 ? "s" : ""}`;
    if (!list.length) { grid.innerHTML = `<p class="empty">Aucun projet dans cette catégorie pour l'instant.</p>`; return; }
    grid.innerHTML = list.map(p => `
      <button class="pf-card" type="button" data-id="${esc(p.id)}" aria-label="Voir le projet ${esc(p.titre)}">
        <div class="pf-img">
          <img src="${esc(p.images[0])}" alt="" loading="lazy">
          ${p.images.length > 1 ? `<span class="pf-count">${p.images.length} photos</span>` : ""}
        </div>
        <div class="pf-body">
          <h3>${esc(p.titre)}</h3>
          <p>${esc(p.resume || "")}</p>
          ${p.tags && p.tags.length ? `<div class="tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
        </div>
      </button>`).join("");
  }

  $("#pf-filters").addEventListener("click", e => {
    const b = e.target.closest("[data-f]"); if (!b) return;
    filter = b.dataset.f;
    renderFilters(); renderGrid();
  });

  // ---------------------------------------------------------- Visionneuse
  const lb = $("#lightbox");
  function showImage(p, i) {
    $("#lb-img").src = p.images[i];
    $("#lb-img").alt = `${p.titre} — photo ${i + 1}`;
    $$("#lb-thumbs button").forEach((b, k) => b.setAttribute("aria-pressed", k === i ? "true" : "false"));
  }
  function openProject(id) {
    const p = data.projets.find(x => x.id === id);
    if (!p) return;
    $("#lb-title").textContent = p.titre;
    $("#lb-desc").textContent = p.description || p.resume || "";
    $("#lb-tags").innerHTML = (p.tags || []).map(t => `<span>${esc(t)}</span>`).join("");
    $("#lb-thumbs").innerHTML = p.images.length > 1
      ? p.images.map((src, k) => `<button type="button" data-k="${k}" aria-label="Photo ${k + 1}"><img src="${esc(src)}" alt=""></button>`).join("")
      : "";
    $("#lb-thumbs").hidden = p.images.length < 2;
    $("#lb-thumbs").onclick = e => { const b = e.target.closest("[data-k]"); if (b) showImage(p, +b.dataset.k); };
    showImage(p, 0);
    if (typeof lb.showModal === "function") lb.showModal(); else lb.setAttribute("open", "");
  }
  const closeLb = () => { if (lb.close) lb.close(); else lb.removeAttribute("open"); };
  $("#lb-close").addEventListener("click", closeLb);
  lb.addEventListener("click", e => { if (e.target === lb) closeLb(); });
  grid.addEventListener("click", e => { const c = e.target.closest(".pf-card"); if (c) openProject(c.dataset.id); });

  fetch("portfolio/portfolio.json")
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(d => {
      data = d;
      renderFilters(); renderGrid();
      const hash = location.hash.replace("#", "");
      if (hash) openProject(hash);
    })
    .catch(() => { grid.innerHTML = `<p class="empty">Le portfolio n'a pas pu être chargé.</p>`; });
})();
