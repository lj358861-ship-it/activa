// Banque de questions du quiz d'aptitude professionnelle rempli par chaque
// candidat juste après la création de son compte. 15 questions QCM (logique,
// culture professionnelle, français, situations de travail). Score total
// ramené sur 200 : les 5 premières questions valent 14 points, les 10
// suivantes 13 points (14*5 + 13*10 = 70 + 130 = 200).
//
// "correcte" = index (0-3) de la bonne réponse dans "options".
const QUESTIONS = [
  {
    id: 1,
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
    id: 2,
    question: "Suite logique : 2, 4, 8, 16, ... ?",
    options: ["24", "32", "20", "18"],
    correcte: 1
  },
  {
    id: 3,
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
    id: 4,
    question: "Si 3 ouvriers construisent un mur en 6 jours, combien de jours faudra-t-il à 6 ouvriers pour construire le même mur (travail identique) ?",
    options: ["12 jours", "6 jours", "3 jours", "2 jours"],
    correcte: 2
  },
  {
    id: 5,
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
    id: 6,
    question: "Trouvez l'intrus dans cette liste : Comptable, Infirmier, Marteau, Ingénieur",
    options: ["Comptable", "Infirmier", "Marteau", "Ingénieur"],
    correcte: 2
  },
  {
    id: 7,
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
    id: 8,
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
    id: 9,
    question: "Complétez la suite : Lundi, Mercredi, Vendredi, ... ?",
    options: ["Samedi", "Dimanche", "Jeudi", "Mardi"],
    correcte: 1
  },
  {
    id: 10,
    question: "Si une formation coûte 15 000 FCFA et qu'on vous applique une réduction de 20%, quel est le montant à payer ?",
    options: ["12 000 FCFA", "13 000 FCFA", "10 000 FCFA", "14 000 FCFA"],
    correcte: 0
  },
  {
    id: 11,
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
    id: 12,
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
    id: 13,
    question: "Quel est le synonyme le plus proche de « rigoureux » dans un contexte professionnel ?",
    options: ["Sévère", "Précis et méthodique", "Lent", "Bavard"],
    correcte: 1
  },
  {
    id: 14,
    question: "Suite logique : A, C, E, G, ... ?",
    options: ["H", "I", "F", "J"],
    correcte: 1
  },
  {
    id: 15,
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

// Barème : 5 premières questions à 14 points, 10 suivantes à 13 points -> total 200.
function pointsPourQuestion(index) {
  return index < 5 ? 14 : 13;
}

// Version publique (sans la bonne réponse) à envoyer au front pour affichage.
function questionsPubliques() {
  return QUESTIONS.map((q, i) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    points: pointsPourQuestion(i)
  }));
}

// Corrige un tableau de réponses [{id, choix}] et renvoie le score détaillé.
// Ne fait JAMAIS confiance à un score envoyé par le client.
function corriger(reponsesCandidat) {
  const parId = new Map((reponsesCandidat || []).map((r) => [r.id, r.choix]));
  let score = 0;
  let bonnes = 0;
  const detail = QUESTIONS.map((q, i) => {
    const choix = parId.has(q.id) ? parId.get(q.id) : null;
    const correct = choix === q.correcte;
    if (correct) { score += pointsPourQuestion(i); bonnes += 1; }
    return { id: q.id, choix, correcte: q.correcte, correct };
  });
  return { score, bonnes, total: QUESTIONS.length, detail };
}

module.exports = { QUESTIONS, questionsPubliques, corriger };
