"""Référencement : à relancer après chaque modification du portfolio.

  python tools/seo.py

1. Une page par projet (public/portfolio/<id>.html), lisible par Google, avec ses photos.
2. La liste de tous les projets, visible sous le livre de public/portfolio.html.
3. public/sitemap.xml (toutes les pages) et public/robots.txt.
Les en-têtes, menus et pieds de page viennent de tools/chrome.py.
"""
import datetime
import html
import json
import re
from pathlib import Path

import chrome

ROOT = chrome.ROOT
SITE = chrome.SITE
data = json.loads((ROOT / "portfolio" / "portfolio.json").read_text(encoding="utf-8"))
label = {f["id"]: f["label"] for f in data["filtres"]}
parts = data.get("livre", {}).get("parties", [{"titre": "Réalisations", "chapitres": list(label)}])
intros = data.get("livre", {}).get("intros", {})
E = lambda s: html.escape(str(s or ""), quote=True)
webp = lambda src, big=True: re.sub(r"\.jpe?g$", ".webp" if big else "-800.webp", src)


def chapter(p):
    t = p.get("themes") or []
    return "laser" if "laser" in t else (t[0] if t else "deco")


# projets dans l'ordre du livre
ordered = []
for part in parts:
    for cid in part["chapitres"]:
        for p in data["projets"]:
            if chapter(p) == cid:
                ordered.append((part["titre"], cid, p))


def absolute(page_html):
    # pages servies depuis /portfolio/ : liens absolus
    return re.sub(r'(href|src)="(?!/|https?:|#|mailto:|data:)([^"]+)"', r'\1="/\2"', page_html)


def project_page(i, part, cid, p):
    pid = p["id"]
    url = f"{SITE}/portfolio/{pid}"
    title = f"{p['titre']} · {label.get(cid, cid)} | impression_ant"
    desc = (p.get("resume") or p.get("description") or "")[:155]
    prev = ordered[i - 1][2] if i > 0 else None
    nxt = ordered[i + 1][2] if i + 1 < len(ordered) else None
    kind = "laser" if cid == "laser" else "3d"
    imgs = "".join(
        f'<figure class="pp-fig"><img src="{E(webp(src))}" alt="{E(p["titre"])} — photo {k + 1}" width="1400" height="1050" {"fetchpriority=\"high\"" if k == 0 else "loading=\"lazy\""} onerror="this.onerror=null;this.src=\'/{E(src)}\'"></figure>'
        for k, src in enumerate(p["images"]))
    ld = {
        "@context": "https://schema.org", "@type": "CreativeWork", "name": p["titre"], "url": url,
        "description": p.get("description") or p.get("resume") or "", "keywords": ", ".join(p.get("tags") or []),
        "genre": label.get(cid, cid), "creator": {"@type": "Person", "name": "Colin Ehret"},
        "publisher": {"@id": SITE + "/#atelier"}, "image": [f"{SITE}/{webp(src)}" for src in p["images"]],
    }
    crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": "Portfolio", "item": SITE + "/portfolio"},
        {"@type": "ListItem", "position": 3, "name": p["titre"], "item": url}]}
    head = chrome.head(f"portfolio/{pid}.html", E(title), E(desc), extra=None)
    head = head.replace("</head>", chrome.ld(ld, crumbs) + "\n</head>")
    main = f'''<main id="contenu" class="pp">
  <div class="wrap pp-wrap">
    <nav class="pp-crumbs" aria-label="Fil d'Ariane"><a href="index.html">Accueil</a> › <a href="portfolio.html">Portfolio</a> › <span>{E(label.get(cid, cid))}</span></nav>
    <header class="pp-head">
      <p class="pp-chap">{E(part)} · {E(label.get(cid, cid))}</p>
      <h1>{E(p["titre"])}</h1>
      <p class="lede">{E(p.get("resume"))}</p>
    </header>
    <div class="pp-gallery">{imgs}</div>
    <div class="pp-text">
      <p>{E(p.get("description"))}</p>
      {"<p class='pp-tags'>" + " · ".join(E(t) for t in p.get("tags") or []) + "</p>" if p.get("tags") else ""}
      <p class="pp-intro">{E(intros.get(cid, ""))}</p>
      <div class="hero-actions">
        <a class="btn" href="demande.html?type={kind}" data-track="clic:Projet · Projet similaire">Un projet similaire ? Décrivez-le</a>
        <a class="btn btn-ghost" href="portfolio.html#{E(pid)}">Voir dans le livre</a>
      </div>
    </div>
    <nav class="pp-nav" aria-label="Autres projets">
      {f'<a href="portfolio/{E(prev["id"])}.html" rel="prev"><span>Projet précédent</span>{E(prev["titre"])}</a>' if prev else "<span></span>"}
      {f'<a href="portfolio/{E(nxt["id"])}.html" rel="next"><span>Projet suivant</span>{E(nxt["titre"])}</a>' if nxt else "<span></span>"}
    </nav>
  </div>
</main>'''
    page = f"""<!doctype html>
<html lang="fr">
{head}
<body>

{chrome.header("portfolio.html")}

{main}

{chrome.FOOTER}

<script src="js/config.js"></script>
<script src="js/layout.js"></script>
</body>
</html>
"""
    page = absolute(page)
    # l'adresse canonique et og:url pointent vers /portfolio/<id>
    page = page.replace(f'"{SITE}/portfolio/{pid}.html"', f'"{url}"')
    out = ROOT / "portfolio" / f"{pid}.html"
    out.write_text(page, encoding="utf-8")
    return f"portfolio/{pid}"


def portfolio_index():
    """Liste visible de tous les projets, sous le livre (et lisible sans JavaScript)."""
    blocks = []
    for part in parts:
        for cid in part["chapitres"]:
            items = [p for (_, c, p) in ordered if c == cid]
            if not items:
                continue
            lis = "".join(f'<li><a href="portfolio/{E(p["id"])}.html"><strong>{E(p["titre"])}</strong><span>{E(p.get("resume"))}</span></a></li>' for p in items)
            blocks.append(f'<div class="pf-idx-chap"><h3>{E(label.get(cid, cid))} <small>{E(part["titre"])}</small></h3><ul>{lis}</ul></div>')
    return ('<!-- index:debut (généré par tools/seo.py) -->\n'
            '  <section class="section pf-idx" aria-labelledby="idx-title">\n    <div class="wrap">\n'
            '      <h2 id="idx-title">Tous les projets</h2>\n'
            '      <p class="pf-idx-lede">Chaque réalisation a aussi sa propre page, avec toutes ses photos.</p>\n'
            f'      <div class="pf-idx-grid">{"".join(blocks)}</div>\n    </div>\n  </section>\n  <!-- index:fin -->')


if __name__ == "__main__":
    urls = [chrome.page_url(f) for f in chrome.PAGES if f != "404.html" and (ROOT / f).exists()]
    for i, (part, cid, p) in enumerate(ordered):
        urls.append(SITE + "/" + project_page(i, part, cid, p))
    # liste des projets dans portfolio.html
    pf = ROOT / "portfolio.html"
    s = pf.read_text(encoding="utf-8")
    block = portfolio_index()
    if "<!-- index:debut" in s:
        s = re.sub(r"<!-- index:debut.*?<!-- index:fin -->", lambda m: block, s, flags=re.S)
    else:
        s = s.replace('  <dialog class="lightbox"', "  " + block + '\n\n  <dialog class="lightbox"', 1)
    pf.write_text(s, encoding="utf-8")
    # plan du site et robots.txt
    today = datetime.date.today().isoformat()
    prio = lambda u: "1.0" if u == SITE + "/" else "0.9" if any(k in u for k in ("impression-3d", "decoupe-laser")) else "0.6" if "/portfolio/" in u else "0.3" if any(k in u for k in ("cgv", "mentions")) else "0.8"
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc><lastmod>{today}</lastmod><priority>{prio(u)}</priority></url>\n" for u in urls)
        + "</urlset>\n", encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /stats\nDisallow: /api/\n\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")
    print(len(urls), "adresses dans le plan du site,", len(ordered), "pages projet")
