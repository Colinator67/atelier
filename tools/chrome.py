"""Met à jour les parties communes de toutes les pages HTML de public/ :
<head> (polices, balises de partage), en-tête, menu et pied de page.
Le contenu propre à chaque page (entre <main> et </main>) n'est jamais touché.

Usage : python tools/chrome.py   (depuis la racine du dépôt)
"""
import json
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
    "index.html": ("Impression 3D et découpe laser sur mesure près de Strasbourg | impression_ant", "Impression 3D, découpe et gravure laser sur mesure en Alsace, envoi partout en France. Déposez votre fichier : prix immédiat. Pas de fichier ? Je modélise pour vous.", None),
    "impression-3d.html": ("Impression 3D sur mesure, devis instantané · PLA, PETG, TPU | impression_ant", "Impression 3D à la demande en PLA, PETG ou TPU, jusqu'à 80 cm. Déposez votre STL, 3MF ou STEP : prix immédiat. Modélisation 3D sur mesure si vous n'avez pas de fichier.", "impression-3d.html"),
    "decoupe-laser.html": ("Découpe et gravure laser sur mesure, devis instantané | impression_ant", "Découpe et gravure laser bois, MDF, contreplaqué et carton, tableaux multicouches et tampons personnalisés. Déposez votre SVG, DXF ou PDF : prix immédiat, ou fichier dessiné pour vous.", "decoupe-laser.html"),
    "portfolio.html": ("Portfolio : réalisations en impression 3D et découpe laser | impression_ant", "Mécanismes imprimés d'un seul tenant, commandes sur mesure, objets paramétriques et tableaux laser multicouches : les réalisations de Colin Ehret, ingénieur en plasturgie.", "portfolio.html"),
    "atelier.html": ("L'atelier : machines, délais et questions fréquentes | impression_ant", "Les imprimantes 3D et le laser de l'atelier, les délais de réponse et de fabrication, et les réponses aux questions fréquentes sur les devis, le paiement et la livraison.", "atelier.html"),
    "demande.html": ("Décrire mon projet d'impression 3D ou de découpe laser | impression_ant", "Décrivez votre projet en quatre étapes, ajoutez photos et croquis, choisissez email, téléphone ou WhatsApp : réponse sous 48 h avec un devis.", None),
    "cgv.html": ("Conditions générales de vente | impression_ant", "Conditions générales de vente d'impression_ant : devis, paiement, fabrication, livraison, garanties.", None),
    "mentions-legales.html": ("Mentions légales et données personnelles | impression_ant", "Mentions légales, données personnelles et mesure d'audience du site impression_ant.", None),
    "404.html": ("Page introuvable | impression_ant", "Cette page n'existe pas ou a été déplacée.", None),
}

# ---- données structurées (schema.org) : l'entreprise sur toutes les pages, les services sur les pages ateliers
BUSINESS = {
    "@context": "https://schema.org", "@type": "LocalBusiness", "@id": SITE + "/#atelier",
    "name": "impression_ant", "alternateName": "IMPRESSION ANT", "url": SITE + "/",
    "description": "Atelier d'impression 3D, de modélisation 3D et de découpe et gravure laser sur mesure, avec devis instantané depuis le fichier du client.",
    "image": SITE + "/img/og.jpg", "logo": SITE + "/img/logo-3d.png", "email": "impression.ant.laser@gmail.com",
    "founder": {"@type": "Person", "name": "Colin Ehret", "jobTitle": "Ingénieur en plasturgie"},
    "address": {"@type": "PostalAddress", "streetAddress": "27 B route de Brumath", "postalCode": "67670", "addressLocality": "Mommenheim", "addressRegion": "Grand Est", "addressCountry": "FR"},
    "areaServed": [{"@type": "AdministrativeArea", "name": "Bas-Rhin"}, {"@type": "AdministrativeArea", "name": "Alsace"}, {"@type": "Country", "name": "France"}],
    "knowsAbout": ["Impression 3D", "Modélisation 3D", "Découpe laser", "Gravure laser", "Plasturgie", "Fabrication additive"],
    "priceRange": "€",
}
SERVICES = {
    "impression-3d.html": {"@context": "https://schema.org", "@type": "Service", "serviceType": "Impression 3D sur mesure", "name": "Impression et modélisation 3D",
        "provider": {"@id": SITE + "/#atelier"}, "areaServed": {"@type": "Country", "name": "France"}, "url": SITE + "/impression-3d",
        "description": "Impression 3D FDM en PLA, PETG et TPU, multicolore, jusqu'à 800 × 800 × 1000 mm, et modélisation 3D sur mesure. Devis instantané depuis un fichier STL, 3MF ou STEP.",
        "offers": {"@type": "Offer", "priceCurrency": "EUR", "description": "Prix calculé selon la matière (17 €/kg) et le temps machine, estimation instantanée sur le site."}},
    "decoupe-laser.html": {"@context": "https://schema.org", "@type": "Service", "serviceType": "Découpe et gravure laser sur mesure", "name": "Découpe, gravure laser et création de fichiers",
        "provider": {"@id": SITE + "/#atelier"}, "areaServed": {"@type": "Country", "name": "France"}, "url": SITE + "/decoupe-laser",
        "description": "Découpe et gravure laser sur MDF, contreplaqué et carton, tableaux multicouches, signalétique, création de fichiers de découpe et tampons personnalisés. Devis instantané depuis un fichier SVG, DXF, PDF ou AI.",
        "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Tampons personnalisés", "itemListElement": [
            {"@type": "Offer", "name": "Tampon Ø 6 cm", "price": "10.00", "priceCurrency": "EUR"},
            {"@type": "Offer", "name": "Tampon Ø 10 cm", "price": "15.00", "priceCurrency": "EUR"},
            {"@type": "Offer", "name": "Tampon Ø 20 cm", "price": "25.00", "priceCurrency": "EUR"}]}},
}



def page_url(file):
    """Adresse publique : Cloudflare sert les pages sans « .html »."""
    return SITE + "/" + ("" if file == "index.html" else file[:-5] if file.endswith(".html") else file)


def ld(*objs):
    return "\n".join('<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False, separators=(",", ":")) + "</script>" for o in objs if o)


def head(file, title, desc, extra=None):
    url = page_url(file)
    return f"""<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="robots" content="{"noindex" if file == "404.html" else "index, follow, max-image-preview:large"}">
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
<script src="js/stats.js" defer></script>
{ld(BUSINESS, SERVICES.get(file), extra)}
<script>try{{var m=sessionStorage.getItem("morph");if(m){{document.documentElement.dataset.morph=m;sessionStorage.removeItem("morph")}}}}catch(e){{}}</script>
</head>"""


def header(active):
    links = []
    for href, label, icon in NAV:
        cur = ' aria-current="page"' if href == active else ""
        img = f'<img src="{icon}" alt="" width="18" height="18">' if icon else ""
        links.append(f'      <a href="{href}"{cur}>{img}{label}</a>')
    links.append('      <a class="nav-cta" href="demande.html" data-track="clic:Menu · Décrire mon projet">Décrire mon projet</a>')
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
        <p><a class="btn" href="demande.html" data-track="clic:Pied de page · Décrire mon projet">Décrire mon projet</a> <a class="footer-mail" href="mailto:impression.ant.laser@gmail.com" data-contact-email>impression.ant.laser@gmail.com</a></p>
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
