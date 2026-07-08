const pool = require('../db');

/**
 * Enregistre un fichier (buffer en mémoire, venant de multer memoryStorage)
 * directement dans la table `fichiers` de la base de données.
 * Retourne l'id du fichier, à stocker dans les colonnes photo_path / cv_path / image_path
 * à la place d'un nom de fichier disque.
 *
 * @param {object} file - req.file ou req.files.x[0] (fourni par multer memoryStorage)
 * @param {object} [connexion] - connexion/transaction à utiliser à la place du pool par défaut
 */
async function enregistrerFichier(file, connexion = pool) {
  if (!file) return null;
  const [resultat] = await connexion.query(
    'INSERT INTO fichiers (nom_original, mimetype, donnees) VALUES (?, ?, ?)',
    [file.originalname || null, file.mimetype, file.buffer]
  );
  return String(resultat.insertId);
}

module.exports = { enregistrerFichier };
