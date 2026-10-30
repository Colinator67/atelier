/* Accueil : un fichier déposé ouvre directement le bon simulateur. */
(function () {
  "use strict";
  const { $, IDB, showMsg } = window.UI;
  const drop = $("#quickDrop"), input = $("#quickFile");
  if (!drop) return;
  const PRINT = ["stl", "3mf", "step", "stp"], LASER = ["svg", "dxf", "pdf", "ai"];

  async function route(f) {
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    const page = PRINT.includes(ext) ? "impression-3d.html" : LASER.includes(ext) ? "decoupe-laser.html" : null;
    if (!page) { showMsg($("#quickMsg"), `Le format .${ext} n'est pas lu par les simulateurs. Décrivez votre projet et joignez le fichier : je vous fais un devis.`, "error"); return; }
    drop.classList.add("is-loading");
    try { await IDB.set("pending-file", f); } catch (e) { /* le client redéposera le fichier */ }
    location.href = page + "#devis";
  }
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("is-over"); }));
  drop.addEventListener("drop", e => { const f = e.dataTransfer.files[0]; if (f) route(f); });
  input.addEventListener("change", () => { const f = input.files[0]; if (f) route(f); });
})();
