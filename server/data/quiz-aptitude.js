// Banque de questions du quiz d'aptitude professionnelle rempli par chaque
// candidat juste après la création de son compte.
//
// STRUCTURE (30 questions QCM, 300 points, 10 points/question) :
//   - 15 questions "culture générale professionnelle" (communes à tous les
//     candidats) : situations de travail, logique, français, bon sens pro.
//   - 15 questions spécifiques au domaine choisi par le candidat à
//     l'inscription (Informatique & Digital, Finance & Comptabilité, etc.).
//     Si le domaine du candidat n'est pas reconnu, on utilise le lot
//     "Autres domaines".
//
// + 5 QUESTIONS BONUS (non notées, non QCM) sur les objectifs de carrière du
//   candidat. Elles ne comptent pas dans le score : elles sont simplement
//   recueillies et affichées dans la fiche du candidat ("À propos du
//   candidat") pour aider les entreprises à mieux cerner ses ambitions.
//
// "correcte" = index (0-3) de la bonne réponse dans "options".

const QUESTIONS_GENERALES = [
  {
    id: 'g1',
    question: "Un employeur vous convoque à un entretien à 9h et vous êtes en retard de 20 minutes sans l'avoir prévenu. Quelle est la meilleure attitude ?",
    options: [
      "Ne rien dire et espérer que ça passe inaperçu",
      "S'excuser brièvement, expliquer la raison sans s'attarder, puis se concentrer sur l'entretien",
      "Annuler l'entretien et en redemander un autre",
      "Rejeter la faute sur les transports en commun sans s'excuser"
    ],
    correcte: 1
  },
  {
    id: 'g2',
    question: "Suite logique : 2, 4, 8, 16, ... ?",
    options: ["24", "32", "20", "18"],
    correcte: 1
  },
  {
    id: 'g3',
    question: "Quel mot complète le mieux : « Un salarié PONCTUEL est celui qui... »",
    options: [
      "arrive toujours à l'heure",
      "travaille très vite",
      "connaît bien son métier",
      "ne prend jamais de congés"
    ],
    correcte: 0
  },
  {
    id: 'g4',
    question: "Si 3 ouvriers construisent un mur en 6 jours, combien de jours faudra-t-il à 6 ouvriers pour construire le même mur (travail identique) ?",
    options: ["12 jours", "6 jours", "3 jours", "2 jours"],
    correcte: 2
  },
  {
    id: 'g5',
    question: "Votre supérieur vous confie une tâche urgente alors que vous êtes déjà surchargé. Que faites-vous en priorité ?",
    options: [
      "Accepter sans rien dire et rester tard sans en parler",
      "Refuser catégoriquement",
      "Expliquer calmement votre charge actuelle et demander comment prioriser ensemble",
      "Faire la nouvelle tâche à moitié pour gagner du temps"
    ],
    correcte: 2
  },
  {
    id: 'g6',
    question: "Trouvez l'intrus dans cette liste : Comptable, Infirmier, Marteau, Ingénieur",
    options: ["Comptable", "Infirmier", "Marteau", "Ingénieur"],
    correcte: 2
  },
  {
    id: 'g7',
    question: "Quelle phrase est correctement écrite ?",
    options: [
      "Je c'est faire ce travail rapidement",
      "Je sais faire ce travail rapidement",
      "Je sait faire ce travail rapidement",
      "Je c'ai faire ce travail rapidement"
    ],
    correcte: 1
  },
  {
    id: 'g8',
    question: "Un client se plaint fortement mais de manière injuste. Quelle est la meilleure réaction professionnelle ?",
    options: [
      "Hausser le ton pour se défendre",
      "Ignorer la réclamation",
      "Écouter calmement, reformuler le problème, puis proposer une solution",
      "Rediriger immédiatement vers un collègue sans explication"
    ],
    correcte: 2
  },
  {
    id: 'g9',
    question: "Complétez la suite : Lundi, Mercredi, Vendredi, ... ?",
    options: ["Samedi", "Dimanche", "Jeudi", "Mardi"],
    correcte: 1
  },
  {
    id: 'g10',
    question: "Si une formation coûte 15 000 FCFA et qu'on vous applique une réduction de 20%, quel est le montant à payer ?",
    options: ["12 000 FCFA", "13 000 FCFA", "10 000 FCFA", "14 000 FCFA"],
    correcte: 0
  },
  {
    id: 'g11',
    question: "Qu'est-ce qu'un CV « à jour » ?",
    options: [
      "Un CV imprimé en couleur",
      "Un CV qui reflète vos expériences et compétences les plus récentes",
      "Un CV de plus de 3 pages",
      "Un CV rédigé en anglais uniquement"
    ],
    correcte: 1
  },
  {
    id: 'g12',
    question: "Vous constatez qu'un collègue commet une erreur qui pourrait nuire à l'entreprise. Que faites-vous ?",
    options: [
      "Ne rien dire, ce n'est pas votre problème",
      "En parler discrètement et respectueusement à la personne concernée ou à un responsable",
      "Le signaler publiquement devant tout le monde",
      "Corriger l'erreur vous-même sans prévenir personne"
    ],
    correcte: 1
  },
  {
    id: 'g13',
    question: "Quel est le synonyme le plus proche de « rigoureux » dans un contexte professionnel ?",
    options: ["Sévère", "Précis et méthodique", "Lent", "Bavard"],
    correcte: 1
  },
  {
    id: 'g14',
    question: "Suite logique : A, C, E, G, ... ?",
    options: ["H", "I", "F", "J"],
    correcte: 1
  },
  {
    id: 'g15',
    question: "Le jour de votre premier entretien d'embauche, quelle tenue est la plus appropriée en général ?",
    options: [
      "Une tenue de sport confortable",
      "Une tenue sobre et soignée, adaptée au secteur d'activité",
      "Peu importe, seules les compétences comptent",
      "La tenue la plus voyante possible pour se démarquer"
    ],
    correcte: 1
  }
];

// Questions spécifiques par domaine (doivent correspondre aux <option> du
// champ "domaine" du formulaire d'inscription candidat). Le libellé "Autres
// domaines" sert de lot de secours pour tout domaine non reconnu.
const QUESTIONS_PAR_DOMAINE = {
  'Informatique & Digital': [
    {
      id: 'd1',
      question: "Que signifie le sigle « URL » ?",
      options: [
        "Adresse d'une page sur Internet",
        "Un langage de programmation",
        "Un type de virus informatique",
        "Un format de fichier image"
      ],
      correcte: 0
    },
    {
      id: 'd2',
      question: "Quel logiciel sert principalement à créer des tableaux et des calculs automatiques ?",
      options: ["Microsoft Word", "Microsoft Excel", "Microsoft PowerPoint", "Adobe Photoshop"],
      correcte: 1
    },
    {
      id: 'd3',
      question: "Un mot de passe « fort » et sécurisé, c'est plutôt :",
      options: [
        "12345678",
        "Le prénom de l'utilisateur",
        "Une combinaison longue de lettres, chiffres et symboles",
        "Le même mot de passe pour tous les comptes"
      ],
      correcte: 2
    },
    {
      id: 'd4',
      question: "Que veut dire « sauvegarder » un fichier ?",
      options: [
        "Le supprimer définitivement",
        "L'enregistrer pour ne pas perdre le travail effectué",
        "L'imprimer",
        "Le partager sur les réseaux sociaux"
      ],
      correcte: 1
    },
    {
      id: 'd5',
      question: "Quel est le rôle principal d'un antivirus ?",
      options: [
        "Accélérer l'ordinateur",
        "Détecter et bloquer les programmes malveillants",
        "Créer des sites web",
        "Gérer les emails uniquement"
      ],
      correcte: 1
    },
    {
      id: 'd6',
      question: "Dans le développement web, que désigne « HTML » ?",
      options: [
        "Un langage pour structurer le contenu d'une page web",
        "Un logiciel de retouche photo",
        "Un type de base de données",
        "Un protocole de messagerie"
      ],
      correcte: 0
    },
    {
      id: 'd7',
      question: "Le « cloud » (informatique en nuage), c'est :",
      options: [
        "Un stockage de données accessible via Internet, sur des serveurs distants",
        "Un logiciel antivirus",
        "Un type de clavier",
        "Une imprimante connectée"
      ],
      correcte: 0
    },
    {
      id: 'd8',
      question: "Vous recevez un email suspect vous demandant vos identifiants bancaires. Quelle est la bonne réaction ?",
      options: [
        "Répondre avec vos identifiants immédiatement",
        "Cliquer sur le lien pour vérifier",
        "Ne pas répondre, ne pas cliquer, et signaler l'email comme suspect (tentative de phishing)",
        "Transférer l'email à tous vos contacts"
      ],
      correcte: 2
    },
    {
      id: 'd9',
      question: "Que signifie « débugger » un programme ?",
      options: [
        "L'installer",
        "Corriger les erreurs qu'il contient",
        "Le supprimer",
        "Le traduire dans une autre langue"
      ],
      correcte: 1
    },
    {
      id: 'd10',
      question: "Parmi ces outils, lequel sert à la gestion de projet et au suivi de tâches en équipe ?",
      options: ["Trello / Asana", "Photoshop", "VLC", "WinRAR"],
      correcte: 0
    },
    {
      id: 'd11',
      question: "Un « raccourci clavier » sert à :",
      options: [
        "Réparer un ordinateur cassé",
        "Exécuter rapidement une action sans passer par les menus (ex : Ctrl+C pour copier)",
        "Se connecter à Internet",
        "Formater le disque dur"
      ],
      correcte: 1
    },
    {
      id: 'd12',
      question: "Que veut dire « réseau social professionnel » (ex : LinkedIn) ?",
      options: [
        "Une plateforme pour jouer en ligne",
        "Une plateforme pour partager son parcours et se connecter avec d'autres professionnels",
        "Un logiciel de comptabilité",
        "Un antivirus"
      ],
      correcte: 1
    },
    {
      id: 'd13',
      question: "Un fichier avec l'extension « .pdf » est généralement utilisé pour :",
      options: [
        "Un document figé, facile à partager sans qu'il soit modifié",
        "Écouter de la musique",
        "Regarder une vidéo",
        "Stocker une base de données uniquement"
      ],
      correcte: 0
    },
    {
      id: 'd14',
      question: "Que signifie l'acronyme « IA » dans un contexte technologique actuel ?",
      options: ["Interface Automatique", "Intelligence Artificielle", "Internet Avancé", "Installation Automatisée"],
      correcte: 1
    },
    {
      id: 'd15',
      question: "Pourquoi est-il recommandé de mettre régulièrement à jour ses logiciels ?",
      options: [
        "Pour occuper de l'espace disque",
        "Pour corriger des failles de sécurité et améliorer les performances",
        "Pour ralentir volontairement l'ordinateur",
        "Ce n'est jamais utile"
      ],
      correcte: 1
    }
  ],

  'Finance & Comptabilité': [
    {
      id: 'd1',
      question: "Que signifie « CA » en entreprise ?",
      options: ["Chiffre d'Affaires", "Compte Annuel", "Charge Administrative", "Capital Ajusté"],
      correcte: 0
    },
    {
      id: 'd2',
      question: "Une facture impayée par un client est enregistrée comme :",
      options: ["Une charge", "Une créance", "Un dividende", "Un amortissement"],
      correcte: 1
    },
    {
      id: 'd3',
      question: "Le bilan comptable présente principalement :",
      options: [
        "Les actifs et les passifs (dettes) d'une entreprise à un instant donné",
        "Uniquement les ventes du mois",
        "La liste des employés",
        "Le planning des congés"
      ],
      correcte: 0
    },
    {
      id: 'd4',
      question: "Si un produit coûte 8 000 FCFA et est vendu 10 000 FCFA, la marge réalisée est de :",
      options: ["1 000 FCFA", "2 000 FCFA", "8 000 FCFA", "18 000 FCFA"],
      correcte: 1
    },
    {
      id: 'd5',
      question: "La TVA est :",
      options: [
        "Une taxe payée par le salarié uniquement",
        "Un impôt indirect sur la consommation, collecté par l'entreprise",
        "Le salaire net d'un employé",
        "Une prime de fin d'année"
      ],
      correcte: 1
    },
    {
      id: 'd6',
      question: "Un « bon de commande » sert à :",
      options: [
        "Officialiser une commande auprès d'un fournisseur",
        "Payer un salaire",
        "Déclarer les impôts",
        "Licencier un employé"
      ],
      correcte: 0
    },
    {
      id: 'd7',
      question: "Que veut dire « trésorerie » d'une entreprise ?",
      options: [
        "L'ensemble des liquidités disponibles immédiatement (caisse, banque)",
        "Le nombre d'employés",
        "Le logo de l'entreprise",
        "Le local commercial"
      ],
      correcte: 0
    },
    {
      id: 'd8',
      question: "Un budget prévisionnel sert à :",
      options: [
        "Décrire le passé de l'entreprise uniquement",
        "Anticiper et planifier les recettes et dépenses futures",
        "Remplacer le CV d'un candidat",
        "Fixer les horaires de travail"
      ],
      correcte: 1
    },
    {
      id: 'd9',
      question: "Un « débit » sur un compte correspond à :",
      options: ["Une entrée d'argent uniquement", "Une sortie ou charge enregistrée", "Un bénéfice net", "Un impôt annulé"],
      correcte: 1
    },
    {
      id: 'd10',
      question: "Le rôle principal d'un comptable est de :",
      options: [
        "Gérer uniquement le recrutement",
        "Enregistrer, contrôler et présenter les opérations financières de l'entreprise",
        "Superviser la production industrielle",
        "Concevoir des publicités"
      ],
      correcte: 1
    },
    {
      id: 'd11',
      question: "Un « relevé bancaire » permet de :",
      options: [
        "Suivre les mouvements (entrées/sorties) d'un compte bancaire",
        "Connaître la météo",
        "Créer une entreprise",
        "Recruter du personnel"
      ],
      correcte: 0
    },
    {
      id: 'd12',
      question: "Si une entreprise dépense plus qu'elle ne gagne sur une période, elle est en situation de :",
      options: ["Bénéfice", "Excédent", "Déficit / perte", "Croissance"],
      correcte: 2
    },
    {
      id: 'd13',
      question: "Un « devis » est :",
      options: [
        "Une estimation du prix d'une prestation avant réalisation",
        "Une facture déjà payée",
        "Un contrat de travail",
        "Un relevé de notes"
      ],
      correcte: 0
    },
    {
      id: 'd14',
      question: "Quel document officialise un paiement déjà effectué ?",
      options: ["Le devis", "Le bon de commande", "La facture / le reçu", "Le contrat de travail"],
      correcte: 2
    },
    {
      id: 'd15',
      question: "Pourquoi est-il important de conserver ses pièces comptables (factures, reçus) ?",
      options: [
        "Ce n'est pas nécessaire",
        "Pour justifier les opérations en cas de contrôle et assurer une bonne gestion",
        "Uniquement pour décorer le bureau",
        "Pour les revendre"
      ],
      correcte: 1
    }
  ],

  'Marketing & Communication': [
    {
      id: 'd1',
      question: "Le « marketing » consiste principalement à :",
      options: [
        "Comprendre les besoins des clients et y répondre pour vendre un produit/service",
        "Gérer uniquement la paie des employés",
        "Réparer des équipements",
        "Faire la comptabilité de l'entreprise"
      ],
      correcte: 0
    },
    {
      id: 'd2',
      question: "Que désigne la « cible » dans une campagne marketing ?",
      options: [
        "Le budget total de l'entreprise",
        "Le groupe de clients potentiels visé par le produit ou le message",
        "Le nom du produit",
        "Le logo de l'entreprise"
      ],
      correcte: 1
    },
    {
      id: 'd3',
      question: "Un « slogan » est :",
      options: [
        "Une phrase courte et mémorable qui résume l'image d'une marque",
        "Un rapport financier",
        "Un contrat commercial",
        "Un logiciel de gestion"
      ],
      correcte: 0
    },
    {
      id: 'd4',
      question: "Les « réseaux sociaux » sont aujourd'hui surtout utilisés en communication pour :",
      options: [
        "Uniquement se divertir",
        "Faire uniquement de la comptabilité",
        "Toucher et interagir directement avec les clients/audience",
        "Remplacer les entretiens d'embauche"
      ],
      correcte: 2
    },
    {
      id: 'd5',
      question: "Que signifie « fidéliser un client » ?",
      options: [
        "L'inciter à acheter une seule fois",
        "L'amener à revenir régulièrement grâce à une bonne relation/expérience",
        "Augmenter ses prix sans raison",
        "Ignorer ses retours"
      ],
      correcte: 1
    },
    {
      id: 'd6',
      question: "Une étude de marché sert à :",
      options: [
        "Décorer les locaux de l'entreprise",
        "Comprendre les attentes des consommateurs et la concurrence avant de lancer un produit",
        "Payer les salaires",
        "Remplacer le service client"
      ],
      correcte: 1
    },
    {
      id: 'd7',
      question: "Le « branding » (image de marque) concerne :",
      options: [
        "La gestion des stocks uniquement",
        "L'identité et la perception d'une entreprise/marque auprès du public",
        "Le calcul des impôts",
        "Le recrutement du personnel"
      ],
      correcte: 1
    },
    {
      id: 'd8',
      question: "Une bonne communication professionnelle avec un client passe surtout par :",
      options: [
        "Un langage clair, courtois et adapté à l'interlocuteur",
        "Un vocabulaire technique incompréhensible",
        "Le silence total",
        "Des messages agressifs pour convaincre"
      ],
      correcte: 0
    },
    {
      id: 'd9',
      question: "Que veut dire « prospect » en langage commercial/marketing ?",
      options: [
        "Un client déjà fidèle depuis 10 ans",
        "Un client potentiel pas encore converti",
        "Un fournisseur",
        "Un concurrent direct"
      ],
      correcte: 1
    },
    {
      id: 'd10',
      question: "Un « visuel » percutant dans une publicité doit avant tout :",
      options: [
        "Être confus et surchargé d'informations",
        "Attirer l'attention et transmettre le message rapidement",
        "Ne contenir aucune image",
        "Être identique à celui d'un concurrent"
      ],
      correcte: 1
    },
    {
      id: 'd11',
      question: "Le community management consiste à :",
      options: [
        "Gérer et animer la présence d'une marque sur les réseaux sociaux",
        "Gérer uniquement les stocks d'un entrepôt",
        "Faire la comptabilité annuelle",
        "Réparer les ordinateurs de l'entreprise"
      ],
      correcte: 0
    },
    {
      id: 'd12',
      question: "Pourquoi est-il important d'analyser les retours (avis, commentaires) des clients ?",
      options: [
        "Ce n'est jamais utile",
        "Pour améliorer le produit, le service ou la communication",
        "Uniquement pour les supprimer",
        "Pour augmenter les prix systématiquement"
      ],
      correcte: 1
    },
    {
      id: 'd13',
      question: "Qu'est-ce qu'un « argumentaire de vente » ?",
      options: [
        "Un document présentant les points forts d'un produit pour convaincre un client",
        "Un contrat de travail",
        "Un rapport comptable",
        "Un planning de congés"
      ],
      correcte: 0
    },
    {
      id: 'd14',
      question: "En communication écrite professionnelle, il vaut mieux :",
      options: [
        "Utiliser un langage familier avec des fautes",
        "Rester clair, poli et bien structuré",
        "Écrire des messages très longs sans structure",
        "Éviter toute formule de politesse"
      ],
      correcte: 1
    },
    {
      id: 'd15',
      question: "Qu'est-ce qui différencie principalement le marketing digital du marketing traditionnel ?",
      options: [
        "Le marketing digital n'utilise aucun outil",
        "Le marketing digital s'appuie sur Internet et les outils numériques pour toucher l'audience",
        "Le marketing traditionnel est toujours plus efficace",
        "Il n'y a aucune différence"
      ],
      correcte: 1
    }
  ],

  'Ressources Humaines': [
    {
      id: 'd1',
      question: "Que signifie « RH » en entreprise ?",
      options: ["Rendement Horaire", "Ressources Humaines", "Recette Hebdomadaire", "Régime Hiérarchique"],
      correcte: 1
    },
    {
      id: 'd2',
      question: "Le rôle principal du service RH est de :",
      options: [
        "Gérer uniquement la comptabilité",
        "Gérer le recrutement, la formation et le bien-être des employés",
        "Fabriquer les produits de l'entreprise",
        "Faire la publicité de l'entreprise"
      ],
      correcte: 1
    },
    {
      id: 'd3',
      question: "Un « entretien d'embauche » sert avant tout à :",
      options: [
        "Évaluer si le profil du candidat correspond au poste et à l'entreprise",
        "Signer immédiatement un contrat",
        "Fixer le salaire final sans discussion",
        "Remplacer le CV"
      ],
      correcte: 0
    },
    {
      id: 'd4',
      question: "Que désigne un « contrat à durée déterminée » (CDD) ?",
      options: [
        "Un contrat sans date de fin",
        "Un contrat de travail avec une durée limitée dans le temps",
        "Un stage non rémunéré",
        "Une lettre de motivation"
      ],
      correcte: 1
    },
    {
      id: 'd5',
      question: "La « fiche de poste » sert à :",
      options: [
        "Décrire les missions, responsabilités et compétences attendues pour un poste",
        "Calculer les impôts de l'entreprise",
        "Remplacer un bulletin de salaire",
        "Lister les fournisseurs"
      ],
      correcte: 0
    },
    {
      id: 'd6',
      question: "Un conflit entre deux collègues doit être géré en priorité par :",
      options: [
        "Le silence, en espérant que ça passe",
        "Le dialogue, éventuellement avec l'appui d'un responsable RH ou hiérarchique",
        "Le renvoi immédiat des deux personnes",
        "L'ignorance totale de la situation"
      ],
      correcte: 1
    },
    {
      id: 'd7',
      question: "Que signifie « intégration » (onboarding) d'un nouvel employé ?",
      options: [
        "Le laisser seul sans accompagnement",
        "L'accompagner pour bien démarrer dans son nouveau poste et l'entreprise",
        "Le licencier après 1 semaine",
        "Réduire son salaire la première année"
      ],
      correcte: 1
    },
    {
      id: 'd8',
      question: "Un « bulletin de paie » (fiche de paie) indique notamment :",
      options: [
        "Le salaire brut, les cotisations et le salaire net",
        "Le chiffre d'affaires de l'entreprise",
        "Le nombre de clients de l'entreprise",
        "La liste des fournisseurs"
      ],
      correcte: 0
    },
    {
      id: 'd9',
      question: "La formation continue des employés permet surtout de :",
      options: [
        "Diminuer leurs compétences",
        "Développer leurs compétences et s'adapter aux évolutions du métier",
        "Justifier des licenciements",
        "Remplacer les entretiens annuels"
      ],
      correcte: 1
    },
    {
      id: 'd10',
      question: "Qu'est-ce que le « recrutement » ?",
      options: [
        "Le processus permettant de trouver et sélectionner un candidat pour un poste",
        "Le calcul du budget annuel",
        "La gestion des stocks",
        "La création d'un logo d'entreprise"
      ],
      correcte: 0
    },
    {
      id: 'd11',
      question: "Une lettre de motivation doit avant tout :",
      options: [
        "Être identique pour toutes les candidatures",
        "Expliquer pourquoi le candidat est motivé et adapté au poste visé",
        "Contenir uniquement des informations personnelles non professionnelles",
        "Faire au moins 5 pages"
      ],
      correcte: 1
    },
    {
      id: 'd12',
      question: "Que signifie « climat social » dans une entreprise ?",
      options: [
        "La météo dans les locaux",
        "L'ambiance générale et les relations entre les employés",
        "Le chiffre d'affaires annuel",
        "Le nombre de bureaux disponibles"
      ],
      correcte: 1
    },
    {
      id: 'd13',
      question: "L'entretien annuel d'évaluation sert à :",
      options: [
        "Sanctionner systématiquement l'employé",
        "Faire le point sur les objectifs, performances et perspectives de l'employé",
        "Remplacer le contrat de travail",
        "Fixer uniquement les vacances"
      ],
      correcte: 1
    },
    {
      id: 'd14',
      question: "Le respect de la confidentialité des dossiers du personnel est :",
      options: [
        "Facultatif selon l'humeur",
        "Une obligation importante pour protéger la vie privée des employés",
        "Inutile en entreprise",
        "Réservé uniquement au directeur général"
      ],
      correcte: 1
    },
    {
      id: 'd15',
      question: "Un « préavis » de démission ou de licenciement sert à :",
      options: [
        "Ne rien annoncer et partir immédiatement",
        "Laisser un délai permettant à l'entreprise et au salarié de s'organiser",
        "Prolonger indéfiniment le contrat",
        "Annuler automatiquement le salaire dû"
      ],
      correcte: 1
    }
  ],

  'Commerce & Gestion': [
    {
      id: 'd1',
      question: "Un « client fidèle » est un client qui :",
      options: [
        "N'achète qu'une seule fois",
        "Revient régulièrement acheter les produits/services de l'entreprise",
        "Se plaint systématiquement",
        "Ne connaît pas l'entreprise"
      ],
      correcte: 1
    },
    {
      id: 'd2',
      question: "La « marge commerciale » correspond à :",
      options: [
        "La différence entre le prix de vente et le prix d'achat",
        "Le salaire du vendeur",
        "Le nombre de clients",
        "La taxe sur les produits"
      ],
      correcte: 0
    },
    {
      id: 'd3',
      question: "Que veut dire « gérer un stock » ?",
      options: [
        "Ignorer les quantités disponibles",
        "Suivre et organiser les quantités de marchandises disponibles pour éviter ruptures ou surplus",
        "Vendre tout à perte",
        "Ne jamais commander de nouveaux produits"
      ],
      correcte: 1
    },
    {
      id: 'd4',
      question: "Un bon accueil client en magasin ou en entreprise passe d'abord par :",
      options: [
        "Ignorer le client jusqu'à ce qu'il demande de l'aide",
        "Un sourire, de la politesse et une écoute attentive de son besoin",
        "Le pousser à acheter sans écouter sa demande",
        "Éviter tout contact visuel"
      ],
      correcte: 1
    },
    {
      id: 'd5',
      question: "Que signifie « négocier » dans un contexte commercial ?",
      options: [
        "Imposer son prix sans discussion",
        "Trouver un accord satisfaisant pour les deux parties (acheteur et vendeur)",
        "Refuser systématiquement toute offre",
        "Annuler la vente"
      ],
      correcte: 1
    },
    {
      id: 'd6',
      question: "Un « fournisseur » est :",
      options: [
        "Une entreprise ou personne qui livre des biens/services à une autre entreprise",
        "Un client final",
        "Un employé de l'entreprise",
        "Un concurrent direct uniquement"
      ],
      correcte: 0
    },
    {
      id: 'd7',
      question: "Pourquoi la gestion du temps est-elle importante dans le commerce ?",
      options: [
        "Elle ne sert à rien",
        "Elle permet de respecter les délais de livraison et de satisfaire les clients",
        "Elle concerne uniquement les comptables",
        "Elle empêche de vendre plus"
      ],
      correcte: 1
    },
    {
      id: 'd8',
      question: "Qu'est-ce qu'un « point de vente » ?",
      options: [
        "Un lieu physique ou en ligne où un produit/service est proposé à la vente",
        "Un document comptable",
        "Un type de contrat de travail",
        "Une réunion d'équipe"
      ],
      correcte: 0
    },
    {
      id: 'd9',
      question: "Un « objectif de vente » sert à :",
      options: [
        "Fixer un résultat chiffré à atteindre sur une période donnée",
        "Décorer la vitrine du magasin",
        "Remplacer le service après-vente",
        "Réduire automatiquement les prix"
      ],
      correcte: 0
    },
    {
      id: 'd10',
      question: "Face à un client mécontent d'un retard de livraison, la meilleure attitude est de :",
      options: [
        "Se justifier en accusant un collègue",
        "L'écouter, s'excuser si nécessaire et proposer une solution concrète",
        "Raccrocher ou l'ignorer",
        "Lui promettre n'importe quoi sans vérifier"
      ],
      correcte: 1
    },
    {
      id: 'd11',
      question: "La « gestion de la caisse » dans un commerce implique surtout :",
      options: [
        "La rigueur et l'exactitude dans le comptage de l'argent",
        "Aucune vérification n'est nécessaire",
        "Laisser la caisse ouverte en permanence",
        "Ne jamais rendre la monnaie"
      ],
      correcte: 0
    },
    {
      id: 'd12',
      question: "Qu'est-ce qu'un « inventaire » ?",
      options: [
        "Un contrat de travail",
        "Le comptage et la vérification des marchandises en stock",
        "Une campagne publicitaire",
        "Une réunion du personnel"
      ],
      correcte: 1
    },
    {
      id: 'd13',
      question: "Une bonne gestion d'entreprise implique de :",
      options: [
        "Dépenser sans suivre de budget",
        "Planifier, organiser et contrôler les ressources (temps, argent, personnel)",
        "Ignorer les résultats financiers",
        "Ne jamais évaluer les performances"
      ],
      correcte: 1
    },
    {
      id: 'd14',
      question: "Le « service après-vente » (SAV) sert à :",
      options: [
        "Accompagner le client après son achat (garantie, réparation, assistance)",
        "Vendre uniquement de nouveaux produits",
        "Remplacer la comptabilité",
        "Gérer les ressources humaines"
      ],
      correcte: 0
    },
    {
      id: 'd15',
      question: "Pourquoi est-il utile d'analyser la concurrence ?",
      options: [
        "Ce n'est jamais utile",
        "Pour ajuster son offre, ses prix et se démarquer sur le marché",
        "Pour copier entièrement leurs produits",
        "Pour ignorer les besoins des clients"
      ],
      correcte: 1
    }
  ],

  'Assurance & Banque': [
    {
      id: 'd1',
      question: "Qu'est-ce qu'une « prime d'assurance » ?",
      options: [
        "Le montant remboursé en cas de sinistre",
        "Le montant payé régulièrement par l'assuré pour être couvert",
        "Un bonus offert par la banque",
        "Le salaire de l'agent d'assurance"
      ],
      correcte: 1
    },
    {
      id: 'd2',
      question: "Un « sinistre » en assurance désigne :",
      options: [
        "Un contrat signé",
        "Un événement (accident, vol, incendie...) donnant droit à une indemnisation",
        "Le paiement mensuel de la prime",
        "Une agence bancaire"
      ],
      correcte: 1
    },
    {
      id: 'd3',
      question: "Que signifie « ouvrir un compte bancaire » ?",
      options: [
        "Créer une relation avec une banque pour déposer/gérer son argent",
        "Emprunter automatiquement de l'argent",
        "Obtenir une assurance vie gratuite",
        "Recevoir un salaire garanti"
      ],
      correcte: 0
    },
    {
      id: 'd4',
      question: "Un « crédit » (prêt) bancaire est :",
      options: [
        "Un don sans remboursement",
        "Une somme prêtée par la banque, à rembourser avec intérêts",
        "Un compte d'épargne",
        "Une assurance obligatoire"
      ],
      correcte: 1
    },
    {
      id: 'd5',
      question: "Le « taux d'intérêt » d'un prêt correspond à :",
      options: [
        "Le coût du crédit exprimé en pourcentage",
        "Le montant total emprunté",
        "La durée du prêt",
        "Le nom de la banque"
      ],
      correcte: 0
    },
    {
      id: 'd6',
      question: "Un « relevé de compte » permet au client de :",
      options: [
        "Voir l'historique de ses opérations bancaires",
        "Obtenir un nouveau crédit automatiquement",
        "Changer de banque immédiatement",
        "Annuler ses assurances"
      ],
      correcte: 0
    },
    {
      id: 'd7',
      question: "Pourquoi la confidentialité des données clients est-elle essentielle en banque/assurance ?",
      options: [
        "Elle ne l'est pas particulièrement",
        "Pour protéger la vie privée et la sécurité financière des clients",
        "Uniquement pour respecter une formalité administrative sans importance",
        "Pour faciliter la revente des données"
      ],
      correcte: 1
    },
    {
      id: 'd8',
      question: "Qu'est-ce qu'une « assurance vie » ?",
      options: [
        "Un contrat garantissant un capital ou une rente à l'assuré ou ses bénéficiaires",
        "Un compte courant classique",
        "Un type de carte bancaire",
        "Un crédit immobilier"
      ],
      correcte: 0
    },
    {
      id: 'd9',
      question: "Un « conseiller clientèle » en banque a pour rôle principal de :",
      options: [
        "Réparer les distributeurs automatiques",
        "Accompagner et conseiller les clients sur leurs opérations et produits financiers",
        "Gérer uniquement l'informatique de la banque",
        "Fixer les taux d'intérêt nationaux"
      ],
      correcte: 1
    },
    {
      id: 'd10',
      question: "Que signifie « souscrire » un contrat d'assurance ?",
      options: [
        "Annuler un contrat existant",
        "Signer et adhérer officiellement à un contrat d'assurance",
        "Recevoir une indemnisation",
        "Refuser une offre"
      ],
      correcte: 1
    },
    {
      id: 'd11',
      question: "L'« épargne » consiste à :",
      options: [
        "Dépenser tout son revenu immédiatement",
        "Mettre de côté une partie de ses revenus pour l'avenir",
        "Emprunter systématiquement",
        "Payer ses impôts"
      ],
      correcte: 1
    },
    {
      id: 'd12',
      question: "Un chèque sans provision signifie que :",
      options: [
        "Le compte du payeur ne dispose pas des fonds suffisants pour couvrir le montant",
        "Le chèque a été payé en espèces",
        "Le chèque est garanti par l'État",
        "Le montant est illimité"
      ],
      correcte: 0
    },
    {
      id: 'd13',
      question: "Face à un client qui ne comprend pas les termes d'un contrat, un bon conseiller doit :",
      options: [
        "Le lui expliquer clairement avec des mots simples",
        "Lui faire signer rapidement sans explication",
        "Changer de sujet",
        "L'ignorer"
      ],
      correcte: 0
    },
    {
      id: 'd14',
      question: "Que veut dire « franchise » dans un contrat d'assurance ?",
      options: [
        "Le montant restant à la charge de l'assuré en cas de sinistre",
        "Le montant total remboursé",
        "Le nom de la compagnie d'assurance",
        "La durée du contrat"
      ],
      correcte: 0
    },
    {
      id: 'd15',
      question: "Pourquoi la rigueur est-elle essentielle dans le secteur bancaire/assurance ?",
      options: [
        "Ce n'est pas important",
        "Car les erreurs peuvent avoir des conséquences financières importantes pour les clients",
        "Uniquement pour respecter une tradition",
        "Car cela ralentit le travail sans raison"
      ],
      correcte: 1
    }
  ],

  'Santé & Paramédical': [
    {
      id: 'd1',
      question: "Le secret professionnel dans le secteur de la santé signifie :",
      options: [
        "Partager librement les informations des patients",
        "Ne jamais divulguer les informations confidentielles d'un patient sans son consentement",
        "Ne rien noter dans le dossier du patient",
        "Une règle facultative"
      ],
      correcte: 1
    },
    {
      id: 'd2',
      question: "Face à un patient anxieux avant un soin, la meilleure attitude est de :",
      options: [
        "L'ignorer pour aller plus vite",
        "Le rassurer calmement et lui expliquer ce qui va se passer",
        "Le brusquer pour qu'il se dépêche",
        "Se moquer de son inquiétude"
      ],
      correcte: 1
    },
    {
      id: 'd3',
      question: "L'hygiène des mains dans un cadre médical/paramédical sert avant tout à :",
      options: [
        "Prévenir la transmission d'infections",
        "Faire perdre du temps",
        "Impressionner les collègues",
        "Ce n'est pas vraiment utile"
      ],
      correcte: 0
    },
    {
      id: 'd4',
      question: "Que signifie « prise en charge » d'un patient ?",
      options: [
        "L'ensemble des soins et de l'accompagnement apportés à un patient",
        "Le paiement de la facture uniquement",
        "Le transport du patient uniquement",
        "L'admission administrative seule"
      ],
      correcte: 0
    },
    {
      id: 'd5',
      question: "Un « dossier médical » sert à :",
      options: [
        "Centraliser les informations de santé d'un patient pour assurer un bon suivi",
        "Remplacer une ordonnance",
        "Servir de publicité pour l'hôpital",
        "Calculer le salaire du personnel"
      ],
      correcte: 0
    },
    {
      id: 'd6',
      question: "En cas d'urgence médicale, la priorité est de :",
      options: [
        "Paniquer sans agir",
        "Rester calme, évaluer la situation et alerter les secours/le personnel compétent",
        "Attendre sans rien faire",
        "Prendre des photos avant d'agir"
      ],
      correcte: 1
    },
    {
      id: 'd7',
      question: "Que veut dire « consentement du patient » avant un soin ?",
      options: [
        "Le patient doit être informé et donner son accord avant l'acte médical (sauf urgence vitale)",
        "Ce n'est jamais nécessaire",
        "Seule la famille doit donner son accord",
        "Le consentement concerne uniquement le paiement"
      ],
      correcte: 0
    },
    {
      id: 'd8',
      question: "Pourquoi le travail en équipe est-il essentiel dans le secteur de la santé ?",
      options: [
        "Il ne l'est pas, chacun travaille seul",
        "Car la coordination entre soignants améliore la qualité et la sécurité des soins",
        "Uniquement pour discuter entre collègues",
        "Cela ralentit toujours les soins"
      ],
      correcte: 1
    },
    {
      id: 'd9',
      question: "Un « protocole de soins » est :",
      options: [
        "Une procédure standardisée à suivre pour garantir la qualité et la sécurité des soins",
        "Un document administratif sans lien avec les soins",
        "Une facture d'hôpital",
        "Un contrat de travail"
      ],
      correcte: 0
    },
    {
      id: 'd10',
      question: "Face à un patient agressif ou en détresse, il est important de :",
      options: [
        "Répondre avec agressivité",
        "Garder son calme, écouter et désamorcer la situation avec professionnalisme",
        "Quitter immédiatement sans explication",
        "L'ignorer complètement"
      ],
      correcte: 1
    },
    {
      id: 'd11',
      question: "Que signifie « asepsie » dans un contexte médical ?",
      options: [
        "L'ensemble des mesures pour éviter toute contamination par des micro-organismes",
        "Un type de médicament",
        "Une maladie contagieuse",
        "Un examen radiologique"
      ],
      correcte: 0
    },
    {
      id: 'd12',
      question: "La ponctualité du personnel soignant est importante car :",
      options: [
        "Elle n'a aucun impact",
        "Elle assure la continuité et la qualité de la prise en charge des patients",
        "Elle concerne uniquement l'administration",
        "Elle ralentit le travail des autres"
      ],
      correcte: 1
    },
    {
      id: 'd13',
      question: "Que faire si vous avez un doute sur un soin à effectuer ?",
      options: [
        "Agir quand même sans vérifier",
        "Demander conseil à un collègue ou un responsable avant d'agir",
        "Ignorer le doute",
        "Annuler le soin sans en informer personne"
      ],
      correcte: 1
    },
    {
      id: 'd14',
      question: "L'écoute active envers un patient permet surtout de :",
      options: [
        "Perdre du temps inutilement",
        "Mieux comprendre ses besoins et instaurer un climat de confiance",
        "Éviter de faire son travail",
        "Remplacer le diagnostic médical"
      ],
      correcte: 1
    },
    {
      id: 'd15',
      question: "Le respect de la dignité du patient implique de :",
      options: [
        "Le traiter avec égard, respect et sans jugement",
        "Parler de lui librement devant d'autres patients",
        "Ignorer ses questions",
        "Le traiter différemment selon son statut social"
      ],
      correcte: 0
    }
  ],

  // Lot de secours utilisé quand le domaine du candidat n'est pas reconnu
  // (ex : ancienne saisie libre, ou "Autres domaines" sélectionné).
  'Autres domaines': [
    {
      id: 'd1',
      question: "Face à une consigne peu claire donnée par votre responsable, la meilleure réaction est de :",
      options: [
        "Deviner et espérer que c'est juste",
        "Demander poliment des précisions avant de commencer",
        "Ne rien faire",
        "Faire à sa manière sans en parler"
      ],
      correcte: 1
    },
    {
      id: 'd2',
      question: "Qu'est-ce qu'un « objectif professionnel » ?",
      options: [
        "Un résultat concret que l'on cherche à atteindre dans son travail",
        "Un simple souhait sans lien avec le travail",
        "Une règle imposée par la loi uniquement",
        "Un document administratif"
      ],
      correcte: 0
    },
    {
      id: 'd3',
      question: "Travailler en équipe demande surtout :",
      options: [
        "De l'individualisme total",
        "De la communication, de l'écoute et de la coopération",
        "D'ignorer les avis des autres",
        "De ne jamais partager d'informations"
      ],
      correcte: 1
    },
    {
      id: 'd4',
      question: "Que faire si vous constatez que vous ne pourrez pas respecter un délai fixé ?",
      options: [
        "Ne rien dire et livrer en retard sans explication",
        "Prévenir à l'avance son responsable et proposer une solution",
        "Abandonner la tâche",
        "Accuser un collègue"
      ],
      correcte: 1
    },
    {
      id: 'd5',
      question: "L'assiduité au travail signifie :",
      options: [
        "Être présent et régulier dans l'exercice de ses fonctions",
        "Travailler vite sans se soucier de la qualité",
        "Prendre le plus de pauses possible",
        "Ne venir que certains jours au choix"
      ],
      correcte: 0
    },
    {
      id: 'd6',
      question: "Recevoir une critique constructive de son supérieur doit être perçu comme :",
      options: [
        "Une attaque personnelle à éviter à tout prix",
        "Une occasion de s'améliorer dans son travail",
        "Une raison de démissionner",
        "Une erreur systématique du responsable"
      ],
      correcte: 1
    },
    {
      id: 'd7',
      question: "Qu'est-ce que la « polyvalence » d'un employé ?",
      options: [
        "Sa capacité à effectuer plusieurs tâches ou missions différentes",
        "Son ancienneté dans l'entreprise",
        "Son salaire",
        "Le nombre de diplômes obtenus"
      ],
      correcte: 0
    },
    {
      id: 'd8',
      question: "Que signifie « respecter la hiérarchie » en entreprise ?",
      options: [
        "Obéir sans jamais poser de question",
        "Respecter l'organisation et les rôles de chacun tout en pouvant exprimer son avis avec respect",
        "Ignorer les consignes des responsables",
        "Ne parler qu'au directeur général"
      ],
      correcte: 1
    },
    {
      id: 'd9',
      question: "Face à un imprévu au travail (panne, absence d'un collègue...), il vaut mieux :",
      options: [
        "Paniquer et arrêter de travailler",
        "Rester calme, s'adapter et chercher une solution",
        "Rejeter la responsabilité sur les autres",
        "Quitter le poste de travail"
      ],
      correcte: 1
    },
    {
      id: 'd10',
      question: "Un « esprit d'initiative » au travail signifie :",
      options: [
        "Attendre toujours qu'on vous dise exactement quoi faire",
        "Proposer des idées ou agir de soi-même pour améliorer une situation",
        "Ne jamais rien proposer",
        "Faire uniquement le strict minimum"
      ],
      correcte: 1
    },
    {
      id: 'd11',
      question: "Que veut dire « gérer son stress » au travail ?",
      options: [
        "L'ignorer complètement",
        "Trouver des moyens de rester calme et efficace face à la pression",
        "Reporter systématiquement le stress sur ses collègues",
        "Arrêter de travailler dès qu'il apparaît"
      ],
      correcte: 1
    },
    {
      id: 'd12',
      question: "L'apprentissage continu (formation, lecture, curiosité) permet surtout de :",
      options: [
        "Rester bloqué dans ses habitudes",
        "Développer ses compétences et s'adapter aux évolutions du métier",
        "Perdre du temps inutilement",
        "Remplacer l'expérience professionnelle"
      ],
      correcte: 1
    },
    {
      id: 'd13',
      question: "Un « planning de travail » sert à :",
      options: [
        "Organiser et répartir les tâches ou horaires dans le temps",
        "Remplacer un contrat de travail",
        "Fixer les salaires",
        "Servir uniquement de décoration"
      ],
      correcte: 0
    },
    {
      id: 'd14',
      question: "Face à un désaccord avec un collègue, la meilleure approche est de :",
      options: [
        "Discuter calmement pour trouver un terrain d'entente",
        "Éviter définitivement cette personne",
        "Hausser le ton systématiquement",
        "En parler à tout le monde sauf à la personne concernée"
      ],
      correcte: 0
    },
    {
      id: 'd15',
      question: "La fiabilité d'un employé se reconnaît surtout à :",
      options: [
        "Sa capacité à tenir ses engagements et fournir un travail de qualité constant",
        "Sa capacité à parler fort",
        "Son ancienneté uniquement",
        "Son apparence physique"
      ],
      correcte: 0
    }
  ]
};

// Questions bonus (carrière/objectifs) : NON notées, réponse libre (texte),
// simplement recueillies et ajoutées au profil du candidat pour la section
// "À propos du candidat" visible par les entreprises/l'admin.
const QUESTIONS_BONUS = [
  { id: 'b1', question: "Quel poste ou métier vises-tu idéalement dans les 3 à 5 prochaines années ?" },
  { id: 'b2', question: "Quel secteur d'activité t'intéresse le plus, et pourquoi ?" },
  { id: 'b3', question: "Quelles compétences aimerais-tu développer prochainement ?" },
  { id: 'b4', question: "Où te vois-tu professionnellement dans 5 ans ?" },
  { id: 'b5', question: "Qu'est-ce qui te motive le plus dans ta carrière ?" }
];

const DOMAINE_SECOURS = 'Autres domaines';

// Renvoie le lot de 15 questions "domaine" adapté au domaine du candidat,
// avec repli automatique sur "Autres domaines" si non reconnu.
function questionsDuDomaine(domaine) {
  return QUESTIONS_PAR_DOMAINE[domaine] || QUESTIONS_PAR_DOMAINE[DOMAINE_SECOURS];
}

// Construit la liste complète des 30 questions QCM (15 générales + 15 domaine)
// pour un candidat donné.
function toutesLesQuestions(domaine) {
  return [...QUESTIONS_GENERALES, ...questionsDuDomaine(domaine)];
}

// Barème : 10 points par question x 30 questions = 300 points.
const POINTS_PAR_QUESTION = 10;

// Version publique (sans les bonnes réponses) à envoyer au front pour affichage.
function questionsPubliques(domaine) {
  return toutesLesQuestions(domaine).map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    points: POINTS_PAR_QUESTION
  }));
}

// Version publique des questions bonus (pas de bonne réponse à cacher).
function questionsBonusPubliques() {
  return QUESTIONS_BONUS.map((q) => ({ id: q.id, question: q.question }));
}

// Corrige un tableau de réponses [{id, choix}] pour un domaine donné et
// renvoie le score détaillé. Ne fait JAMAIS confiance à un score envoyé
// par le client.
function corriger(reponsesCandidat, domaine) {
  const questions = toutesLesQuestions(domaine);
  const parId = new Map((reponsesCandidat || []).map((r) => [r.id, r.choix]));
  let score = 0;
  let bonnes = 0;
  const detail = questions.map((q) => {
    const choix = parId.has(q.id) ? parId.get(q.id) : null;
    const correct = choix === q.correcte;
    if (correct) { score += POINTS_PAR_QUESTION; bonnes += 1; }
    return { id: q.id, choix, correcte: q.correcte, correct };
  });
  return { score, bonnes, total: questions.length, detail };
}

// Met en forme les réponses bonus [{id, reponse}] pour stockage (uniquement
// le texte de la question + la réponse donnée, pour un affichage direct
// côté admin sans avoir à recroiser avec la banque de questions).
function formaterReponsesBonus(reponsesBonus) {
  const parId = new Map((reponsesBonus || []).map((r) => [r.id, String(r.reponse || '').trim()]));
  return QUESTIONS_BONUS
    .map((q) => ({ id: q.id, question: q.question, reponse: parId.get(q.id) || '' }))
    .filter((r) => r.reponse.length > 0);
}

module.exports = {
  QUESTIONS_GENERALES,
  QUESTIONS_PAR_DOMAINE,
  QUESTIONS_BONUS,
  POINTS_PAR_QUESTION,
  toutesLesQuestions,
  questionsPubliques,
  questionsBonusPubliques,
  corriger,
  formaterReponsesBonus
};
