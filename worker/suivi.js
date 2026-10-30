/* =========================================================================
   Suivi de commande.
   - Chaque demande envoyée par le site est enregistrée (table « demandes » de la base D1 STATS).
   - Le client suit l'avancement sur /suivi (ou /en/track) avec son numéro IA-…, via GET /api/suivi?ref=…
   - Colin change l'étape et écrit un message au client depuis /stats (section « Demandes »).
   ========================================================================= */

// étape : [clé, libellé FR, libellé EN]
export const STEPS = [
  ["recue", "Demande reçue", "Request received"],
  ["devis", "Devis envoyé", "Quote sent"],
  ["conception", "En conception", "Being designed"],
  ["fabrication", "En fabrication", "In production"],
  ["prete", "Expédiée ou prête au retrait", "Shipped or ready for pickup"],
  ["terminee", "Terminée", "Completed"]
];
export const CANCEL = ["annulee", "Annulée", "Cancelled"];
const ALL = [...STEPS, CANCEL].map(s => s[0]);
const REF_RE = /^IA-\d{6}-[2-9A-HJ-NP-Z]{4}$/;
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Numéro de demande lisible : IA-AAMMJJ-XXXX (sans 0/O/1/I pour éviter les confusions)
export function requestId() {
  const d = new Date(Date.now() + 3600e3); // heure de Paris (approx.)
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, "");
  const A = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const rnd = crypto.getRandomValues(new Uint8Array(4));
  return `IA-${ymd}-${Array.from(rnd, b => A[b % A.length]).join("")}`;
}

let ready = false;
async function ensure(env) {
  if (ready || !env.STATS) return !!env.STATS;
  await env.STATS.prepare(`CREATE TABLE IF NOT EXISTS demandes (
    id TEXT PRIMARY KEY, created INTEGER NOT NULL, kind TEXT, contact TEXT, lang TEXT,
    status TEXT NOT NULL DEFAULT 'recue', note TEXT, history TEXT, updated INTEGER)`).run();
  ready = true;
  return true;
}

// appelée par /api/demande après l'envoi : ne doit jamais faire échouer la demande
export async function record(env, { id, kind, contact, lang }) {
  try {
    if (!(await ensure(env))) return;
    const now = Date.now();
    await env.STATS.prepare("INSERT OR IGNORE INTO demandes (id, created, kind, contact, lang, status, history, updated) VALUES (?, ?, ?, ?, ?, 'recue', ?, ?)")
      .bind(id, now, kind, contact || "", lang || "fr", JSON.stringify([["recue", now]]), now).run();
  } catch (e) { /* le suivi est un plus : la demande est déjà partie */ }
}

// GET /api/suivi?ref=IA-…  (public : uniquement l'avancement, aucune donnée personnelle)
export async function lookup(request, env) {
  const url = new URL(request.url);
  const ref = String(url.searchParams.get("ref") || "").trim().toUpperCase().replace(/\s+/g, "").replace(/^IA(\d)/, "IA-$1");
  if (!REF_RE.test(ref)) return json({ ok: false, error: "format" }, 400);
  if (!(await ensure(env))) return json({ ok: false, error: "indisponible" }, 503);
  const r = await env.STATS.prepare("SELECT id, created, kind, status, note, history, updated FROM demandes WHERE id = ?").bind(ref).first();
  if (!r) return json({ ok: false, error: "introuvable" }, 404);
  let history = [];
  try { history = JSON.parse(r.history || "[]"); } catch (e) {}
  return json({ ok: true, id: r.id, created: r.created, updated: r.updated, kind: String(r.kind || "").replace(/ · client anglophone$/, ""),
    status: r.status, note: r.note || "", history, steps: STEPS, cancel: CANCEL });
}

// POST /stats (formulaires de la section « Demandes ») — l'authentification est vérifiée par dashboard()
export async function adminPost(request, env) {
  await ensure(env);
  const f = await request.formData();
  const action = f.get("action");
  const now = Date.now();
  if (action === "create") {
    const id = requestId();
    const kind = String(f.get("kind") || "Demande").slice(0, 80);
    await env.STATS.prepare("INSERT INTO demandes (id, created, kind, contact, lang, status, history, updated) VALUES (?, ?, ?, ?, 'fr', 'recue', ?, ?)")
      .bind(id, now, kind, String(f.get("contact") || "").slice(0, 120), JSON.stringify([["recue", now]]), now).run();
    return Response.redirect(new URL(`/stats?ok=${id}#demandes`, request.url).toString(), 303);
  }
  const id = String(f.get("id") || "");
  const r = await env.STATS.prepare("SELECT status, history FROM demandes WHERE id = ?").bind(id).first();
  if (!r) return Response.redirect(new URL("/stats#demandes", request.url).toString(), 303);
  if (action === "delete") {
    await env.STATS.prepare("DELETE FROM demandes WHERE id = ?").bind(id).run();
    return Response.redirect(new URL("/stats#demandes", request.url).toString(), 303);
  }
  const status = ALL.includes(f.get("status")) ? f.get("status") : r.status;
  const note = String(f.get("note") || "").slice(0, 600);
  let history = [];
  try { history = JSON.parse(r.history || "[]"); } catch (e) {}
  if (status !== r.status) history.push([status, now]);
  await env.STATS.prepare("UPDATE demandes SET status = ?, note = ?, history = ?, updated = ? WHERE id = ?")
    .bind(status, note, JSON.stringify(history), now, id).run();
  return Response.redirect(new URL(`/stats?ok=${id}#demandes`, request.url).toString(), 303);
}

// section HTML ajoutée au tableau de bord /stats
export async function adminSection(env, okId) {
  if (!(await ensure(env))) return "";
  const rows = (await env.STATS.prepare(
    "SELECT id, created, kind, contact, lang, status, note, updated FROM demandes ORDER BY CASE WHEN status IN ('terminee','annulee') THEN 1 ELSE 0 END, created DESC LIMIT 80"
  ).all()).results || [];
  const day = t => new Date(t).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "2-digit" });
  const opts = cur => [...STEPS, CANCEL].map(([k, fr]) => `<option value="${k}"${k === cur ? " selected" : ""}>${fr}</option>`).join("");
  const list = rows.length ? rows.map(r => `
    <form method="post" action="/stats" class="dm${r.id === okId ? " dm-ok" : ""}${["terminee", "annulee"].includes(r.status) ? " dm-done" : ""}">
      <input type="hidden" name="id" value="${esc(r.id)}">
      <div class="dm-id"><a href="${r.lang === "en" ? "/en/track" : "/suivi"}?ref=${esc(r.id)}" target="_blank" rel="noopener">${esc(r.id)}</a><span>${day(r.created)} · ${esc(r.kind)}</span><span>${esc(r.contact)}</span></div>
      <select name="status" aria-label="Étape">${opts(r.status)}</select>
      <input name="note" value="${esc(r.note)}" placeholder="Message visible par le client (facultatif)" maxlength="600">
      <button name="action" value="update">Enregistrer</button>
    </form>`).join("") : `<p class="empty">Aucune demande pour l'instant. Les demandes envoyées depuis le site apparaissent ici automatiquement.</p>`;
  return `<section class="card" id="demandes"><h2>Demandes et suivi de commande</h2>
  <p class="note">Le client voit l'étape et ton message sur <a href="/suivi" target="_blank" rel="noopener">impressionant.fr/suivi</a> avec son numéro. Les demandes terminées ou annulées passent en bas.</p>
  ${okId ? `<p class="dm-flash">Enregistré : ${esc(okId)}</p>` : ""}
  <div class="dms">${list}</div>
  <details class="dm-new"><summary>Ajouter une demande reçue ailleurs (Instagram, téléphone…)</summary>
    <form method="post" action="/stats" class="dm"><input name="kind" placeholder="Projet, ex. Tampon Ø 10 cm" required maxlength="80"><input name="contact" placeholder="Client / contact" maxlength="120">
    <button name="action" value="create">Créer et obtenir un numéro</button></form></details>
</section>`;
}

export const ADMIN_CSS = `
 .dms{display:grid;gap:8px} .dm{display:grid;grid-template-columns:minmax(220px,1.2fr) minmax(170px,.8fr) minmax(200px,1.4fr) auto;gap:8px;align-items:center;padding:10px;border-radius:8px;background:#F4F2EF}
 .dm-done{opacity:.6} .dm-ok{box-shadow:0 0 0 2px #2D6A3E} .dm-id{display:grid;gap:1px;min-width:0} .dm-id a{font-weight:700;color:inherit}
 .dm-id span{font-size:.82rem;color:#6E6A66;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .dm select,.dm input{font:inherit;padding:8px 10px;border:1px solid #D9D3CB;border-radius:8px;background:#fff;min-width:0}
 .dm button{font:600 .92rem var(--f-body);padding:9px 14px;border:0;border-radius:999px;background:#2A2928;color:#fff;cursor:pointer}
 .dm-flash{color:#2D6A3E;font-weight:600} .dm-new{margin-top:12px} .dm-new summary{cursor:pointer;font-weight:600;margin-bottom:8px}
 .dm-new .dm{grid-template-columns:1fr 1fr auto}
 @media (max-width:760px){.dm,.dm-new .dm{grid-template-columns:1fr}}`;
