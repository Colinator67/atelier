/* Mentions légales : remplies depuis config.js */
(function () {
  "use strict";
  const C = window.SITE_CONFIG;
  const { $, esc } = window.UI;
  if (!$("#legal")) return;
  const lg = C.legal;
  $("#legal").innerHTML = `
    <h3>Éditeur du site</h3>
    <p>${esc(lg.name)} — ${esc(lg.status)}<br>SIRET : ${esc(lg.siret)}<br>${esc(lg.address)}<br>Contact : ${esc(lg.email)}</p>
    <h3>Hébergement</h3>
    <p>${esc(lg.host)}</p>
    <h3>Devis</h3>
    <p>Les prix affichés par le calculateur sont des estimations indicatives, sans valeur contractuelle. Le prix définitif est confirmé par email après vérification du fichier.</p>
    <h3>Données personnelles</h3>
    <p>Lorsque vous envoyez une demande, votre email, votre message et votre fichier me sont transmis uniquement pour vous répondre et établir un devis. Ils ne sont ni revendus ni utilisés à des fins publicitaires, et sont supprimés au plus tard 3 ans après notre dernier échange. Les fichiers déposés dans le calculateur sont analysés dans votre navigateur et ne sont envoyés que si vous validez une demande. Vous pouvez demander l'accès, la rectification ou la suppression de vos données en écrivant à ${esc(lg.email)}. Le site n'utilise pas de cookies publicitaires ni de mesure d'audience.</p>`;
})();
