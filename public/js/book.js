/* =========================================================================
   Portfolio en livre : double page sur ordinateur, page simple sur téléphone.
   Couverture → avant-propos → sommaire → chapitres → règles de design →
   « Prêt à écrire un nouveau chapitre ? » → 4e de couverture.
   Les pages tournent en 3D ; le texte des projets laser se grave à l'ouverture.
   Contenu : portfolio/portfolio.json (projets, chapitres et leurs intros).
   ========================================================================= */
(function () {
  "use strict";
  const { $, $$, esc } = window.UI;
  const book = $("#book"), stage = $("#bookStage");
  if (!book) return;

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TURN_MS = still ? 0 : 700;
  const thumb = (src) => src.replace(/\.jpe?g$/i, "-800.webp");
  const large = (src) => src.replace(/\.jpe?g$/i, ".webp");

  let data = null, pages = [], mode = null, leaves = [], flipped = 0, busy = false;
  const engraved = new Set();

  // ------------------------------------------------------------ contenu des pages
  const ABOUT = "Étudiant ingénieur en plasturgie à l'INSA Strasbourg, je suis passionné par l'impression 3D depuis près de 8 ans. Les modèles présentés ici viennent de projets personnels, d'études ou de commandes. Je les vois comme un entraînement permanent : je veux maîtriser parfaitement la modélisation 3D pour devenir chef de projet en fabrication additive, ou contribuer à faire progresser cette technologie par la recherche.";
  const RULES = "Quand je dessine une pièce, elle doit pouvoir être imprimée par n'importe qui, sur n'importe quelle imprimante. Je limite au maximum les supports et j'évite les éléments extérieurs comme les vis, l'adhésif ou les aimants. Pour moi, un objet réussi se fabrique de A à Z par une imprimante 3D : deux personnes, à deux endroits différents, peuvent produire exactement le même objet.";

  function chapterOf(p) {
    const t = p.themes || [];
    return t.includes("laser") ? "laser" : (t[0] || "deco");
  }

  function buildPages() {
    const L = data.livre || {};
    const parts = L.parties || [{ titre: "Réalisations", chapitres: data.filtres.map(f => f.id) }];
    const label = (id) => (data.filtres.find(f => f.id === id) || { label: id }).label;
    const list = [];
    const add = (kind, html, meta = {}) => { list.push({ kind, html, ...meta }); return list.length - 1; };

    add("cover", `
      <div class="cv-logos"><img src="img/logo-3d.png" alt=""><img src="img/logo-laser.png" alt=""></div>
      <p class="cv-brand">impression_ant</p>
      <h2 class="cv-title">Portfolio</h2>
      <p class="cv-sub">Pièces imaginées, modélisées et fabriquées à l'atelier</p>
      <p class="cv-author">Colin Ehret · ${new Date().getFullYear()}</p>`);
    const pAbout = add("text", `
      <h2 class="pg-h">Avant-propos</h2>
      <img class="pg-portrait" data-src="portfolio/img/colin-1-800.webp" data-fallback="portfolio/img/colin-1.jpg" alt="Portrait de Colin Ehret">
      <p class="pg-p">${esc(ABOUT)}</p>`);
    const pToc = add("toc", "");

    // chapitres
    const chapters = [];
    parts.forEach(part => part.chapitres.forEach(cid => {
      const projets = data.projets.filter(p => chapterOf(p) === cid);
      if (!projets.length) return;
      const n = chapters.length + 1;
      const ch = { id: cid, part: part.titre, label: label(cid), n, projets: [] };
      chapters.push(ch);
      ch.page = add("chapter", "", { chapter: ch, laser: cid === "laser" });
      projets.forEach(p => ch.projets.push({ p, page: add("project", "", { project: p, chapter: ch, laser: cid === "laser" }) }));
    }));
    const pRules = add("text", `
      <h2 class="pg-h">Mes règles de design</h2>
      <p class="pg-p pg-lead">${esc(RULES)}</p>`);
    const pEnd = add("end", `
      <h2 class="end-h">Prêt à écrire un nouveau chapitre avec votre projet ?</h2>
      <p class="pg-p">Une pièce à imprimer, un fichier à graver, une idée encore floue : racontez-la-moi, je vous réponds sous <span data-delay="reply">48 h</span>.</p>
      <div class="end-actions">
        <a class="btn" href="demande.html">Décrire mon projet</a>
        <a class="btn btn-ghost" href="impression-3d.html#devis">Estimer une impression</a>
        <a class="btn btn-ghost" href="decoupe-laser.html#devis">Estimer une découpe</a>
      </div>`);
    // la 4e de couverture doit tomber au dos de la dernière feuille : nombre de pages pair
    if ((list.length + 1) % 2) add("blank", "");
    add("back", `
      <div class="cv-logos"><img src="img/logo-3d.png" alt=""><img src="img/logo-laser.png" alt=""></div>
      <p class="cv-brand">impression_ant</p>
      <p class="cv-sub">Impression 3D · découpe laser · modélisation</p>
      <p class="cv-author">impressionant.fr</p>`);

    // pages qui ont besoin des numéros des autres
    list[pToc].html = `
      <h2 class="pg-h">Sommaire</h2>
      <ol class="toc">
        <li><button type="button" data-goto="${pAbout}"><span>Avant-propos</span><i></i><b>${pAbout}</b></button></li>
        ${parts.map(part => {
          const chs = chapters.filter(c => c.part === part.titre);
          if (!chs.length) return "";
          return `<li class="toc-part"><p>${esc(part.titre)}</p><ol>${chs.map(c => `
            <li><button type="button" data-goto="${c.page}"><span>${esc(c.label)}</span><i></i><b>${c.page}</b></button></li>`).join("")}</ol></li>`;
        }).join("")}
        <li><button type="button" data-goto="${pRules}"><span>Mes règles de design</span><i></i><b>${pRules}</b></button></li>
        <li><button type="button" data-goto="${pEnd}"><span>Votre projet</span><i></i><b>${pEnd}</b></button></li>
      </ol>`;
    chapters.forEach(c => {
      list[c.page].html = `
        <p class="ch-n">Chapitre ${c.n} · ${esc(c.part)}</p>
        <h2 class="ch-h" ${c.id === "laser" ? "data-engrave" : ""}>${esc(c.label)}</h2>
        <p class="pg-p" ${c.id === "laser" ? "data-engrave" : ""}>${esc((data.livre && data.livre.intros && data.livre.intros[c.id]) || "")}</p>
        <ol class="ch-list">${c.projets.map(x => `<li><button type="button" data-goto="${x.page}"><span>${esc(x.p.titre)}</span><i></i><b>${x.page}</b></button></li>`).join("")}</ol>`;
      c.projets.forEach(({ p, page }) => {
        const more = p.images.length - 1;
        list[page].html = `
          <p class="pg-run">${esc(c.label)}</p>
          <button type="button" class="pg-photo" data-open="${esc(p.id)}" aria-label="Agrandir les photos : ${esc(p.titre)}">
            <img data-src="${esc(thumb(p.images[0]))}" data-fallback="${esc(p.images[0])}" alt="">
            ${more > 0 ? `<span class="pg-more">+${more} photo${more > 1 ? "s" : ""}</span>` : ""}
          </button>
          <h3 class="pg-t" ${c.id === "laser" ? "data-engrave" : ""}>${esc(p.titre)}</h3>
          <p class="pg-p" ${c.id === "laser" ? "data-engrave" : ""}>${esc(p.description || p.resume || "")}</p>
          ${p.tags && p.tags.length ? `<p class="pg-tags">${p.tags.map(esc).join(" · ")}</p>` : ""}`;
      });
    });
    return list;
  }

  // ------------------------------------------------------------ gravure du texte (pages laser)
  // chaque lettre du titre et chaque mot du texte « brûle » à son tour
  function prepareEngrave(face) {
    $$("[data-engrave]", face).forEach(el => {
      if (el.dataset.ready) return;
      const isTitle = /^H/.test(el.tagName);
      const text = el.textContent;
      const parts = isTitle ? Array.from(text) : text.split(/(\s+)/);
      el.setAttribute("aria-label", text);
      el.innerHTML = parts.map(t => /^\s+$/.test(t) ? t : `<span class="eg" aria-hidden="true">${esc(t)}</span>`).join("");
      el.dataset.ready = "1";
    });
  }
  function engrave(face, key) {
    if (!face || engraved.has(key)) return;
    engraved.add(key);
    const page = face.querySelector(".pg");
    if (!page || !page.classList.contains("pg-laser")) return;
    if (still) { page.classList.add("is-engraved"); return; }
    let t = 120;
    $$("[data-engrave]", face).forEach(el => {
      const isTitle = /^H/.test(el.tagName);
      $$(".eg", el).forEach(s => { s.style.setProperty("--d", t + "ms"); t += isTitle ? 38 : 42; });
      t += 160;
    });
    page.classList.add("is-engraving");
    setTimeout(() => { page.classList.remove("is-engraving"); page.classList.add("is-engraved"); }, t + 700);
  }

  // ------------------------------------------------------------ construction des feuilles
  const pageHTML = (i) => {
    const pg = pages[i];
    if (!pg) return `<div class="pg pg-blank"></div>`;
    const num = ["cover", "back", "blank"].includes(pg.kind) ? "" : `<span class="pg-num">${i}</span>`;
    const engr = engraved.has(i) ? " is-engraved" : "";
    return `<div class="pg pg-${pg.kind}${pg.laser ? " pg-laser" + engr : ""}" data-page="${i}">${pg.html}${num}</div>`;
  };
  function build() {
    const spread = mode === "spread";
    const n = spread ? Math.ceil(pages.length / 2) : pages.length;
    book.className = "book is-" + mode;
    book.innerHTML = Array.from({ length: n }, (_, k) => {
      const front = spread ? 2 * k : k, back = spread ? 2 * k + 1 : -1;
      return `<div class="leaf" data-k="${k}">
        <div class="face front">${pageHTML(front)}</div>
        <div class="face back">${back >= 0 ? pageHTML(back) : `<div class="pg pg-verso"></div>`}</div>
      </div>`;
    }).join("");
    leaves = $$(".leaf", book);
    $$(".face", book).forEach(prepareEngrave);
    $$("[data-delay]", book).forEach(el => { const v = (window.SITE_CONFIG.delays || {})[el.dataset.delay]; if (v) el.textContent = v; });
    apply(false);
  }

  // ------------------------------------------------------------ état : feuilles tournées
  const visiblePages = () => mode === "spread" ? [2 * flipped - 1, 2 * flipped].filter(i => i >= 0 && i < pages.length) : [flipped];
  function apply(animate, turning) {
    const n = leaves.length;
    leaves.forEach((leaf, k) => {
      const on = k < flipped;
      leaf.classList.toggle("is-flipped", on);
      leaf.style.zIndex = k === turning ? n + 5 : (on ? k + 1 : n - k);
      leaf.style.transitionDuration = animate ? TURN_MS + "ms" : "0ms";
      // page simple : une feuille déjà tournée sort de l'écran, on la masque
      leaf.style.visibility = mode === "single" && on && !animate && k < flipped - 1 ? "hidden" : "";
      if (mode === "single" && on && !animate && k === flipped - 1) leaf.style.visibility = "hidden";
    });
    // livre fermé : la couverture est centrée ; ouvert : les deux pages
    if (mode === "spread") book.style.setProperty("--shift", flipped === 0 ? "-25%" : flipped === n ? "25%" : "0%");
    book.style.transitionDuration = animate ? TURN_MS + "ms" : "0ms";
    // seules les pages visibles sont lisibles et atteignables au clavier
    const vis = visiblePages();
    $$(".face", book).forEach(f => {
      const pg = f.querySelector("[data-page]");
      const show = pg && vis.includes(+pg.dataset.page) || (mode === "single" && f.classList.contains("front") && +f.parentNode.dataset.k === flipped);
      f.inert = !show; f.setAttribute("aria-hidden", show ? "false" : "true");
    });
    loadImages(vis);
    updateControls(vis);
  }
  function loadImages(vis) {
    const lo = Math.min(...vis) - 3, hi = Math.max(...vis) + 4;
    $$("img[data-src]", book).forEach(img => {
      const pg = img.closest("[data-page]"); const i = pg ? +pg.dataset.page : 0;
      if (i < lo || i > hi) return;
      img.onerror = () => { if (img.dataset.fallback && img.src.indexOf(img.dataset.fallback) < 0) img.src = img.dataset.fallback; };
      img.src = img.dataset.src; img.removeAttribute("data-src");
    });
  }
  function updateControls(vis) {
    const last = leaves.length;
    $("#bookPrev").disabled = flipped === 0;
    $("#bookNext").disabled = flipped >= (mode === "spread" ? last : pages.length - 1);
    const first = pages[vis[0]];
    let txt;
    if (first && first.kind === "cover") txt = "Couverture";
    else if (pages[vis[vis.length - 1]].kind === "back" && vis.length === 1) txt = "4e de couverture";
    else {
      const nums = vis.filter(i => !["cover", "back", "blank"].includes(pages[i].kind));
      txt = nums.length ? `Page${nums.length > 1 ? "s" : ""} ${nums.join("–")} sur ${pages.length - 2}` : "Fin";
    }
    $("#bookCount").textContent = txt;
    // l'adresse suit le projet affiché, pour pouvoir le partager
    const proj = vis.map(i => pages[i]).find(p => p && p.project);
    history.replaceState(null, "", proj ? "#" + proj.project.id : location.pathname);
  }
  function afterTurn() {
    const vis = visiblePages();
    vis.forEach(i => { const pg = pages[i]; if (pg && pg.project && window.track) window.track("projet_vu", pg.project.titre, true); });
    vis.forEach(i => {
      if (!pages[i] || !pages[i].laser) return;
      const pg = book.querySelector(`[data-page="${i}"]`);
      engrave(pg && pg.parentNode, i);
    });
  }

  // ------------------------------------------------------------ tourner les pages
  const maxFlipped = () => mode === "spread" ? leaves.length : pages.length - 1;
  function turn(dir) {
    if (busy) return Promise.resolve();
    const target = flipped + dir;
    if (target < 0 || target > maxFlipped()) return Promise.resolve();
    busy = true;
    const turning = dir > 0 ? flipped : flipped - 1;
    flipped = target;
    apply(true, turning);
    return new Promise(res => setTimeout(() => { busy = false; apply(false); afterTurn(); res(); }, TURN_MS + 30));
  }
  async function goTo(page) {
    const target = mode === "spread" ? Math.ceil(page / 2) : page;
    if (target === flipped || busy) return;
    const dir = target > flipped ? 1 : -1;
    const steps = Math.abs(target - flipped);
    if (steps > 1 && !still) {
      // plusieurs feuilles : elles tournent en cascade rapide
      busy = true;
      const from = flipped;
      const gap = Math.min(70, 520 / steps); // la cascade ne dure jamais plus d'environ une seconde
      for (let s = 1; s <= steps; s++) {
        const k = dir > 0 ? from + s - 1 : from - s;
        setTimeout(() => {
          flipped = dir > 0 ? from + s : from - s;
          const leaf = leaves[k];
          leaf.style.visibility = "";
          leaf.style.transitionDuration = "520ms";
          leaf.classList.toggle("is-flipped", dir > 0);
          leaf.style.zIndex = leaves.length + 5 + s;
          if (mode === "spread") book.style.setProperty("--shift", flipped === 0 ? "-25%" : flipped === leaves.length ? "25%" : "0%");
          book.style.transitionDuration = "520ms";
        }, (s - 1) * gap);
      }
      await new Promise(r => setTimeout(r, (steps - 1) * gap + 560));
      busy = false; apply(false); afterTurn();
    } else {
      flipped = target; apply(false); afterTurn();
    }
  }

  // ------------------------------------------------------------ taille et mode
  function layout() {
    const vw = innerWidth, vh = innerHeight;
    const next = vw >= 900 ? "spread" : "single";
    const avH = Math.max(420, vh - (vw >= 900 ? 190 : 170));
    let ph, pw;
    if (next === "spread") { ph = Math.min(avH, (Math.min(vw, 1500) - 80) / 2 / 0.72); pw = ph * 0.72; }
    else { pw = Math.min(vw - 32, 520); ph = Math.min(avH, pw / 0.66); pw = Math.min(pw, ph * 0.78); }
    stage.style.setProperty("--pw", Math.round(pw) + "px");
    stage.style.setProperty("--ph", Math.round(ph) + "px");
    if (next !== mode) {
      const keep = visiblePages().find(i => pages[i] && pages[i].kind !== "blank") || 0;
      mode = next;
      flipped = mode === "spread" ? Math.ceil(keep / 2) : keep;
      build();
      afterTurn();
    }
  }
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(layout, 120); });

  // ------------------------------------------------------------ commandes
  $("#bookPrev").addEventListener("click", () => turn(-1));
  $("#bookNext").addEventListener("click", () => turn(1));
  $("#bookToc").addEventListener("click", () => goTo(pages.findIndex(p => p.kind === "toc")));
  document.addEventListener("keydown", e => {
    if (e.target.closest("input, textarea, select, dialog[open]")) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); turn(1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); turn(-1); }
    if (e.key === "Home") goTo(0);
  });
  book.addEventListener("click", e => {
    const g = e.target.closest("[data-goto]"); if (g) { goTo(+g.dataset.goto); return; }
    const o = e.target.closest("[data-open]"); if (o) { openProject(o.dataset.open); return; }
    if (e.target.closest("a, button")) return;
    // un clic près du bord extérieur tourne la page (le centre reste libre pour lire)
    const r = book.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    if (mode === "single") { if (x > 0.7) turn(1); else if (x < 0.2) turn(-1); }
    else if (flipped === 0) turn(1);
    else if (flipped === leaves.length) turn(-1);
    else { if (x > 0.78) turn(1); else if (x < 0.22) turn(-1); }
  });
  // balayage au doigt
  let sx = null, sy = null;
  stage.addEventListener("pointerdown", e => { sx = e.clientX; sy = e.clientY; }, { passive: true });
  stage.addEventListener("pointerup", e => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { turn(dx < 0 ? 1 : -1); stage.dataset.swiped = "1"; }
  }, { passive: true });
  stage.addEventListener("click", e => { if (stage.dataset.swiped) { e.stopPropagation(); e.preventDefault(); delete stage.dataset.swiped; } }, true);

  // ------------------------------------------------------------ visionneuse
  const lb = $("#lightbox");
  function showImage(p, i) {
    const img = $("#lb-img");
    img.onerror = () => { if (img.src.indexOf(p.images[i]) < 0) img.src = p.images[i]; };
    img.src = large(p.images[i]);
    img.alt = `${p.titre} — photo ${i + 1}`;
    $$("#lb-thumbs button").forEach((b, k) => b.setAttribute("aria-pressed", k === i ? "true" : "false"));
  }
  function openProject(id) {
    const p = data.projets.find(x => x.id === id);
    if (!p) return;
    $("#lb-title").textContent = p.titre;
    window.track && window.track("projet_photos", p.titre);
    $("#lb-desc").textContent = p.description || p.resume || "";
    $("#lb-tags").innerHTML = (p.tags || []).map(t => `<span>${esc(t)}</span>`).join("");
    $("#lb-thumbs").innerHTML = p.images.length > 1
      ? p.images.map((src, k) => `<button type="button" data-k="${k}" aria-label="Photo ${k + 1}"><img src="${esc(thumb(src))}" alt="" onerror="this.onerror=null;this.src='${esc(src)}'"></button>`).join("")
      : "";
    $("#lb-thumbs").hidden = p.images.length < 2;
    $("#lb-thumbs").onclick = e => { const b = e.target.closest("[data-k]"); if (b) showImage(p, +b.dataset.k); };
    showImage(p, 0);
    if (typeof lb.showModal === "function") lb.showModal(); else lb.setAttribute("open", "");
  }
  const closeLb = () => { if (lb.close) lb.close(); else lb.removeAttribute("open"); };
  $("#lb-close").addEventListener("click", closeLb);
  lb.addEventListener("click", e => { if (e.target === lb) closeLb(); });

  // ------------------------------------------------------------ démarrage
  fetch("portfolio/portfolio.json")
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(d => {
      data = d;
      pages = buildPages();
      // lien direct vers un projet (ex. depuis l'accueil) : le livre s'ouvre à sa page
      const id = location.hash.slice(1);
      const at = id ? pages.findIndex(p => p.project && p.project.id === id) : -1;
      layout();
      if (at > 0) { flipped = mode === "spread" ? Math.ceil(at / 2) : at; apply(false); afterTurn(); }
      setTimeout(() => { const h = $("#bookHint"); if (h) h.classList.add("is-faded"); }, 6000);
      // ancre modifiée sans recharger la page
      addEventListener("hashchange", () => {
        const at = pages.findIndex(p => p.project && p.project.id === location.hash.slice(1));
        if (at > 0) goTo(at);
      });
    })
    .catch(() => { book.innerHTML = `<p class="empty">Le portfolio n'a pas pu être chargé.</p>`; });
})();
