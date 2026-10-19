/* =========================================================================
   Worker Cloudflare — sert le site (dossier public/) et reçoit les demandes
   de devis sur /api/demande (POST, multipart/form-data).

   Variables (Cloudflare > Workers & Pages > atelier > Settings > Variables and Secrets) :
     DISCORD_WEBHOOK_URL  webhook d'un salon Discord privé (recommandé)
     RESEND_API_KEY       clé API Resend pour recevoir aussi un email (facultatif)
     NOTIFY_EMAIL         ton adresse, destinataire des emails
     FROM_EMAIL           expéditeur (par défaut : "Devis <onboarding@resend.dev>")
     TURNSTILE_SECRET     clé secrète Turnstile si l'anti-spam est activé (facultatif)
   ========================================================================= */

const MAX_FILE = 8 * 1024 * 1024; // limite des pièces jointes Discord sans boost
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

async function handleRequest(request, env) {
  let form;
  try { form = await request.formData(); }
  catch { return json({ ok: false, error: "Demande illisible." }, 400); }

  const email = String(form.get("email") || "").trim();
  const message = String(form.get("message") || "").trim().slice(0, 3000);
  const summary = String(form.get("summary") || "").trim().slice(0, 3000);
  const kind = String(form.get("kind") || "Demande").slice(0, 60);
  const file = form.get("file");

  if (form.get("website")) return json({ ok: true }); // robot
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200)
    return json({ ok: false, error: "Adresse email invalide." }, 400);

  // Anti-spam Turnstile
  if (env.TURNSTILE_SECRET) {
    const token = form.get("cf-turnstile-response");
    const v = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: String(token || ""), remoteip: request.headers.get("CF-Connecting-IP") || "" })
    }).then(r => r.json()).catch(() => ({ success: false }));
    if (!v.success) return json({ ok: false, error: "Vérification anti-robot échouée. Rechargez la page et réessayez." }, 400);
  }

  const hasFile = file && typeof file === "object" && file.size > 0;
  const fileTooBig = hasFile && file.size > MAX_FILE;
  const fileNote = !hasFile ? "Aucun fichier" : fileTooBig
    ? `${file.name} (${(file.size / 1048576).toFixed(1)} Mo — trop lourd, demander au client de l'envoyer par email)`
    : `${file.name} (${(file.size / 1024).toFixed(0)} Ko, en pièce jointe)`;

  const results = [];

  // ---------------------------------------------------------------- Discord
  if (env.DISCORD_WEBHOOK_URL) {
    const payload = {
      username: "Devis du site",
      embeds: [{
        title: `Nouvelle demande · ${kind}`,
        color: kind.startsWith("Impression") ? 0xC1A88A : 0x4C4C4C,
        fields: [
          { name: "Client", value: email },
          { name: "Récapitulatif", value: "```\n" + summary.slice(0, 1000) + "\n```" },
          { name: "Précisions", value: message ? message.slice(0, 1000) : "—" },
          { name: "Fichier", value: fileNote }
        ],
        timestamp: new Date().toISOString()
      }]
    };
    const body = new FormData();
    body.append("payload_json", JSON.stringify(payload));
    if (hasFile && !fileTooBig) body.append("files[0]", file, file.name);
    const r = await fetch(env.DISCORD_WEBHOOK_URL, { method: "POST", body }).catch(() => null);
    results.push(!!(r && r.ok));
  }

  // ---------------------------------------------------------------- Email (Resend)
  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
    const attachments = [];
    if (hasFile && !fileTooBig) attachments.push({ filename: file.name, content: toBase64(new Uint8Array(await file.arrayBuffer())) });
    const html = `<h2>Nouvelle demande · ${escapeHtml(kind)}</h2>
      <p><strong>Client :</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
      <pre style="background:#f2f0ed;padding:12px;border-radius:6px">${escapeHtml(summary)}</pre>
      <p><strong>Précisions :</strong><br>${escapeHtml(message || "—").replace(/\n/g, "<br>")}</p>
      <p><strong>Fichier :</strong> ${escapeHtml(fileNote)}</p>
      <p style="color:#777">Répondez directement à cet email pour écrire au client.</p>`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.FROM_EMAIL || "Devis <onboarding@resend.dev>",
        to: [env.NOTIFY_EMAIL],
        reply_to: email,
        subject: `Demande de devis · ${kind} · ${email}`,
        html,
        attachments
      })
    }).catch(() => null);
    results.push(!!(r && r.ok));
  }

  if (!results.length) return json({ ok: false, error: "L'envoi n'est pas encore configuré sur ce site." }, 503);
  if (!results.some(Boolean)) return json({ ok: false }, 502);
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/demande") {
      if (request.method === "GET") {
        // diagnostic : indique seulement si chaque canal est configuré (aucune valeur secrète)
        return json({ ok: true, discord: !!env.DISCORD_WEBHOOK_URL, email: !!(env.RESEND_API_KEY && env.NOTIFY_EMAIL), vars: Object.keys(env).filter(k => k !== "ASSETS") });
      }
      if (request.method !== "POST") return json({ ok: false, error: "Méthode non autorisée." }, 405);
      return handleRequest(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};

function toBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
