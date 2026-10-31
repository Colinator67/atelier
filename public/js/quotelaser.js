/* =========================================================================
   Page Découpe laser : simulateur de devis et tampons.
   ========================================================================= */
(function () {
  "use strict";
  if (!document.getElementById("dropL")) return;
  const C = window.SITE_CONFIG;
  const { $, $$, nf, eur, fmtSize, fmtDuration, fmtMinutes, esc, setLines, showMsg, clampQty, bindDrop, bindChips } = window.UI;
  const openRequest = (req) => window.AskModal.open(req);

  // ======================================================================
  // DEVIS LASER
  // ======================================================================
  const L = C.laser;
  const sl = { material: L.materials[0].id, result: null, file: null, estimate: null, raster: false };
  const matL = $("#matL");
  matL.innerHTML = L.materials.map(m => `<button type="button" data-id="${m.id}" aria-pressed="${m.id === sl.material}">${esc(m.label)}</button>`).join("");
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
    showMsg(msg, "");
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
      window.track && window.track("devis_laser_fichier", (file.name.split(".").pop() || "").toUpperCase());
    } catch (err) {
      console.error(err);
      showMsg(msg, err.message || "Ce fichier n'a pas pu être lu.", "error");
    }
  });
  function clearPart() {
    sl.result = null; sl.file = null; sl.raster = false; sl.estimate = null;
    $("#previewL").hidden = true; $("#dropL").hidden = false; $("#imgL").innerHTML = ""; $("#fileL").value = "";
    showMsg($("#msgL"), "");
  }
  $("#resetL").addEventListener("click", () => { clearPart(); updateL(); });

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
    const lines = $("#linesL"), warn = $("#warnL");
    const blank = { size: "—", cut: "—", engr: "—", cutmin: "—", engrmin: "—", unit: "—" };
    $("[data-dv=detail]", ticketL).hidden = !sl.result;
    if (sl.raster) { setLines(lines, blank); warn.hidden = true; dvL.refresh(); return; }
    const r = sl.result;
    if (!r) { setLines(lines, blank); warn.hidden = true; dvL.refresh(); return; }
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
    dvL.refresh();
  }
  function currentL() {
    if (!sl.file) return null;
    const mat = L.materials.find(m => m.id === sl.material), qty = clampQty($("#qtyL"));
    if (sl.raster) return { name: sl.file.name, file: sl.file, unit: null, qty, meta: `${mat.label} · image : prix sur devis`,
      summary: [`Découpe / gravure laser — ${sl.file.name}`, "Fichier image : devis personnalisé demandé", `Matériau souhaité : ${mat.label}`, `Quantité : ${qty}`] };
    const r = sl.result, e = sl.estimate; if (!r || !e) return null;
    return { name: sl.file.name, file: sl.file, unit: Math.round(e.unitPrice * 100) / 100, qty: e.qty, meta: `${e.material.label} · ${fmtSize(r.size)}`,
      summary: [
        `Découpe laser — ${sl.file.name}`,
        `Matériau : ${e.material.label}`,
        `Dimensions : ${fmtSize(r.size)}`,
        `Coupe : ${nf(0).format(r.cutLength)} mm · gravure : ${nf(1).format(r.engraveArea / 100)} cm²`,
        `Temps estimé : ${fmtMinutes(e.minutes)} par pièce`,
        `Quantité : ${e.qty} × ${eur(e.unitPrice)} = ${eur(Math.round(e.unitPrice * 100) / 100 * e.qty)}`
      ] };
  }
  const ticketL = $("#ticketL");
  const dvL = window.Devis.create({
    root: ticketL, key: "L", kind: "Découpe laser", partLabel: "Pièce",
    current: currentL, reset: () => { clearPart(); $("#qtyL").value = 1; updateL(); }, dropEl: () => $("#dropL")
  });
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
  bindDrop($("#dropS"), $("#fileS"), file => { sS.file = file; $("#fnameS").textContent = "Fichier joint : " + file.name; updateS(); });
  function updateS() {
    const D = window.StampDeal, on = !!(D && D.active());
    $("#dealS").hidden = !on;
    if (on) $("#dealS").innerHTML = `Code <strong>${D.code}</strong> : -${D.pct} % sur les tampons. Une fois par commande, non cumulable.`;
    if (dvS) dvS.refresh();
  }
  function currentS() {
    const D = window.StampDeal, on = !!(D && D.active()), qty = clampQty($("#qtyS"));
    const unit = on ? D.price(sS.stamp.price) : sS.stamp.price;
    return { name: sS.stamp.label, file: sS.file, unit, qty, meta: (on ? `Remise ${D.code} (-${D.pct} %) · ` : "Prix fixe · ") + (sS.file ? sS.file.name : "motif à envoyer"),
      summary: [`${sS.stamp.label}`, `Motif : ${sS.file ? sS.file.name : "à décrire / envoyer"}`, on ? `Remise défi : ${D.code} (-${D.pct} %)` : null, `Quantité : ${qty} × ${eur(unit)} = ${eur(unit * qty)}`].filter(Boolean) };
  }
  const dvS = window.Devis.create({
    root: $("#ticketS"), key: "S", kind: "Tampon", partLabel: "Tampon", addText: "Ajouter un autre tampon au devis", nextText: "Un autre tampon ? Choisissez sa taille ci-contre.",
    current: currentS, reset: () => { sS.file = null; $("#fileS").value = ""; $("#fnameS").textContent = "SVG, PDF, AI ou image · vous pourrez aussi le décrire"; $("#qtyS").value = 1; }, dropEl: () => $("#stamps")
  });
  updateS();
  document.addEventListener("stampdeal", updateS);
  // « Commander directement » et l'adresse …#tampon ouvrent l'onglet Tampon du devis
  const toStampTab = () => { const t = $("#lm-stamp"); if (t) t.click(); };
  $$("[data-stamp-direct]").forEach(a => a.addEventListener("click", toStampTab));
  if (location.hash === "#tester" || location.hash === "#tampon") toStampTab();

  // fichier déposé depuis l'accueil
  window.UI.pickUpPendingFile($("#fileL"));
})();
