"""Met à jour les parties communes de toutes les pages HTML de public/ :
<head> (polices, balises de partage), en-tête, menu et pied de page.
Le contenu propre à chaque page (entre <main> et </main>) n'est jamais touché.

Usage : python tools/chrome.py   (depuis la racine du dépôt)
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public"
SITE = "https://impressionant.fr"
BRAND = "impression_ant"

NAV = [
    ("impression-3d.html", "Impression 3D", "img/logo-3d.png"),
    ("decoupe-laser.html", "Découpe laser", "img/logo-laser.png"),
    ("portfolio.html", "Portfolio", None),
    ("atelier.html", "L'atelier", None),
]

# page : (titre, description, page active du menu, classe du body)
PAGES = {
    "index.html": ("impression_ant · Impression 3D & découpe laser", "Impression 3D, modélisation et découpe laser sur mesure. Devis instantané depuis votre fichier.", None),
    "impression-3d.html": ("Impression 3D · impression_ant", "Impression 3D PLA, PETG et TPU et modélisation sur mesure. Devis instantané depuis votre fichier STL, 3MF ou STEP.", "impression-3d.html"),
    "decoupe-laser.html": ("Découpe laser · impression_ant", "Découpe et gravure laser, création de fichiers multicouches et tampons. Devis instantané depuis votre fichier SVG, DXF, PDF ou AI.", "decoupe-laser.html"),
    "portfolio.html": ("Portfolio · impression_ant", "Portfolio de Colin Ehret : mécanismes imprimés en 3D, découpes laser multicouches, commandes sur mesure et modélisation paramétrique.", "portfolio.html"),
    "atelier.html": ("L'atelier · impression_ant", "Comment je travaille, les machines de l'atelier, les délais et les réponses aux questions fréquentes.", "atelier.html"),
    "demande.html": ("Décrire mon projet · impression_ant", "Décrivez votre projet d'impression 3D ou de découpe laser en quatre étapes. Réponse par email, téléphone ou WhatsApp.", None),
    "cgv.html": ("Conditions générales de vente · impression_ant", "Conditions générales de vente d'impression_ant : devis, paiement, fabrication, livraison, garanties.", None),
    "mentions-legales.html": ("Mentions légales · impression_ant", "Mentions légales et données personnelles du site impression_ant.", None),
    "404.html": ("Page introuvable · impression_ant", "Cette page n'existe pas ou a été déplacée.", None),
}


def head(file, title, desc):
    url = SITE + "/" + ("" if file == "index.html" else file)
    return f"""<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="{desc}">
<meta name="theme-color" content="#ECEAE7">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/img/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="img/favicon.png">
<link rel="apple-touch-icon" href="img/favicon.png">
<link rel="preload" href="fonts/archivo-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/plex-sans-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/style.css">
<script>try{{var m=sessionStorage.getItem("morph");if(m){{document.documentElement.dataset.morph=m;sessionStorage.removeItem("morph")}}}}catch(e){{}}</script>
</head>"""


def header(active):
    links = []
    for href, label, icon in NAV:
        cur = ' aria-current="page"' if href == active else ""
        img = f'<img src="{icon}" alt="" width="18" height="18">' if icon else ""
        links.append(f'      <a href="{href}"{cur}>{img}{label}</a>')
    links.append('      <a class="nav-cta" href="demande.html">Décrire mon projet</a>')
    return f"""<a class="skip" href="#contenu">Aller au contenu</a>
<header class="topbar">
  <div class="wrap topbar-in">
    <a class="brand" href="index.html" aria-label="Accueil {BRAND}">
      <span class="brand-coins" aria-hidden="true">
        <img src="img/logo-3d.png" alt="" width="32" height="32">
        <img src="img/logo-laser.png" alt="" width="32" height="32">
      </span>
      <span class="brand-name" data-brand>{BRAND}</span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-pages"><span class="nav-toggle-bars" aria-hidden="true"></span><span class="nav-toggle-label">Menu</span></button>
    <nav class="nav" id="nav-pages" aria-label="Pages du site">
{chr(10).join(links)}
    </nav>
  </div>
</header>"""


FOOTER = f"""<footer class="footer">
  <div class="wrap footer-in">
    <div class="footer-top">
      <div class="footer-contact">
        <p>Une question, un projet ? Je réponds sous <span data-delay="reply">48 h</span>.</p>
        <p><a class="btn" href="demande.html">Décrire mon projet</a> <a class="footer-mail" href="mailto:impression.ant.laser@gmail.com" data-contact-email>impression.ant.laser@gmail.com</a></p>
      </div>
      <nav aria-label="Pied de page">
        <a href="impression-3d.html">Impression 3D</a>
        <a href="decoupe-laser.html">Découpe laser</a>
        <a href="portfolio.html">Portfolio</a>
        <a href="atelier.html">L'atelier et FAQ</a>
        <a href="cgv.html">Conditions de vente</a>
        <a href="mentions-legales.html">Mentions légales</a>
      </nav>
    </div>
    <span class="footer-brand" data-brand>{BRAND}</span>
  </div>
</footer>"""


def apply(file):
    path = ROOT / file
    html = path.read_text(encoding="utf-8")
    title, desc, active = PAGES[file]
    html = re.sub(r"<head>.*?</head>", head(file, title, desc), html, count=1, flags=re.S)
    html = re.sub(r'(<a class="skip"[^>]*>[^<]*</a>\s*)?<header class="topbar">.*?</header>', header(active), html, count=1, flags=re.S)
    html = re.sub(r'<footer class="footer">.*?</footer>', FOOTER, html, count=1, flags=re.S)
    if file == "404.html":
        # servie à n'importe quelle adresse : liens absolus
        html = re.sub(r'(href|src)="(?!/|https?:|#|mailto:)([^"]+)"', r'\1="/\2"', html)
    path.write_text(html, encoding="utf-8")


if __name__ == "__main__":
    for f in PAGES:
        if (ROOT / f).exists():
            apply(f)
            print("ok", f)
