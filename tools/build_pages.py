"""Génère les pages HTML du site (en-tête, menu et pied de page communs).

Usage : python tools/build_pages.py   (depuis la racine du dépôt)
Les fichiers produits dans public/ sont ceux publiés : on peut aussi les
modifier directement sur GitHub sans relancer ce script.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public"
BRAND = "impression_ant"

NAV = [
    ("impression-3d.html", "Impression 3D", "img/logo-3d.png"),
    ("decoupe-laser.html", "Découpe laser", "img/logo-laser.png"),
    ("portfolio.html", "Portfolio", None),
]


def head(title, desc):
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="{desc}">
<link rel="icon" href="img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@112,600;112,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="css/style.css">
</head>"""


def header(active):
    links = []
    for href, label, icon in NAV:
        cur = ' aria-current="page"' if href == active else ""
        img = f'<img src="{icon}" alt="" width="18" height="18">' if icon else ""
        links.append(f'<a href="{href}"{cur}>{img}{label}</a>')
    return f"""<header class="topbar">
  <div class="wrap topbar-in">
    <a class="brand" href="index.html" aria-label="Accueil {BRAND}">
      <span class="brand-coins" aria-hidden="true">
        <img src="img/logo-3d.png" alt="" width="32" height="32">
        <img src="img/logo-laser.png" alt="" width="32" height="32">
      </span>
      <span class="brand-name" data-brand>{BRAND}</span>
    </a>
    <nav class="nav" aria-label="Pages du site">
      {chr(10).join('      ' + l for l in links).strip()}
    </nav>
  </div>
</header>"""


FOOTER = f"""<footer class="footer">
  <div class="wrap footer-in">
    <span data-brand>{BRAND}</span>
    <nav aria-label="Pied de page">
      <a href="impression-3d.html">Impression 3D</a>
      <a href="decoupe-laser.html">Découpe laser</a>
      <a href="portfolio.html">Portfolio</a>
      <a href="cgv.html">Conditions de vente</a>
      <a href="mentions-legales.html">Mentions légales</a>
    </nav>
  </div>
</footer>"""

MODAL = """<dialog class="modal" id="modal" aria-labelledby="modal-title">
  <form id="reqForm" novalidate>
    <div class="modal-head">
      <h2 id="modal-title">Envoyer ma demande</h2>
      <button class="icon-btn" type="button" id="closeModal" aria-label="Fermer">×</button>
    </div>
    <div class="summary" id="reqSummary"></div>
    <div class="field">
      <label for="reqEmail">Votre email</label>
      <input type="email" id="reqEmail" name="email" required autocomplete="email" placeholder="vous@exemple.fr">
    </div>
    <div class="field">
      <label for="reqMsg" id="reqMsgLabel">Précisions <span class="opt-label">(facultatif)</span></label>
      <textarea id="reqMsg" name="message" rows="4" placeholder="Délai souhaité, usage de la pièce, teintes du bi-color, finitions…"></textarea>
    </div>
    <div class="field" id="reqFileWrap" hidden>
      <label for="reqFile">Photo, croquis ou fichier <span class="opt-label">(facultatif, 8 Mo max)</span></label>
      <input type="file" id="reqFile">
    </div>
    <div class="hp" aria-hidden="true"><label for="reqWebsite">Site web</label><input type="text" id="reqWebsite" name="website" tabindex="-1" autocomplete="off"></div>
    <div class="field-check">
      <input type="checkbox" id="reqConsent" required>
      <label for="reqConsent">J'accepte que mon email, mon message et mon fichier soient utilisés uniquement pour répondre à ma demande.</label>
    </div>
    <div id="turnstile"></div>
    <p class="msg" id="reqMsgBox" role="status" hidden></p>
    <div class="modal-actions">
      <button class="btn btn-ghost" type="button" id="cancelModal">Annuler</button>
      <button class="btn" type="submit" id="sendReq">Envoyer</button>
    </div>
  </form>
  <div class="sent" id="reqSent" hidden>
    <h2>Demande envoyée</h2>
    <p>Merci ! J'ai bien reçu votre demande et je vous réponds par email dès que possible.</p>
    <button class="btn" type="button" id="closeSent">Fermer</button>
  </div>
  <div class="sent" id="reqFallback" hidden>
    <h2>L'envoi automatique n'a pas fonctionné</h2>
    <p>Copiez le récapitulatif ci-dessous et envoyez-le par email<span id="fbEmailWrap"> à <strong class="mono" id="fbEmail"></strong></span>, avec votre fichier en pièce jointe.</p>
    <textarea id="fbText" rows="8" readonly></textarea>
    <div class="modal-actions">
      <button class="btn btn-ghost" type="button" id="copyFb">Copier le récapitulatif</button>
      <button class="btn" type="button" id="closeFb">Fermer</button>
    </div>
  </div>
</dialog>"""

LIB_3D = """<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>"""


def scripts(*names, libs=""):
    tags = [libs] if libs else []
    tags += [f'<script src="js/{n}"></script>' for n in names]
    return "\n".join(tags)


def page(file, title, desc, active, body_class, main, extra="", js=()):
    cls = f' class="{body_class}"' if body_class else ""
    html = f"""{head(title, desc)}
<body{cls}>

{header(active)}

<main id="contenu">
{main}
</main>

{FOOTER}
{extra}
{js}
</body>
</html>
"""
    (ROOT / file).write_text(html, encoding="utf-8")
    print("écrit", file)


def step(n, title, text=""):
    t = f"<span>{text}</span>" if text else ""
    return f'<div class="step" data-n="{n}"><strong>{title}</strong>{t}</div>'


def end_step(n, title, text=""):
    t = f"<span>{text}</span>" if text else ""
    return f'<div class="step" data-n="{n}"><strong>{title}</strong>{t}<i class="arrow" aria-hidden="true"></i></div>'


# ======================================================================
# ACCUEIL
# ======================================================================
HOME = """  <section class="hero" aria-labelledby="hero-title">
    <div class="wrap hero-head">
      <h1 id="hero-title">Vos pièces en plastique imprimé ou en bois découpé, chiffrées en quelques secondes.</h1>
      <p class="lede">Déposez votre fichier, choisissez la matière, obtenez une estimation. Pas de fichier ? Je modélise la pièce ou je dessine le fichier de découpe pour vous.</p>
    </div>
    <div class="split">
      <a class="side side-3d" href="impression-3d.html">
        <div class="side-in">
          <img class="side-logo" src="img/logo-3d.png" alt="Logo impression 3D" width="160" height="160">
          <div class="side-text">
            <p class="eyebrow">Atelier impression 3D</p>
            <h2>Impression & modélisation 3D</h2>
            <p>Pièces fonctionnelles, prototypes, objets déco. Fichiers STL, 3MF ou STEP, ou modélisation sur mesure.</p>
            <ul class="specs">
              <li><span>PLA</span><span>PETG</span><span>TPU</span></li>
              <li class="mono">Devis instantané depuis votre fichier</li>
            </ul>
            <span class="cta">Estimer une impression <span aria-hidden="true">→</span></span>
          </div>
        </div>
      </a>
      <a class="side side-laser" href="decoupe-laser.html">
        <div class="side-in">
          <img class="side-logo" src="img/logo-laser.png" alt="Logo découpe laser" width="160" height="160">
          <div class="side-text">
            <p class="eyebrow">Atelier découpe laser</p>
            <h2>Découpe, gravure & création de fichiers</h2>
            <p>Découpes multicouches, signalétique, tampons. Vos fichiers SVG, DXF, PDF ou AI, ou un fichier dessiné pour vous.</p>
            <ul class="specs">
              <li><span>MDF</span><span>Contreplaqué</span><span>Carton</span><span>Tampons</span></li>
              <li class="mono">Création de fichier sur mesure</li>
            </ul>
            <span class="cta">Estimer une découpe <span aria-hidden="true">→</span></span>
          </div>
        </div>
      </a>
    </div>
  </section>

  <section class="section" aria-labelledby="teaser-title">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Portfolio</p>
          <h2 id="teaser-title">Quelques réalisations</h2>
        </div>
        <a class="link-more" href="portfolio.html">Voir tout le portfolio <span aria-hidden="true">→</span></a>
      </div>
      <div class="teaser">
        <a href="portfolio.html#machine-a-vagues"><img src="portfolio/img/machine-a-vagues-1.jpg" alt="Machine à vagues imprimée en 3D" loading="lazy"></a>
        <a href="portfolio.html#glaces-usb"><img src="portfolio/img/glaces-usb-1.jpg" alt="Glaces porte-clés USB" loading="lazy"></a>
        <a href="portfolio.html#spookslot"><img src="portfolio/img/spookslot-2.jpg" alt="Figurine Spookslot" loading="lazy"></a>
        <a href="portfolio.html#let-it-snow"><img src="portfolio/img/let-it-snow-2.jpg" alt="Sapin de Noël mécanique" loading="lazy"></a>
      </div>
    </div>
  </section>"""

# ======================================================================
# IMPRESSION 3D
# ======================================================================
FLOW_3D = f"""  <section class="section" aria-labelledby="flow3-title">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Comment ça marche</p>
          <h2 id="flow3-title">De votre idée à la pièce livrée</h2>
        </div>
      </div>
      <div class="flow">
        <div class="flow-q">Vous avez déjà un fichier 3D ?</div>
        <div class="flow-branches">
          <div class="lane">
            <span class="lane-label">Oui, j'ai mon fichier</span>
            <div class="lane-steps">
              {step(1, "Déposez-le dans le simulateur", "STL, 3MF ou STEP, matière et couleur au choix")}
              {step(2, "Le devis estimé m'est envoyé", "en un clic, avec votre fichier")}
            </div>
            <a class="btn btn-small lane-cta" href="#devis">Ouvrir le simulateur</a>
          </div>
          <div class="lane lane-hl">
            <span class="lane-label">Non, j'ai une idée</span>
            <div class="lane-steps">
              {step(1, "Décrivez votre projet", "photo, croquis, dimensions, usage")}
              {step(2, "Je modélise la pièce", "conception pensée pour l'impression 3D, devis de modélisation")}
            </div>
            <button class="btn btn-small lane-cta" type="button" data-project="3d">Décrire mon projet</button>
          </div>
        </div>
        <div class="flow-join">
          <div class="flow-end">
            {end_step(3, "On valide ensemble par email", "prix exact, couleur, délai")}
            {end_step(4, "Je fabrique la pièce", "sur mon parc d'imprimantes FDM")}
            {end_step(5, "La pièce vous est envoyée", "frais de port en plus du devis")}
          </div>
        </div>
      </div>
    </div>
  </section>"""

QUOTE_3D = """  <section id="devis" class="section" aria-labelledby="d3-title">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Simulateur</p>
          <h2 id="d3-title">Devis impression 3D</h2>
        </div>
        <p class="formats mono">STL · 3MF · STEP</p>
      </div>

      <div class="quote">
        <div class="quote-main">
          <label class="drop" id="drop3d" for="file3d">
            <input type="file" id="file3d" accept=".stl,.3mf,.step,.stp" hidden>
            <span class="drop-title">Déposez votre fichier 3D</span>
            <span class="drop-sub">ou cliquez pour le choisir · unités en millimètres</span>
          </label>
          <div class="viewer" id="viewer3d" hidden>
            <canvas id="canvas3d" aria-label="Aperçu 3D de la pièce"></canvas>
            <div class="viewer-bar">
              <span class="mono" id="fname3d"></span>
              <button class="link-btn" type="button" id="reset3d">Changer de fichier</button>
            </div>
          </div>
          <p class="msg" id="msg3d" role="status" hidden></p>

          <div class="options">
            <fieldset class="opt">
              <legend>Matière</legend>
              <div class="seg" id="mat3d"></div>
              <p class="hint" id="matnote3d"></p>
            </fieldset>
            <fieldset class="opt">
              <legend>Couleur / effet</legend>
              <div id="colors3d"></div>
            </fieldset>
            <div class="opt-row">
              <div class="opt">
                <label for="infill3d">Solidité</label>
                <select id="infill3d"></select>
              </div>
              <div class="opt">
                <label for="qty3d">Quantité</label>
                <input type="number" id="qty3d" min="1" max="500" value="1" inputmode="numeric">
              </div>
              <div class="opt opt-check">
                <input type="checkbox" id="sup3d" checked>
                <label for="sup3d">Supports si nécessaire</label>
              </div>
            </div>
          </div>
        </div>

        <aside class="ticket" aria-labelledby="t3-title">
          <h3 id="t3-title">Estimation</h3>
          <dl class="lines" id="lines3d">
            <div><dt>Dimensions</dt><dd class="mono" data-k="size">—</dd></div>
            <div><dt>Volume de la pièce</dt><dd class="mono" data-k="vol">—</dd></div>
            <div><dt>Matière estimée</dt><dd class="mono" data-k="grams">—</dd></div>
            <div><dt>Temps d'impression</dt><dd class="mono" data-k="time">—</dd></div>
            <div class="sep"><dt>Prix unitaire</dt><dd class="mono" data-k="unit">—</dd></div>
            <div><dt>Frais de préparation</dt><dd class="mono" data-k="setup">—</dd></div>
          </dl>
          <div class="total"><span>Total estimé</span><strong class="mono" id="total3d">—</strong></div>
          <p class="warn" id="warn3d" hidden></p>
          <button class="btn" type="button" id="ask3d" disabled>Demander ce devis</button>
          <p class="fine">Prix hors frais de port. Estimation indicative, sans valeur contractuelle : je confirme le prix exact après vérification du fichier.</p>
        </aside>
      </div>
    </div>
  </section>"""


def page_hero(logo, eyebrow, title, text):
    return f"""  <section class="page-hero">
    <div class="wrap page-hero-in">
      <img src="{logo}" alt="" width="140" height="140">
      <div>
        <p class="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </div>
  </section>"""


# ======================================================================
# DÉCOUPE LASER
# ======================================================================
FLOW_LASER = f"""  <section class="section" aria-labelledby="flowl-title">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Comment ça marche</p>
          <h2 id="flowl-title">Du dessin à la découpe</h2>
        </div>
      </div>
      <div class="flow">
        <div class="flow-q">Vous avez déjà un fichier de découpe ?</div>
        <div class="flow-branches">
          <div class="lane lane-hl">
            <span class="lane-label">Non : je crée le fichier</span>
            <div class="lane-steps">
              {step(1, "Décrivez votre idée", "logo, photo, texte, dimensions, matériau")}
              {step(2, "Je dessine le fichier", "découpe, gravure, multicouche si besoin")}
              {step(3, "Vous validez l'aperçu", "je l'ajuste si besoin avant la découpe")}
            </div>
            <a class="btn btn-small lane-cta" href="#creation">Décrire mon idée</a>
          </div>
          <div class="lane">
            <span class="lane-label">Oui, j'ai mon fichier</span>
            <div class="lane-steps">
              {step(1, "Déposez-le dans le simulateur", "SVG, DXF, PDF ou AI")}
              {step(2, "Le devis estimé m'est envoyé", "temps de découpe et de gravure calculés")}
            </div>
            <a class="btn btn-small lane-cta" href="#devis">Ouvrir le simulateur</a>
          </div>
        </div>
        <div class="flow-join">
          <div class="flow-end">
            {end_step(4, "On valide ensemble par email", "prix exact, matériau, délai")}
            {end_step(5, "Découpe et gravure", "sur laser xTool M1 Ultra")}
            {end_step(6, "La pièce vous est envoyée", "frais de port en plus du devis")}
          </div>
        </div>
        <p class="flow-note">Vous avez votre propre machine ? Je peux aussi vous livrer uniquement le fichier de découpe, prêt à l'emploi.</p>
      </div>
    </div>
  </section>"""

QUOTE_LASER = """  <section id="devis" class="section" aria-labelledby="dl-title">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Simulateur</p>
          <h2 id="dl-title">Devis découpe & gravure laser</h2>
        </div>
        <div class="chips" role="tablist" aria-label="Type de demande laser">
          <button class="chip is-on" role="tab" aria-selected="true" data-lmode="cut" id="lm-cut">Découpe / gravure</button>
          <button class="chip" role="tab" aria-selected="false" data-lmode="stamp" id="lm-stamp">Tampon</button>
        </div>
      </div>

      <div class="quote" id="laser-cut">
        <div class="quote-main">
          <label class="drop" id="dropL" for="fileL">
            <input type="file" id="fileL" accept=".svg,.dxf,.pdf,.ai,.png,.jpg,.jpeg,.webp,.bmp" hidden>
            <span class="drop-title">Déposez votre fichier de découpe</span>
            <span class="drop-sub">SVG, DXF, PDF ou AI · images acceptées sur demande</span>
          </label>
          <div class="preview2d" id="previewL" hidden>
            <div class="preview2d-img" id="imgL"></div>
            <div class="viewer-bar">
              <span class="mono" id="fnameL"></span>
              <button class="link-btn" type="button" id="resetL">Changer de fichier</button>
            </div>
          </div>
          <p class="msg" id="msgL" role="status" hidden></p>

          <div class="options">
            <fieldset class="opt">
              <legend>Matériau</legend>
              <div class="seg" id="matL"></div>
            </fieldset>
            <div class="opt-row">
              <div class="opt">
                <label for="qtyL">Quantité</label>
                <input type="number" id="qtyL" min="1" max="500" value="1" inputmode="numeric">
              </div>
            </div>
            <details class="howto">
              <summary>Préparer votre fichier</summary>
              <ul>
                <li><strong>Coupe</strong> : tracés sans remplissage (contour seul).</li>
                <li><strong>Gravure</strong> : formes remplies et textes.</li>
                <li>Dessinez à l'échelle réelle, en millimètres. Les textes des PDF/AI doivent être vectorisés.</li>
                <li>Fichier .ai : enregistrez-le avec « Créer un fichier compatible PDF ».</li>
              </ul>
            </details>
          </div>
        </div>

        <aside class="ticket" aria-labelledby="tl-title">
          <h3 id="tl-title">Estimation</h3>
          <dl class="lines" id="linesL">
            <div><dt>Dimensions</dt><dd class="mono" data-k="size">—</dd></div>
            <div><dt>Longueur de coupe</dt><dd class="mono" data-k="cut">—</dd></div>
            <div><dt>Surface gravée</dt><dd class="mono" data-k="engr">—</dd></div>
            <div class="sep"><dt>Temps de coupe</dt><dd class="mono" data-k="cutmin">—</dd></div>
            <div><dt>Temps de gravure</dt><dd class="mono" data-k="engrmin">—</dd></div>
            <div><dt>Prix unitaire</dt><dd class="mono" data-k="unit">—</dd></div>
          </dl>
          <div class="total"><span>Total estimé</span><strong class="mono" id="totalL">—</strong></div>
          <p class="warn" id="warnL" hidden></p>
          <button class="btn" type="button" id="askL" disabled>Demander ce devis</button>
          <p class="fine">Prix hors frais de port. Estimation indicative basée sur le temps machine : je confirme le prix exact après vérification du fichier.</p>
        </aside>
      </div>

      <div class="quote" id="laser-stamp" hidden>
        <div class="quote-main">
          <fieldset class="opt">
            <legend>Taille du tampon</legend>
            <div class="stamps" id="stamps"></div>
          </fieldset>
          <div class="opt-row">
            <div class="opt">
              <label for="qtyS">Quantité</label>
              <input type="number" id="qtyS" min="1" max="200" value="1" inputmode="numeric">
            </div>
          </div>
          <label class="drop drop-small" id="dropS" for="fileS">
            <input type="file" id="fileS" accept=".svg,.dxf,.pdf,.ai,.png,.jpg,.jpeg,.webp" hidden>
            <span class="drop-title">Votre motif (facultatif)</span>
            <span class="drop-sub" id="fnameS">SVG, PDF, AI ou image · vous pourrez aussi le décrire</span>
          </label>
        </div>
        <aside class="ticket" aria-labelledby="ts-title">
          <h3 id="ts-title">Prix</h3>
          <dl class="lines" id="linesS">
            <div><dt>Tampon</dt><dd class="mono" data-k="label">—</dd></div>
            <div><dt>Prix unitaire</dt><dd class="mono" data-k="unit">—</dd></div>
          </dl>
          <div class="total"><span>Total</span><strong class="mono" id="totalS">—</strong></div>
          <button class="btn" type="button" id="askS">Demander ce tampon</button>
          <p class="fine">Prix fixe par tampon, hors frais de port. Je vous recontacte pour valider le motif.</p>
        </aside>
      </div>
    </div>
  </section>"""

# ======================================================================
# PORTFOLIO
# ======================================================================
PORTFOLIO = """  <section class="wrap pf-hero" aria-labelledby="pf-title">
    <div>
      <p class="eyebrow">Portfolio · fabrication additive</p>
      <h1 id="pf-title">Pièces imaginées, modélisées et imprimées à l'atelier</h1>
      <p class="lede">Photos, impressions et modélisations entièrement réalisées par Colin Ehret : mécanismes imprimés d'un seul tenant, commandes sur mesure et objets paramétriques.</p>
    </div>
    <div class="pf-strip"><img src="portfolio/img/let-it-snow-1.jpg" alt="Sapin de Noël mécanique imprimé en 3D"></div>
  </section>

  <section class="section" aria-labelledby="projets-title">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow" id="pf-count">Projets</p>
          <h2 id="projets-title">Réalisations</h2>
        </div>
        <div class="chips" id="pf-filters" role="tablist" aria-label="Filtrer les projets"></div>
      </div>
      <div class="pf-grid" id="pf-grid" aria-live="polite"></div>
    </div>
  </section>

  <section class="section" aria-labelledby="about-title">
    <div class="wrap about">
      <img src="portfolio/img/colin-1.jpg" alt="Portrait de Colin Ehret" loading="lazy">
      <div>
        <h3 id="about-title">À propos</h3>
        <p>Étudiant ingénieur en plasturgie à l'INSA Strasbourg, je suis passionné par l'impression 3D depuis près de 8 ans. Les modèles présentés ici viennent de projets personnels, d'études ou de commandes. Je les vois comme un entraînement permanent : je veux maîtriser parfaitement la modélisation 3D pour devenir chef de projet en fabrication additive, ou contribuer à faire progresser cette technologie par la recherche.</p>
      </div>
      <div>
        <h3>Mes règles de design</h3>
        <p>Quand je dessine une pièce, elle doit pouvoir être imprimée par n'importe qui, sur n'importe quelle imprimante. Je limite au maximum les supports et j'évite les éléments extérieurs comme les vis, l'adhésif ou les aimants. Pour moi, un objet réussi se fabrique de A à Z par une imprimante 3D : deux personnes, à deux endroits différents, peuvent produire exactement le même objet.</p>
      </div>
    </div>
  </section>

  <dialog class="lightbox" id="lightbox" aria-labelledby="lb-title">
    <div class="lb-in">
      <div class="lb-media">
        <div class="lb-main"><img id="lb-img" src="" alt=""></div>
        <div class="lb-thumbs" id="lb-thumbs"></div>
      </div>
      <div class="lb-text">
        <button class="icon-btn lb-close" type="button" id="lb-close" aria-label="Fermer">×</button>
        <h2 id="lb-title"></h2>
        <p id="lb-desc"></p>
        <div class="tags" id="lb-tags"></div>
      </div>
    </div>
  </dialog>"""

IDEA_FORM = """  <section id="creation" class="section" aria-labelledby="idea-title">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Création de fichier</p>
          <h2 id="idea-title">Une idée, mais pas de fichier ?</h2>
        </div>
      </div>
      <div class="idea">
        <div class="idea-intro">
          <p>Décrivez ce que vous imaginez : je dessine le fichier de découpe et vous envoie un aperçu avec le devis. Un logo, une photo ou un croquis sur papier suffisent pour démarrer.</p>
          <ul class="idea-points">
            <li>Découpe, gravure et assemblages multicouches</li>
            <li>Aperçu à valider avant toute fabrication</li>
            <li>Pièce découpée et envoyée, ou fichier seul pour votre machine</li>
          </ul>
        </div>
        <form class="idea-form" id="ideaForm" novalidate>
          <fieldset class="opt">
            <legend>Ce dont vous avez besoin</legend>
            <div class="seg" id="ideaNeed" role="radiogroup">
              <button type="button" role="radio" aria-pressed="true" aria-checked="true" data-v="Fichier + découpe">Le fichier et la pièce découpée</button>
              <button type="button" role="radio" aria-pressed="false" aria-checked="false" data-v="Fichier seul">Uniquement le fichier</button>
            </div>
          </fieldset>
          <div class="field">
            <label for="ideaDesc">Votre idée</label>
            <textarea id="ideaDesc" rows="5" required placeholder="Ex. : un panneau prénom en 3 couches pour une chambre d'enfant, un logo d'entreprise gravé sur des sous-verres, une boîte de rangement à encoches…"></textarea>
          </div>
          <div class="opt-row">
            <div class="opt">
              <label for="ideaSize">Dimensions approximatives</label>
              <input type="text" id="ideaSize" placeholder="Ex. : 30 × 20 cm">
            </div>
            <div class="opt">
              <label for="ideaMat">Matériau</label>
              <select id="ideaMat"></select>
            </div>
          </div>
          <div class="opt-row">
            <div class="opt">
              <label for="ideaQty">Quantité</label>
              <input type="number" id="ideaQty" min="1" max="1000" value="1" inputmode="numeric">
            </div>
            <div class="opt">
              <label for="ideaWhen">Délai souhaité</label>
              <select id="ideaWhen">
                <option>Pas pressé</option>
                <option>Sous 2 semaines</option>
                <option>Sous 1 semaine</option>
                <option>Date précise (à indiquer)</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label for="ideaFiles">Images de référence <span class="opt-label">(facultatif : logo, photo, croquis · 5 fichiers, 8 Mo au total)</span></label>
            <input type="file" id="ideaFiles" multiple accept="image/*,.pdf,.svg,.ai,.dxf">
          </div>
          <div class="field">
            <label for="ideaEmail">Votre email</label>
            <input type="email" id="ideaEmail" required autocomplete="email" placeholder="vous@exemple.fr">
          </div>
          <div class="hp" aria-hidden="true"><label for="ideaWebsite">Site web</label><input type="text" id="ideaWebsite" tabindex="-1" autocomplete="off"></div>
          <div class="field-check">
            <input type="checkbox" id="ideaConsent" required>
            <label for="ideaConsent">J'accepte que mon email, mon message et mes fichiers soient utilisés uniquement pour répondre à ma demande.</label>
          </div>
          <p class="msg" id="ideaMsg" role="status" hidden></p>
          <button class="btn" type="submit" id="ideaSend">Envoyer mon idée</button>
          <div class="idea-done" id="ideaDone" hidden>
            <h3>Idée bien reçue !</h3>
            <p>Je vous réponds par email avec mes questions éventuelles, un premier aperçu et le devis.</p>
          </div>
          <div class="idea-done" id="ideaFallback" hidden>
            <h3>L'envoi automatique n'a pas fonctionné</h3>
            <p>Copiez ce récapitulatif et envoyez-le par email avec vos images.</p>
            <textarea id="ideaFbText" rows="7" readonly></textarea>
          </div>
        </form>
      </div>
    </div>
  </section>"""

LEGAL = """  <section class="section">
    <div class="wrap narrow legal">
      <h1>Mentions légales & données personnelles</h1>
      <div id="legal"></div>
    </div>
  </section>"""

CGV = """  <section class="section">
    <div class="wrap narrow legal">
      <h1>Conditions générales de vente</h1>
      <div id="cgv"></div>
    </div>
  </section>"""

if __name__ == "__main__":
    page("index.html", f"{BRAND} · Impression 3D & découpe laser",
         "Impression 3D, modélisation et découpe laser sur mesure. Devis instantané depuis votre fichier.",
         None, "", HOME, js=scripts("config.js", "layout.js"))
    page("impression-3d.html", f"Impression 3D · {BRAND}",
         "Impression 3D PLA, PETG et TPU et modélisation sur mesure. Devis instantané depuis votre fichier STL, 3MF ou STEP.",
         "impression-3d.html", "theme-3d",
         page_hero("img/logo-3d.png", "Atelier impression 3D", "Impression & modélisation 3D",
                   "Pièces fonctionnelles, prototypes, objets déco ou pièces de rechange, en PLA, PETG ou TPU. Vous avez un fichier ? Le simulateur vous donne un prix tout de suite. Sinon, je modélise la pièce pour vous.")
         + "\n" + FLOW_3D + "\n" + QUOTE_3D,
         extra=MODAL, js=scripts("config.js", "layout.js", "geometry.js", "request.js", "quote3d.js", libs=LIB_3D))
    page("decoupe-laser.html", f"Découpe laser · {BRAND}",
         "Découpe et gravure laser sur bois et carton, tampons, et création de fichiers de découpe sur mesure.",
         "decoupe-laser.html", "theme-laser",
         page_hero("img/logo-laser.png", "Atelier découpe laser", "Découpe, gravure & création de fichiers",
                   "Découpes multicouches, signalétique, décoration, tampons. Je dessine votre fichier de découpe à partir d'une idée, d'un logo ou d'une photo, ou je découpe directement le vôtre.")
         + "\n" + FLOW_LASER + "\n" + IDEA_FORM + "\n" + QUOTE_LASER,
         extra=MODAL, js=scripts("config.js", "layout.js", "geometry.js", "vector.js", "request.js", "quotelaser.js", "ideaform.js"))
    page("portfolio.html", f"Portfolio · {BRAND}",
         "Portfolio de Colin Ehret : mécanismes imprimés en 3D, commandes sur mesure et modélisation paramétrique.",
         "portfolio.html", "", PORTFOLIO, js=scripts("config.js", "layout.js", "portfolio.js"))
    page("mentions-legales.html", f"Mentions légales · {BRAND}",
         "Mentions légales et politique de données personnelles.",
         None, "", LEGAL, js=scripts("config.js", "layout.js", "legal.js"))
    page("cgv.html", f"Conditions de vente · {BRAND}",
         "Conditions générales de vente : devis, commande, fabrication, livraison et garanties.",
         None, "", CGV, js=scripts("config.js", "layout.js", "legal.js"))
