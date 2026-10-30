/* =========================================================================
   Page « L'atelier » : les machines dessinées. Au survol (ou au toucher),
   la porte s'ouvre et la fiche technique sort de la machine.
   Données : config.js → machines (art = dessin, photo = ta photo à la place).
   Dessins : vue de face, repère 300 × 300 ; chamber = intérieur de la machine
   d'où sort la fiche ; door = la porte (side = charnière à gauche, lid = capot).
   ========================================================================= */
(function () {
  "use strict";
  const C = window.SITE_CONFIG;
  const { $$, esc } = window.UI;
  const box = document.querySelector('[data-render="machines-art"]');
  if (!box) return;

  const G = "#4C4C4C", G2 = "#3B3B3B", G3 = "#2A2928", S = "#C1A88A", L = "#ECEAE7", M = "#5E5E5E";
  const SPOOLS = ["#D33A3A", "#F2C53D", "#2F74C9", "#ECEAE7"];
  const r = (x, y, w, h, fill, rx = 0, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
  // intérieur d'imprimante 3D : portique, tête, plateau, pièce en cours
  const printInside = (x, y, w, h, head = S) =>
    r(x, y, w, h, G3, 4) +
    r(x + 8, y + 22, w - 16, 6, M) + r(x + w / 2 - 15, y + 14, 30, 26, head, 3) + r(x + w / 2 - 3, y + 40, 6, 6, M) +
    r(x + 12, y + h - 18, w - 24, 8, M) +
    `<path d="M${x + w / 2 - 22} ${y + h - 18} l10 -34 h24 l10 34z" fill="${S}" opacity=".9"/>`;

  const ART = {
    x1c: {
      svg: r(64, 12, 172, 38, G2, 6) + SPOOLS.map((c, i) => `<circle cx="${92 + i * 39}" cy="31" r="11" fill="${c}"/>`).join("") +
        r(36, 52, 228, 222, G, 10) + r(48, 60, 204, 12, M, 3) + printInside(48, 80, 204, 166) +
        r(36, 252, 228, 22, G2, 0) + r(48, 257, 34, 11, L, 2, 'opacity=".55"'),
      chamber: [48, 80, 204, 166], door: "side"
    },
    a1mini: {
      svg: r(62, 92, 176, 182, "#D9D4CE", 10) + r(62, 248, 176, 26, "#C7C1BA", 0) + r(72, 256, 30, 10, G, 2) +
        printInside(74, 104, 152, 138, G),
      chamber: [74, 104, 152, 138], door: "side"
    },
    u1: {
      svg: r(38, 36, 224, 238, L, 10, `stroke="${G}" stroke-width="3"`) + r(38, 36, 224, 26, G, 10) + r(38, 50, 224, 12, G, 0) +
        r(50, 74, 200, 166, G3, 4) + SPOOLS.map((c, i) => r(62 + i * 46, 82, 38, 24, c, 3)).join("") +
        r(58, 112, 184, 5, M) + r(62, 220, 176, 8, M) + `<path d="M126 220 l8 -30 h32 l8 30z" fill="${S}"/>` +
        r(38, 248, 224, 26, G, 0) + r(50, 254, 34, 12, L, 2, 'opacity=".6"'),
      chamber: [50, 74, 200, 166], door: "side"
    },
    zr: {
      svg: r(40, 30, 220, 10, M, 3) + SPOOLS.map((c, i) => r(56 + i * 50, 14, 36, 22, c, 3)).join("") +
        r(40, 44, 220, 230, G2, 10) + printInside(52, 58, 196, 180, G) + r(40, 250, 220, 24, G3, 0) + r(52, 256, 30, 11, S, 2),
      chamber: [52, 58, 196, 180], door: "side"
    },
    giga: {
      svg: r(14, 10, 272, 266, "none", 6, `stroke="${G}" stroke-width="12"`) + r(14, 10, 272, 18, G, 6) + r(14, 250, 272, 26, G, 0) +
        r(26, 30, 248, 218, G3, 2) + r(34, 66, 232, 7, M) + r(128, 56, 44, 30, S, 3) +
        r(36, 226, 112, 8, M) + r(152, 226, 112, 8, M) +
        `<path d="M70 226 l14 -96 h56 l14 96z" fill="${S}" opacity=".9"/><path d="M190 226 l8 -56 h34 l8 56z" fill="${S}" opacity=".7"/>`,
      chamber: [26, 30, 248, 218], door: "side"
    },
    laser: {
      svg: r(18, 118, 264, 150, L, 12, `stroke="${G}" stroke-width="3"`) + r(18, 236, 264, 32, "#DAD6D1", 0) + r(30, 246, 40, 12, G, 3) +
        r(30, 132, 240, 100, G3, 4) +
        Array.from({ length: 9 }, (_, i) => r(40 + i * 26, 140, 2, 84, "#3E3C3A")).join("") +
        r(36, 160, 228, 6, M) + r(150, 150, 22, 24, S, 3) + r(158, 174, 6, 4, "#FF8A3D"),
      chamber: [30, 132, 240, 100], door: "lid"
    },
    uv: {
      svg: r(14, 124, 272, 144, G2, 14) + r(14, 240, 272, 28, G3, 0) + r(232, 248, 36, 12, S, 3) +
        r(28, 136, 244, 98, "#1F1E1D", 4) + r(36, 150, 228, 8, M) + r(110, 140, 46, 24, L, 3) +
        r(56, 196, 188, 30, "#3A3836", 2) + r(86, 200, 128, 22, "#C1A88A", 2, 'opacity=".9"'),
      chamber: [28, 136, 244, 98], door: "lid"
    }
  };

  // porte : vitre teintée, cadre, reflet, poignée
  const doorSVG = (w, h, type) => {
    const tint = type === "lid" ? "rgba(214, 120, 40, .42)" : "rgba(28, 28, 28, .42)";
    const frame = type === "lid" ? "#B8B2AB" : "#6A6A6A";
    const handle = type === "lid" ? `<rect x="${w / 2 - 24}" y="${h - 9}" width="48" height="5" rx="2.5" fill="${G}"/>` : `<rect x="${w - 11}" y="${h / 2 - 24}" width="5" height="48" rx="2.5" fill="${S}"/>`;
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="4" fill="${tint}" stroke="${frame}" stroke-width="4"/>
      <path d="M${w * 0.12} ${h - 4} L${w * 0.42} 4 L${w * 0.55} 4 L${w * 0.25} ${h - 4}Z" fill="#fff" opacity=".13"/>${handle}</svg>`;
  };

  const pct = (v) => (v / 300 * 100).toFixed(3) + "%";
  box.innerHTML = (C.machines || []).map((m, i) => {
    const a = ART[m.art] || ART.x1c;
    const [x, y, w, h] = a.chamber;
    const id = `mc-sheet-${i}`;
    const rows = [["Technologie", m.tech], ["Matières", m.materials], ["Taille max", m.size], ["Idéal pour", m.use]].filter(([, v]) => v);
    const visual = m.photo
      ? `<img class="mc-photo" src="${esc(m.photo)}" alt="" loading="lazy">`
      : `<svg class="mc-body" viewBox="0 0 300 300" aria-hidden="true">${a.svg}</svg>
         <div class="mc-door is-${a.door}" style="left:${pct(x)};top:${pct(y)};width:${pct(w)};height:${pct(h)}">${doorSVG(w, h, a.door)}</div>`;
    return `<article class="mc${m.photo ? " has-photo" : ""}" data-reveal>
      <div class="mc-art" style="--cx:${pct(x)};--cy:${pct(y)};--cr:${pct(300 - x - w)};--cb:${pct(300 - y - h)}">
        ${visual}
        <div class="mc-sheet" id="${id}">
          <p class="mc-sheet-k">${esc(m.kind || "")}</p>
          <p class="mc-sheet-n">${esc(m.name)}</p>
          <dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        </div>
      </div>
      <h3 class="mc-name"><button type="button" class="mc-btn" aria-expanded="false" aria-controls="${id}">${esc(m.name)}</button></h3>
      <p class="mc-kind">${esc(m.kind || "")}<span class="mc-hint" aria-hidden="true"> · voir la fiche</span></p>
    </article>`;
  }).join("");

  // au toucher ou au clavier : ouvrir / fermer (une machine à la fois)
  const cards = $$(".mc", box);
  cards.forEach(card => {
    const btn = card.querySelector(".mc-btn");
    btn.addEventListener("click", () => {
      const open = !card.classList.contains("is-open");
      cards.forEach(c => { c.classList.remove("is-open"); c.querySelector(".mc-btn").setAttribute("aria-expanded", "false"); });
      card.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") cards.forEach(c => { c.classList.remove("is-open"); c.querySelector(".mc-btn").setAttribute("aria-expanded", "false"); }); });
})();
