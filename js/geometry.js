/* =========================================================================
   Lecture des fichiers 3D (STL, 3MF, STEP) et calcul des métriques.
   Tout se passe dans le navigateur du client : aucun fichier n'est envoyé
   tant qu'il ne clique pas sur « Demander ce devis ».
   Sortie commune : Float32Array de triangles (9 nombres par triangle, en mm).
   ========================================================================= */
(function () {
  "use strict";

  const OCCT_VERSION = "0.0.23";
  const OCCT_BASE = `https://cdn.jsdelivr.net/npm/occt-import-js@${OCCT_VERSION}/dist/`;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Impossible de charger " + src));
      document.head.appendChild(s);
    });
  }

  // ---------------------------------------------------------------- STL
  function parseSTL(buffer) {
    const dv = new DataView(buffer);
    if (buffer.byteLength >= 84) {
      const n = dv.getUint32(80, true);
      if (84 + n * 50 === buffer.byteLength) return parseBinarySTL(dv, n);
    }
    const head = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(512, buffer.byteLength)));
    if (/^\s*solid/i.test(head) && /facet|vertex/i.test(new TextDecoder().decode(buffer.slice(0, Math.min(buffer.byteLength, 4096))))) {
      return parseAsciiSTL(new TextDecoder().decode(buffer));
    }
    if (buffer.byteLength >= 84) return parseBinarySTL(dv, Math.floor((buffer.byteLength - 84) / 50));
    throw new Error("Fichier STL illisible.");
  }
  function parseBinarySTL(dv, n) {
    const out = new Float32Array(n * 9);
    let o = 84;
    for (let i = 0; i < n; i++) {
      o += 12; // normale ignorée
      for (let k = 0; k < 9; k++) { out[i * 9 + k] = dv.getFloat32(o, true); o += 4; }
      o += 2;
    }
    return out;
  }
  function parseAsciiSTL(text) {
    const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
    const v = [];
    let m;
    while ((m = re.exec(text))) v.push(+m[1], +m[2], +m[3]);
    if (v.length < 9) throw new Error("Fichier STL vide ou illisible.");
    return new Float32Array(v.slice(0, v.length - (v.length % 9)));
  }

  // ---------------------------------------------------------------- 3MF
  async function parse3MF(buffer) {
    if (!window.JSZip) throw new Error("Le module de lecture 3MF n'a pas pu être chargé.");
    const zip = await JSZip.loadAsync(buffer);
    const modelPaths = Object.keys(zip.files).filter(p => /\.model$/i.test(p));
    if (!modelPaths.length) throw new Error("Aucun modèle trouvé dans ce fichier 3MF.");

    const objects = new Map(); // "path#id" -> { tris, components: [{path,id,m}] }
    const docs = {};
    const parser = new DOMParser();
    for (const p of modelPaths) {
      const xml = await zip.file(p).async("string");
      docs[p] = parser.parseFromString(xml, "application/xml");
      const norm = "/" + p.replace(/^\//, "");
      for (const obj of Array.from(docs[p].getElementsByTagNameNS("*", "object"))) {
        const id = obj.getAttribute("id");
        const entry = { tris: null, components: [] };
        const mesh = obj.getElementsByTagNameNS("*", "mesh")[0];
        if (mesh) {
          const vs = mesh.getElementsByTagNameNS("*", "vertex");
          const verts = new Float64Array(vs.length * 3);
          for (let i = 0; i < vs.length; i++) {
            verts[i * 3] = +vs[i].getAttribute("x");
            verts[i * 3 + 1] = +vs[i].getAttribute("y");
            verts[i * 3 + 2] = +vs[i].getAttribute("z");
          }
          const ts = mesh.getElementsByTagNameNS("*", "triangle");
          const tris = new Float32Array(ts.length * 9);
          for (let i = 0; i < ts.length; i++) {
            const a = +ts[i].getAttribute("v1"), b = +ts[i].getAttribute("v2"), c = +ts[i].getAttribute("v3");
            tris.set([verts[a*3], verts[a*3+1], verts[a*3+2], verts[b*3], verts[b*3+1], verts[b*3+2], verts[c*3], verts[c*3+1], verts[c*3+2]], i * 9);
          }
          entry.tris = tris;
        }
        for (const c of Array.from(obj.getElementsByTagNameNS("*", "component"))) {
          const path = c.getAttribute("p:path") || c.getAttributeNS("http://schemas.microsoft.com/3dmanufacturing/production/2015/06", "path") || norm;
          entry.components.push({ path: "/" + path.replace(/^\//, ""), id: c.getAttribute("objectid"), m: parseMatrix(c.getAttribute("transform")) });
        }
        objects.set(norm + "#" + id, entry);
      }
    }

    // Fichier racine = celui qui contient <build>
    const rootPath = modelPaths.find(p => docs[p].getElementsByTagNameNS("*", "build").length) || modelPaths[0];
    const rootNorm = "/" + rootPath.replace(/^\//, "");
    const parts = [];
    const collect = (key, m, depth) => {
      const o = objects.get(key);
      if (!o || depth > 10) return;
      if (o.tris) parts.push(transformTris(o.tris, m));
      for (const c of o.components) collect(c.path + "#" + c.id, mul(m, c.m), depth + 1);
    };
    const items = docs[rootPath].getElementsByTagNameNS("*", "item");
    for (const it of Array.from(items)) {
      const path = it.getAttribute("p:path") ? "/" + it.getAttribute("p:path").replace(/^\//, "") : rootNorm;
      collect(path + "#" + it.getAttribute("objectid"), parseMatrix(it.getAttribute("transform")), 0);
    }
    if (!parts.length) for (const [, o] of objects) if (o.tris) parts.push(o.tris);
    const total = parts.reduce((s, a) => s + a.length, 0);
    if (!total) throw new Error("Ce fichier 3MF ne contient aucun maillage.");
    const out = new Float32Array(total);
    let off = 0;
    for (const a of parts) { out.set(a, off); off += a.length; }
    return out;
  }
  // matrice 3MF : 12 valeurs (m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32)
  function parseMatrix(s) {
    if (!s) return null;
    const v = s.trim().split(/\s+/).map(Number);
    return v.length === 12 ? v : null;
  }
  function mul(a, b) { // applique b puis a
    if (!a) return b; if (!b) return a;
    const r = new Array(12);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      r[i * 3 + j] = b[i * 3] * a[j] + b[i * 3 + 1] * a[3 + j] + b[i * 3 + 2] * a[6 + j];
    for (let j = 0; j < 3; j++) r[9 + j] = b[9] * a[j] + b[10] * a[3 + j] + b[11] * a[6 + j] + a[9 + j];
    return r;
  }
  function transformTris(t, m) {
    if (!m) return t;
    const o = new Float32Array(t.length);
    for (let i = 0; i < t.length; i += 3) {
      const x = t[i], y = t[i + 1], z = t[i + 2];
      o[i]     = x * m[0] + y * m[3] + z * m[6] + m[9];
      o[i + 1] = x * m[1] + y * m[4] + z * m[7] + m[10];
      o[i + 2] = x * m[2] + y * m[5] + z * m[8] + m[11];
    }
    return o;
  }

  // ---------------------------------------------------------------- STEP
  let occtPromise = null;
  async function parseSTEP(buffer) {
    if (!occtPromise) {
      occtPromise = loadScript(OCCT_BASE + "occt-import-js.js")
        .then(() => window.occtimportjs({ locateFile: name => OCCT_BASE + name }))
        .catch(e => { occtPromise = null; throw e; });
    }
    let occt;
    try { occt = await occtPromise; }
    catch (e) { throw new Error("Le lecteur STEP n'a pas pu se charger. Envoyez plutôt un STL ou un 3MF, ou faites votre demande directement."); }
    const res = occt.ReadStepFile(new Uint8Array(buffer), { linearUnit: "millimeter", linearDeflectionType: "bounding_box_ratio", linearDeflection: 0.001 });
    if (!res || !res.success || !res.meshes.length) throw new Error("Ce fichier STEP n'a pas pu être lu.");
    const parts = [];
    for (const mesh of res.meshes) {
      const p = mesh.attributes.position.array, idx = mesh.index.array;
      const t = new Float32Array(idx.length * 3);
      for (let i = 0; i < idx.length; i++) { t[i * 3] = p[idx[i] * 3]; t[i * 3 + 1] = p[idx[i] * 3 + 1]; t[i * 3 + 2] = p[idx[i] * 3 + 2]; }
      parts.push(t);
    }
    const out = new Float32Array(parts.reduce((s, a) => s + a.length, 0));
    let off = 0; for (const a of parts) { out.set(a, off); off += a.length; }
    return out;
  }

  // ---------------------------------------------------------------- Métriques
  /* volume (mm³), surface (mm²), boîte englobante, surface en surplomb
     (projetée) × hauteur → volume de supports approximatif. */
  function measure(tris, supportAngleDeg) {
    const n = tris.length / 9;
    let vol = 0, area = 0;
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < tris.length; i += 3) {
      const x = tris[i], y = tris[i + 1], z = tris[i + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const cosLim = Math.cos((90 - supportAngleDeg) * Math.PI / 180); // normale vers le bas plus raide que l'angle
    let supportVol = 0;
    for (let t = 0; t < n; t++) {
      const o = t * 9;
      const ax = tris[o], ay = tris[o + 1], az = tris[o + 2];
      const bx = tris[o + 3], by = tris[o + 4], bz = tris[o + 5];
      const cx = tris[o + 6], cy = tris[o + 7], cz = tris[o + 8];
      vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz);
      area += len / 2;
      if (len > 0 && nz / len < -cosLim) {
        const h = (az + bz + cz) / 3 - minZ;
        if (h > 0.5) supportVol += (-nz / 2) * h; // aire projetée × hauteur
      }
    }
    const flipped = vol < 0;
    return {
      triangles: n,
      volume: Math.abs(vol),
      area,
      size: [maxX - minX, maxY - minY, maxZ - minZ],
      supportVolume: flipped ? 0 : supportVol,
      closed: Math.abs(vol) > 1e-6
    };
  }

  async function readMeshFile(file) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const buffer = await file.arrayBuffer();
    let tris;
    if (ext === "stl") tris = parseSTL(buffer);
    else if (ext === "3mf") tris = await parse3MF(buffer);
    else if (ext === "step" || ext === "stp") tris = await parseSTEP(buffer);
    else throw new Error("Format non pris en charge. Formats acceptés : STL, 3MF, STEP.");
    if (!tris.length) throw new Error("Le fichier ne contient aucune géométrie.");
    return tris;
  }

  /* Estimation poids / temps / prix pour une pièce (quantité 1). */
  function estimatePrint(m, cfg, materialId, infill, withSupports) {
    const mat = cfg.materials.find(x => x.id === materialId) || cfg.materials[0];
    const e = cfg.estimate;
    const shell = Math.min(m.volume, m.area * e.wallThickness);
    const inside = Math.max(0, m.volume - shell);
    const support = withSupports ? m.supportVolume * e.supportFill : 0;
    const extruded = shell + inside * infill + support;             // mm³
    const grams = extruded / 1000 * mat.density;
    const layers = Math.ceil(m.size[2] / e.layerHeight);
    const seconds = extruded / mat.flow + layers * e.layerOverheadS + e.setupMinutes * 60;
    const hours = seconds / 3600;
    const materialCost = grams / 1000 * cfg.pricePerKg;
    const machineCost = hours * cfg.pricePerHour;
    return { grams, hours, materialCost, machineCost, unitPrice: materialCost + machineCost, supportGrams: support / 1000 * mat.density };
  }

  window.Geometry = { readMeshFile, measure, estimatePrint, loadScript };
})();
