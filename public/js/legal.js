/* Mentions légales et conditions générales de vente, remplies depuis config.js (bloc legal). */
(function () {
  "use strict";
  const C = window.SITE_CONFIG;
  const { $, esc } = window.UI;
  const lg = C.legal;
  const who = `${esc(lg.name)}, ${esc(lg.status)}, exerçant sous le nom commercial ${esc(lg.tradeName)}`;
  const ids = `SIREN ${esc(lg.siren)} · SIRET ${esc(lg.siret)}<br>${esc(lg.rne)}<br>Code APE ${esc(lg.ape)}<br>${esc(lg.address)}`;

  if ($("#legal")) {
    $("#legal").innerHTML = `
    <h3>Éditeur du site</h3>
    <p>${who}.<br>${ids}<br>${esc(lg.vatMention)}<br>Contact : ${esc(lg.email)}</p>
    <h3>Directeur de la publication</h3>
    <p>${esc(lg.name)}</p>
    <h3>Hébergement</h3>
    <p>${esc(lg.host)}</p>
    <h3>Devis</h3>
    <p>Les prix affichés par les simulateurs sont des estimations indicatives, hors frais de port et sans valeur contractuelle. Le prix définitif est confirmé par email après vérification du fichier. Voir les <a href="cgv.html">conditions générales de vente</a>.</p>
    <h3>Propriété intellectuelle</h3>
    <p>Les textes, photos, modèles et logos présentés sur ce site sont la propriété de ${esc(lg.name)}, sauf mention contraire. Toute reproduction sans autorisation est interdite.</p>
    <h3>Données personnelles</h3>
    <p>Lorsque vous envoyez une demande, votre email, votre message et vos fichiers me sont transmis uniquement pour vous répondre et établir un devis. Ils transitent par les services de Cloudflare (hébergement) et Discord ou Resend (notification de la demande), ne sont ni revendus ni utilisés à des fins publicitaires, et sont supprimés au plus tard 3 ans après notre dernier échange. Les fichiers déposés dans les simulateurs sont analysés dans votre navigateur et ne sont envoyés que si vous validez une demande. Vous pouvez demander l'accès, la rectification ou la suppression de vos données en écrivant à ${esc(lg.email)}, et saisir la CNIL (cnil.fr) en cas de difficulté. Le site n'utilise pas de cookies publicitaires ni de mesure d'audience.</p>`;
  }

  if ($("#cgv")) {
    $("#cgv").innerHTML = `
    <p>En vigueur au ${new Date(2026, 9, 19).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.</p>

    <h3>1. Vendeur</h3>
    <p>${who}.<br>${ids}<br>${esc(lg.vatMention)}<br>Contact : ${esc(lg.email)}</p>

    <h3>2. Objet</h3>
    <p>Les présentes conditions s'appliquent aux prestations proposées sur ce site : impression 3D, modélisation 3D, découpe et gravure laser, tampons et création de fichiers de découpe, pour des clients particuliers et professionnels. Toute commande implique leur acceptation.</p>

    <h3>3. Devis et commande</h3>
    <p>Les prix affichés par les simulateurs sont des estimations indicatives, calculées automatiquement à partir du fichier et des options choisies. Ils ne constituent pas une offre ferme. Après examen de la demande, un devis définitif est envoyé par email : il précise le prix, les options, le délai, les frais de port et les modalités de paiement. La commande est ferme lorsque le client accepte ce devis par écrit (email) et, le cas échéant, règle l'acompte qui y est indiqué.</p>

    <h3>4. Prix</h3>
    <p>Les prix sont exprimés en euros. Sauf mention contraire, ils ne comprennent pas les frais de port, indiqués séparément sur le devis. ${esc(lg.vatMention)}</p>

    <h3>5. Paiement</h3>
    <p>Le paiement s'effectue selon les modalités indiquées sur le devis. Aucun paiement n'est réalisé sur le site. La fabrication démarre après acceptation du devis et réception du paiement ou de l'acompte prévu.</p>

    <h3>6. Fichiers fournis par le client</h3>
    <p>Le client garantit détenir les droits nécessaires sur les fichiers, logos, images et textes qu'il transmet, et que leur reproduction ne porte pas atteinte aux droits de tiers (droits d'auteur, marques). Le vendeur peut refuser toute demande dont le contenu serait illicite ou contraire aux droits d'un tiers. La qualité du résultat dépend de celle du fichier fourni : le vendeur signale avant fabrication les défauts qu'il identifie, mais ne peut être tenu responsable d'un défaut de conception du fichier fourni par le client.</p>

    <h3>7. Modélisation et création de fichiers</h3>
    <p>Les modèles 3D et fichiers de découpe réalisés sur mesure sont soumis à la validation d'un aperçu par le client avant fabrication ou livraison. Sauf accord contraire précisé dans le devis, le client obtient le droit d'utiliser l'objet ou le fichier livré pour son propre usage ; le vendeur conserve ses droits d'auteur sur les créations originales et peut présenter le travail réalisé dans son portfolio, sauf demande de confidentialité du client.</p>

    <h3>8. Fabrication et aspect des pièces</h3>
    <p>Les pièces sont fabriquées à la demande par impression 3D ou découpe laser. Ces procédés laissent des marques propres à la technique (lignes de couches, traces de supports, brûlures de découpe) et les matériaux naturels comme le bois présentent des variations de teinte : ces caractéristiques ne constituent pas des défauts. Les couleurs affichées à l'écran sont indicatives.</p>

    <h3>9. Délais et livraison</h3>
    <p>Le délai indiqué sur le devis court à partir de l'acceptation et du paiement prévu. Les produits sont envoyés à l'adresse indiquée par le client, ou remis en main propre sur accord. Les frais de port sont à la charge du client. Pour un client particulier, le transfert des risques a lieu lorsqu'il prend physiquement possession du produit. En cas de colis endommagé, le client émet des réserves auprès du transporteur et prévient le vendeur dans les meilleurs délais.</p>

    <h3>10. Droit de rétractation</h3>
    <p>Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne s'applique pas aux biens confectionnés selon les spécifications du consommateur ou nettement personnalisés, ce qui est le cas des pièces fabriquées sur mesure, ni aux contenus numériques fournis sans support matériel (fichiers) dont l'exécution a commencé avec l'accord du consommateur.</p>

    <h3>11. Garanties légales</h3>
    <p>Les clients particuliers bénéficient de la garantie légale de conformité (articles L217-3 et suivants du Code de la consommation) et de la garantie des vices cachés (articles 1641 et suivants du Code civil). En cas de défaut, le client contacte le vendeur par email avec une description et des photos ; le vendeur propose une réparation, un remplacement ou un remboursement selon les cas prévus par la loi.</p>

    <h3>12. Responsabilité</h3>
    <p>Les pièces sont destinées à l'usage décrit dans la demande. Le vendeur ne peut être tenu responsable d'une utilisation non prévue (contact alimentaire, charge mécanique, exposition à la chaleur) qui n'aurait pas été signalée lors de la demande.</p>

    <h3>13. Réclamations et médiation</h3>
    <p>Toute réclamation est à adresser à ${esc(lg.email)}. Si aucune solution n'est trouvée, le client particulier peut recourir gratuitement au médiateur de la consommation : ${esc(lg.mediator)}.</p>

    <h3>14. Données personnelles</h3>
    <p>Le traitement des données est décrit dans les <a href="mentions-legales.html">mentions légales</a>.</p>

    <h3>15. Droit applicable</h3>
    <p>Les présentes conditions sont soumises au droit français. À défaut d'accord amiable, le litige est porté devant les tribunaux compétents ; pour un client particulier, selon les règles de compétence du Code de la consommation.</p>`;
  }
})();
