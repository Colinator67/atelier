/* =========================================================================
   Page Impression 3D : simulateur de devis.
   ========================================================================= */
(function () {
  "use strict";
  if (!document.getElementById("drop3d")) return;
  const C = window.SITE_CONFIG;
  const { $, $$, nf, eur, fmtSize, fmtDuration, fmtMinutes, esc, setLines, showMsg, clampQty, bindDrop, bindChips } = window.UI;
  const openRequest = (req) => window.AskModal.open(req);

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
    tintMesh(); showColorPhoto();
  }
  $("#colors3d").addEventListener("click", e => {
    const b = e.target.closest(".swatch"); if (!b) return;
    const all = (P.colors[s3.material] || []).flatMap(g => g.items);
    s3.color = all.find(c => c.id === b.dataset.id);
    $$(".swatch", $("#colors3d")).forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    tintMesh(); showColorPhoto(); update3d();
  });
  function showColorPhoto() {
    const box = $("#colorPhoto3d"); if (!box) return;
    const ph = s3.color && s3.color.photo;
    box.hidden = !ph;
    if (ph) box.innerHTML = `<img src="${esc(ph)}" alt="Échantillon imprimé : ${esc(s3.color.label)}" loading="lazy"><span>Échantillon réel · ${esc(s3.color.label)}</span>`;
  }

  // Solidité
  $("#infill3d").innerHTML = P.infillOptions.map(o => `<option value="${o.id}">${esc(o.label)}</option>`).join("");
  ["#infill3d", "#qty3d", "#sup3d"].forEach(s => $(s).addEventListener("input", update3d));

  // Fichier
  bindDrop($("#drop3d"), $("#file3d"), async (file) => {
    const msg = $("#msg3d");
    showMsg(msg, "");
    try {
      const tris = await Geometry.readMeshFile(file);
      const m = Geometry.measure(tris, P.estimate.supportAngle);
      if (!m.closed || m.volume < 1) throw new Error("Le volume de la pièce est nul : le maillage est probablement ouvert ou vide.");
      s3.metrics = m; s3.file = file; s3.tris = tris; s3.scale = 1;
      $("#fname3d").textContent = file.name;
      $("#drop3d").hidden = true; $("#viewer3d").hidden = false;
      showMsg(msg, "");
      showMesh(tris);
      update3d();
      window.UI.toast("Fichier analysé");
      window.track && window.track("devis_3d_fichier", (file.name.split(".").pop() || "").toUpperCase());
    } catch (err) {
      console.error(err);
      showMsg(msg, err.message || "Ce fichier n'a pas pu être lu.", "error");
    }
  });
  function clearPart() {
    s3.metrics = null; s3.file = null; s3.estimate = null; s3.tris = null;
    $("#viewer3d").hidden = true; $("#drop3d").hidden = false; $("#file3d").value = "";
  }
  $("#reset3d").addEventListener("click", () => { clearPart(); update3d(); });

  function update3d() {
    const m = s3.metrics, lines = $("#lines3d"), warn = $("#warn3d");
    $("[data-dv=detail]", ticket).hidden = !m;
    if (!m) { warn.hidden = true; dv.refresh(); return; }
    const qty = clampQty($("#qty3d"));
    const infill = P.infillOptions.find(o => o.id === $("#infill3d").value).value;
    const e = Geometry.estimatePrint(m, P, s3.material, infill, $("#sup3d").checked);
    s3.estimate = { ...e, qty, infillLabel: $("#infill3d").selectedOptions[0].textContent, supports: $("#sup3d").checked };
    setLines(lines, {
      size: fmtSize(m.size),
      vol: nf(1).format(m.volume / 1000) + " cm³",
      grams: nf(0).format(e.grams) + " g",
      time: fmtDuration(e.hours),
      unit: eur(e.unitPrice),
      setup: eur(P.setupFee || 0)
    });

    const sortD = a => [...a].sort((x, y) => y - x);
    const tooBig = sortD(m.size).some((v, i) => v > sortD(P.maxSize)[i]);
    const notes = [];
    if (tooBig) notes.push(`La pièce dépasse le volume d'impression (${P.maxSize.join(" × ")} mm). Elle devra être découpée en plusieurs parties : le prix sera ajusté.`);
    const fixes = [];
    const maxDim = Math.max(...m.size);
    if (maxDim < 15 && s3.scale === 1) {
      notes.push(`La pièce ne mesure que ${fmtSize(m.size)} : votre fichier est peut-être en pouces ou en centimètres au lieu de millimètres.`);
      fixes.push([25.4, "C'est en pouces (× 25,4)"], [10, "C'est en centimètres (× 10)"]);
      if (maxDim < 2) fixes.push([1000, "C'est en mètres (× 1000)"]);
    }
    if (maxDim > 2000 && s3.scale === 1) {
      notes.push("La pièce est énorme : votre fichier est peut-être en microns au lieu de millimètres.");
      fixes.push([0.001, "C'est en microns (÷ 1000)"]);
    }
    if (s3.scale !== 1) notes.push(`Dimensions converties (× ${nf(s3.scale < 1 ? 3 : 1).format(s3.scale)}).`), fixes.push([1 / s3.scale, "Annuler la conversion"]);
    warn.innerHTML = notes.map(n => `<span>${esc(n)}</span>`).join(" ") + (fixes.length ? `<span class="warn-actions">${fixes.map(([k, l]) => `<button type="button" class="btn btn-small btn-ghost" data-scale="${k}">${esc(l)}</button>`).join("")}</span>` : "");
    warn.hidden = !notes.length;
    const dims = $("#dims3d"); if (dims) dims.textContent = fmtSize(m.size);
    dv.refresh();
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
    renderer.outputEncoding = THREE.sRGBEncoding;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7f74, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(1, -1.4, 2); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.35); rim.position.set(-1.5, 1.2, 0.8); scene.add(rim);
    const material = new THREE.MeshStandardMaterial({ color: 0xC1A88A, roughness: 0.6, metalness: 0.0 });
    const controls = THREE.OrbitControls ? new THREE.OrbitControls(camera, canvas) : null;
    const render = () => renderer.render(scene, camera);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let spinning = false;
    const loop = () => { if (!spinning) return; controls.update(); render(); requestAnimationFrame(loop); };
    const spin = (on) => { if (!controls || still) return; controls.autoRotate = on; if (on && !spinning) { spinning = true; requestAnimationFrame(loop); } else if (!on) spinning = false; };
    if (controls) {
      controls.enableDamping = false; controls.autoRotateSpeed = 1.4;
      controls.addEventListener("change", () => { if (!spinning) render(); });
      // la rotation automatique s'arrête dès que le client manipule la pièce
      controls.addEventListener("start", () => spin(false));
    }
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); render();
    };
    new ResizeObserver(resize).observe(canvas);
    viewer = { renderer, scene, camera, controls, material, mesh: null, grid: null, render, resize, spin };
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
    v.spin(true);
  }
  function tintMesh() {
    if (!viewer || !s3.color) return;
    const hex = (s3.color.swatch.match(/#[0-9a-f]{6}/i) || ["#C1A88A"])[0];
    viewer.material.color.set(hex);
    viewer.render();
  }

  // conversion d'unités proposée dans l'avertissement
  $("#warn3d").addEventListener("click", e => {
    const b = e.target.closest("[data-scale]"); if (!b || !s3.tris) return;
    const k = +b.dataset.scale;
    const t = new Float32Array(s3.tris.length);
    for (let i = 0; i < t.length; i++) t[i] = s3.tris[i] * k;
    s3.tris = t; s3.scale = Math.abs(s3.scale * k - 1) < 1e-6 ? 1 : s3.scale * k;
    s3.metrics = Geometry.measure(t, P.estimate.supportAngle);
    showMesh(t); update3d();
    window.UI.toast(s3.scale === 1 ? "Dimensions d'origine" : "Dimensions converties");
  });

  // comparaison des matières
  const TRAITS = [["rigidite", "Rigidité"], ["souplesse", "Souplesse"], ["chaleur", "Tenue à la chaleur"], ["exterieur", "Extérieur, UV, humidité"]];
  const cmp = $("#cmp3d");
  if (cmp && P.materials.every(m => m.traits)) {
    cmp.innerHTML = `<table class="cmp"><caption class="sr-only">Comparaison des matières</caption>
      <thead><tr><th scope="col"><span class="sr-only">Critère</span></th>${P.materials.map(m => `<th scope="col">${esc(m.label)}</th>`).join("")}</tr></thead>
      <tbody>${TRAITS.map(([k, l]) => `<tr><th scope="row">${l}</th>${P.materials.map(m => `<td><span class="meter" style="--v:${m.traits[k]}" role="img" aria-label="${m.traits[k]} sur 3"></span></td>`).join("")}</tr>`).join("")}
      <tr><th scope="row">Idéal pour</th>${P.materials.map(m => `<td>${esc(m.best || "")}</td>`).join("")}</tr></tbody></table>`;
  }

  // la pièce en cours, telle qu'elle rejoint le devis
  function current() {
    const m = s3.metrics, e = s3.estimate; if (!m || !e) return null;
    const mat = P.materials.find(x => x.id === s3.material);
    return {
      name: s3.file.name, file: s3.file, unit: Math.round(e.unitPrice * 100) / 100, qty: e.qty,
      meta: `${mat.label} · ${s3.color.label} · ${e.infillLabel}`,
      summary: [
        `Impression 3D — ${s3.file.name}`,
        `Matière : ${mat.label} · ${s3.color.label}`,
        `Solidité : ${e.infillLabel} · supports : ${e.supports ? "oui" : "non"}`,
        `Dimensions : ${fmtSize(m.size)} · volume ${nf(1).format(m.volume / 1000)} cm³`,
        `Estimation : ${nf(0).format(e.grams)} g · ${fmtDuration(e.hours)} par pièce`,
        `Quantité : ${e.qty} × ${eur(e.unitPrice)} = ${eur(Math.round(e.unitPrice * 100) / 100 * e.qty)}`
      ]
    };
  }
  const ticket = $("#ticket3d");
  const dv = window.Devis.create({
    root: ticket, key: "3d", kind: "Impression 3D", partLabel: "Pièce", setupFee: P.setupFee || 0,
    current, reset: () => { clearPart(); $("#qty3d").value = 1; update3d(); }, dropEl: () => $("#drop3d")
  });
  renderColors();
  update3d();
  window.UI.pickUpPendingFile($("#file3d"));
})();
