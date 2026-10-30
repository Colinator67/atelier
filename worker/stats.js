/* =========================================================================
   Statistiques de visite, sans cookie ni donnée personnelle.
   - POST /api/s : une page vue ou une action envoyée par public/js/stats.js
   - GET /stats  : tableau de bord privé (mot de passe : variable STATS_PASSWORD)
   Le visiteur est compté grâce à une empreinte anonyme recalculée chaque jour
   (adresse IP + navigateur + sel du jour, hachés) : impossible de le suivre d'un
   jour à l'autre ni de retrouver son IP. Données effacées après 13 mois.
   ========================================================================= */

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|discordbot|whatsapp|curl|wget|python|node-fetch|playwright|puppeteer/i;
const SOURCES = [
  [/(^|\.)google\./, "Google"], [/(^|\.)bing\.com$/, "Bing"], [/duckduckgo\.com$/, "DuckDuckGo"], [/(^|\.)qwant\.com$/, "Qwant"],
  [/(^|\.)ecosia\.org$/, "Ecosia"], [/(^|\.)yahoo\./, "Yahoo"], [/instagram\.com$/, "Instagram"], [/(^|\.)facebook\.com$|fb\.me$/, "Facebook"],
  [/discord(app)?\.com$|discord\.gg$/, "Discord"], [/linkedin\.com$|lnkd\.in$/, "LinkedIn"], [/youtube\.com$|youtu\.be$/, "YouTube"],
  [/tiktok\.com$/, "TikTok"], [/pinterest\./, "Pinterest"], [/reddit\.com$/, "Reddit"], [/printables\.com$/, "Printables"],
  [/cults3d\.com$/, "Cults3D"], [/makerworld\.com$/, "MakerWorld"], [/thingiverse\.com$/, "Thingiverse"], [/chatgpt\.com$|openai\.com$/, "ChatGPT"],
  [/perplexity\.ai$/, "Perplexity"], [/claude\.ai$/, "Claude"], [/(^|\.)t\.co$|x\.com$|twitter\.com$/, "X (Twitter)"]
];
const clip = (v, n) => String(v || "").slice(0, n);
const parisDay = (t) => new Date(t + 3600e3).toISOString().slice(0, 10);

function sourceOf(ref, utm, host) {
  if (utm) return "utm:" + clip(utm, 40).toLowerCase();
  if (!ref) return "Direct";
  let h; try { h = new URL(ref).hostname.replace(/^www\./, ""); } catch (e) { return "Direct"; }
  if (h === host || h.endsWith("." + host) || h.endsWith(".workers.dev")) return "Interne";
  for (const [re, name] of SOURCES) if (re.test(h)) return name;
  return h;
}
function deviceOf(ua) {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "Tablette";
  if (/mobi|iphone|android/i.test(ua)) return "Mobile";
  return "Ordinateur";
}
async function visitorHash(day, ip, ua, salt) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${day}|${ip}|${ua}|${salt}`));
  return Array.from(new Uint8Array(d).slice(0, 8), b => b.toString(16).padStart(2, "0")).join("");
}

export async function collect(request, env) {
  if (!env.STATS) return new Response(null, { status: 204 });
  const ua = request.headers.get("user-agent") || "";
  if (BOT.test(ua) || request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1") return new Response(null, { status: 204 });
  let d; try { d = JSON.parse(await request.text()); } catch (e) { return new Response(null, { status: 400 }); }
  const kind = d.k === "event" ? "event" : "view";
  const now = Date.now(), day = parisDay(now), url = new URL(request.url);
  const visitor = await visitorHash(day, request.headers.get("cf-connecting-ip") || "", ua, env.STATS_SALT || "impression_ant");
  await env.STATS.prepare("INSERT INTO events (ts, day, kind, name, label, path, source, country, device, visitor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(now, day, kind, clip(d.n, 40), clip(d.l, 80), clip(d.p, 120), kind === "view" ? sourceOf(d.r, d.u, url.hostname.replace(/^www\./, "")) : null,
      (request.cf && request.cf.country) || "", deviceOf(ua), visitor).run();
  // ménage occasionnel : on ne garde que 13 mois
  if (Math.random() < 0.01) await env.STATS.prepare("DELETE FROM events WHERE ts < ?").bind(now - 400 * 864e5).run();
  return new Response(null, { status: 204 });
}

// ------------------------------------------------------------------ tableau de bord
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const EVENTS = {
  devis_3d_fichier: "Fichier analysé · simulateur 3D", devis_laser_fichier: "Fichier analysé · simulateur laser",
  devis_demande: "Devis demandé depuis un simulateur", demande_etape: "Formulaire « Décrire mon projet » · étape atteinte",
  demande_envoyee: "Formulaire « Décrire mon projet » · envoyé", depot_accueil: "Fichier déposé sur l'accueil",
  machine_fiche: "Fiche machine ouverte", projet_vu: "Projet vu dans le livre", projet_photos: "Photos d'un projet agrandies",
  tampon_test: "Testeur de tampon ouvert", tampon_defi: "Défi de la fourmi", tampon_commande: "Tampon commandé depuis le testeur",
  clic: "Clic sur un bouton", email: "Clic sur l'email"
};
const FLAGS = c => c && c.length === 2 ? String.fromCodePoint(...[...c.toUpperCase()].map(ch => 127397 + ch.charCodeAt(0))) : "";

function unauthorized() {
  return new Response("Accès réservé.", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Statistiques impression_ant", charset="UTF-8"' } });
}
export async function dashboard(request, env) {
  if (!env.STATS_PASSWORD) return new Response("Ajoute la variable secrète STATS_PASSWORD dans Cloudflare pour ouvrir les statistiques.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  const auth = request.headers.get("authorization") || "";
  let ok = false;
  try { ok = auth.startsWith("Basic ") && atob(auth.slice(6)).split(":").slice(1).join(":") === env.STATS_PASSWORD; } catch (e) {}
  if (!ok) return unauthorized();
  if (!env.STATS) return new Response("Base de statistiques non reliée.", { status: 503 });

  const url = new URL(request.url);
  const days = Math.min(400, Math.max(1, parseInt(url.searchParams.get("jours") || "30", 10) || 30));
  const since = parisDay(Date.now() - (days - 1) * 864e5);
  const q = (sql, ...b) => env.STATS.prepare(sql).bind(since, ...b).all().then(r => r.results || []);
  const [tot, perDay, pages, sources, countries, devices, events, steps] = await Promise.all([
    q("SELECT COUNT(*) v, COUNT(DISTINCT day || visitor) u FROM events WHERE kind='view' AND day >= ?"),
    q("SELECT day, COUNT(*) v, COUNT(DISTINCT visitor) u FROM events WHERE kind='view' AND day >= ? GROUP BY day ORDER BY day"),
    q("SELECT path k, COUNT(*) n, COUNT(DISTINCT day || visitor) u FROM events WHERE kind='view' AND day >= ? GROUP BY path ORDER BY n DESC LIMIT 15"),
    q("SELECT source k, COUNT(DISTINCT day || visitor) n FROM events WHERE kind='view' AND source <> 'Interne' AND day >= ? GROUP BY source ORDER BY n DESC LIMIT 15"),
    q("SELECT country k, COUNT(DISTINCT day || visitor) n FROM events WHERE kind='view' AND day >= ? GROUP BY country ORDER BY n DESC LIMIT 10"),
    q("SELECT device k, COUNT(DISTINCT day || visitor) n FROM events WHERE kind='view' AND day >= ? GROUP BY device ORDER BY n DESC"),
    q("SELECT name, label, COUNT(*) n FROM events WHERE kind='event' AND name <> 'demande_etape' AND day >= ? GROUP BY name, label ORDER BY name, n DESC"),
    q("SELECT label k, COUNT(DISTINCT day || visitor) n FROM events WHERE kind='event' AND name='demande_etape' AND day >= ? GROUP BY label")
  ]);
  const t = tot[0] || { v: 0, u: 0 };
  const bars = (rows, total) => rows.length ? `<table>${rows.map(r => `<tr><td>${esc(r.k || "—")}</td><td class="bar"><i style="width:${total ? Math.max(2, r.n / total * 100) : 0}%"></i></td><td class="n">${r.n}</td></tr>`).join("")}</table>` : `<p class="empty">Pas encore de données.</p>`;
  const max = (rows) => rows.reduce((m, r) => Math.max(m, r.n), 0);
  const maxDay = perDay.reduce((m, r) => Math.max(m, r.u), 0);
  const chart = perDay.length ? `<div class="chart">${perDay.map(r => `<div class="col" title="${esc(r.day)} : ${r.u} visiteurs, ${r.v} pages"><i style="height:${maxDay ? r.u / maxDay * 100 : 0}%"></i><span>${esc(r.day.slice(8))}</span></div>`).join("")}</div>` : `<p class="empty">Pas encore de visites.</p>`;
  const STEP_ORDER = ["type", "desc", "files", "contact", "recap"], STEP_LBL = { type: "1 · Type", desc: "2 · Description", files: "3 · Fichiers", contact: "4 · Contact", recap: "5 · Récapitulatif" };
  const funnel = STEP_ORDER.map(k => ({ k: STEP_LBL[k], n: (steps.find(s => s.k === k) || { n: 0 }).n }));
  const sent = events.filter(e => e.name === "demande_envoyee").reduce((s, e) => s + e.n, 0);
  funnel.push({ k: "Envoyé", n: sent });
  const groups = {};
  events.forEach(e => (groups[e.name] = groups[e.name] || []).push({ k: e.label || "—", n: e.n }));
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Statistiques · impression_ant</title><link rel="stylesheet" href="/css/style.css">
<style>
 body{background:#ECEAE7} .st{max-width:1100px;margin:0 auto;padding:32px 16px 64px;display:grid;gap:22px}
 .st h1{font-size:2.2rem} .per{display:flex;gap:6px;flex-wrap:wrap} .per a{padding:8px 14px;border-radius:999px;background:rgba(0,0,0,.06);color:inherit;text-decoration:none;font-weight:600}
 .per a.on{background:#2A2928;color:#fff} .kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
 .kpi div,.card{background:#fff;border-radius:10px;padding:18px} .kpi b{display:block;font:800 2rem/1.1 var(--f-display);font-stretch:112%}
 .kpi span{color:#6E6A66} .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
 .card h2{font-size:1.1rem;margin-bottom:10px} table{width:100%;border-collapse:collapse;font-size:.92rem} td{padding:5px 4px;vertical-align:middle}
 td:first-child{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap} td.bar{width:40%} td.bar i{display:block;height:8px;border-radius:4px;background:#C1A88A}
 td.n{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;width:3em} .empty{color:#8C857C}
 .chart{display:flex;align-items:flex-end;gap:3px;height:160px;padding-top:8px} .col{flex:1;display:grid;grid-template-rows:1fr auto;height:100%;min-width:0}
 .col i{align-self:end;display:block;background:#4C4C4C;border-radius:3px 3px 0 0;min-height:1px} .col span{font-size:.65rem;color:#8C857C;text-align:center}
 .note{color:#6E6A66;font-size:.88rem}
</style></head><body><main class="st">
<h1>Statistiques du site</h1>
<nav class="per">${[7, 30, 90, 365].map(n => `<a href="?jours=${n}" class="${n === days ? "on" : ""}">${n === 365 ? "12 mois" : n + " jours"}</a>`).join("")}</nav>
<section class="kpi"><div><b>${t.u}</b><span>visiteurs</span></div><div><b>${t.v}</b><span>pages vues</span></div>
<div><b>${funnel[0].n}</b><span>ont ouvert « Décrire mon projet »</span></div><div><b>${sent + (groups.devis_demande || []).reduce((s, e) => s + e.n, 0)}</b><span>demandes envoyées</span></div></section>
<section class="card"><h2>Visiteurs par jour</h2>${chart}</section>
<section class="grid">
 <div class="card"><h2>D'où viennent les visiteurs</h2>${bars(sources, max(sources))}<p class="note">« Direct » : adresse tapée, favori, ou lien sans origine connue. Pour suivre une campagne, ajoute ?utm_source=nom à tes liens.</p></div>
 <div class="card"><h2>Pages les plus vues</h2>${bars(pages.map(p => ({ k: p.k, n: p.n })), max(pages))}</div>
 <div class="card"><h2>Parcours « Décrire mon projet »</h2>${bars(funnel, funnel[0].n || max(funnel))}<p class="note">Où les visiteurs s'arrêtent dans le formulaire en étapes.</p></div>
 <div class="card"><h2>Pays</h2>${bars(countries.map(c => ({ k: (FLAGS(c.k) + " " + (c.k || "?")).trim(), n: c.n })), max(countries))}</div>
 <div class="card"><h2>Appareils</h2>${bars(devices, max(devices))}</div>
</section>
<section class="grid">${Object.entries(groups).filter(([n]) => n !== "demande_envoyee" || true).map(([n, rows]) => `<div class="card"><h2>${esc(EVENTS[n] || n)}</h2>${bars(rows.slice(0, 12), max(rows))}</div>`).join("") || `<div class="card"><h2>Actions</h2><p class="empty">Pas encore d'actions enregistrées.</p></div>`}</section>
<p class="note">Mesure d'audience sans cookie : aucune adresse IP n'est conservée, les visiteurs ne sont pas suivis d'un jour à l'autre, les robots et les navigateurs qui refusent le suivi sont ignorés. Données conservées 13 mois.</p>
</main></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}
