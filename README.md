# Site vitrine + devis automatique

Site statique (HTML/CSS/JS) hébergé gratuitement sur un **Worker Cloudflare** (projet « atelier »), qui transmet aussi les demandes vers **Discord** et **email**.

## Contenu

```
wrangler.jsonc                    configuration Cloudflare (page 404 activée)
worker/index.js                   reçoit les demandes : numéro IA-AAMMJJ-XXXX, Discord, email, confirmation client
public/index.html                 accueil (dépôt direct d'un fichier → bon simulateur)
public/impression-3d.html         impression 3D (parcours + simulateur)
public/decoupe-laser.html         découpe laser (parcours + simulateur + tampons)
public/demande.html               « Décrire mon projet » : formulaire en 5 étapes
public/atelier.html               « L'atelier » : méthode, engagements, machines, avis, FAQ
public/portfolio.html             portfolio en forme de livre (js/book.js)
public/404.html                   page introuvable
public/css/style.css              charte graphique
public/fonts/                     polices hébergées sur le site
public/js/config.js               ← TOUT ce qui se règle : prix, matières, délais affichés, avis, machines, FAQ, mentions
public/js/onboarding.js           formulaire en étapes (brouillon gardé sur l'appareil)
public/js/price.js                total animé + barre de prix fixe sur téléphone
public/js/content.js              affiche avis et FAQ depuis config.js
public/js/machines.js             machines dessinées de « L'atelier » : la porte s'ouvre sur la fiche
public/js/motion.js               apparition des blocs au défilement (attribut data-reveal)
public/js/geometry.js, vector.js  lecture des fichiers 3D et 2D, calculs
public/portfolio/portfolio.json   ← la liste de tes projets
public/portfolio/img/             ← leurs photos (JPG + versions WebP)
public/img/og.jpg                 image affichée quand on partage un lien du site
tools/chrome.py                   met à jour en-tête, menu, pied de page et balises de partage de toutes les pages
tools/images.py                   crée les versions WebP des nouvelles photos du portfolio
```

Les pages se modifient directement. Pour changer le menu ou le pied de page partout : édite `tools/chrome.py` puis lance `python tools/chrome.py`.

## Avis clients, délais, machines, FAQ

Tout est dans `public/js/config.js` : `delays`, `reviews` (la section avis reste cachée tant que la liste est vide — n'y mets que de vrais avis), `machines` : nom, technologie, matières, taille max, usage, et `art` = le dessin utilisé (x1c, a1mini, u1, zr, giga, laser, uv). Ajoute `photo: "img/atelier/x1c.jpg"` pour remplacer un dessin par ta photo (la fiche s'ouvre alors par-dessus la photo) et `faq`. Pour une photo d'échantillon de couleur, ajoute `photo: "img/couleurs/rouge.jpg"` à la couleur voulue.

## 1. Mise en ligne

Le dépôt GitHub `Colinator67/atelier` est relié au Worker Cloudflare « atelier ». À chaque modification poussée sur GitHub, Cloudflare reconstruit et met le site à jour tout seul (onglet *Deployments* du Worker).

Adresse publique : Worker « atelier » → *Domains* → active l'interrupteur **Production** (`atelier.<ton-compte>.workers.dev`).

## 2. Recevoir les demandes

### Discord (notification instantanée + fichier joint)
1. Sur ton serveur Discord : un salon privé → *Modifier le salon* → *Intégrations* → *Webhooks* → *Nouveau webhook* → *Copier l'URL*.
2. Cloudflare → *Workers & Pages* → **atelier** → *Settings* → *Variables and Secrets* → ajoute `DISCORD_WEBHOOK_URL` (type *Secret*) avec cette URL.

### Email (Resend, gratuit jusqu'à quelques milliers d'emails par mois)
1. Crée un compte sur resend.com avec ton adresse email, puis une clé API.
2. Ajoute dans Cloudflare : `RESEND_API_KEY` (secret) et `NOTIFY_EMAIL` (ton adresse, la même que celle du compte Resend).
3. Sans domaine perso, Resend n'envoie qu'à l'adresse du compte : c'est exactement ce qu'il faut ici. Répondre à l'email écrit directement au client.

Les variables s'appliquent dès l'enregistrement (*Deploy*).

### Email de confirmation au client
Le client reçoit « Demande IA-… bien reçue » si tu envoies depuis ton domaine :
1. Resend → *Domains* → *Add Domain* → `impressionant.fr`, puis ajoute chez ton registraire les enregistrements DNS indiqués (DKIM, SPF) et attends la validation.
2. Ajoute dans Cloudflare la variable `CONFIRM_FROM` = `impression_ant <contact@impressionant.fr>` (n'importe quelle adresse du domaine) et, si tu veux, `REPLY_DELAY` = `24 à 48 h`.
Sans `CONFIRM_FROM`, tout fonctionne mais aucun email n'est envoyé au client. Les réponses du client à cet email arrivent sur `NOTIFY_EMAIL`.

Fichiers de plus de 8 Mo : ils ne sont pas joints, la notification te le signale et tu demandes au client de te l'envoyer.

### Anti-spam (facultatif)
Cloudflare → *Turnstile* → ajoute ton site → colle la *site key* dans `public/js/config.js` (`turnstileSiteKey`) et la *secret key* dans la variable `TURNSTILE_SECRET`.

## 3. Ajouter un projet au portfolio

Dépose les photos dans `public/portfolio/img/` (JPG, 1400 px de large suffisent) et ajoute un bloc dans `public/portfolio/portfolio.json`, dans la liste `projets` :

```json
{
  "id": "mosaique-koi",
  "titre": "Mosaïque koï",
  "themes": ["deco"],
  "resume": "Mosaïque 1,6 × 1,6 m imprimée en PLA multicolore.",
  "description": "Texte complet affiché dans la visionneuse.",
  "tags": ["PLA", "Multicolore"],
  "images": ["portfolio/img/mosaique-koi-1.jpg", "portfolio/img/mosaique-koi-2.jpg"]
}
```

`themes` reprend les identifiants de la liste `filtres` (mecanisme, commande, deco, parametrique, laser).

Le portfolio s'affiche comme un livre (`public/js/book.js`) : couverture, avant-propos, sommaire, un chapitre par catégorie, puis « Prêt à écrire un nouveau chapitre ? ». Un projet va dans le chapitre « Découpe laser » s'il a le thème `laser` (son texte se grave à l'ouverture de la page), sinon dans le chapitre de son **premier** thème. L'ordre des chapitres et leur phrase d'introduction se règlent dans le bloc `livre` de `portfolio.json`. Les numéros de page et le sommaire se recalculent tout seuls.

## 4. Recaler l'estimation sur Orca Slicer

Dans `public/js/config.js`, bloc `print.estimate` et `flow` de chaque matière :

| Si le site annonce… | Ajuste |
|---|---|
| trop de grammes sur les petites pièces | baisse `wallThickness` |
| trop de grammes sur les grosses pièces | c'est le remplissage : vérifie `infillOptions` |
| un temps trop long sur les grosses pièces | augmente `flow` (mm³/s) |
| un temps trop long sur les pièces hautes et fines | baisse `layerOverheadS` |
| un temps trop long sur les toutes petites pièces | baisse `setupMinutes` |

Envoie-moi 4-5 pièces avec le temps et les grammes donnés par Orca, et je calcule les coefficients.

## 5. Recaler les vitesses laser (xTool M1 Ultra)

Bloc `laser.materials` : `cutSpeed` (mm/s), `passes`, `engraveSpeed` (mm/s). Les valeurs fournies sont des points de départ pour un laser diode 10 W : remplace-les par tes réglages XCS. `maxSize` = taille max d'une plaque.

## 6. Domaine perso (plus tard)

Achète le domaine (environ 7 à 15 €/an), puis Worker « atelier » → *Domains* → *Add Domain*. Rien d'autre à modifier.

## Ajouter des photos au portfolio

Après avoir déposé des JPG : `pip install Pillow` puis `python tools/images.py` (crée les WebP plus légers). Sans ça, le site affiche les JPG.

## Tester en local

Ouvre un terminal dans le dossier `public` et lance `python -m http.server 8000`, puis va sur http://localhost:8000. L'envoi des demandes ne fonctionne qu'une fois en ligne : en local, le site affiche le récapitulatif à copier.

## Statistiques de visite (/stats)

Le site compte ses visites lui-même, sans cookie (base Cloudflare D1 « atelier-stats »).

1. Cloudflare → Workers & Pages → atelier → Settings → Variables and Secrets → ajouter un secret
   `STATS_PASSWORD` (le mot de passe du tableau de bord). Facultatif : `STATS_SALT`, une suite de caractères au hasard.
2. Ouvrir https://impressionant.fr/stats (identifiant : n'importe lequel, mot de passe : celui choisi).
   Périodes : `?jours=7`, `30`, `90` ou `365`.

Pour suivre un nouveau bouton : ajouter `data-track="clic:Nom du bouton"` sur l'élément.

## Référencement

- Après chaque modification du portfolio : `cd tools && python3 seo.py` (pages projet, liste, sitemap.xml, robots.txt),
  et après un changement de titre ou de description : `python3 chrome.py`.
- Google Search Console : ajouter la propriété « Domaine » impressionant.fr (la vérification DNS se fait
  en un clic avec Cloudflare), puis Sitemaps → `sitemap.xml`.
- Bing Webmaster Tools : « Importer depuis Google Search Console ».
