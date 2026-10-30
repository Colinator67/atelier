"""Page « Création de fichiers » en français et en anglais (même structure, deux langues).

  python tools/files_page.py   puis   python tools/chrome.py

Les textes sont ici ; l'en-tête, le menu et le pied de page viennent de chrome.py.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public"

EXAMPLES = [  # (id du projet, type) — pièces sans marque ni personnage protégé
    ("tableau-multicouche-personnage", "laser"),
    ("tableaux-multicouches-fetes", "laser"),
    ("machine-a-vagues", "3d"),
    ("glaces-usb", "3d"),
    ("sous-bock-mecanique", "3d"),
    ("ville-parametrique", "3d"),
]

T = {
    "fr": dict(
        file="creation-fichiers.html", req="demande.html", lang="fr",
        h1="Création de fichiers sur&nbsp;mesure",
        lede="Fichiers de découpe laser multicouches et modèles 3D, dessinés pour vous à partir d'une idée, d'une photo ou d'un croquis, et livrés prêts pour votre machine.",
        cta="Décrire mon fichier", cta2="Voir des exemples",
        hero_alt="Tableau multicouche en bois découpé et gravé au laser",
        types_t="Deux types de fichiers",
        laser_t="Fichiers de découpe laser", laser_p="À partir de 15 €",
        laser_li=["Tableaux multicouches, décors, signalétique, gravure", "Formats SVG, DXF ou PDF", "Couches et opérations (découpe, gravure) bien séparées"],
        laser_btn="Demander un fichier laser",
        d3_t="Modèles 3D", d3_p="Sur devis",
        d3_li=["Pièces techniques, pièces de rechange, mécanismes, objets déco", "Formats STL, 3MF ou STEP", "Pensés pour s'imprimer facilement : orientation, jeux, peu de supports"],
        d3_btn="Demander un modèle 3D",
        proc_t="Comment ça se passe",
        proc=[("Vous décrivez votre idée", "Un thème, un texte, une photo ou un croquis, les dimensions et le matériau de votre machine."),
              ("Je vous envoie un visuel", "Un aperçu du rendu, avec le prix et le délai."),
              ("On l'ajuste ensemble", "Je retouche le visuel jusqu'à ce qu'il vous convienne."),
              ("Vous recevez le fichier", "Prêt à l'emploi, adapté à votre plateau et à l'épaisseur de votre matériau."),
              ("Vous payez", "Une fois le fichier reçu.")],
        incl_t="Ce qui est compris",
        incl=["Un fichier exclusif : dessiné pour vous, jamais revendu à quelqu'un d'autre.",
              "Le droit de vendre les objets que vous découpez ou imprimez avec.",
              "Un fichier adapté à votre machine et à votre matériau.",
              "Des échanges en français ou en anglais."],
        ex_t="Quelques fichiers dessinés à l'atelier", ex_more="Tout le portfolio", ex_kind={"laser": "Fichier laser", "3d": "Modèle 3D"},
        faq_t="Questions fréquentes",
        faq=[("Ma machine est-elle compatible ?", "Les fichiers SVG, DXF et PDF s'ouvrent dans LightBurn, xTool Creative Space, Glowforge, LaserGRBL et la plupart des logiciels de découpe. Les fichiers STL et 3MF fonctionnent avec tous les trancheurs : Bambu Studio, PrusaSlicer, OrcaSlicer, Cura. Indiquez votre machine dans la demande : j'adapte le fichier à son plateau."),
             ("Puis-je vendre les objets fabriqués avec le fichier ?", "Oui, vous pouvez vendre les objets découpés ou imprimés. Le fichier lui-même reste pour votre usage : il ne doit pas être revendu ni partagé."),
             ("Combien de temps faut-il ?", "Je réponds sous 24 à 48 h avec un premier visuel ou mes questions. Le délai de création dépend de la complexité : il est indiqué avec le visuel, avant tout engagement."),
             ("J'habite hors de France, est-ce possible ?", "Oui : un fichier s'envoie par email, partout dans le monde, et les échanges peuvent se faire en anglais."),
             ("Pouvez-vous aussi fabriquer la pièce ?", 'Oui. Je peux découper ou imprimer la pièce et vous l\'envoyer, ou vous la remettre à Strasbourg : voir <a href="decoupe-laser.html">découpe laser</a> et <a href="impression-3d.html">impression 3D</a>.')],
        end_t="Une idée de fichier ?", end_p="Décrivez-la en deux minutes : vous recevez un visuel et un prix, sans engagement.",
        track="Création de fichiers",
    ),
    "en": dict(
        file="en/index.html", req="en/request.html", lang="en",
        h1="Custom laser files and 3D&nbsp;models",
        lede="Multilayer laser cutting files and 3D models, designed for you from an idea, a photo or a sketch, and delivered ready for your machine.",
        cta="Describe your file", cta2="See examples",
        hero_alt="Multilayer wooden panel, laser cut and engraved",
        types_t="Two kinds of files",
        laser_t="Laser cutting files", laser_p="From €15",
        laser_li=["Multilayer panels, decor, signs, engraving", "SVG, DXF or PDF", "Layers and operations (cut, engrave) clearly separated"],
        laser_btn="Request a laser file",
        d3_t="3D models", d3_p="Quoted per project",
        d3_li=["Functional parts, spare parts, mechanisms, decor", "STL, 3MF or STEP", "Designed to print easily: orientation, clearances, few supports"],
        d3_btn="Request a 3D model",
        proc_t="How it works",
        proc=[("You describe your idea", "A theme, some text, a photo or a sketch, plus the size and the material your machine uses."),
              ("I send you a preview", "A visual of the result, with the price and the timeline."),
              ("We fine-tune it together", "I revise the preview until you're happy with it."),
              ("You get the file", "Ready to use, sized for your bed and your material thickness."),
              ("You pay", "Once you have the file.")],
        incl_t="What's included",
        incl=["An exclusive file: designed for you, never resold to anyone else.",
              "The right to sell the pieces you cut or print with it.",
              "A file adapted to your machine and your material.",
              "Replies in English or French."],
        ex_t="A few files designed in the workshop", ex_more="Full portfolio (in French)", ex_kind={"laser": "Laser file", "3d": "3D model"},
        faq_t="Questions",
        faq=[("Will it work with my machine?", "SVG, DXF and PDF files open in LightBurn, xTool Creative Space, Glowforge, LaserGRBL and most laser software. STL and 3MF files work with every slicer: Bambu Studio, PrusaSlicer, OrcaSlicer, Cura. Tell me which machine you have and I'll size the file for its bed."),
             ("Can I sell what I make with the file?", "Yes, you can sell the pieces you cut or print. The file itself is for your own use: please don't resell or share it."),
             ("How long does it take?", "I reply within 24 to 48 hours with a first preview or my questions. Design time depends on complexity and is stated with the preview, before you commit to anything."),
             ("I'm not in France. Is that a problem?", "Not at all: files are delivered by email, anywhere in the world. I'm based in Strasbourg, France, and I'm happy to work in English."),
             ("Can you make the piece too?", 'Yes. I can laser cut or 3D print it and ship it from France. Mention it in your request and the shipping cost will be on the quote. <a href="index.html" hreflang="fr">The French site</a> has instant quotes for printing and cutting.')],
        end_t="Got an idea for a file?", end_p="Describe it in two minutes: you'll get a preview and a price, with no commitment.",
        track="Custom files EN",
    ),
}


def page(L):
    t = T[L]
    req = t["req"]
    lis = lambda xs: "".join(f"<li>{x}</li>" for x in xs)
    proc = "".join(f'<li data-reveal><strong>{a}</strong><span>{b}</span></li>' for a, b in t["proc"])
    faq = "".join(f'<details class="faq-item"><summary>{q}</summary><div class="faq-a"><p>{a}</p></div></details>' for q, a in t["faq"])
    ex = "".join(
        f'<a class="fx-ex" href="portfolio/{pid}.html" data-reveal{" hreflang=\"fr\"" if L == "en" else ""}>'
        f'<img src="portfolio/img/{pid}-1-800.webp" alt="" width="800" height="600" loading="lazy">'
        f'<span>{t["ex_kind"][k]}</span></a>' for pid, k in EXAMPLES)
    return f"""<!doctype html>
<html lang="{t['lang']}">
<head></head>
<body>

<header class="topbar"></header>

<main id="contenu" class="fx-page">
  <section class="page-hero">
    <div class="wrap page-hero-in">
      <img src="img/logo-laser.png" alt="" width="120" height="120">
      <div data-reveal>
        <h1>{t['h1']}</h1>
        <p>{t['lede']}</p>
        <div class="hero-actions fx-hero-actions">
          <a class="btn" href="{req}?type=laser" data-track="clic:{t['track']} · Haut de page">{t['cta']}</a>
          <a class="btn btn-ghost" href="#examples">{t['cta2']}</a>
        </div>
      </div>
      <figure class="page-hero-photo"><img src="portfolio/img/tableau-multicouche-personnage-1-800.webp" srcset="/portfolio/img/tableau-multicouche-personnage-1-800.webp 800w, /portfolio/img/tableau-multicouche-personnage-1.webp 1400w" sizes="(max-width: 860px) 100vw, 50vw" alt="{t['hero_alt']}" width="1400" height="1050" fetchpriority="high"></figure>
    </div>
  </section>

  <section class="section" aria-labelledby="types-title">
    <div class="wrap">
      <h2 id="types-title" data-reveal>{t['types_t']}</h2>
      <div class="fx-types">
        <article class="fx-type" data-reveal>
          <h3>{t['laser_t']}</h3>
          <p class="fx-price">{t['laser_p']}</p>
          <ul class="idea-points">{lis(t['laser_li'])}</ul>
          <a class="btn btn-small" href="{req}?type=laser" data-track="clic:{t['track']} · Laser">{t['laser_btn']}</a>
        </article>
        <article class="fx-type" data-reveal>
          <h3>{t['d3_t']}</h3>
          <p class="fx-price">{t['d3_p']}</p>
          <ul class="idea-points">{lis(t['d3_li'])}</ul>
          <a class="btn btn-small" href="{req}?type=3d" data-track="clic:{t['track']} · 3D">{t['d3_btn']}</a>
        </article>
      </div>
    </div>
  </section>

  <section id="process" class="section fx-band" aria-labelledby="proc-title">
    <div class="wrap steps-wrap">
      <div class="fx-proc-side">
        <h2 id="proc-title" data-reveal>{t['proc_t']}</h2>
        <h3 class="fx-incl-t" data-reveal>{t['incl_t']}</h3>
        <ul class="idea-points" data-reveal>{lis(t['incl'])}</ul>
      </div>
      <ol class="process">{proc}</ol>
    </div>
  </section>

  <section id="examples" class="section" aria-labelledby="ex-title">
    <div class="wrap">
      <div class="section-head">
        <div><h2 id="ex-title" data-reveal>{t['ex_t']}</h2></div>
        <a class="link-more" href="portfolio.html"{' hreflang="fr"' if L == "en" else ""}>{t['ex_more']} <span aria-hidden="true">→</span></a>
      </div>
      <div class="fx-gallery">{ex}</div>
    </div>
  </section>

  <section id="faq" class="section" aria-labelledby="faq-title">
    <div class="wrap faq-wrap">
      <h2 id="faq-title" data-reveal>{t['faq_t']}</h2>
      <div class="faq">{faq}</div>
    </div>
  </section>

  <section class="section cta-section" aria-labelledby="cta-title">
    <div class="wrap cta-band" data-reveal>
      <h2 id="cta-title">{t['end_t']}</h2>
      <p>{t['end_p']}</p>
      <div class="hero-actions">
        <a class="btn" href="{req}?type=laser" data-track="clic:{t['track']} · Bas de page">{t['cta']}</a>
      </div>
    </div>
  </section>
</main>

<footer class="footer"></footer>

<script src="js/config.js"></script>
<script src="js/layout.js"></script>
<script src="js/motion.js"></script>
</body>
</html>
"""


if __name__ == "__main__":
    for L in T:
        out = ROOT / T[L]["file"]
        out.parent.mkdir(exist_ok=True)
        out.write_text(page(L), encoding="utf-8")
        print("ok", out.relative_to(ROOT))
