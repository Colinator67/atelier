/* =========================================================================
   Lecture des fichiers laser (SVG, DXF, PDF, AI) et calcul :
   - longueur de coupe (mm)  : tracés sans remplissage
   - surface de gravure (mm²): formes remplies et textes
   Les images matricielles (PNG, JPG…) ne sont pas chiffrées : contact direct.
   ========================================================================= */
(function () {
  "use strict";

  const PDFJS_VERSION = "3.11.174";
  const PDFJS_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/`;
  const MM_PER_PX = 25.4 / 96;
  const MM_PER_PT = 25.4 / 72;

  const RASTER_EXT = ["png", "jpg", "jpeg", "webp", "bmp", "gif", "tif", "tiff", "heic"];

  // ---------------------------------------------------------------- SVG
  function svgUnitToMm(value, pxMm = MM_PER_PX) {
    if (!value) return null;
    const m = String(value).trim().match(/^([\d.]+)\s*(mm|cm|in|pt|pc|px)?$/i);
    if (!m) return null;
    const n = parseFloat(m[1]);
    switch ((m[2] || "px").toLowerCase()) {
      case "mm": return n;
      case "cm": return n * 10;
      case "in": return n * 25.4;
      case "pt": return n * MM_PER_PT;
      case "pc": return n * 12 * MM_PER_PT;
      default: return n * pxMm;
    }
  }

  async function analyzeSVG(text) {
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== "svg" || doc.getElementsByTagName("parsererror").length)
      throw new Error("Ce fichier SVG est illisible.");

    // Taille physique
    const vb = (svg.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
    // Illustrator exporte avec 1 px = 1 pt (72 dpi) au lieu de 96 dpi
    const unitMm = /Adobe Illustrator/i.test(text.slice(0, 2000)) ? MM_PER_PT : MM_PER_PX;
    let wMm = svgUnitToMm(svg.getAttribute("width"), unitMm);
    let hMm = svgUnitToMm(svg.getAttribute("height"), unitMm);
    const hasVB = vb.length === 4 && vb[2] > 0 && vb[3] > 0;
    if (wMm == null && hasVB) wMm = vb[2] * unitMm;
    if (hMm == null && hasVB) hMm = wMm ? wMm * vb[3] / vb[2] : vb[3] * unitMm;
    if (!wMm || !hMm) throw new Error("Impossible de déterminer la taille du dessin (largeur/hauteur absentes).");

    // Rendu hors écran dans un shadow DOM pour isoler les styles du fichier
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:-99999px;top:0;width:1px;height:1px;overflow:hidden;";
    document.body.appendChild(host);
    const root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    const live = document.importNode(svg, true);
    const pxW = wMm / MM_PER_PX, pxH = hMm / MM_PER_PX;
    live.setAttribute("width", pxW + "px");
    live.setAttribute("height", pxH + "px");
    root.appendChild(live);

    let cutPx = 0, hasEngrave = false, hasRasterImage = false;
    const engraveTargets = [];
    try {
      const els = live.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse,text,image,use");
      for (const el of els) {
        if (el.closest("defs,clipPath,mask,symbol,marker,pattern")) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const tag = el.tagName.toLowerCase();
        if (tag === "image") { hasRasterImage = true; continue; }
        if (tag === "text" || tag === "use") { hasEngrave = true; engraveTargets.push(el); continue; }
        const fillVisible = tag !== "line" && cs.fill !== "none" && parseFloat(cs.fillOpacity || "1") > 0;
        const strokeVisible = cs.stroke !== "none" && parseFloat(cs.strokeOpacity || "1") > 0;
        if (fillVisible) { hasEngrave = true; engraveTargets.push(el); }
        if (strokeVisible && typeof el.getTotalLength === "function") {
          let len = 0;
          try { len = el.getTotalLength(); } catch (e) { len = 0; }
          const ctm = el.getCTM && el.getCTM();
          const scale = ctm ? Math.sqrt(Math.abs(ctm.a * ctm.d - ctm.b * ctm.c)) : 1;
          cutPx += len * scale;
        }
      }
    } finally { host.remove(); }

    // Surface gravée : rendu des seules zones remplies, comptage des pixels foncés
    let engraveMm2 = 0;
    if (hasEngrave) engraveMm2 = await rasterEngraveArea(svg, wMm, hMm);

    return {
      size: [wMm, hMm],
      cutLength: cutPx * MM_PER_PX,
      engraveArea: engraveMm2,
      hasRasterImage
    };
  }

  async function rasterEngraveArea(svg, wMm, hMm) {
    const clone = svg.cloneNode(true);
    const res = Math.min(10, 4000 / Math.max(wMm, hMm)); // px par mm
    const W = Math.max(1, Math.round(wMm * res)), H = Math.max(1, Math.round(hMm * res));
    clone.setAttribute("width", W + "px");
    clone.setAttribute("height", H + "px");
    // les traits ne comptent pas comme gravure
    const style = clone.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = "*{stroke:none !important}";
    clone.insertBefore(style, clone.firstChild);
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("rendu impossible"));
        i.src = url;
      });
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, W, H);
      const d = ctx.getImageData(0, 0, W, H).data;
      let count = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue;
        const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        if (lum < 0.92) count++;
      }
      return count / (res * res);
    } catch (e) {
      return 0;
    } finally { URL.revokeObjectURL(url); }
  }

  // ---------------------------------------------------------------- DXF
  const DXF_UNITS = { 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000, 0: 1 };

  function analyzeDXF(text) {
    const lines = text.split(/\r?\n/);
    const pairs = [];
    for (let i = 0; i + 1 < lines.length; i += 2) pairs.push([parseInt(lines[i], 10), lines[i + 1].trim()]);

    // unités
    let unit = 1;
    for (let i = 0; i < pairs.length - 1; i++) {
      if (pairs[i][0] === 9 && pairs[i][1] === "$INSUNITS") { unit = DXF_UNITS[parseInt(pairs[i + 1][1], 10)] ?? 1; break; }
    }

    // section ENTITIES (et BLOCKS ignorés pour rester simple)
    let start = -1, end = pairs.length;
    for (let i = 0; i < pairs.length - 1; i++) {
      if (pairs[i][0] === 2 && pairs[i][1] === "ENTITIES") start = i + 1;
      else if (start >= 0 && pairs[i][0] === 0 && pairs[i][1] === "ENDSEC") { end = i; break; }
    }
    if (start < 0) throw new Error("Aucune entité trouvée dans ce DXF.");

    const ents = [];
    let cur = null;
    for (let i = start; i < end; i++) {
      const [code, val] = pairs[i];
      if (code === 0) { cur = { type: val, g: [] }; ents.push(cur); }
      else if (cur) cur.g.push([code, val]);
    }

    let length = 0;
    const bb = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const pt = (x, y) => { if (x < bb.minX) bb.minX = x; if (x > bb.maxX) bb.maxX = x; if (y < bb.minY) bb.minY = y; if (y > bb.maxY) bb.maxY = y; };
    const get = (e, c) => { const f = e.g.find(p => p[0] === c); return f ? parseFloat(f[1]) : 0; };
    const all = (e, c) => e.g.filter(p => p[0] === c).map(p => parseFloat(p[1]));

    let polyVerts = null, polyClosed = false;
    const flushPoly = () => {
      if (polyVerts && polyVerts.length > 1) length += polylineLength(polyVerts, polyClosed, pt);
      polyVerts = null;
    };

    for (const e of ents) {
      switch (e.type) {
        case "LINE": {
          const x1 = get(e, 10), y1 = get(e, 20), x2 = get(e, 11), y2 = get(e, 21);
          length += Math.hypot(x2 - x1, y2 - y1); pt(x1, y1); pt(x2, y2); break;
        }
        case "CIRCLE": {
          const cx = get(e, 10), cy = get(e, 20), r = get(e, 40);
          length += 2 * Math.PI * r; pt(cx - r, cy - r); pt(cx + r, cy + r); break;
        }
        case "ARC": {
          const cx = get(e, 10), cy = get(e, 20), r = get(e, 40);
          let a1 = get(e, 50), a2 = get(e, 51);
          let sweep = a2 - a1; if (sweep <= 0) sweep += 360;
          length += r * sweep * Math.PI / 180;
          for (let k = 0; k <= 16; k++) { const a = (a1 + sweep * k / 16) * Math.PI / 180; pt(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
          break;
        }
        case "ELLIPSE": {
          const cx = get(e, 10), cy = get(e, 20), mx = get(e, 11), my = get(e, 21), ratio = get(e, 40) || 1;
          let t1 = get(e, 41), t2 = e.g.some(p => p[0] === 42) ? get(e, 42) : 2 * Math.PI;
          if (t2 <= t1) t2 += 2 * Math.PI;
          const a = Math.hypot(mx, my), ang = Math.atan2(my, mx);
          let prev = null;
          for (let k = 0; k <= 64; k++) {
            const t = t1 + (t2 - t1) * k / 64;
            const ex = a * Math.cos(t), ey = a * ratio * Math.sin(t);
            const x = cx + ex * Math.cos(ang) - ey * Math.sin(ang), y = cy + ex * Math.sin(ang) + ey * Math.cos(ang);
            if (prev) length += Math.hypot(x - prev[0], y - prev[1]);
            prev = [x, y]; pt(x, y);
          }
          break;
        }
        case "LWPOLYLINE": {
          const xs = [], flags = get(e, 70);
          let v = null;
          for (const [c, val] of e.g) {
            if (c === 10) { v = { x: parseFloat(val), y: 0, b: 0 }; xs.push(v); }
            else if (c === 20 && v) v.y = parseFloat(val);
            else if (c === 42 && v) v.b = parseFloat(val);
          }
          length += polylineLength(xs, (flags & 1) === 1, pt); break;
        }
        case "POLYLINE": flushPoly(); polyVerts = []; polyClosed = (get(e, 70) & 1) === 1; break;
        case "VERTEX": if (polyVerts) polyVerts.push({ x: get(e, 10), y: get(e, 20), b: get(e, 42) }); break;
        case "SEQEND": flushPoly(); break;
        case "SPLINE": {
          // approximation par le polygone des points d'ajustement, sinon de contrôle
          let xs = all(e, 11), ys = all(e, 21);
          if (xs.length < 2) { xs = all(e, 10); ys = all(e, 20); }
          const pts = xs.map((x, i) => ({ x, y: ys[i] || 0, b: 0 }));
          length += polylineLength(pts, (get(e, 70) & 1) === 1, pt) * (xs === all(e, 11) ? 1 : 0.95);
          break;
        }
        default: break;
      }
    }
    flushPoly();
    if (!isFinite(bb.minX)) throw new Error("Aucun tracé exploitable dans ce DXF.");
    return {
      size: [(bb.maxX - bb.minX) * unit, (bb.maxY - bb.minY) * unit],
      cutLength: length * unit,
      engraveArea: 0,
      hasRasterImage: false
    };
  }

  function polylineLength(v, closed, pt) {
    let L = 0;
    const n = v.length;
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = v[i], b = v[(i + 1) % n];
      pt(a.x, a.y);
      const chord = Math.hypot(b.x - a.x, b.y - a.y);
      if (a.b) {
        const theta = 4 * Math.atan(Math.abs(a.b));
        const r = chord / (2 * Math.sin(theta / 2));
        L += r * theta;
      } else L += chord;
    }
    if (n) pt(v[n - 1].x, v[n - 1].y);
    return L;
  }

  // ---------------------------------------------------------------- PDF / AI
  let pdfjsPromise = null;
  async function getPdfjs() {
    if (!pdfjsPromise) {
      pdfjsPromise = Geometry.loadScript(PDFJS_BASE + "pdf.min.js").then(() => {
        const lib = window.pdfjsLib;
        lib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + "pdf.worker.min.js";
        return lib;
      }).catch(e => { pdfjsPromise = null; throw e; });
    }
    return pdfjsPromise;
  }

  async function analyzePDF(buffer, isAI) {
    let lib;
    try { lib = await getPdfjs(); }
    catch (e) { throw new Error("Le lecteur PDF n'a pas pu se charger. Envoyez plutôt un SVG ou un DXF."); }
    let pdf;
    try { pdf = await lib.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false }).promise; }
    catch (e) {
      throw new Error(isAI
        ? "Ce fichier .ai n'est pas lisible. Dans Illustrator, enregistrez-le avec l'option « Créer un fichier compatible PDF », ou exportez-le en SVG."
        : "Ce fichier PDF est illisible.");
    }
    const page = await pdf.getPage(1);
    const vp = page.getViewport({ scale: 1 });
    const ops = await page.getOperatorList();
    const O = lib.OPS;

    let ctm = [1, 0, 0, 1, 0, 0];
    const stack = [];
    let cutPt = 0, fillPt2 = 0, hasRasterImage = false, hasText = false;
    const bb = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    let pending = null; // { subpaths: [[x,y,...]], ctm }

    const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    const multiply = (a, b) => [
      a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]
    ];

    const buildPath = (subOps, coords) => {
      const subpaths = [];
      let cur = null, j = 0, cx = 0, cy = 0, sx = 0, sy = 0;
      const push = (x, y) => { const p = apply(ctm, x, y); cur.push(p[0], p[1]); cx = x; cy = y;
        if (p[0] < bb.minX) bb.minX = p[0]; if (p[0] > bb.maxX) bb.maxX = p[0]; if (p[1] < bb.minY) bb.minY = p[1]; if (p[1] > bb.maxY) bb.maxY = p[1]; };
      const bez = (x1, y1, x2, y2, x3, y3) => {
        const x0 = cx, y0 = cy;
        for (let k = 1; k <= 8; k++) {
          const t = k / 8, u = 1 - t;
          push(u*u*u*x0 + 3*u*u*t*x1 + 3*u*t*t*x2 + t*t*t*x3, u*u*u*y0 + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y3);
        }
      };
      for (const op of subOps) {
        if (op === O.moveTo) { cur = []; subpaths.push(cur); sx = coords[j]; sy = coords[j + 1]; push(coords[j], coords[j + 1]); j += 2; }
        else if (op === O.lineTo) { if (!cur) { cur = []; subpaths.push(cur); } push(coords[j], coords[j + 1]); j += 2; }
        else if (op === O.curveTo) { bez(coords[j], coords[j+1], coords[j+2], coords[j+3], coords[j+4], coords[j+5]); j += 6; }
        else if (op === O.curveTo2) { bez(cx, cy, coords[j], coords[j+1], coords[j+2], coords[j+3]); j += 4; }
        else if (op === O.curveTo3) { bez(coords[j], coords[j+1], coords[j+2], coords[j+3], coords[j+2], coords[j+3]); j += 4; }
        else if (op === O.closePath) { if (cur) { push(sx, sy); cur.closed = true; } }
        else if (op === O.rectangle) {
          const x = coords[j], y = coords[j + 1], w = coords[j + 2], h = coords[j + 3]; j += 4;
          cur = []; subpaths.push(cur);
          push(x, y); push(x + w, y); push(x + w, y + h); push(x, y + h); push(x, y); cur.closed = true;
          sx = x; sy = y;
        }
      }
      return subpaths;
    };
    const lengthOf = sp => { let L = 0; for (let i = 2; i < sp.length; i += 2) L += Math.hypot(sp[i] - sp[i - 2], sp[i + 1] - sp[i - 1]); return L; };
    const areaOf = sp => { let A = 0; const n = sp.length; for (let i = 0; i < n; i += 2) { const k = (i + 2) % n; A += sp[i] * sp[k + 1] - sp[k] * sp[i + 1]; } return A / 2; };

    const strokeOps = new Set([O.stroke, O.closeStroke]);
    const fillOps = new Set([O.fill, O.eoFill, O.fillStroke, O.eoFillStroke, O.closeFillStroke, O.closeEOFillStroke]);

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i], args = ops.argsArray[i];
      if (fn === O.save) stack.push(ctm.slice());
      else if (fn === O.restore) { if (stack.length) ctm = stack.pop(); }
      else if (fn === O.transform) ctm = multiply(ctm, args);
      else if (fn === O.paintFormXObjectBegin) { stack.push(ctm.slice()); if (args && args[0]) ctm = multiply(ctm, args[0]); }
      else if (fn === O.paintFormXObjectEnd) { if (stack.length) ctm = stack.pop(); }
      else if (fn === O.constructPath) pending = buildPath(args[0], args[1]);
      else if (strokeOps.has(fn) && pending) { for (const sp of pending) cutPt += lengthOf(sp); pending = null; }
      else if (fillOps.has(fn) && pending) { let A = 0; for (const sp of pending) A += areaOf(sp); fillPt2 += Math.abs(A); pending = null; }
      else if (fn === O.endPath) pending = null;
      else if (fn === O.paintImageXObject || fn === O.paintInlineImageXObject || fn === O.paintImageMaskXObject) hasRasterImage = true;
      else if (fn === O.showText || fn === O.showSpacedText) hasText = true;
    }
    const size = isFinite(bb.minX)
      ? [(bb.maxX - bb.minX) * MM_PER_PT, (bb.maxY - bb.minY) * MM_PER_PT]
      : [vp.width * MM_PER_PT, vp.height * MM_PER_PT];
    if (!cutPt && !fillPt2 && !hasRasterImage && !hasText) throw new Error("Aucun tracé vectoriel trouvé dans ce fichier.");
    return {
      size,
      cutLength: cutPt * MM_PER_PT,
      engraveArea: fillPt2 * MM_PER_PT * MM_PER_PT,
      hasRasterImage,
      hasText
    };
  }

  // ---------------------------------------------------------------- Entrée
  async function readLaserFile(file) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (RASTER_EXT.includes(ext)) return { raster: true };
    if (ext === "svg") return analyzeSVG(await file.text());
    if (ext === "dxf") return analyzeDXF(await file.text());
    if (ext === "pdf") return analyzePDF(await file.arrayBuffer(), false);
    if (ext === "ai") return analyzePDF(await file.arrayBuffer(), true);
    throw new Error("Format non pris en charge. Formats acceptés : SVG, DXF, PDF, AI (et images, sur demande).");
  }

  /* Temps et prix laser */
  function estimateLaser(r, cfg, materialId) {
    const mat = cfg.materials.find(m => m.id === materialId) || cfg.materials[0];
    const cutS = r.cutLength * mat.passes / mat.cutSpeed * cfg.cutOverhead;
    const engraveS = r.engraveArea / (mat.engraveSpeed * cfg.engraveLineInterval) * cfg.engraveOverhead;
    const minutes = Math.max(cfg.minMinutes, (cutS + engraveS) / 60);
    return { cutMin: cutS / 60, engraveMin: engraveS / 60, minutes, unitPrice: minutes * mat.pricePerMin, material: mat };
  }

  window.Vector = { readLaserFile, estimateLaser, RASTER_EXT, analyzeSVG, analyzeDXF };
})();
