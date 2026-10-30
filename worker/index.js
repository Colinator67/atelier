import { collect, dashboard } from "./stats.js";

/* =========================================================================
   Worker Cloudflare — sert le site (dossier public/) et reçoit les demandes
   de devis sur /api/demande (POST, multipart/form-data).

   Variables (Cloudflare > Workers & Pages > atelier > Settings > Variables and Secrets) :
     DISCORD_WEBHOOK_URL  webhook d'un salon Discord privé (recommandé)
     RESEND_API_KEY       clé API Resend pour recevoir aussi un email (facultatif)
     NOTIFY_EMAIL         ton adresse, destinataire des emails
     FROM_EMAIL           expéditeur (par défaut : "Devis <onboarding@resend.dev>")
     CONFIRM_FROM         expéditeur de l'email de confirmation envoyé au client, sur ton domaine
                          vérifié dans Resend, ex. "impression_ant <contact@impressionant.fr>".
                          Sans cette variable, aucun email n'est envoyé au client.
     REPLY_DELAY          délai de réponse annoncé dans la confirmation (défaut : "48 h")
     TURNSTILE_SECRET     clé secrète Turnstile si l'anti-spam est activé (facultatif)
     STATS_PASSWORD       mot de passe de la page /stats (statistiques de visite)
     STATS_SALT           texte au hasard pour anonymiser les visiteurs (facultatif)
   ========================================================================= */

const MAX_FILE = 8 * 1024 * 1024; // limite des pièces jointes Discord sans boost
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

async function handleRequest(request, env) {
  let form;
  try { form = await request.formData(); }
  catch { return json({ ok: false, error: "Demande illisible." }, 400); }

  const email = String(form.get("email") || "").trim();
  const phone = String(form.get("phone") || "").replace(/[\s.\-()]/g, "").slice(0, 20);
  const name = String(form.get("name") || "").trim().slice(0, 80);
  const contact = String(form.get("contact") || "email").split(",").map(c => c.trim()).filter(c => ["email", "phone", "sms", "whatsapp"].includes(c));
  const message = String(form.get("message") || "").trim().slice(0, 3000);
  const summary = String(form.get("summary") || "").trim().slice(0, 3000);
  const en = form.get("lang") === "en"; // demande venue de la version anglaise (en/request)
  const kind = String(form.get("kind") || "Demande").slice(0, 60) + (en ? " · client anglophone" : "");
  const files = form.getAll("file").filter(f => f && typeof f === "object" && f.size > 0).slice(0, 5);

  if (form.get("website")) return json({ ok: true }); // robot
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 200;
  const phoneOk = /^(\+\d{8,15}|0\d{9})$/.test(phone);
  if (email && !emailOk) return json({ ok: false, error: en ? "Invalid email address." : "Adresse email invalide." }, 400);
  if (phone && !phoneOk) return json({ ok: false, error: en ? "Invalid phone number." : "Numéro de téléphone invalide." }, 400);
  if (!emailOk && !phoneOk) return json({ ok: false, error: en ? "Please enter an email or a phone number so I can reply." : "Indiquez un email ou un numéro pour que je puisse vous répondre." }, 400);

  const id = requestId();
  const LABEL = { email: "Email", phone: "Appel", sms: "SMS", whatsapp: "WhatsApp" };
  const contactTxt = [
    name ? `Prénom : ${name}` : "",
    emailOk ? `Email : ${email}` : "",
    phoneOk ? `Tél. : ${phone}` + (phone ? ` · WhatsApp : https://wa.me/${phone.replace(/^0/, "33").replace(/^\+/, "")}` : "") : "",
    `Préfère : ${(contact.length ? contact : ["email"]).map(c => LABEL[c]).join(", ")}`
  ].filter(Boolean).join("\n");

  // Anti-spam Turnstile
  if (env.TURNSTILE_SECRET) {
    const token = form.get("cf-turnstile-response");
    const v = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: String(token || ""), remoteip: request.headers.get("CF-Connecting-IP") || "" })
    }).then(r => r.json()).catch(() => ({ success: false }));
    if (!v.success) return json({ ok: false, error: en ? "Anti-robot check failed. Reload the page and try again." : "Vérification anti-robot échouée. Rechargez la page et réessayez." }, 400);
  }

  // on joint les fichiers tant que le total reste sous la limite
  let budget = MAX_FILE;
  const attached = [], skipped = [];
  for (const f of files) { if (f.size <= budget) { attached.push(f); budget -= f.size; } else skipped.push(f); }
  const fileNote = !files.length ? "Aucun fichier" : [
    ...attached.map(f => `${f.name} (${(f.size / 1024).toFixed(0)} Ko, en pièce jointe)`),
    ...skipped.map(f => `${f.name} (${(f.size / 1048576).toFixed(1)} Mo — trop lourd, demander au client de l'envoyer par email)`)
  ].join("\n");

  const results = [];

  // ---------------------------------------------------------------- Discord
  if (env.DISCORD_WEBHOOK_URL) {
    const payload = {
      username: "Devis du site",
      embeds: [{
        title: `Demande ${id} · ${kind}`,
        color: kind.startsWith("Impression") ? 0xC1A88A : 0x4C4C4C,
        fields: [
          { name: "Client", value: contactTxt.slice(0, 1000) },
          { name: "Récapitulatif", value: "```\n" + summary.slice(0, 1000) + "\n```" },
          { name: "Précisions", value: message ? message.slice(0, 1000) : "—" },
          { name: "Fichier", value: fileNote }
        ],
        timestamp: new Date().toISOString()
      }]
    };
    const body = new FormData();
    body.append("payload_json", JSON.stringify(payload));
    attached.forEach((f, i) => body.append(`files[${i}]`, f, f.name));
    const r = await fetch(env.DISCORD_WEBHOOK_URL, { method: "POST", body }).catch(() => null);
    results.push(!!(r && r.ok));
  }

  // ---------------------------------------------------------------- Email (Resend)
  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
    const attachments = [];
    for (const f of attached) attachments.push({ filename: f.name, content: toBase64(new Uint8Array(await f.arrayBuffer())) });
    const html = `<h2>Demande ${id} · ${escapeHtml(kind)}</h2>
      <p><strong>Client :</strong><br>${escapeHtml(contactTxt).replace(/\n/g, "<br>")}</p>
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
        ...(emailOk ? { reply_to: email } : {}),
        subject: `Demande ${id} · ${kind} · ${emailOk ? email : phone}`,
        html,
        attachments
      })
    }).catch(() => null);
    results.push(!!(r && r.ok));
  }

  if (!results.length) return json({ ok: false, error: "L'envoi n'est pas encore configuré sur ce site." }, 503);
  if (!results.some(Boolean)) return json({ ok: false }, 502);

  // ---------------------------------------------------------------- Confirmation au client
  let confirmation = false;
  if (emailOk && env.RESEND_API_KEY && env.CONFIRM_FROM) {
    const delay = env.REPLY_DELAY || "48 h";
    const hello = name ? `${en ? "Hello" : "Bonjour"} ${escapeHtml(name)},` : (en ? "Hello," : "Bonjour,");
    const chtml = en ? `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;line-height:1.55;color:#2A2928;max-width:560px">
      <p>${hello}</p>
      <p>Thanks, I've received your request <strong>${id}</strong>. I'll read it and reply within 48 hours.</p>
      <p style="margin:20px 0 6px;font-weight:600">Your request</p>
      <pre style="white-space:pre-wrap;font-family:inherit;background:#F4F2EF;padding:14px;border-radius:6px;margin:0">${escapeHtml(summary)}${message ? "\n\n" + escapeHtml(message) : ""}</pre>
      <p style="margin-top:20px">Next: I send you a preview and a price, we fine-tune it together, then you receive your file. Nothing to pay for now.</p>
      <p>To add anything to your request, just reply to this email.</p>
      <p>Colin<br><span style="color:#6E6A66">impression_ant · custom laser files and 3D models · Strasbourg, France</span></p>
    </div>` : `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;line-height:1.55;color:#2A2928;max-width:560px">
      <p>${hello}</p>
      <p>J'ai bien reçu votre demande <strong>${id}</strong> (${escapeHtml(kind)}). Je la lis et je vous réponds sous ${escapeHtml(delay)}.</p>
      <p style="margin:20px 0 6px;font-weight:600">Votre demande</p>
      <pre style="white-space:pre-wrap;font-family:inherit;background:#F4F2EF;padding:14px;border-radius:6px;margin:0">${escapeHtml(summary)}${message ? "\n\n" + escapeHtml(message) : ""}</pre>
      <p style="margin-top:20px">La suite : je vous envoie un devis définitif (avec un aperçu à valider s'il y a une création), puis je fabrique après votre accord. Rien n'est à payer pour l'instant.</p>
      <p>Pour compléter votre demande, répondez simplement à cet email.</p>
      <p>Colin<br><span style="color:#6E6A66">impression_ant · impression 3D et découpe laser</span></p>
    </div>`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.CONFIRM_FROM,
        to: [email],
        ...(env.NOTIFY_EMAIL ? { reply_to: env.NOTIFY_EMAIL } : {}),
        subject: en ? `Request ${id} received · impression_ant` : `Demande ${id} bien reçue · impression_ant`,
        html: chtml
      })
    }).catch(() => null);
    confirmation = !!(r && r.ok);
  }
  return json({ ok: true, id, confirmation });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/demande") {
      if (request.method === "GET") {
        // diagnostic : indique seulement si chaque canal est configuré (aucune valeur secrète)
        return json({ ok: true, discord: !!env.DISCORD_WEBHOOK_URL, email: !!(env.RESEND_API_KEY && env.NOTIFY_EMAIL) });
      }
      if (request.method !== "POST") return json({ ok: false, error: "Méthode non autorisée." }, 405);
      return handleRequest(request, env);
    }
    if (url.pathname === "/api/s" && request.method === "POST") return collect(request, env).catch(() => new Response(null, { status: 204 }));
    if (url.pathname === "/stats") return dashboard(request, env);
    return env.ASSETS.fetch(request);
  }
};

// Numéro de demande lisible : IA-AAMMJJ-XXXX (sans 0/O/1/I pour éviter les confusions)
function requestId() {
  const d = new Date(Date.now() + 3600e3); // heure de Paris (approx.)
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, "");
  const A = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const rnd = crypto.getRandomValues(new Uint8Array(4));
  return `IA-${ymd}-${Array.from(rnd, b => A[b % A.length]).join("")}`;
}

function toBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
