"""Version anglaise du parcours « Décrire mon projet » : public/en/request.html.
Recopie la page française et traduit ses textes ; à relancer après une modification de demande.html,
puis lancer chrome.py. Le script s'arrête si un texte à traduire a disparu de la page française.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public"
src = (ROOT / "demande.html").read_text(encoding="utf-8")
main = re.search(r"<main.*?</main>", src, re.S).group(0)

PAIRS = [
    ("Étape 1 sur 5", "Step 1 of 5"),
    ("Votre demande concerne :", "What do you need?"),
    ('<span class="ob-choice-t">Impression 3D</span>', '<span class="ob-choice-t">3D model</span>'),
    ("Une pièce à modéliser puis imprimer : objet, pièce de rechange, prototype, déco.", "A part or object to design for 3D printing: spare part, prototype, mechanism, decor."),
    ('<span class="ob-choice-t">Découpe laser</span>', '<span class="ob-choice-t">Laser cutting file</span>'),
    ("Un fichier de découpe à dessiner : multicouche, gravure, signalétique, tampon.", "A cutting file to design: multilayer panel, engraving, sign, decor."),
    ('<p class="ob-aside">Vous avez déjà votre fichier ? Le simulateur vous donne le prix tout de suite : <a href="impression-3d.html#devis">impression 3D</a> ou <a href="decoupe-laser.html#devis">découpe laser</a>.</p>',
     '<p class="ob-aside">Prices: laser files from €15, 3D models quoted per project. <a href="en/index.html#process">How it works</a></p>'),
    ("Décrivez brièvement votre projet", "Briefly describe your project"),
    ("Vous pourrez ajouter des photos et des fichiers à l'étape suivante si vous en avez.", "You can add photos and files in the next step if you have any."),
    ("Description du projet", "Project description"),
    ("Usage, dimensions, matière, quantité : tout ce qui vous vient.", "Purpose, size, material, your machine: anything that comes to mind."),
    ("Ce dont vous avez besoin", "What you need"),
    ('<button type="button" class="chip is-on" aria-pressed="true" data-v="Le fichier et la pièce découpée">Le fichier et la pièce découpée</button>\n            <button type="button" class="chip" aria-pressed="false" data-v="Uniquement le fichier">Uniquement le fichier, pour ma machine</button>',
     '<button type="button" class="chip is-on" aria-pressed="true" data-v="Only the file">Only the file, for my own machine</button>\n            <button type="button" class="chip" aria-pressed="false" data-v="The file and the finished piece">The file and the finished piece, shipped from France</button>'),
    ('Délai souhaité <span class="opt-label">(facultatif)</span>', 'Timeline <span class="opt-label">(optional)</span>'),
    ('data-v="Pas pressé">Pas pressé', 'data-v="No rush">No rush'),
    ('data-v="Sous 2 semaines">Sous 2 semaines', 'data-v="Within 2 weeks">Within 2 weeks'),
    ('data-v="Sous 1 semaine">Sous 1 semaine', 'data-v="Within 1 week">Within 1 week'),
    ('data-v="Date précise (dans la description)">Date précise', 'data-v="Specific date (see description)">Specific date'),
    ("Ajoutez vos photos et fichiers", "Add photos and files"),
    ("Photo de la pièce à remplacer, croquis, logo, fichier existant : tout aide. Jusqu'à 5 fichiers, 8 Mo au total.", "Reference pictures, a sketch, a logo, an existing file: anything helps. Up to 5 files, 8 MB in total."),
    ("Déposez vos fichiers ici", "Drop your files here"),
    ("ou cliquez pour les choisir", "or click to choose them"),
    ("Comment voulez-vous être recontacté ?", "How should I get back to you?"),
    ('Choisissez un ou plusieurs moyens. Je réponds sous <span data-delay="reply">48 h</span>.', "Pick one or more. I reply within 48 hours."),
    ("Appel téléphonique", "Phone call"),
    ("Votre email", "Your email"),
    ("vous@exemple.fr", "you@example.com"),
    ("Votre numéro", "Your number"),
    ("06 12 34 56 78", "+44 7700 900123"),
    ("Numéro français ou international (+33, +356…)", "With your country code (+44, +1, +49…)"),
    ('Votre prénom <span class="opt-label">(facultatif)</span>', 'Your first name <span class="opt-label">(optional)</span>'),
    ('Quand vous appeler ? <span class="opt-label">(facultatif)</span>', 'When can I call you? <span class="opt-label">(optional, with your time zone)</span>'),
    ("Ex. : en semaine après 18 h", "E.g. weekdays after 6 pm, UK time"),
    ("Vérifiez votre demande", "Check your request"),
    ("J'accepte que mes coordonnées, mon message et mes fichiers soient utilisés uniquement pour répondre à ma demande (<a href=\"mentions-legales.html\">données personnelles</a>).",
     "I agree that my contact details, message and files are used only to answer my request (<a href=\"mentions-legales.html\" hreflang=\"fr\">privacy notice, in French</a>)."),
    ('<label for="obWebsite">Site web</label>', '<label for="obWebsite">Website</label>'),
    ('id="obBack">Retour', 'id="obBack">Back'),
    ('id="obNext">Continuer', 'id="obNext">Continue'),
    ('Brouillon enregistré sur cet appareil · <button type="button" class="link-btn" id="obReset">Recommencer</button>', 'Draft saved on this device · <button type="button" class="link-btn" id="obReset">Start over</button>'),
    ("Demande envoyée", "Request sent"),
    ("Numéro de demande", "Request number"),
    ('Je vous réponds sous <span data-delay="reply">48 h</span>.', "I'll reply within 48 hours."),
    ("Je lis votre demande et je reviens vers vous avec mes questions éventuelles.", "I read your request and get back to you with any questions."),
    ("Je vous envoie un devis, avec un aperçu à valider pour toute création.", "I send you a preview and a price."),
    ("Après votre accord, je fabrique et je vous envoie la pièce.", "We fine-tune the preview together, then you receive your file."),
    ('<a class="btn btn-ghost" href="portfolio.html">Voir le portfolio en attendant</a>', '<a class="btn btn-ghost" href="en/index.html#examples">See examples in the meantime</a>'),
    ("L'envoi automatique n'a pas fonctionné", "The request couldn't be sent automatically"),
    ("Votre demande n'est pas perdue : copiez le récapitulatif et envoyez-le à", "Nothing is lost: copy the summary and email it to"),
    (", avec vos fichiers en pièce jointe.", ", with your files attached."),
    ("Copier le récapitulatif", "Copy the summary"),
    ("Ouvrir ma messagerie", "Open my email app"),
]

for fr, en in PAIRS:
    if fr not in main:
        raise SystemExit("Texte introuvable dans demande.html : " + fr[:80])
    main = main.replace(fr, en)

page = f"""<!doctype html>
<html lang="en">
<head></head>
<body>

<header class="topbar"></header>

{main}

<footer class="footer"></footer>

<script src="js/config.js"></script>
<script src="js/layout.js"></script>
<script src="js/onboarding.js"></script>
</body>
</html>
"""
(ROOT / "en").mkdir(exist_ok=True)
(ROOT / "en" / "request.html").write_text(page, encoding="utf-8")
print("ok en/request.html")
