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
})();
