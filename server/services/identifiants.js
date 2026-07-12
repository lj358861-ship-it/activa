const crypto = require('crypto');
const pool = require('../db');

// Génère un identifiant candidat lisible et non devinable, au format ARYY-XXXX
// (YY = 2 derniers chiffres de l'année, XXXX = 4 chiffres tirés au hasard, PAS séquentiels).
// `annee` (nombre complet, ex: 2026) est optionnel : par défaut l'année en cours.
// `connexion` permet de réutiliser une transaction en cours (inscription candidat).
async function genererCodeCandidat(connexion = pool, annee = new Date().getFullYear()) {
  const anneeCourte = String(annee).slice(-2);
  for (let tentative = 0; tentative < 50; tentative++) {
    const nombre = crypto.randomInt(0, 10000); // 0000 à 9999, aléatoire
    const code = `AR${anneeCourte}-${String(nombre).padStart(4, '0')}`;
    const [existant] = await connexion.query('SELECT id FROM candidats WHERE code_candidat = ?', [code]);
    if (!existant.length) return code;
  }
  throw new Error('Impossible de générer un identifiant candidat unique après plusieurs tentatives. Merci de réessayer.');
}

// Normalise une saisie utilisateur ("ar260001", "AR26 0001", "ar26-0001"...) vers le
// format canonique ARYY-XXXX, pour que la recherche admin soit tolérante à la casse
// et aux espaces/tirets manquants.
function normaliserCodeCandidat(saisie) {
  if (!saisie) return null;
  const nettoye = String(saisie).toUpperCase().replace(/[\s-]/g, '');
  const correspondance = /^AR(\d{2})(\d{4})$/.exec(nettoye);
  if (!correspondance) return null;
  return `AR${correspondance[1]}-${correspondance[2]}`;
}

module.exports = { genererCodeCandidat, normaliserCodeCandidat };
