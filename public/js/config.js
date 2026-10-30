/* =========================================================================
   CONFIGURATION DU SITE — c'est le seul fichier à modifier au quotidien.
   Prix, matériaux, couleurs, vitesses laser, textes de contact.
   ========================================================================= */
window.SITE_CONFIG = {
  // ---- Identité --------------------------------------------------------
  brand: "impression_ant",              // nom affiché en haut à gauche
  tagline: "Impression 3D & découpe laser sur mesure",
  contactEmail: "impression.ant.laser@gmail.com",                     // ex. "contact@mondomaine.fr" — affiché si l'envoi automatique échoue
  // Point d'envoi des demandes (fonction Cloudflare Pages fournie dans /functions/api/demande.js)
  requestEndpoint: "/api/demande",
  // Anti-spam Cloudflare Turnstile (facultatif) : colle ta "site key" ici pour l'activer
  turnstileSiteKey: "",

  // ---- Engagements affichés sur le site (à ajuster) ---------------------
  delays: {
    reply: "24 à 48 h",                 // délai de première réponse
    make: "3 à 7 jours",                // délai de fabrication habituel après validation
    shipping: "Colissimo ou remise en main propre"
  },

  // ---- Avis clients réels (la section reste cachée tant que la liste est vide)
  // { name: "Julie", city: "Strasbourg", text: "…", project: "Tableau multicouche", photo: "portfolio/img/xxx.jpg" }
  reviews: [],

  // ---- Machines de l'atelier (page « L'atelier ») -----------------------
  // photo facultative : "img/atelier/x1c.jpg"
  machines: [
    // art = illustration dessinée (x1c, a1mini, u1, zr, giga, laser, uv) ; photo = ta photo, qui la remplace si tu en ajoutes une
    { name: "Bambu Lab X1-Carbon", kind: "Impression 3D", art: "x1c",
      // tes visuels : fermé, ouvert, et la porte découpée (frame = taille du cadrage, doorRect = porte en px dans ce cadrage)
      photos: { closed: "img/atelier/x1c-ferme.webp", open: "img/atelier/x1c-ouvert.webp", inside: "img/atelier/x1c-interieur.webp", frame: [820, 842], doorRect: [259, 310, 460, 453], openAngle: 118,
        // porte reconstruite : vitre mesurée sur tes images (teinte et opacité), cadre, et ta poignée découpée (position en px dans le cadrage)
        glass: "rgba(55, 55, 55, .62)", frameColor: "#2A2A29", handle: { src: "img/atelier/x1c-poignee.webp", rect: [676, 486, 44, 48] } },
      tech: "FDM fermée, multicolore", materials: "PLA, PETG, TPU", size: "256 × 256 × 256 mm",
      use: "Objets déco multicolores, figurines, pièces fonctionnelles" },
    { name: "Bambu Lab A1 mini", kind: "Impression 3D", art: "a1mini",
      // tes visuels : machine sans le bras (fond), bras découpé dans la vue « bras en bas » (rect en px dans le cadrage), vue « bras en haut »
      photos: { closed: "img/atelier/a1mini-sans-bras.webp", open: "img/atelier/a1mini-haut.webp", frame: [720, 800],
        arm: { src: "img/atelier/a1mini-bras.webp", rect: [15, 347, 542, 277], lift: 240 } },
      tech: "FDM compacte", materials: "PLA, PETG, TPU", size: "180 × 180 × 180 mm",
      use: "Petites pièces, porte-clés, séries rapides" },
    { name: "Snapmaker U1", kind: "Impression 3D", art: "u1",
      tech: "FDM à changeur d'outils, 4 têtes", materials: "PLA, PETG, TPU, mélangeables dans une même pièce", size: "270 × 270 × 270 mm",
      use: "Pièces rigides et souples à la fois, multicolore sans purge" },
    { name: "WonderMaker ZR Ultra", kind: "Impression 3D", art: "zr",
      tech: "FDM à changeur d'outils, 4 têtes en 5 s", materials: "PLA, PETG, TPU", size: "300 × 270 × 290 mm",
      use: "Multicolore à couleurs franches, multimatière" },
    { name: "Elegoo OrangeStorm Giga", kind: "Impression 3D grand format", art: "giga",
      tech: "FDM grand format, plateau en 4 zones", materials: "PLA, PETG", size: "800 × 800 × 1000 mm",
      use: "Grandes pièces d'un seul tenant : décors, maquettes, prototypes" },
    { name: "xTool M1 Ultra", kind: "Découpe et gravure laser", art: "laser",
      tech: "Laser à diode, découpe et gravure", materials: "MDF, contreplaqué, carton", size: "300 × 300 mm",
      use: "Tableaux multicouches, tampons, signalétique, boîtes" },
    { name: "eufyMake E1", kind: "Impression UV", art: "uv",
      tech: "Jet d'encre UV, couleurs et relief", materials: "Bois, acrylique, métal, pièces imprimées", size: "330 × 420 mm (A3), relief jusqu'à 5 mm",
      use: "Mettre en couleur une découpe laser ou une impression 3D" }
  ],


  // ---- Questions fréquentes (page « L'atelier ») -------------------------
  faq: [
    { q: "Le prix du simulateur est-il définitif ?", a: "Non, c'est une estimation calculée à partir de votre fichier. Je vérifie le fichier et vous envoie un devis définitif par email avant toute fabrication. Rien n'est payé sur le site." },
    { q: "Comment se passe le paiement ?", a: "Les modalités sont indiquées sur le devis. La fabrication démarre après votre accord écrit et le paiement ou l'acompte prévu." },
    { q: "Combien de temps faut-il ?", a: "Je réponds sous {reply}. La fabrication prend en général {make} après validation du devis ; le délai exact est écrit sur le devis." },
    { q: "Comment la pièce m'est-elle livrée ?", a: "Par {shipping}. Les frais de port sont indiqués à part sur le devis." },
    { q: "Et si mon fichier n'est pas imprimable ?", a: "Je vous le signale avant fabrication, avec ce qui pose problème. Je peux corriger le fichier ou le remodéliser : c'est précisé sur le devis." },
    { q: "Je n'ai pas de fichier, seulement une idée.", a: "C'est fréquent. Décrivez votre projet, ajoutez une photo ou un croquis : je modélise la pièce ou je dessine le fichier de découpe, et vous validez un aperçu avant la fabrication." },
    { q: "Les couleurs et l'aspect sont-ils garantis ?", a: "Les couleurs à l'écran sont indicatives. L'impression 3D laisse de fines lignes de couches et la découpe laser des bords légèrement brunis : c'est propre à ces techniques, pas un défaut." },
    { q: "Puis-je retourner une pièce ?", a: "Les pièces faites sur mesure ne sont pas concernées par le droit de rétractation. En cas de défaut, envoyez-moi des photos : je propose une réparation, un remplacement ou un remboursement selon la garantie légale." }
  ],

  // ---- Impression 3D ---------------------------------------------------
  print: {
    pricePerKg: 17,          // €/kg, tous matériaux
    pricePerHour: 7,         // €/h machine (calé sur tes prix de référence : magnet 5 €, coq 25 €, trophée train 40 €)
    setupFee: 2.5,           // € de frais de préparation, une fois par commande
    // Volume utile max (mm) : au-delà, le site prévient que la pièce devra être découpée
    maxSize: [800, 800, 1000],   // Elegoo OrangeStorm Giga
    // Coefficients d'estimation — à recaler avec tes résultats Orca (voir README)
    estimate: {
      wallThickness: 0.9,    // mm : 2 périmètres de 0,45 mm, appliqué sur toute la surface
      layerHeight: 0.2,      // mm
      layerOverheadS: 2.0,   // s perdues par couche (changements, retraits, déplacements)
      setupMinutes: 6,       // préchauffe, calibration, purge
      supportAngle: 45,      // ° : faces plus inclinées que ça vers le bas = supports
      supportFill: 0.15      // densité moyenne des supports
    },
    infillOptions: [
      { id: "standard", label: "Standard (15 %)", value: 0.15 },
      { id: "renforce", label: "Renforcé (40 %)", value: 0.40 },
      { id: "plein",    label: "Plein (100 %)",   value: 1.00 }
    ],
    materials: [
      { id: "PLA",  label: "PLA",  density: 1.24, flow: 10,  note: "Rigide, large choix de couleurs et d'effets", traits: { rigidite: 3, souplesse: 0, chaleur: 1, exterieur: 1 }, best: "Déco, prototypes, figurines" },
      { id: "PETG", label: "PETG", density: 1.27, flow: 8,   note: "Plus résistant à la chaleur et aux chocs", traits: { rigidite: 2, souplesse: 1, chaleur: 2, exterieur: 3 }, best: "Pièces mécaniques, extérieur, voiture" },
      { id: "TPU",  label: "TPU",  density: 1.21, flow: 3.5, note: "Souple, type caoutchouc", traits: { rigidite: 0, souplesse: 3, chaleur: 1, exterieur: 2 }, best: "Joints, coques, pièces anti-choc" }
    ],
    // flow = débit moyen réel en mm³/s (déplacements compris). Sert au calcul du temps.
    colors: {
      PLA: [
        { group: "Couleurs", items: [
          { id: "rouge",  label: "Rouge",  swatch: "#D33A3A" },
          { id: "orange", label: "Orange", swatch: "#EE7B30" },
          { id: "jaune",  label: "Jaune",  swatch: "#F2C53D" },
          { id: "vert",   label: "Vert",   swatch: "#3E9E55" },
          { id: "bleu",   label: "Bleu",   swatch: "#2F74C9" },
          { id: "indigo", label: "Indigo", swatch: "#3D3F9A" },
          { id: "violet", label: "Violet", swatch: "#8248A8" }
        ]},
        { group: "Paillettes", items: [
          { id: "paillettes-or",   label: "Paillettes or",   swatch: "linear-gradient(135deg,#B8913A,#F3D98A 45%,#9C7726)" },
          { id: "paillettes-noir", label: "Paillettes noir", swatch: "linear-gradient(135deg,#151515,#4A4A4A 45%,#0D0D0D)" },
          { id: "paillettes-gris", label: "Paillettes gris", swatch: "linear-gradient(135deg,#7A7A7A,#C9C9C9 45%,#6A6A6A)" }
        ]},
        { group: "Thermochromique", items: [
          { id: "thermo-blanc-violet", label: "Blanc → violet", swatch: "linear-gradient(90deg,#F4F4F4 50%,#8248A8 50%)" },
          { id: "thermo-jaune-orange", label: "Jaune → orange", swatch: "linear-gradient(90deg,#F2C53D 50%,#EE7B30 50%)" }
        ]},
        { group: "Bi-color", items: [
          { id: "bicolor", label: "Bi-color (préciser les 2 teintes)", swatch: "conic-gradient(#2F74C9 0 50%,#D33A3A 0)" }
        ]}
      ],
      PETG: null,   // null = couleur à préciser par le client dans sa demande
      TPU: null
    }
  },

  // ---- Découpe / gravure laser (xTool M1 Ultra) ------------------------
  laser: {
    maxSize: [300, 300],     // mm, zone de travail — à ajuster selon tes plaques
    engraveLineInterval: 0.1,// mm entre deux lignes de gravure
    cutOverhead: 1.10,       // +10 % : accélérations et déplacements entre coupes
    engraveOverhead: 1.25,   // +25 % : allers-retours de la tête en gravure
    minMinutes: 1,           // facturation minimale
    // Vitesses de départ pour un laser diode 10 W — à corriger avec tes vrais réglages
    materials: [
      { id: "mdf3",    label: "MDF 3 mm",          pricePerMin: 1.0, cutSpeed: 5,  passes: 1, engraveSpeed: 250 },
      { id: "mdf5",    label: "MDF 5 mm",          pricePerMin: 1.0, cutSpeed: 3,  passes: 2, engraveSpeed: 250 },
      { id: "cp3",     label: "Contreplaqué 3 mm", pricePerMin: 1.0, cutSpeed: 6,  passes: 1, engraveSpeed: 250 },
      { id: "cp5",     label: "Contreplaqué 5 mm", pricePerMin: 1.0, cutSpeed: 4,  passes: 2, engraveSpeed: 250 },
      { id: "carton3", label: "Carton 3 mm",       pricePerMin: 0.5, cutSpeed: 15, passes: 1, engraveSpeed: 300 }
    ],
    stamps: [
      { id: "t6",  label: "Tampon Ø 6 cm",  price: 10 },
      { id: "t10", label: "Tampon Ø 10 cm", price: 15 },
      { id: "t20", label: "Tampon Ø 20 cm", price: 25 }
    ]
  },

  // ---- Mentions légales (obligatoires en France) ----------------------
  legal: {
    name: "Colin Ehret",                       // dénomination : MONSIEUR COLIN EHRET
    tradeName: "impression_ant (IMPRESSION ANT)",
    status: "Entrepreneur individuel (EI)",
    siren: "941 785 453",
    siret: "941 785 453 00015",
    rne: "Immatriculé au Registre national des entreprises (RNE) depuis le 25 mars 2025",
    ape: "7410Z — Activités spécialisées de design",
    address: "27 B route de Brumath, 67670 Mommenheim, France",
    email: "impression.ant.laser@gmail.com",
    vatMention: "TVA non applicable, art. 293 B du CGI",
    mediator: { name: "Société Médiation Professionnelle", url: "http://www.mediateur-consommation-smp.fr", address: "Alteritae, 5 rue Salvaing, 12000 Rodez" },
    host: "Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis — pages.cloudflare.com"
  }
};
