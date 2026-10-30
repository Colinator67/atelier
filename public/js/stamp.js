/* =========================================================================
   Page Découpe laser : « Tester mon tampon ».
   Une feuille de papier s'ouvre, le tampon suit la souris, chaque clic laisse
   une empreinte d'encre (grain, pression inégale, léger angle).
   Easter egg : une fourmi postière traverse parfois la feuille ; la tamponner
   lance le défi des enveloppes (8 sur 10) qui donne 10 % sur le tampon.
   ========================================================================= */
(function () {
  "use strict";
  const C = window.SITE_CONFIG;
  const { $, $$, eur, esc, toast } = window.UI;
  const STAMPS = (C.laser && C.laser.stamps) || [];
  const CODE = "FOURMI10", PCT = 10, KEY = "atelier-tampon-remise";
  const track = (n, l, once) => window.track && window.track(n, l, once);

  // ------------------------------------------------------------ remise gagnée (lue par quotelaser.js)
  const deal = {
    active() { try { return localStorage.getItem(KEY) === CODE; } catch (e) { return false; } },
    win() { try { localStorage.setItem(KEY, CODE); } catch (e) {} document.dispatchEvent(new CustomEvent("stampdeal")); },
    code: CODE, pct: PCT,
    price(p) { return this.active() ? Math.round(p * (100 - PCT)) / 100 : p; }
  };
  window.StampDeal = deal;

  const opener = $$("[data-stamp-test]");
  const demos = $$("[data-stamp-demo]");
  if ((!opener.length && !demos.length) || !STAMPS.length) return;

  const INKS = [["Noir", "#26231F"], ["Bleu", "#23408E"], ["Rouge", "#B02A23"], ["Vert", "#2D6A3E"], ["Violet", "#5B2C83"]];
  const cm = s => parseFloat(s.label.match(/[\d,.]+/)[0].replace(",", "."));
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const st = { size: STAMPS[1] || STAMPS[0], ink: INKS[0][1], text: "Votre texte", around: "Votre nom · votre ville", logo: null };

  // ------------------------------------------------------------ fenêtre
  const dlg = document.createElement("dialog");
  dlg.className = "st-dlg";
  dlg.setAttribute("aria-labelledby", "st-title");
  dlg.innerHTML = `
  <div class="st-shell">
    <header class="st-head">
      <h2 id="st-title">Tester mon tampon</h2>
      <button type="button" class="icon-btn st-x" data-st-close aria-label="Fermer">×</button>
    </header>
    <aside class="st-side">
      <div class="field"><label for="stText">Texte au centre</label><input id="stText" maxlength="28" autocomplete="off"></div>
      <div class="field"><label for="stAround">Texte autour <span class="opt-label">(facultatif)</span></label><input id="stAround" maxlength="40" autocomplete="off"></div>
      <div class="field">
        <span class="st-lbl">Logo <span class="opt-label">(facultatif)</span></span>
        <label class="st-logo" for="stLogo"><input type="file" id="stLogo" accept="image/*,.svg" hidden><span id="stLogoTxt">Ajouter une image</span></label>
        <button type="button" class="link-btn" id="stLogoRm" hidden>Retirer le logo</button>
      </div>
      <fieldset class="st-set"><legend>Taille</legend><div class="st-sizes">${STAMPS.map(s => `<button type="button" data-size="${s.id}" aria-pressed="false">Ø ${cm(s)} cm<small>${eur(s.price)}</small></button>`).join("")}</div></fieldset>
      <fieldset class="st-set"><legend>Encre</legend><div class="st-inks">${INKS.map(([n, c]) => `<button type="button" data-ink="${c}" aria-pressed="false" aria-label="${n}" title="${n}" style="--ink:${c}"></button>`).join("")}</div></fieldset>
    </aside>
    <div class="st-foot">
      <p class="st-deal" id="stDeal" hidden></p>
      <div class="st-actions">
        <button type="button" class="btn" id="stOrder">Commander ce tampon</button>
        <button type="button" class="btn btn-ghost" id="stClear">Effacer la feuille</button>
      </div>
    </div>
    <div class="st-desk">
      <div class="st-paper" id="stPaper" tabindex="0" aria-label="Feuille de test : cliquez ou appuyez sur Entrée pour tamponner">
        <canvas class="st-ink" id="stInk"></canvas>
        <p class="st-hint" id="stHint">${window.matchMedia("(pointer: coarse)").matches ? "Touchez la feuille pour tamponner" : "Cliquez sur la feuille pour tamponner"}</p>
        <div class="st-tool" id="stTool" aria-hidden="true"><div class="st-tool-in"><span class="st-shadow"></span><span class="st-handle"></span><span class="st-base"><img alt="" id="stGhost"></span></div></div>
        <div class="st-hud" id="stHud" hidden></div>
        <div class="st-panel" id="stPanel" hidden></div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(dlg);

  const paper = $("#stPaper", dlg), ink = $("#stInk", dlg), tool = $("#stTool", dlg), toolIn = $(".st-tool-in", tool), ghost = $("#stGhost", dlg);
  const g = ink.getContext("2d");
  let W = 0, H = 0, DPR = 1, pxcm = 20;

  function resize() {
    const r = paper.getBoundingClientRect();
    if (!r.width) return;
    const old = W ? (() => { const c = document.createElement("canvas"); c.width = ink.width; c.height = ink.height; c.getContext("2d").drawImage(ink, 0, 0); return c; })() : null;
    W = r.width; H = r.height; DPR = Math.min(2, window.devicePixelRatio || 1);
    ink.width = Math.round(W * DPR); ink.height = Math.round(H * DPR);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (old) g.drawImage(old, 0, 0);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    // le tampon de 20 cm tient dans la feuille ; les tailles restent proportionnelles entre elles
    pxcm = Math.min(W, H) * 0.042;
    refresh();
  }
  const D = () => cm(st.size) * pxcm;

  // ------------------------------------------------------------ dessin du motif (noir sur transparent)
  function design(size, spec) {
    const S = spec || st;
    const c = document.createElement("canvas"); c.width = c.height = Math.max(8, Math.ceil(size));
    const x = c.getContext("2d"), R = c.width / 2;
    x.translate(R, R); x.fillStyle = x.strokeStyle = "#000"; x.textAlign = "center"; x.textBaseline = "middle";
    const lw = Math.max(1.6, size * 0.035);
    x.lineWidth = lw; x.beginPath(); x.arc(0, 0, R - lw / 2 - 0.5, 0, Math.PI * 2); x.stroke();
    let inner = R - lw - size * 0.025;
    const around = S.around.trim();
    if (around) {
      const band = size * 0.15;
      let fs = band * 0.62, r = inner - band / 2;
      const word = around.toUpperCase();
      const total = f => { x.font = `700 ${f}px Archivo, sans-serif`; return [...word].reduce((s, ch) => s + x.measureText(ch).width + f * 0.08, 0); };
      while (total(fs) > r * Math.PI * 1.55 && fs > 4) fs *= 0.92;
      const t = total(fs); let a = -Math.PI / 2 - t / r / 2;
      x.font = `700 ${fs}px Archivo, sans-serif`;
      for (const ch of word) {
        const w = x.measureText(ch).width + fs * 0.08, th = a + w / r / 2;
        x.save(); x.rotate(th); x.translate(r, 0); x.rotate(Math.PI / 2); x.fillText(ch, 0, 0); x.restore();
        a += w / r;
      }
      // petites étoiles en bas, entre les deux anneaux
      x.font = `700 ${fs * 0.9}px Archivo, sans-serif`;
      [-0.18, 0, 0.18].forEach(d => { x.save(); x.rotate(Math.PI / 2 + d); x.translate(r, 0); x.rotate(-Math.PI / 2); x.fillText("✦", 0, 0); x.restore(); });
      inner -= band;
    }
    x.lineWidth = Math.max(1, size * 0.012); x.beginPath(); x.arc(0, 0, inner, 0, Math.PI * 2); x.stroke();
    const text = S.text.trim(), box = inner * 1.45, logo = S.logo;
    let ty = 0;
    if (logo) {
      const hBox = text ? inner * 0.95 : inner * 1.3;
      const k = Math.min(box / logo.width, hBox / logo.height);
      const lw2 = logo.width * k, lh2 = logo.height * k;
      const ly = text ? -inner * 0.18 : 0;
      x.drawImage(logo, -lw2 / 2, ly - lh2 / 2, lw2, lh2);
      ty = ly + lh2 / 2 + inner * 0.22;
    }
    if (text) {
      const lines = text.length > 13 && text.includes(" ") ? split2(text) : [text];
      let fs = (logo ? inner * 0.26 : inner * (lines.length > 1 ? 0.34 : 0.42));
      x.font = `800 ${fs}px Archivo, sans-serif`;
      const widest = () => Math.max(...lines.map(l => x.measureText(l).width));
      while (widest() > box && fs > 4) { fs *= 0.93; x.font = `800 ${fs}px Archivo, sans-serif`; }
      const lh = fs * 1.05, y0 = (logo ? ty : 0) - (lines.length - 1) * lh / 2;
      lines.forEach((l, i) => x.fillText(l, 0, y0 + i * lh));
    }
    return c;
  }
  function split2(s) {
    const m = s.length / 2; let best = -1;
    for (let i = 0; i < s.length; i++) if (s[i] === " " && (best < 0 || Math.abs(i - m) < Math.abs(best - m))) best = i;
    return best < 0 ? [s] : [s.slice(0, best), s.slice(best + 1)];
  }

  // grain de l'encre : points et petites taches retirés de l'empreinte
  const NOISE = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 512; const x = c.getContext("2d");
    for (let i = 0; i < 5200; i++) { x.fillStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.5})`; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, 0.3 + Math.random() * 1.3, 0, 7); x.fill(); }
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.14})`; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, 3 + Math.random() * 9, 0, 7); x.fill(); }
    return c;
  })();
  let motif = null; // motif à la taille courante
  function inked(color, src) {
    const m = src || motif, s = m.width, c = document.createElement("canvas"); c.width = c.height = s;
    const x = c.getContext("2d");
    x.drawImage(m, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, s, s);
    x.globalCompositeOperation = "destination-out";
    x.save(); x.translate(s / 2, s / 2); x.rotate(Math.random() * 6.28);
    const n = Math.max(s * 1.5, 512); x.drawImage(NOISE, -n / 2 + (Math.random() - 0.5) * 60, -n / 2 + (Math.random() - 0.5) * 60, n, n); x.restore();
    // pression inégale : un bord un peu plus pâle que l'autre
    const ox = (Math.random() - 0.5) * s * 0.5, oy = (Math.random() - 0.5) * s * 0.5;
    const gr = x.createRadialGradient(s / 2 + ox, s / 2 + oy, s * 0.2, s / 2 + ox, s / 2 + oy, s * 0.75);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, `rgba(0,0,0,${0.25 + Math.random() * 0.25})`);
    x.fillStyle = gr; x.fillRect(0, 0, s, s);
    return c;
  }
  function stampAt(px, py, ctx) {
    const im = inked(st.ink), d = im.width / DPR2;
    ctx.save(); ctx.translate(px, py); ctx.rotate((Math.random() - 0.5) * 0.07);
    ctx.globalAlpha = 0.86 + Math.random() * 0.12; ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(im, -d / 2, -d / 2, d, d); ctx.restore();
  }
  let DPR2 = 1;
  function refresh() {
    DPR2 = Math.min(2, window.devicePixelRatio || 1);
    motif = design(D() * DPR2);
    const pv = inked(st.ink);
    ghost.src = pv.toDataURL();
    const d = D();
    tool.style.setProperty("--d", d + "px");
    $$("[data-size]", dlg).forEach(b => b.setAttribute("aria-pressed", b.dataset.size === st.size.id ? "true" : "false"));
    $$("[data-ink]", dlg).forEach(b => b.setAttribute("aria-pressed", b.dataset.ink === st.ink ? "true" : "false"));
    const price = deal.price(st.size.price);
    $("#stOrder", dlg).textContent = `Commander ce tampon · ${eur(price)}`;
    const dl = $("#stDeal", dlg);
    dl.hidden = !deal.active();
    dl.innerHTML = deal.active() ? `Code <strong>${CODE}</strong> : -${PCT} % appliqués (${eur(st.size.price)} → ${eur(price)}).` : "";
  }

  // ------------------------------------------------------------ réglages
  $("#stText", dlg).value = st.text; $("#stAround", dlg).value = st.around;
  $("#stText", dlg).addEventListener("input", e => { st.text = e.target.value; refresh(); });
  $("#stAround", dlg).addEventListener("input", e => { st.around = e.target.value; refresh(); });
  $(".st-sizes", dlg).addEventListener("click", e => { const b = e.target.closest("[data-size]"); if (!b) return; st.size = STAMPS.find(s => s.id === b.dataset.size); refresh(); });
  $(".st-inks", dlg).addEventListener("click", e => { const b = e.target.closest("[data-ink]"); if (!b) return; st.ink = b.dataset.ink; refresh(); });
  $("#stLogo", dlg).addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; if (f) loadLogo(f); });
  $("#stLogoRm", dlg).addEventListener("click", () => { st.logo = null; $("#stLogoTxt", dlg).textContent = "Ajouter une image"; $("#stLogoRm", dlg).hidden = true; refresh(); });
  $("#stClear", dlg).addEventListener("click", () => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, ink.width, ink.height); g.restore(); });

  // logo : les zones sombres (ou opaques, pour un PNG détouré) deviennent l'encre
  function loadLogo(file) {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 600 / Math.max(img.naturalWidth || 300, img.naturalHeight || 300));
      const w = Math.max(1, Math.round((img.naturalWidth || 300) * k)), h = Math.max(1, Math.round((img.naturalHeight || 300) * k));
      const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
      x.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url);
      const d = x.getImageData(0, 0, w, h), p = d.data;
      let sum = 0, n = 0, transparent = 0, dark = 0;
      for (let i = 0; i < p.length; i += 4) { if (p[i + 3] < 128) { transparent++; continue; } const l = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; sum += l; n++; if (l < 128) dark++; }
      // PNG détouré d'une seule couleur : la silhouette fait l'encre ; sinon, ce sont les zones sombres
      const contrast = n && dark / n > 0.08 && dark / n < 0.92;
      const useAlpha = transparent > p.length / 4 * 0.15 && !contrast, thr = n ? Math.min(200, sum / n) : 128;
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
        const i = (y * w + xx) * 4, lum = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
        const on = useAlpha ? p[i + 3] > 110 : (p[i + 3] > 110 && lum < thr);
        p[i] = p[i + 1] = p[i + 2] = 0; p[i + 3] = on ? 255 : 0;
        if (on) { x0 = Math.min(x0, xx); y0 = Math.min(y0, y); x1 = Math.max(x1, xx); y1 = Math.max(y1, y); }
      }
      if (x1 <= x0) { toast("Je n'ai pas trouvé de motif dans cette image"); return; }
      x.putImageData(d, 0, 0);
      const out = document.createElement("canvas"); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
      out.getContext("2d").drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
      st.logo = out; st.logoFile = file;
      $("#stLogoTxt", dlg).textContent = file.name; $("#stLogoRm", dlg).hidden = false;
      refresh();
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast("Cette image ne peut pas être lue ici : essayez un PNG ou un JPG"); };
    img.src = url;
  }

  // ------------------------------------------------------------ le tampon suit la souris
  let tx = 0, ty = 0;
  const place = (x, y) => { tx = x; ty = y; tool.style.transform = `translate(${x}px, ${y}px)`; };
  const local = e => { const r = paper.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  paper.addEventListener("pointermove", e => { if (e.pointerType !== "mouse") return; const [x, y] = local(e); place(x, y); tool.classList.add("is-on"); });
  paper.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") tool.classList.remove("is-on"); });
  paper.addEventListener("pointerdown", e => {
    if (e.target.closest(".st-panel button, .st-panel a")) return;
    if (!panel.hidden && !game.on) return;
    e.preventDefault();
    const [x, y] = local(e); place(x, y); tool.classList.add("is-on");
    press();
  });
  paper.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && panel.hidden) { e.preventDefault(); if (!tool.classList.contains("is-on")) { place(W / 2, H / 2); tool.classList.add("is-on"); } press(); }
  });

  let pressAnim = null, stamped = 0;
  function press() {
    const x = tx, y = ty;
    if (pressAnim) pressAnim.cancel();
    const dur = still ? 120 : 230;
    pressAnim = toolIn.animate([
      { transform: "translateY(0) scale(1)" },
      { transform: "translateY(5px) scale(.94)", offset: 0.42 },
      { transform: "translateY(5px) scale(.94)", offset: 0.58 },
      { transform: "translateY(0) scale(1)" }
    ], { duration: dur, easing: "cubic-bezier(.23,1,.32,1)" });
    // on vise au moment du clic (les enveloppes bougent pendant la descente du tampon)
    if (hitAnt(x, y)) return;
    const env = game.on ? hitEnvelope(x, y) : null;
    setTimeout(() => {
      if (env) { env(); return; }
      stampAt(x, y, g);
      if (++stamped === 1) $("#stHint", dlg).classList.add("is-gone");
    }, dur * 0.42);
  }

  // ------------------------------------------------------------ la fourmi postière
  const ANT = `<svg viewBox="0 0 120 60" width="96" height="48" aria-hidden="true">
    <g class="st-legs" stroke="#3F3D3B" stroke-width="2.4" stroke-linecap="round" fill="none">
      <path class="l1" d="M50 34 L40 50 M50 34 L60 52 M66 33 L58 51"/><path class="l2" d="M58 34 L50 52 M66 34 L76 51 M48 33 L34 46"/>
    </g>
    <path d="M94 22 Q104 8 112 10 M92 24 Q106 14 114 20" stroke="#3F3D3B" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="30" cy="32" rx="22" ry="13" fill="#4C4C4C"/><ellipse cx="60" cy="31" rx="13" ry="8" fill="#4C4C4C"/><circle cx="86" cy="28" r="10" fill="#4C4C4C"/><circle cx="90" cy="25" r="2" fill="#FCFCFC"/>
    <g transform="translate(40 4) rotate(-6)"><rect width="40" height="25" rx="2" fill="#FBF8F2" stroke="#8C847B" stroke-width="1.5"/><path d="M1 1 L20 14 L39 1" fill="none" stroke="#8C847B" stroke-width="1.5"/><rect x="29" y="3" width="8" height="9" fill="none" stroke="#B02A23" stroke-width="1.2" stroke-dasharray="2 1.5"/></g>
  </svg>`;
  const ant = document.createElement("div"); ant.className = "st-ant"; ant.innerHTML = ANT; ant.hidden = true; paper.appendChild(ant);
  let antAnim = null, antTimer = null;
  function scheduleAnt(ms) { clearTimeout(antTimer); antTimer = setTimeout(walkAnt, ms); }
  function walkAnt() {
    if (!dlg.open || game.on || !panel.hidden) { scheduleAnt(6000); return; }
    const y = 40 + Math.random() * Math.max(40, H - 120), ltr = Math.random() < 0.6;
    ant.hidden = false; ant.classList.toggle("is-rtl", !ltr); ant.style.top = y + "px";
    const from = ltr ? -110 : W + 10, to = ltr ? W + 10 : -110;
    antAnim = ant.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }], { duration: Math.max(5200, W * 8), easing: "linear" });
    antAnim.onfinish = () => { ant.hidden = true; scheduleAnt(18000 + Math.random() * 12000); };
  }
  function hitAnt(x, y) {
    if (ant.hidden || game.on) return false;
    const r = ant.getBoundingClientRect(), p = paper.getBoundingClientRect();
    const ax = r.left - p.left, ay = r.top - p.top;
    if (x < ax - 12 || x > ax + r.width + 12 || y < ay - 12 || y > ay + r.height + 12) return false;
    antAnim.pause();
    const env = $("g[transform]", ant);
    env.insertAdjacentHTML("beforeend", `<circle cx="33" cy="7.5" r="5" fill="none" stroke="${st.ink}" stroke-width="1.6"/>`);
    track("tampon_defi", "Fourmi trouvée", true);
    setTimeout(intro, still ? 0 : 350);
    return true;
  }

  // ------------------------------------------------------------ défi des enveloppes
  const panel = $("#stPanel", dlg), hud = $("#stHud", dlg);
  const game = { on: false, n: 0, done: 0, hits: 0, envs: [], timer: null, TOTAL: 10, GOAL: 8 };
  function showPanel(html) { panel.innerHTML = html; panel.hidden = false; tool.classList.remove("is-on"); const b = panel.querySelector("button"); if (b) b.focus(); }
  function hidePanel() { panel.hidden = true; panel.innerHTML = ""; }
  function intro() {
    const won = deal.active();
    showPanel(`<div class="st-card"><h3>Une fourmi postière !</h3>
      <p>${won ? `Vous avez déjà gagné le code <strong>${CODE}</strong>. Rejouer pour le plaisir ?` : `Tamponnez le timbre de <strong>${game.GOAL} enveloppes sur ${game.TOTAL}</strong> avant qu'elles ne quittent la feuille, et gagnez <strong>${PCT} % de remise</strong> sur votre tampon.`}</p>
      <div class="st-card-actions"><button type="button" class="btn" data-go>Relever le défi</button><button type="button" class="btn btn-ghost" data-no>Non merci</button></div></div>`);
    panel.querySelector("[data-go]").onclick = start;
    panel.querySelector("[data-no]").onclick = () => { hidePanel(); antAnim && antAnim.play(); };
  }
  function start() {
    hidePanel(); if (antAnim) antAnim.cancel(); ant.hidden = true; clearTimeout(antTimer);
    $("g[transform] circle", ant) && $("g[transform] circle", ant).remove();
    Object.assign(game, { on: true, n: 0, done: 0, hits: 0, envs: [] });
    track("tampon_defi", "Défi lancé");
    hud.hidden = false; updHud(); spawn();
  }
  function updHud() { hud.textContent = `Enveloppes ${Math.min(game.n, game.TOTAL)} / ${game.TOTAL} · ${game.hits} tamponnée${game.hits > 1 ? "s" : ""}`; }
  function spawn() {
    if (!game.on || game.n >= game.TOTAL) return;
    const i = game.n++;
    const ew = Math.max(118, Math.min(170, W * 0.24)), eh = ew * 0.62;
    let y, tries = 0;
    do { y = 16 + Math.random() * Math.max(10, H - eh - 60); tries++; } while (tries < 12 && game.envs.some(e => !e.gone && Math.abs(e.y - y) < eh + 8));
    const el = document.createElement("div"); el.className = "st-env"; el.style.cssText = `width:${ew}px;height:${eh}px;top:${y}px`;
    el.innerHTML = `<span class="st-env-flap"></span><span class="st-env-box"></span><span class="st-env-lines"></span>`;
    paper.appendChild(el);
    const e = { el, y, hit: false, gone: false };
    const dur = Math.max(1900, 4300 - i * 270) * (W < 500 ? 0.85 : 1);
    e.anim = el.animate([{ transform: `translateX(${-ew - 10}px)` }, { transform: `translateX(${W + 10}px)` }], { duration: dur, easing: "linear" });
    e.anim.onfinish = () => { e.gone = true; el.remove(); game.done++; if (game.done >= game.TOTAL) end(); };
    game.envs.push(e); updHud();
    game.timer = setTimeout(spawn, Math.max(650, 1450 - i * 85));
  }
  function hitEnvelope(x, y) {
    const p = paper.getBoundingClientRect();
    for (const e of game.envs) {
      if (e.gone || e.hit) continue;
      const b = $(".st-env-box", e.el).getBoundingClientRect();
      const bx = b.left - p.left, by = b.top - p.top, tol = 14;
      if (x >= bx - tol && x <= bx + b.width + tol && y >= by - tol && y <= by + b.height + tol) {
        e.hit = true; game.hits++; updHud();
        return () => {
        const mark = document.createElement("img"); mark.className = "st-env-mark"; mark.alt = "";
        const tmp = motif; motif = design(b.width * 1.5 * DPR2); mark.src = inked(st.ink).toDataURL(); motif = tmp;
        const er = e.el.getBoundingClientRect(), mw = b.width * 1.5;
        mark.style.cssText = `width:${mw}px;left:${b.left - er.left + b.width / 2 - mw / 2}px;top:${b.top - er.top + b.height / 2 - mw / 2}px;transform:rotate(${(Math.random() - 0.5) * 16}deg)`;
        e.el.appendChild(mark); e.el.classList.add("is-hit");
        };
      }
    }
    return null;
  }
  function end() {
    game.on = false; clearTimeout(game.timer); hud.hidden = true;
    const ok = game.hits >= game.GOAL;
    track("tampon_defi", ok ? "Défi gagné" : "Défi perdu");
    if (ok) {
      deal.win(); refresh();
      showPanel(`<div class="st-card"><h3>${game.hits} sur ${game.TOTAL} : défi réussi !</h3>
        <p>Votre code <strong class="st-code">${CODE}</strong> vous donne <strong>${PCT} % de remise</strong> sur votre tampon. Il est déjà ajouté à votre demande.</p>
        <p class="st-fine">Valable sur les tampons, une fois par commande, non cumulable.</p>
        <div class="st-card-actions"><button type="button" class="btn" data-order>Commander mon tampon</button><button type="button" class="btn btn-ghost" data-close>Continuer à tester</button></div></div>`);
      panel.querySelector("[data-order]").onclick = order;
    } else {
      showPanel(`<div class="st-card"><h3>${game.hits} sur ${game.TOTAL}</h3>
        <p>Les enveloppes ont été plus rapides cette fois. Il en faut ${game.GOAL} pour gagner la remise.</p>
        <div class="st-card-actions"><button type="button" class="btn" data-again>Rejouer</button><button type="button" class="btn btn-ghost" data-close>Continuer à tester</button></div></div>`);
      panel.querySelector("[data-again]").onclick = start;
    }
    panel.querySelector("[data-close]").onclick = () => { hidePanel(); scheduleAnt(25000); };
  }
  function stopGame() {
    game.on = false; clearTimeout(game.timer); game.envs.forEach(e => { if (e.anim) e.anim.cancel(); e.el.remove(); }); game.envs = [];
    hud.hidden = true; hidePanel(); clearTimeout(antTimer); if (antAnim) antAnim.cancel(); ant.hidden = true;
  }

  // ------------------------------------------------------------ SVG prêt à graver
  // Gravure = tout ce qui n'est pas de l'encre à l'intérieur du cercle (le relief qui reste porte l'encre),
  // découpe = le cercle. Le motif est inversé (miroir) pour que l'empreinte se lise à l'endroit.
  function engraveSVG(spec, diamCm) {
    const mmD = diamCm * 10, pad = 1, ppm = mmD > 120 ? 8 : 12;         // 1 mm de marge, px par mm
    const S = mmD + 2 * pad, N = Math.ceil(S * ppm), R = mmD / 2 * ppm, rc = (mmD / 2 + 0.4) * ppm, c0 = S / 2 * ppm;
    const art = design(mmD * ppm, spec);
    const cv = document.createElement("canvas"); cv.width = cv.height = N;
    const x = cv.getContext("2d"); x.drawImage(art, c0 - art.width / 2, c0 - art.width / 2);
    const px = x.getImageData(0, 0, N, N).data;
    const m = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (let i = 0; i < N; i++) {
      const dx = i + 0.5 - c0, dy = y + 0.5 - c0;
      m[y * N + i] = (dx * dx + dy * dy <= rc * rc && px[(y * N + i) * 4 + 3] < 128) ? 1 : 0;
    }
    const loops = trace(m, N, N).map(l => simplify(l, 0.75)).filter(l => l.length > 2);
    const mm = v => (v / ppm).toFixed(2);
    // miroir horizontal : x → S - x
    const d = loops.map(l => "M" + l.map(([a, b]) => `${(S - a / ppm).toFixed(2)} ${mm(b)}`).join("L") + "Z").join("");
    const t = s2 => String(s2).replace(/[<&>"]/g, ch => ({ "<": "&lt;", "&": "&amp;", ">": "&gt;", '"': "&quot;" }[ch]));
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${S}mm" height="${S}mm" viewBox="0 0 ${S} ${S}">
  <title>Tampon Ø ${diamCm} cm · ${t(spec.text)} · motif en miroir, prêt à graver</title>
  <desc>Noir : gravure (zones en creux). Rouge : découpe du cercle Ø ${(mmD + 0.8).toFixed(1)} mm. Motif inversé pour une empreinte à l'endroit.</desc>
  <path id="gravure" fill="#000000" fill-rule="evenodd" d="${d}"/>
  <circle id="decoupe" cx="${S / 2}" cy="${S / 2}" r="${(mmD / 2 + 0.4).toFixed(2)}" fill="none" stroke="#FF0000" stroke-width="0.1"/>
</svg>`;
  }
  // contours d'un masque binaire : arêtes des pixels allumés enchaînées en boucles fermées (remplissage pair-impair)
  function trace(m, w, h) {
    const W1 = w + 1, o1 = new Int32Array(W1 * (h + 1)).fill(-1), o2 = new Int32Array(W1 * (h + 1)).fill(-1);
    const add = (a, b) => { if (o1[a] < 0) o1[a] = b; else o2[a] = b; };
    const on = (i, y) => i >= 0 && y >= 0 && i < w && y < h && m[y * w + i];
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
      if (!m[y * w + i]) continue;
      const tl = y * W1 + i, tr = tl + 1, bl = tl + W1, br = bl + 1;
      if (!on(i, y - 1)) add(tl, tr);
      if (!on(i + 1, y)) add(tr, br);
      if (!on(i, y + 1)) add(br, bl);
      if (!on(i - 1, y)) add(bl, tl);
    }
    const take = v => { let n = o1[v]; if (n >= 0) { o1[v] = o2[v]; o2[v] = -1; } return n; };
    const loops = [];
    for (let s = 0; s < o1.length; s++) {
      while (o1[s] >= 0) {
        const pts = []; let v = s, guard = 0;
        do { pts.push([v % W1, (v / W1) | 0]); v = take(v); } while (v >= 0 && v !== s && ++guard < 4e6);
        // retire les points alignés (escaliers droits)
        const out = pts.filter((p, k) => { const a = pts[(k - 1 + pts.length) % pts.length], b = pts[(k + 1) % pts.length]; return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) !== 0; });
        if (out.length > 2) loops.push(out);
      }
    }
    return loops;
  }
  // Douglas-Peucker sur une boucle fermée
  function simplify(pts, eps) {
    if (pts.length < 8) return pts;
    let far = 0, fd = -1;
    for (let k = 1; k < pts.length; k++) { const d2 = (pts[k][0] - pts[0][0]) ** 2 + (pts[k][1] - pts[0][1]) ** 2; if (d2 > fd) { fd = d2; far = k; } }
    const dp = (a) => {
      const keep = new Uint8Array(a.length); keep[0] = keep[a.length - 1] = 1;
      const st2 = [[0, a.length - 1]];
      while (st2.length) {
        const [i, j] = st2.pop(); let dm = 0, km = -1;
        const [x1, y1] = a[i], [x2, y2] = a[j], L = Math.hypot(x2 - x1, y2 - y1) || 1;
        for (let k = i + 1; k < j; k++) { const dd = Math.abs((x2 - x1) * (y1 - a[k][1]) - (x1 - a[k][0]) * (y2 - y1)) / L; if (dd > dm) { dm = dd; km = k; } }
        if (dm > eps) { keep[km] = 1; st2.push([i, km], [km, j]); }
      }
      return a.filter((_, k) => keep[k]);
    };
    const A = dp(pts.slice(0, far + 1)), B = dp([...pts.slice(far), pts[0]]);
    return [...A, ...B.slice(1, -1)];
  }

  // ------------------------------------------------------------ commande
  function order() {
    const big = document.createElement("canvas"); big.width = big.height = 1200;
    const x = big.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, 1200, 1200);
    const m = design(1100); x.drawImage(m, 50, 50);
    big.toBlob(blob => {
      const file = new File([blob], "apercu-tampon.png", { type: "image/png" });
      let svg = null;
      try { svg = new File([engraveSVG({ text: st.text, around: st.around, logo: st.logo }, cm(st.size))], `tampon-${cm(st.size)}cm-a-graver.svg`, { type: "image/svg+xml" }); } catch (e) { /* l'aperçu suffit */ }
      const qtyIn = document.getElementById("qtyS");
      const qty = qtyIn ? Math.max(1, Math.round(+qtyIn.value || 1)) : 1;
      const unit = deal.price(st.size.price);
      close();
      const tab = document.getElementById("lm-stamp"); if (tab) tab.click();
      const sb = document.querySelector(`#stamps .stamp[data-id="${st.size.id}"]`); if (sb) sb.click();
      track("tampon_commande", st.size.label);
      window.AskModal.open({
        kind: "Tampon",
        files: svg ? [file, svg] : [file],
        summary: [
          `Tampon — ${st.size.label} (motif créé avec le testeur)`,
          `Pièces jointes : aperçu PNG${svg ? " + SVG prêt à graver (miroir, gravure en noir, découpe du cercle en rouge)" : ""}`,
          `Texte au centre : ${st.text.trim() || "aucun"}`,
          `Texte autour : ${st.around.trim() || "aucun"}`,
          st.logo ? `Logo : ${st.logoFile ? st.logoFile.name : "oui"} (à m'envoyer en bonne qualité si possible)` : null,
          `Quantité : ${qty}`,
          deal.active() ? `Remise défi : ${CODE} (-${PCT} %)` : null,
          `Total : ${eur(unit * qty)} hors frais de port${deal.active() ? ` (au lieu de ${eur(st.size.price * qty)})` : ""}`
        ].filter(Boolean).join("\n")
      });
    }, "image/png");
  }
  $("#stOrder", dlg).addEventListener("click", order);

  // ------------------------------------------------------------ ouverture / fermeture
  function open() {
    const sel = document.querySelector('#stamps .stamp[aria-pressed="true"]');
    if (sel) st.size = STAMPS.find(s => s.id === sel.dataset.id) || st.size;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    document.documentElement.classList.add("st-lock");
    requestAnimationFrame(() => { resize(); scheduleAnt(still ? 9000 : 6500); });
    track("tampon_test", "Testeur ouvert");
  }
  function close() { stopGame(); if (dlg.open && dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
  dlg.addEventListener("close", () => { stopGame(); document.documentElement.classList.remove("st-lock"); });
  $("[data-st-close]", dlg).addEventListener("click", close);
  opener.forEach(b => b.addEventListener("click", open));
  window.addEventListener("resize", () => { if (dlg.open) resize(); });
  // l'adresse …/decoupe-laser#tester ouvre directement le testeur
  if (opener.length && location.hash === "#tester") setTimeout(open, 300);

  // ------------------------------------------------------------ démonstration : trois empreintes posées une à une
  const SAMPLES = [
    { text: "Atelier Colin", around: "Fait main à Strasbourg", ink: "#23408E", cm: 10, x: 0.34, y: 0.42, r: -0.06 },
    { text: "Bon pour accord", around: "", ink: "#B02A23", cm: 6, x: 0.74, y: 0.3, r: 0.08 },
    { text: "Merci !", around: "Votre boutique · votre ville", ink: "#2D6A3E", cm: 8, x: 0.66, y: 0.74, r: 0.03 }
  ];
  function runDemo(box) {
    const r = box.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const unit = Math.min(r.width, r.height) * 0.052;
    box.querySelectorAll(".st-demo-imp").forEach(c => c.remove());
    SAMPLES.forEach((sp, i) => {
      const d = sp.cm * unit, c = document.createElement("canvas");
      c.className = "st-demo-imp"; c.width = c.height = Math.ceil(d * dpr);
      c.style.cssText = `width:${d}px;height:${d}px;left:${sp.x * r.width - d / 2}px;top:${sp.y * r.height - d / 2}px;--r:${sp.r}rad;animation-delay:${still ? 0 : 250 + i * 420}ms`;
      const im = inked(sp.ink, design(d * dpr, { text: sp.text, around: sp.around, logo: null }));
      c.getContext("2d").drawImage(im, 0, 0);
      box.appendChild(c);
    });
  }
  if (demos.length) {
    const go = () => demos.forEach(b => { if (b.dataset.done) return; b.dataset.done = "1"; runDemo(b); });
    const ready = document.fonts && document.fonts.load ? document.fonts.load("800 20px Archivo").catch(() => {}) : Promise.resolve();
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); ready.then(() => { e.target.dataset.done = "1"; runDemo(e.target); }); } }), { threshold: 0.35 });
      demos.forEach(b => io.observe(b));
    } else ready.then(go);
  }
  if (!opener.length) return;

  // les polices du site servent aussi pour le motif : on redessine une fois chargées
  if (document.fonts && document.fonts.load) document.fonts.load("800 20px Archivo").then(() => { if (dlg.open) refresh(); }).catch(() => {});
})();
