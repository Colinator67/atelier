/* =========================================================================
   CONFIGURATION DU SITE — c'est le seul fichier à modifier au quotidien.
   Prix, matériaux, couleurs, vitesses laser, textes de contact.
   ========================================================================= */
window.SITE_CONFIG = {
  // ---- Identité --------------------------------------------------------
  brand: "impression_ant",              // nom affiché en haut à gauche
  tagline: "Impression 3D & découpe laser sur mesure",
  contactEmail: "",                     // ex. "contact@mondomaine.fr" — affiché si l'envoi automatique échoue
  // Point d'envoi des demandes (fonction Cloudflare Pages fournie dans /functions/api/demande.js)
  requestEndpoint: "/api/demande",
  // Anti-spam Cloudflare Turnstile (facultatif) : colle ta "site key" ici pour l'activer
  turnstileSiteKey: "",

  // ---- Impression 3D ---------------------------------------------------
  print: {
    pricePerKg: 17,          // €/kg, tous matériaux
    pricePerHour: 1,         // €/h machine
    // Volume utile max (mm) : au-delà, le site prévient que la pièce devra être découpée
    maxSize: [256, 256, 256],
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
      { id: "PLA",  label: "PLA",  density: 1.24, flow: 10,  note: "Rigide, large choix de couleurs et d'effets" },
      { id: "PETG", label: "PETG", density: 1.27, flow: 8,   note: "Plus résistant à la chaleur et aux chocs" },
      { id: "TPU",  label: "TPU",  density: 1.21, flow: 3.5, note: "Souple, type caoutchouc" }
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
    name: "[Prénom Nom]",
    status: "Entrepreneur individuel",
    siret: "[SIRET]",
    address: "[Adresse ou domiciliation]",
    email: "[email de contact]",
    host: "Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis — pages.cloudflare.com"
  }
};
