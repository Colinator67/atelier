/* =========================================================================
   Interface : galerie, devis 3D, devis laser, tampons, fenêtre de demande.
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

  // ---------------------------------------------------------- Identité
  $$("[data-brand]").forEach(el => el.textContent = C.brand);
  document.title = `${C.brand} · Impression 3D & laser`;

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

  // ======================================================================
  // GALERIE
  // ======================================================================
  const LOGO = { "3d": "img/logo-3d.png", laser: "img/logo-laser.png" };
  const LABEL = { "3d": "Impression 3D", laser: "Découpe laser" };
  let creations = [];
  function renderGallery(filter) {
    const g = $("#gallery");
    const list = creations.filter(c => filter === "all" || c.categorie === filter);
    if (!list.length) { g.innerHTML = `<p class="empty">Aucune création dans cette catégorie pour l'instant.</p>`; return; }
    g.innerHTML = list.map(c => `
      <article class="card">
        <div class="card-img">
          <img src="${esc(c.image)}" alt="${esc(c.titre)}" loading="lazy">
          <span class="badge badge-${c.categorie === "laser" ? "laser" : "3d"}"><img src="${LOGO[c.categorie] || LOGO["3d"]}" alt="">${LABEL[c.categorie] || ""}</span>
        </div>
        <div class="card-body">
          ${c.exemple ? `<span class="example-flag">Exemple à remplacer</span>` : ""}
          <h3>${esc(c.titre)}</h3>
          <p>${esc(c.description || "")}</p>
          ${c.tags && c.tags.length ? `<div class="tags">${c.tags.map(t => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
        </div>
      </article>`).join("");
  }
  fetch("creations/creations.json")
    .then(r => r.ok ? r.json() : [])
    .then(d => { creations = Array.isArray(d) ? d : (d.creations || []); renderGallery("all"); })
    .catch(() => { $("#gallery").innerHTML = `<p class="empty">La galerie n'a pas pu être chargée.</p>`; });
  bindChips("[data-filter]", "filter", renderGallery);

  // ======================================================================
  // DEVIS 3D
  // ======================================================================
  const P = C.print;
  const s3 = { material: P.materials[0].id, color: null, metrics: null, file: null, estimate: null };

  // Matières
  const matBox = $("#mat3d");
  matBox.innerHTML = P.materials.map(m => `<button type="button" data-id="${m.id}" aria-pressed="${m.id === s3.material}">${esc(m.label)}</button>`).join("");
  matBox.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    s3.material = b.dataset.id;
    $$("button", matBox).forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    renderColors(); update3d();
  });

  // Couleurs
  function renderColors() {
    const box = $("#colors3d");
    const mat = P.materials.find(m => m.id === s3.material);
    $("#matnote3d").textContent = mat.note || "";
    const groups = P.colors[s3.material];
    if (!groups) {
      s3.color = { id: "a-preciser", label: "À préciser dans la demande", swatch: "#9a948e" };
      box.innerHTML = `<p class="hint">Indiquez la couleur souhaitée dans votre demande, je vous confirme la disponibilité.</p>`;
      tintMesh();
      return;
    }
    const all = groups.flatMap(g => g.items);
    if (!s3.color || !all.find(c => c.id === s3.color.id)) s3.color = all[0];
    box.innerHTML = groups.map(g => `
      <div class="color-group">
        <h4>${esc(g.group)}</h4>
        <div class="swatches">${g.items.map(c => `<button type="button" class="swatch" data-id="${c.id}" aria-pressed="${c.id === s3.color.id}"><i style="background:${c.swatch}"></i>${esc(c.label)}</button>`).join("")}</div>
      </div>`).join("");
    tintMesh();
  }
  $("#colors3d").addEventListener("click", e => {
    const b = e.target.closest(".swatch"); if (!b) return;
    const all = (P.colors[s3.material] || []).flatMap(g => g.items);
    s3.color = all.find(c => c.id === b.dataset.id);
    $$(".swatch", $("#colors3d")).forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    tintMesh();
  });

  // Solidité
  $("#infill3d").innerHTML = P.infillOptions.map(o => `<option value="${o.id}">${esc(o.label)}</option>`).join("");
  ["#infill3d", "#qty3d", "#sup3d"].forEach(s => $(s).addEventListener("input", update3d));

  // Fichier
  bindDrop($("#drop3d"), $("#file3d"), async (file) => {
    const msg = $("#msg3d");
    showMsg(msg, "Analyse du fichier…");
    try {
      const tris = await Geometry.readMeshFile(file);
      const m = Geometry.measure(tris, P.estimate.supportAngle);
      if (!m.closed || m.volume < 1) throw new Error("Le volume de la pièce est nul : le maillage est probablement ouvert ou vide.");
      s3.metrics = m; s3.file = file;
      $("#fname3d").textContent = file.name;
      $("#drop3d").hidden = true; $("#viewer3d").hidden = false;
      showMsg(msg, "");
      showMesh(tris);
      update3d();
    } catch (err) {
      console.error(err);
      showMsg(msg, err.message || "Ce fichier n'a pas pu être lu.", "error");
    }
  });
  $("#reset3d").addEventListener("click", () => {
    s3.metrics = null; s3.file = null; s3.estimate = null;
    $("#viewer3d").hidden = true; $("#drop3d").hidden = false;
    update3d();
  });

  function update3d() {
    const m = s3.metrics, lines = $("#lines3d"), warn = $("#warn3d");
    if (!m) {
      setLines(lines, { size: "—", vol: "—", grams: "—", time: "—", matcost: "—", machcost: "—", unit: "—" });
      $("#total3d").textContent = "—"; warn.hidden = true; $("#ask3d").disabled = true; return;
    }
    const qty = clampQty($("#qty3d"));
    const infill = P.infillOptions.find(o => o.id === $("#infill3d").value).value;
    const e = Geometry.estimatePrint(m, P, s3.material, infill, $("#sup3d").checked);
    s3.estimate = { ...e, qty, infillLabel: $("#infill3d").selectedOptions[0].textContent, supports: $("#sup3d").checked };
    setLines(lines, {
      size: fmtSize(m.size),
      vol: nf(1).format(m.volume / 1000) + " cm³",
      grams: nf(0).format(e.grams) + " g",
      time: fmtDuration(e.hours),
      matcost: eur(e.materialCost),
      machcost: eur(e.machineCost),
      unit: eur(e.unitPrice)
    });
    $("#total3d").textContent = eur(e.unitPrice * qty);
    const sortD = a => [...a].sort((x, y) => y - x);
    const tooBig = sortD(m.size).some((v, i) => v > sortD(P.maxSize)[i]);
    const notes = [];
    if (tooBig) notes.push(`La pièce dépasse le volume d'impression (${P.maxSize.join(" × ")} mm). Elle devra être découpée en plusieurs parties : le prix sera ajusté.`);
    if (m.size.every(v => v < 2)) notes.push("La pièce est minuscule : votre fichier est peut-être en mètres ou en pouces au lieu de millimètres.");
    if (m.size.some(v => v > 2000)) notes.push("La pièce est énorme : votre fichier est peut-être en microns au lieu de millimètres.");
    warn.textContent = notes.join(" "); warn.hidden = !notes.length;
    $("#ask3d").disabled = false;
  }

  // Aperçu 3D (three.js)
  let viewer = null;
  function initViewer() {
    if (viewer || !window.THREE) return viewer;
    const canvas = $("#canvas3d");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100000);
    camera.up.set(0, 0, 1);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7f74, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 0.75); key.position.set(1, -1.4, 2); scene.add(key);
    const material = new THREE.MeshStandardMaterial({ color: 0xC1A88A, roughness: 0.55, metalness: 0.05 });
    const controls = THREE.OrbitControls ? new THREE.OrbitControls(camera, canvas) : null;
    const render = () => renderer.render(scene, camera);
    if (controls) { controls.enableDamping = false; controls.addEventListener("change", render); }
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); render();
    };
    new ResizeObserver(resize).observe(canvas);
    viewer = { renderer, scene, camera, controls, material, mesh: null, grid: null, render, resize };
    return viewer;
  }
  function showMesh(tris) {
    const v = initViewer(); if (!v) return;
    if (v.mesh) { v.scene.remove(v.mesh); v.mesh.geometry.dispose(); }
    if (v.grid) v.scene.remove(v.grid);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(tris, 3));
    geo.computeVertexNormals(); geo.computeBoundingBox();
    const bb = geo.boundingBox, c = new THREE.Vector3(); bb.getCenter(c);
    geo.translate(-c.x, -c.y, -bb.min.z);
    const size = new THREE.Vector3(); bb.getSize(size);
    const r = Math.max(size.x, size.y, size.z) || 1;
    v.mesh = new THREE.Mesh(geo, v.material); v.scene.add(v.mesh);
    const step = Math.pow(10, Math.floor(Math.log10(r)));
    v.grid = new THREE.GridHelper(Math.ceil(r * 1.6 / step) * step, Math.ceil(r * 1.6 / step) * 2, 0x9a948e, 0xcfcac5);
    v.grid.rotation.x = Math.PI / 2; v.scene.add(v.grid);
    v.camera.position.set(r * 1.6, -r * 2.0, r * 1.3);
    v.camera.near = r / 100; v.camera.far = r * 100; v.camera.updateProjectionMatrix();
    if (v.controls) { v.controls.target.set(0, 0, size.z / 2); v.controls.update(); } else v.camera.lookAt(0, 0, size.z / 2);
    tintMesh();
    requestAnimationFrame(v.resize);
  }
  function tintMesh() {
    if (!viewer || !s3.color) return;
    const hex = (s3.color.swatch.match(/#[0-9a-f]{6}/i) || ["#C1A88A"])[0];
    viewer.material.color.set(hex);
    viewer.render();
  }

  renderColors();
  update3d();

  // ======================================================================
  // DEVIS LASER
  // ======================================================================
  const L = C.laser;
  const sl = { material: L.materials[0].id, result: null, file: null, estimate: null, raster: false };
  const matL = $("#matL");
  matL.innerHTML = L.materials.map(m => `<button type="button" data-id="${m.id}" aria-pressed="${m.id === sl.material}">${esc(m.label)}<small>${nf(2).format(m.pricePerMin)} €/min</small></button>`).join("");
  matL.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    sl.material = b.dataset.id;
    $$("button", matL).forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    updateL();
  });
  $("#qtyL").addEventListener("input", updateL);

  bindChips("[data-lmode]", "lmode", mode => {
    $("#laser-cut").hidden = mode !== "cut";
    $("#laser-stamp").hidden = mode !== "stamp";
  });

  bindDrop($("#dropL"), $("#fileL"), async (file) => {
    const msg = $("#msgL");
    showMsg(msg, "Analyse du fichier…");
    try {
      const r = await Vector.readLaserFile(file);
      sl.file = file;
      $("#fnameL").textContent = file.name;
      $("#dropL").hidden = true; $("#previewL").hidden = false;
      await preview2d(file, r);
      if (r.raster) {
        sl.raster = true; sl.result = null;
        showMsg(msg, "Les images (PNG, JPG…) ne sont pas chiffrées automatiquement : leur rendu dépend du traitement de l'image. Contactez-moi avec ce fichier et je vous fais un devis personnalisé.", "contact");
      } else {
        sl.raster = false; sl.result = r;
        showMsg(msg, "");
      }
      updateL();
    } catch (err) {
      console.error(err);
      showMsg(msg, err.message || "Ce fichier n'a pas pu être lu.", "error");
    }
  });
  $("#resetL").addEventListener("click", () => {
    sl.result = null; sl.file = null; sl.raster = false; sl.estimate = null;
    $("#previewL").hidden = true; $("#dropL").hidden = false; $("#imgL").innerHTML = "";
    showMsg($("#msgL"), "");
    updateL();
  });

  async function preview2d(file, r) {
    const box = $("#imgL");
    box.innerHTML = "";
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "svg" || r.raster) {
      const img = new Image(); img.alt = "Aperçu du fichier"; img.src = URL.createObjectURL(file);
      box.appendChild(img); return;
    }
    if ((ext === "pdf" || ext === "ai") && window.pdfjsLib) {
      try {
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
        const page = await pdf.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(3, 900 / Math.max(base.width, base.height));
        const vp = page.getViewport({ scale });
        const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
        await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
        box.appendChild(c); c.style.maxWidth = "100%"; c.style.maxHeight = "100%";
        return;
      } catch (e) { /* aperçu facultatif */ }
    }
    box.innerHTML = `<p class="mono" style="color:#4C4C4C">${esc(file.name)}<br>${r.size ? fmtSize(r.size) : ""}</p>`;
  }

  function updateL() {
    const lines = $("#linesL"), warn = $("#warnL"), btn = $("#askL");
    const blank = { size: "—", cut: "—", engr: "—", cutmin: "—", engrmin: "—", unit: "—" };
    if (sl.raster) {
      setLines(lines, blank); $("#totalL").textContent = "Sur devis";
      warn.hidden = true; btn.disabled = false; btn.textContent = "Me contacter avec ce fichier"; return;
    }
    btn.textContent = "Demander ce devis";
    const r = sl.result;
    if (!r) { setLines(lines, blank); $("#totalL").textContent = "—"; warn.hidden = true; btn.disabled = true; return; }
    const qty = clampQty($("#qtyL"));
    const e = Vector.estimateLaser(r, L, sl.material);
    sl.estimate = { ...e, qty };
    setLines(lines, {
      size: fmtSize(r.size),
      cut: r.cutLength ? nf(0).format(r.cutLength) + " mm" : "aucune",
      engr: r.engraveArea ? nf(1).format(r.engraveArea / 100) + " cm²" : "aucune",
      cutmin: r.cutLength ? fmtMinutes(e.cutMin) : "—",
      engrmin: r.engraveArea ? fmtMinutes(e.engraveMin) : "—",
      unit: eur(e.unitPrice)
    });
    $("#totalL").textContent = eur(e.unitPrice * qty);
    const notes = [];
    if (r.size[0] > L.maxSize[0] || r.size[1] > L.maxSize[1]) {
      const fitsRotated = r.size[1] <= L.maxSize[0] && r.size[0] <= L.maxSize[1];
      if (!fitsRotated) notes.push(`Le dessin dépasse la zone de découpe (${L.maxSize.join(" × ")} mm). Il faudra le découper en plusieurs plaques.`);
    }
    if (r.hasRasterImage) notes.push("Le fichier contient une image : sa gravure n'est pas comptée dans l'estimation, je la chiffrerai à part.");
    if (r.hasText) notes.push("Le fichier contient du texte non vectorisé : sa gravure n'est pas comptée. Vectorisez les textes pour une estimation complète.");
    if (!r.cutLength && !r.engraveArea) notes.push("Aucun tracé de coupe ni zone de gravure détecté. Vérifiez que les traits de coupe sont des contours sans remplissage.");
    if (Math.max(...r.size) < 5) notes.push("Le dessin est minuscule : vérifiez qu'il est bien à l'échelle réelle, en millimètres.");
    warn.textContent = notes.join(" "); warn.hidden = !notes.length;
    btn.disabled = false;
  }
  updateL();

  // ---------------------------------------------------------- Tampons
  const sS = { stamp: L.stamps[0], file: null };
  const maxStamp = Math.max(...L.stamps.map(s => parseFloat(s.label.match(/[\d,.]+/)[0].replace(",", "."))));
  $("#stamps").innerHTML = L.stamps.map(s => {
    const d = parseFloat(s.label.match(/[\d,.]+/)[0].replace(",", "."));
    const px = Math.round(26 + 46 * d / maxStamp);
    return `<button type="button" class="stamp" data-id="${s.id}" aria-pressed="${s.id === sS.stamp.id}">
      <span class="disc" style="width:${px}px;height:${px}px"></span>
      <strong>Ø ${nf(0).format(d)} cm</strong><span>${eur(s.price)}</span></button>`;
  }).join("");
  $("#stamps").addEventListener("click", e => {
    const b = e.target.closest(".stamp"); if (!b) return;
    sS.stamp = L.stamps.find(s => s.id === b.dataset.id);
    $$(".stamp").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    updateS();
  });
  $("#qtyS").addEventListener("input", updateS);
  bindDrop($("#dropS"), $("#fileS"), file => { sS.file = file; $("#fnameS").textContent = "Fichier joint : " + file.name; });
  function updateS() {
    const qty = clampQty($("#qtyS"));
    setLines($("#linesS"), { label: sS.stamp.label, unit: eur(sS.stamp.price) });
    $("#totalS").textContent = eur(sS.stamp.price * qty);
  }
  updateS();

  // ======================================================================
  // DEMANDE
  // ======================================================================
  const modal = $("#modal");
  let current = null; // { kind, summary, file }

  function openRequest(req) {
    current = req;
    $("#reqSummary").textContent = req.summary;
    $("#reqForm").hidden = false; $("#reqSent").hidden = true; $("#reqFallback").hidden = true;
    showMsg($("#reqMsgBox"), "");
    if (typeof modal.showModal === "function") modal.showModal(); else modal.setAttribute("open", "");
    setTimeout(() => $("#reqEmail").focus(), 50);
    loadTurnstile();
  }
  const closeModal = () => { if (modal.close) modal.close(); else modal.removeAttribute("open"); };
  ["#closeModal", "#cancelModal", "#closeSent", "#closeFb"].forEach(s => $(s).addEventListener("click", closeModal));

  $("#ask3d").addEventListener("click", () => {
    const m = s3.metrics, e = s3.estimate;
    const mat = P.materials.find(x => x.id === s3.material);
    openRequest({
      kind: "Impression 3D",
      file: s3.file,
      summary: [
        `Impression 3D — ${s3.file.name}`,
        `Matière : ${mat.label} · ${s3.color.label}`,
        `Solidité : ${e.infillLabel} · supports : ${e.supports ? "oui" : "non"}`,
        `Dimensions : ${fmtSize(m.size)} · volume ${nf(1).format(m.volume / 1000)} cm³`,
        `Estimation : ${nf(0).format(e.grams)} g · ${fmtDuration(e.hours)} par pièce`,
        `Quantité : ${e.qty}`,
        `Total estimé : ${eur(e.unitPrice * e.qty)} (${eur(e.unitPrice)} / pièce)`
      ].join("\n")
    });
  });
  $("#askL").addEventListener("click", () => {
    if (sl.raster) {
      openRequest({ kind: "Laser (image)", file: sl.file, summary: `Découpe / gravure laser — ${sl.file.name}\nFichier image : devis personnalisé demandé\nQuantité : ${clampQty($("#qtyL"))}` });
      return;
    }
    const r = sl.result, e = sl.estimate;
    openRequest({
      kind: "Découpe laser",
      file: sl.file,
      summary: [
        `Découpe laser — ${sl.file.name}`,
        `Matériau : ${e.material.label}`,
        `Dimensions : ${fmtSize(r.size)}`,
        `Coupe : ${nf(0).format(r.cutLength)} mm · gravure : ${nf(1).format(r.engraveArea / 100)} cm²`,
        `Temps estimé : ${fmtMinutes(e.minutes)} par pièce`,
        `Quantité : ${e.qty}`,
        `Total estimé : ${eur(e.unitPrice * e.qty)} (${eur(e.unitPrice)} / pièce)`
      ].join("\n")
    });
  });
  $("#askS").addEventListener("click", () => {
    const qty = clampQty($("#qtyS"));
    openRequest({
      kind: "Tampon",
      file: sS.file,
      summary: [`Tampon — ${sS.stamp.label}`, `Quantité : ${qty}`, `Total : ${eur(sS.stamp.price * qty)}`, `Motif : ${sS.file ? sS.file.name : "à décrire / envoyer"}`].join("\n")
    });
  });

  // Turnstile (facultatif)
  let tsLoaded = false;
  function loadTurnstile() {
    if (!C.turnstileSiteKey || tsLoaded) return;
    tsLoaded = true;
    window.onTurnstileLoad = () => window.turnstile.render("#turnstile", { sitekey: C.turnstileSiteKey });
    Geometry.loadScript("https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit").catch(() => {});
  }

  $("#reqForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const box = $("#reqMsgBox");
    const email = $("#reqEmail").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { showMsg(box, "Saisissez une adresse email valide, par exemple vous@exemple.fr.", "error"); $("#reqEmail").focus(); return; }
    if (!$("#reqConsent").checked) { showMsg(box, "Cochez la case d'accord pour que je puisse vous répondre.", "error"); return; }
    if ($("#reqWebsite").value) return; // robot
    const fd = new FormData();
    fd.append("kind", current.kind);
    fd.append("email", email);
    fd.append("message", $("#reqMsg").value.trim());
    fd.append("summary", current.summary);
    if (current.file) fd.append("file", current.file, current.file.name);
    const ts = document.querySelector('[name="cf-turnstile-response"]');
    if (ts) fd.append("cf-turnstile-response", ts.value);

    const btn = $("#sendReq");
    btn.disabled = true; btn.textContent = "Envoi…";
    try {
      if (!C.requestEndpoint) throw new Error("no endpoint");
      const res = await fetch(C.requestEndpoint, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data.error && res.status === 400) { showMsg(box, data.error, "error"); return; }
        throw new Error("HTTP " + res.status);
      }
      $("#reqForm").hidden = true; $("#reqSent").hidden = false;
      $("#reqMsg").value = "";
    } catch (err) {
      showFallback(email);
    } finally {
      btn.disabled = false; btn.textContent = "Envoyer";
    }
  });

  function showFallback(email) {
    $("#reqForm").hidden = true; $("#reqFallback").hidden = false;
    const to = C.contactEmail || C.legal.email;
    const valid = to && !/^\[/.test(to);
    $("#fbEmailWrap").hidden = !valid;
    if (valid) $("#fbEmail").textContent = to;
    $("#fbText").value = `${current.summary}\n\nEmail : ${email}\nPrécisions : ${$("#reqMsg").value.trim() || "—"}`;
  }
  $("#copyFb").addEventListener("click", () => {
    const t = $("#fbText");
    const done = () => { $("#copyFb").textContent = "Copié"; setTimeout(() => $("#copyFb").textContent = "Copier le récapitulatif", 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(done, () => { t.select(); });
    else t.select();
  });

  // ======================================================================
  // MENTIONS LÉGALES
  // ======================================================================
  const lg = C.legal;
  $("#legal").innerHTML = `
    <h3>Éditeur du site</h3>
    <p>${esc(lg.name)} — ${esc(lg.status)}<br>SIRET : ${esc(lg.siret)}<br>${esc(lg.address)}<br>Contact : ${esc(lg.email)}</p>
    <h3>Hébergement</h3>
    <p>${esc(lg.host)}</p>
    <h3>Devis</h3>
    <p>Les prix affichés par le calculateur sont des estimations indicatives, sans valeur contractuelle. Le prix définitif est confirmé par email après vérification du fichier.</p>
    <h3>Données personnelles</h3>
    <p>Lorsque vous envoyez une demande, votre email, votre message et votre fichier me sont transmis uniquement pour vous répondre et établir un devis. Ils ne sont ni revendus ni utilisés à des fins publicitaires, et sont supprimés au plus tard 3 ans après notre dernier échange. Les fichiers déposés dans le calculateur sont analysés dans votre navigateur et ne sont envoyés que si vous validez une demande. Vous pouvez demander l'accès, la rectification ou la suppression de vos données en écrivant à ${esc(lg.email)}. Le site n'utilise pas de cookies publicitaires ni de mesure d'audience.</p>`;
})();
