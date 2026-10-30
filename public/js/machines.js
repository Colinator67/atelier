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

  // ------------------------------------------------------------ dessins (repère 300 × 300, vue de trois quarts)
  // Chaque dessin : svg = le corps ; chamber = [x, y, l, h] intérieur d'où sort la fiche ;
  // door = "side" (porte à charnière), "lid" (capot) ou "arm" (pas de porte : le portique monte) ;
  // part = [x, y, l, h] de l'élément qui bouge, partSvg = son dessin.
  const DX = 18, DY = -12; // profondeur visible (côté droit et dessus)
  const grad = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</linearGradient>`;
  const cube = (k, x, y, w, h, front, side, top, rx = 8) => `
    <path d="M${x + w} ${y + rx} l${DX} ${DY} v${h - rx} l${-DX} ${-DY}z" fill="${side}"/>
    <path d="M${x + rx} ${y} l${DX} ${DY} h${w - rx} l${-DX} ${-DY}z" fill="${top}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#${k}-front)"/>
    <defs>${grad(k + "-front", front)}</defs>`;
  const feet = (x, y, w, c = "#1C1B1A") => `<rect x="${x + 10}" y="${y}" width="16" height="5" rx="2" fill="${c}"/><rect x="${x + w - 26}" y="${y}" width="16" height="5" rx="2" fill="${c}"/>`;
  const screen = (x, y, w = 40, h = 14) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#121212"/><rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" rx="1.5" fill="#2B4A5E"/><rect x="${x + 6}" y="${y + 5}" width="${(w - 12) * 0.55}" height="2" fill="#9CC9E0"/><rect x="${x + 6}" y="${y + 9}" width="${(w - 12) * 0.35}" height="1.6" fill="#6E9DB5"/>`;
  // intérieur d'imprimante : paroi du fond, éclairage, tiges, plateau texturé, pièce en couches, portique et tête
  const inside = (k, x, y, w, h, o = {}) => {
    const bedY = y + h - 22, objH = Math.min(h * 0.38, 70), cx = x + w / 2;
    const heads = o.heads ? o.heads.map((c, i) => {
      const hx = x + 14 + i * ((w - 28) / o.heads.length);
      return `<rect x="${hx}" y="${y + 10}" width="${(w - 28) / o.heads.length - 6}" height="18" rx="3" fill="${c}"/><rect x="${hx + 4}" y="${y + 13}" width="${(w - 28) / o.heads.length - 14}" height="3" rx="1.5" fill="#fff" opacity=".25"/>`;
    }).join("") : "";
    return `<defs>
        ${grad(k + "-in", [[0, "#3A3936"], [1, "#1B1A19"]])}
        ${grad(k + "-bed", [[0, "#2A2A2A"], [0.5, "#3B3B3B"], [1, "#222"]], 1, 0)}
        ${grad(k + "-obj", [[0, o.obj || "#C1A88A"], [1, o.obj2 || "#9C8466"]], 1, 0)}
        ${grad(k + "-rod", [[0, "#8E8E8E"], [0.5, "#E2E2E2"], [1, "#7A7A7A"]])}
        <pattern id="${k}-layers" width="4" height="2.4" patternUnits="userSpaceOnUse"><rect width="4" height="1.2" fill="#000" opacity=".12"/></pattern>
      </defs>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="url(#${k}-in)"/>
      <rect x="${x + 6}" y="${y + 3}" width="${w - 12}" height="3" rx="1.5" fill="#FFE9C2" opacity=".85"/>
      <rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h * 0.5}" fill="#FFE9C2" opacity=".06"/>
      <rect x="${x + 10}" y="${y + 8}" width="3" height="${h - 30}" fill="url(#${k}-rod)" opacity=".7"/><rect x="${x + w - 13}" y="${y + 8}" width="3" height="${h - 30}" fill="url(#${k}-rod)" opacity=".7"/>
      ${heads}
      <path d="M${cx - 34} ${bedY} c 0 -${objH * 0.6} 12 -${objH} 34 -${objH} s 34 ${objH * 0.4} 34 ${objH}z" fill="url(#${k}-obj)"/>
      <path d="M${cx - 34} ${bedY} c 0 -${objH * 0.6} 12 -${objH} 34 -${objH} s 34 ${objH * 0.4} 34 ${objH}z" fill="url(#${k}-layers)"/>
      ${o.second ? `<rect x="${x + w - 58}" y="${bedY - 26}" width="30" height="26" rx="2" fill="${o.second}"/><rect x="${x + w - 58}" y="${bedY - 26}" width="30" height="26" fill="url(#${k}-layers)"/>` : ""}
      <rect x="${x + 8}" y="${bedY}" width="${w - 16}" height="9" rx="2" fill="url(#${k}-bed)"/>
      <rect x="${x + 8}" y="${bedY + 9}" width="${w - 16}" height="4" fill="#111"/>
      ${o.noGantry ? "" : `<rect x="${x + 8}" y="${y + h * 0.3}" width="${w - 16}" height="5" rx="2" fill="url(#${k}-rod)"/>
      <rect x="${cx + 8}" y="${y + h * 0.3 - 13}" width="30" height="30" rx="4" fill="${o.head || "#2E2E2E"}"/>
      <circle cx="${cx + 23}" cy="${y + h * 0.3 + 1}" r="8" fill="#151515"/><circle cx="${cx + 23}" cy="${y + h * 0.3 + 1}" r="5" fill="none" stroke="#555" stroke-width="1.5"/>
      <path d="M${cx + 19} ${y + h * 0.3 + 17} h8 l-2 6 h-4z" fill="#C9A15A"/>`}`;
  };
  // bobine de filament vue de face
  const spool = (cx, cy, r, c) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1E1E1E"/><circle cx="${cx}" cy="${cy}" r="${r - 3}" fill="${c}"/><circle cx="${cx}" cy="${cy}" r="${r - 3}" fill="none" stroke="#000" stroke-opacity=".15" stroke-dasharray="1 2"/><circle cx="${cx}" cy="${cy}" r="${r * 0.35}" fill="#2A2A2A"/><circle cx="${cx}" cy="${cy}" r="${r * 0.15}" fill="#666"/>`;
  const SP = ["#D33A3A", "#F2C53D", "#2F74C9", "#F4F1EC"];

  const ART = {
    // imprimante fermée, boîte à bobines sur le dessus
    x1c: {
      svg: `<ellipse cx="150" cy="282" rx="128" ry="7" fill="#000" opacity=".12"/>` +
        cube("x1-ams", 58, 14, 172, 42, [[0, "#3C3C3C"], [1, "#2B2B2B"]], "#222", "#4A4A4A", 6) +
        `<rect x="66" y="20" width="156" height="28" rx="4" fill="#161616"/>` + SP.map((c, i) => spool(85 + i * 39, 34, 12, c)).join("") +
        `<rect x="66" y="20" width="156" height="12" rx="4" fill="#fff" opacity=".07"/>` +
        cube("x1", 34, 60, 230, 214, [[0, "#565656"], [0.6, "#3E3E3E"], [1, "#333"]], "#262626", "#5E5E5E", 10) +
        `<rect x="44" y="66" width="210" height="8" rx="3" fill="#2A2A2A"/>` +
        inside("x1i", 46, 80, 206, 160, { obj: "#4FA3D9", obj2: "#2F74C9", second: "#E8C547" }) +
        `<rect x="34" y="246" width="230" height="28" fill="#2C2C2C"/>` + screen(46, 252, 44, 16) + `<circle cx="248" cy="260" r="3" fill="#7BD88F"/>` + feet(34, 274, 230),
      chamber: [46, 80, 206, 160], door: "side"
    },
    // petite imprimante à bras en porte-à-faux, sans porte : le bras monte
    a1mini: {
      svg: `<ellipse cx="150" cy="282" rx="112" ry="7" fill="#000" opacity=".12"/>
        <defs>${grad("a1-col", [[0, "#D6D1CB"], [0.5, "#F2EFEB"], [1, "#C9C3BC"]], 1, 0)}${grad("a1-bed", [[0, "#2E2E2E"], [0.5, "#454545"], [1, "#262626"]], 1, 0)}${grad("a1-obj", [[0, "#E86A6A"], [1, "#B83E3E"]], 1, 0)}
        <pattern id="a1-layers" width="4" height="2.4" patternUnits="userSpaceOnUse"><rect width="4" height="1.2" fill="#000" opacity=".14"/></pattern></defs>` +
        cube("a1b", 46, 232, 208, 42, [[0, "#ECE8E3"], [1, "#D4CEC7"]], "#BDB6AE", "#F4F1ED", 8) + screen(58, 244, 36, 14) + feet(46, 274, 208, "#9A938B") +
        `<path d="M98 232 h150 l${DX} ${DY} h-150z" fill="#4A4A4A"/><rect x="98" y="222" width="150" height="10" rx="2" fill="url(#a1-bed)"/>` +
        `<path d="M150 222 c0 -26 8 -44 24 -44 s24 18 24 44z" fill="url(#a1-obj)"/><path d="M150 222 c0 -26 8 -44 24 -44 s24 18 24 44z" fill="url(#a1-layers)"/>` +
        `<rect x="58" y="44" width="26" height="190" rx="6" fill="url(#a1-col)"/><path d="M84 50 l10 -7 v182 l-10 7z" fill="#B7B0A8"/><rect x="58" y="36" width="26" height="14" rx="5" fill="#E6E1DB"/>` +
        `<path d="M60 236 q-26 -20 -10 -90 q8 -36 30 -60" fill="none" stroke="#2A2A2A" stroke-width="3"/>`,
      chamber: [96, 70, 170, 150], door: "arm",
      part: [74, 92, 196, 66],
      partSvg: (w, h) => `<defs>${grad("a1-arm", [[0, "#F4F1ED"], [1, "#CFC9C2"]])}</defs>
        <rect x="0" y="10" width="${w - 30}" height="16" rx="5" fill="url(#a1-arm)"/><rect x="0" y="24" width="${w - 30}" height="4" fill="#B5AEA6"/>
        <rect x="${w - 92}" y="0" width="52" height="56" rx="8" fill="#F1EDE8" stroke="#CFC9C2" stroke-width="2"/>
        <circle cx="${w - 66}" cy="26" r="13" fill="#2E2E2E"/><circle cx="${w - 66}" cy="26" r="8" fill="none" stroke="#666" stroke-width="2"/>
        <path d="M${w - 71} 56 h10 l-2 8 h-6z" fill="#C9A15A"/><rect x="${w - 40}" y="6" width="34" height="8" rx="3" fill="#E6E1DB"/>`
    },
    // changeur d'outils : quatre têtes garées en haut de l'enceinte
    u1: {
      svg: `<ellipse cx="150" cy="282" rx="128" ry="7" fill="#000" opacity=".12"/>` +
        cube("u1", 34, 30, 232, 244, [[0, "#F4F2EF"], [1, "#DCD8D3"]], "#C2BDB6", "#FFFFFF", 10) +
        `<rect x="34" y="30" width="232" height="30" rx="10" fill="#2E2E2E"/><rect x="34" y="48" width="232" height="12" fill="#2E2E2E"/>` +
        inside("u1i", 46, 68, 208, 176, { heads: ["#D33A3A", "#F2C53D", "#2F74C9", "#F4F1EC"], obj: "#E2E2E2", obj2: "#9E9E9E", second: "#D33A3A", head: "#3A3A3A" }) +
        `<rect x="34" y="250" width="232" height="24" fill="#E4E0DB"/>` + screen(46, 254, 40, 15) + feet(34, 274, 232, "#8E8780"),
      chamber: [46, 68, 208, 176], door: "side"
    },
    // changeur d'outils, têtes posées sur un rail extérieur
    zr: {
      svg: `<ellipse cx="150" cy="282" rx="126" ry="7" fill="#000" opacity=".12"/>` +
        `<defs>${grad("zr-rail", [[0, "#9A9A9A"], [0.5, "#E6E6E6"], [1, "#7E7E7E"]])}</defs><rect x="40" y="34" width="220" height="8" rx="3" fill="url(#zr-rail)"/>` +
        SP.map((c, i) => `<rect x="${52 + i * 52}" y="12" width="40" height="26" rx="5" fill="#2A2A2A"/><rect x="${56 + i * 52}" y="16" width="32" height="10" rx="3" fill="${c}"/><circle cx="${72 + i * 52}" cy="31" r="3" fill="#555"/>`).join("") +
        cube("zr", 36, 46, 228, 228, [[0, "#3A3A3A"], [1, "#262626"]], "#1C1C1C", "#4C4C4C", 10) +
        inside("zri", 48, 58, 204, 182, { obj: "#E8C547", obj2: "#C9A227", second: "#2F74C9" }) +
        `<rect x="36" y="248" width="228" height="26" fill="#1F1F1F"/>` + screen(48, 253, 44, 16) + `<rect x="226" y="258" width="26" height="5" rx="2.5" fill="#C1A88A"/>` + feet(36, 274, 228),
      chamber: [48, 58, 204, 182], door: "side"
    },
    // grand format à cadre ouvert, plateau en quatre zones : le portique monte
    giga: {
      svg: `<ellipse cx="150" cy="284" rx="140" ry="7" fill="#000" opacity=".12"/>
        <defs>${grad("gg-al", [[0, "#7C7C7C"], [0.5, "#D9D9D9"], [1, "#6E6E6E"]], 1, 0)}${grad("gg-alh", [[0, "#CFCFCF"], [1, "#7A7A7A"]])}${grad("gg-obj", [[0, "#F0A35E"], [1, "#C8742E"]], 1, 0)}${grad("gg-obj2", [[0, "#9FD3E8"], [1, "#5FA7C4"]], 1, 0)}
        <pattern id="gg-layers" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1.4" fill="#000" opacity=".12"/></pattern></defs>
        <rect x="22" y="10" width="14" height="262" fill="url(#gg-al)"/><rect x="264" y="10" width="14" height="262" fill="url(#gg-al)"/>
        <path d="M278 16 l10 -8 v256 l-10 8z" fill="#5C5C5C"/>
        <rect x="22" y="8" width="256" height="14" fill="url(#gg-alh)"/>
        <rect x="36" y="22" width="228" height="218" fill="#E9E6E2" opacity=".35"/>
        <path d="M70 226 c0 -60 14 -110 44 -110 s44 50 44 110z" fill="url(#gg-obj)"/><path d="M70 226 c0 -60 14 -110 44 -110 s44 50 44 110z" fill="url(#gg-layers)"/>
        <rect x="178" y="170" width="62" height="56" rx="3" fill="url(#gg-obj2)"/><rect x="178" y="170" width="62" height="56" fill="url(#gg-layers)"/>` +
        [0, 1, 2, 3].map(i => `<rect x="${40 + i * 56}" y="226" width="52" height="10" rx="2" fill="#2E2E2E"/><rect x="${40 + i * 56}" y="226" width="52" height="3" fill="#4A4A4A"/>`).join("") +
        `<rect x="22" y="240" width="256" height="34" rx="4" fill="#2E2E2E"/>` + screen(36, 248, 50, 18) + `<rect x="236" y="254" width="28" height="6" rx="3" fill="#C1A88A"/>` + feet(22, 274, 256),
      chamber: [36, 30, 228, 196], door: "arm",
      part: [22, 70, 256, 52],
      partSvg: (w, h) => `<defs>${grad("gg-x", [[0, "#D9D9D9"], [1, "#6E6E6E"]])}</defs>
        <rect x="0" y="16" width="${w}" height="12" fill="url(#gg-x)"/><rect x="0" y="26" width="${w}" height="3" fill="#555"/>
        <rect x="${w / 2 - 22}" y="2" width="44" height="46" rx="6" fill="#2E2E2E"/><circle cx="${w / 2}" cy="22" r="11" fill="#151515"/><circle cx="${w / 2}" cy="22" r="7" fill="none" stroke="#666" stroke-width="2"/>
        <path d="M${w / 2 - 4} 48 h8 l-2 6 h-4z" fill="#C9A15A"/>`
    },
    // découpeuse laser de bureau, capot teinté
    laser: {
      svg: `<ellipse cx="150" cy="282" rx="136" ry="7" fill="#000" opacity=".12"/>
        <defs>${grad("ls-ply", [[0, "#E2C9A0"], [1, "#C9A97A"]])}</defs>` +
        cube("ls", 18, 112, 264, 162, [[0, "#F3F1EE"], [1, "#D8D4CF"]], "#BBB5AE", "#FFFFFF", 12) +
        `<rect x="30" y="122" width="240" height="108" rx="5" fill="#1F1E1D"/>
        ${Array.from({ length: 22 }, (_, i) => `<rect x="${36 + i * 10.6}" y="128" width="1.5" height="96" fill="#3A3836"/>`).join("")}
        <rect x="58" y="176" width="150" height="46" rx="2" fill="url(#ls-ply)"/>
        <path d="M78 214 c8 -28 30 -28 36 -8 c6 -24 28 -24 34 0 c6 -16 24 -16 30 6" fill="none" stroke="#6B4423" stroke-width="2.5"/>
        <rect x="36" y="146" width="228" height="7" rx="2" fill="#9A9A9A"/><rect x="142" y="134" width="30" height="30" rx="4" fill="#2A2A2A"/>
        <circle cx="157" cy="168" r="3" fill="#FF8A3D"/><path d="M157 168 l-4 10 h8z" fill="#FF8A3D" opacity=".5"/>` +
        `<rect x="18" y="238" width="264" height="36" fill="#E3DFDA"/><rect x="30" y="250" width="56" height="12" rx="6" fill="#2E2E2E"/><circle cx="256" cy="256" r="5" fill="#7BD88F"/>` + feet(18, 274, 264, "#8E8780"),
      chamber: [30, 122, 240, 108], door: "lid"
    },
    // imprimante UV à plateau, capot avant
    uv: {
      svg: `<ellipse cx="150" cy="282" rx="138" ry="7" fill="#000" opacity=".12"/>
        <defs>${grad("uv-art", [[0, "#E86A6A"], [0.33, "#F2C53D"], [0.66, "#4FA3D9"], [1, "#8248A8"]], 1, 0)}</defs>` +
        cube("uv", 14, 120, 272, 154, [[0, "#3E3E3E"], [1, "#262626"]], "#1B1B1B", "#555", 14) +
        `<rect x="28" y="132" width="244" height="100" rx="5" fill="#161616"/>
        <rect x="34" y="148" width="232" height="8" rx="3" fill="#8C8C8C"/><rect x="104" y="136" width="56" height="30" rx="4" fill="#E8E5E1"/>
        ${["#00AEEF", "#EC008C", "#FFF200", "#fff"].map((c, i) => `<rect x="${110 + i * 12}" y="160" width="8" height="5" rx="1" fill="${c}"/>`).join("")}
        <rect x="46" y="200" width="208" height="28" rx="3" fill="#2E2E2E"/><rect x="74" y="186" width="152" height="18" rx="3" fill="#C9A97A"/>
        <rect x="80" y="190" width="140" height="10" rx="2" fill="url(#uv-art)"/>` +
        `<rect x="14" y="240" width="272" height="34" fill="#1E1E1E"/>` + screen(28, 249, 46, 16) + `<rect x="238" y="254" width="34" height="7" rx="3.5" fill="#C1A88A"/>` + feet(14, 274, 272),
      chamber: [28, 132, 244, 100], door: "lid"
    }
  };

  // porte vitrée : vitre fumée (ambrée pour les capots laser et UV), cadre, reflets, poignée
  const doorSVG = (w, h, type, k) => {
    const amber = type === "lid";
    const handle = amber ? `<rect x="${w / 2 - 26}" y="${h - 10}" width="52" height="6" rx="3" fill="#2A2A2A"/>` : `<rect x="${w - 12}" y="${h / 2 - 28}" width="6" height="56" rx="3" fill="#C1A88A"/><rect x="${w - 11}" y="${h / 2 - 26}" width="2" height="52" rx="1" fill="#fff" opacity=".4"/>`;
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <defs>${grad(k + "-glass", amber ? [[0, "#E58A2E", 0.55], [1, "#B85F14", 0.62]] : [[0, "#2A2A2A", 0.32], [1, "#111", 0.5]], 1, 1)}</defs>
      <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="5" fill="url(#${k}-glass)" stroke="${amber ? "#CFC9C2" : "#1E1E1E"}" stroke-width="4"/>
      <path d="M${w * 0.1} ${h - 4} L${w * 0.38} 4 L${w * 0.5} 4 L${w * 0.22} ${h - 4}Z" fill="#fff" opacity=".14"/>
      <path d="M${w * 0.56} ${h - 4} L${w * 0.7} 4 L${w * 0.74} 4 L${w * 0.6} ${h - 4}Z" fill="#fff" opacity=".08"/>${handle}</svg>`;
  };

  const pct = (v) => (v / 300 * 100).toFixed(3) + "%";
  box.innerHTML = (C.machines || []).map((m, i) => {
    const a = ART[m.art] || ART.x1c;
    const [x, y, w, h] = a.chamber;
    const id = `mc-sheet-${i}`;
    const rows = [["Technologie", m.tech], ["Matières", m.materials], ["Taille max", m.size], ["Idéal pour", m.use]].filter(([, v]) => v);
    let moving = "";
    if (a.door === "arm") {
      const [px, py, pw, ph] = a.part;
      moving = `<div class="mc-door is-arm" style="--dx:${pct(px)};--dy:${pct(py)};--dw:${pct(pw)};--dh:${pct(ph)}"><svg viewBox="0 0 ${pw} ${ph}" aria-hidden="true">${a.partSvg(pw, ph)}</svg></div>`;
    } else {
      moving = `<div class="mc-door is-${a.door}" style="--dx:${pct(x)};--dy:${pct(y)};--dw:${pct(w)};--dh:${pct(h)}">${doorSVG(w, h, a.door, (m.art || "m") + i)}</div>`;
    }
    let visual = m.photo
      ? `<img class="mc-photo" src="${esc(m.photo)}" alt="" loading="lazy">`
      : `<svg class="mc-body" viewBox="0 0 300 300" aria-hidden="true">${a.svg}</svg>${moving}`;
    let artVars = `--cx:${pct(x)};--cy:${pct(y)};--cr:${pct(300 - x - w)};--cb:${pct(300 - y - h)}`;
    // tes visuels (fermé / ouvert) : la porte découpée pivote, puis la vue ouverte prend le relais
    const ph = m.photos;
    if (ph) {
      const [FW, FH] = ph.frame, [dx, dy, dw, dh] = ph.arm ? ph.arm.rect : ph.doorRect;
      const P = (v, t) => (v / t * 100).toFixed(3) + "%";
      // le cadrage tient dans 92 % de la carte, centré (images hautes ou larges)
      const fit = FW / FH > 1 ? [0.92, 0.92 * FH / FW] : [0.92 * FW / FH, 0.92];
      const bw = fit[0], bh = fit[1], bl = (1 - bw) / 2, bt = (1 - bh) / 2;
      const mcpBox = `left:${(bl * 100).toFixed(3)}%;top:${(bt * 100).toFixed(3)}%;width:${(bw * 100).toFixed(3)}%;height:${(bh * 100).toFixed(3)}%`;
      const L = bl + bw * dx / FW, T = bt + bh * dy / FH, R = 1 - (L + bw * dw / FW), B = 1 - (T + bh * dh / FH);
      const toSheet = (v) => (Math.max(0, (v - 0.03) / 0.94) * 100).toFixed(3) + "%";
      // ouverture selon la charnière : gauche (porte), haut (capot qui se lève), bas (porte qui se rabat)
      const hinge = ph.hinge || "left", ang = ph.openAngle || 110;
      const openT = hinge === "top" ? `rotateX(${ang}deg)` : hinge === "bottom" ? `rotateX(${-ang}deg)` : `rotateY(${-ang}deg)`;
      artVars = `--st:${toSheet(T)};--sr:${toSheet(R)};--sb:${toSheet(B)};--sl:${toSheet(L)};--open-t:${openT}`;
      const box = `left:${P(dx, FW)};top:${P(dy, FH)};width:${P(dw, FW)};height:${P(dh, FH)}`;
      if (ph.arm) {
        // pas de porte : le bras découpé monte au-dessus de la machine sans bras, puis la vue « bras en haut » prend le relais
        artVars += `;--lift:${-(ph.arm.lift / dh * 100).toFixed(2)}%`;
        visual = `<div class="mcp" style="${mcpBox}">
          <img class="mcp-closed" src="${esc(ph.closed)}" alt="" loading="lazy">
          <img class="mcp-arm" src="${esc(ph.arm.src)}" alt="" loading="lazy" style="${box}">
          <img class="mcp-open" src="${esc(ph.open)}" alt="" loading="lazy">
        </div>`;
      } else visual = `<div class="mcp" style="${mcpBox}">
          <img class="mcp-closed" src="${esc(ph.closed)}" alt="" loading="lazy">
          <img class="mcp-inside" src="${esc(ph.inside)}" alt="" loading="lazy" style="left:${P(dx, FW)};top:${P(dy, FH)};width:${P(dw, FW)};height:${P(dh, FH)}">
          <div class="mcp-door is-hinge-${hinge}" style="left:${P(dx, FW)};top:${P(dy, FH)};width:${P(dw, FW)};height:${P(dh, FH)};--glass:${ph.glass || "rgba(40,40,40,.6)"};--frame:${ph.frameColor || "#222"}">
            ${ph.doorImg ? `<img class="mcp-door-img" src="${esc(ph.doorImg)}" alt="">` : `<span class="mcp-glass"></span>`}
            ${ph.handle ? `<img class="mcp-handle" src="${esc(ph.handle.src)}" alt="" style="left:${P(ph.handle.rect[0] - dx, dw)};top:${P(ph.handle.rect[1] - dy, dh)};width:${P(ph.handle.rect[2], dw)};height:${P(ph.handle.rect[3], dh)}">` : ""}
          </div>
          <img class="mcp-open" src="${esc(ph.open)}" alt="" loading="lazy">
        </div>`;
    }
    return `<article class="mc${m.photo ? " has-photo" : ""}${ph ? " has-photos" : ""}" data-reveal>
      <div class="mc-art" style="${artVars}">
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
