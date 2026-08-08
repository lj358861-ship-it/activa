// Génère un code de vérification d'email aléatoire, alphanumérique, façon
// "B99E76X" : 7 caractères, lettres majuscules + chiffres, sans caractères
// ambigus (0/O, 1/I) pour éviter les erreurs de recopie depuis l'email.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genererCodeVerification(longueur = 7) {
  let code = '';
  for (let i = 0; i < longueur; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

// Durée de validité d'un code avant qu'il faille en redemander un nouveau.
const DUREE_VALIDITE_MINUTES = 30;

module.exports = { genererCodeVerification, DUREE_VALIDITE_MINUTES };
