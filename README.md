# Site vitrine + devis automatique

Site statique (HTML/CSS/JS) hébergé gratuitement sur un **Worker Cloudflare** (projet « atelier »), qui transmet aussi les demandes vers **Discord** et **email**.

## Contenu

```
wrangler.jsonc                    configuration Cloudflare (ne pas toucher)
worker/index.js                   reçoit les demandes et les envoie sur Discord + email
public/index.html                 la page (vitrine, devis 3D, devis laser, mentions légales)
public/css/style.css              charte graphique
public/js/config.js               ← TOUT ce qui se règle : prix, matières, couleurs, vitesses laser, mentions légales
public/js/geometry.js             lecture STL / 3MF / STEP + calcul poids, temps, prix
public/js/vector.js               lecture SVG / DXF / PDF / AI + longueur de coupe, surface gravée
public/js/app.js                  interface
public/creations/creations.json   ← la liste de tes créations (galerie)
public/creations/                 ← tes photos
public/img/                       logos
```

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

Fichiers de plus de 8 Mo : ils ne sont pas joints, la notification te le signale et tu demandes au client de te l'envoyer.

### Anti-spam (facultatif)
Cloudflare → *Turnstile* → ajoute ton site → colle la *site key* dans `public/js/config.js` (`turnstileSiteKey`) et la *secret key* dans la variable `TURNSTILE_SECRET`.

## 3. Ajouter une création à la galerie

Dépose la photo dans `public/creations/` (JPG ou WebP, 1200 px de large suffisent) et ajoute une entrée dans `public/creations/creations.json` :

```json
{
  "titre": "Mosaïque koï",
  "categorie": "3d",
  "description": "Mosaïque 1,6 × 1,6 m imprimée en PLA multicolore.",
  "image": "creations/mosaique-koi.jpg",
  "tags": ["PLA", "Multicolore"]
}
```

`categorie` vaut `"3d"` ou `"laser"`. Supprime les 4 fiches d'exemple (celles avec `"exemple": true`).

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

## Tester en local

Ouvre un terminal dans le dossier `public` et lance `python -m http.server 8000`, puis va sur http://localhost:8000. L'envoi des demandes ne fonctionne qu'une fois en ligne : en local, le site affiche le récapitulatif à copier.
