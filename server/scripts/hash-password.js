// Utilitaire : node server/scripts/hash-password.js "MonMotDePasse"
const bcrypt = require('bcryptjs');

const motDePasse = process.argv[2];
if (!motDePasse) {
  console.log('Utilisation : node server/scripts/hash-password.js "MonMotDePasse"');
  process.exit(1);
}

bcrypt.hash(motDePasse, 10).then((hash) => {
  console.log('Hash généré :');
  console.log(hash);
});
