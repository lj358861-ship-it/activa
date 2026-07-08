const multer = require('multer');
const path = require('path');

// Stockage en mémoire (buffer) : les images sont ensuite enregistrées dans la base
// de données (table `fichiers`), pas sur le disque.
const storage = multer.memoryStorage();

const typesAutorises = ['.jpg', '.jpeg', '.png', '.webp'];

function filtreImage(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (typesAutorises.includes(ext)) cb(null, true);
  else cb(new Error('Format d\'image non autorisé. Formats acceptés : JPG, PNG, WEBP.'));
}

const maxSizeMo = parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10);

const uploadImage = multer({
  storage,
  fileFilter: filtreImage,
  limits: { fileSize: maxSizeMo * 1024 * 1024 }
});

module.exports = uploadImage;
