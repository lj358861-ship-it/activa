const multer = require('multer');
const path = require('path');

// Stockage en mémoire (buffer) : les fichiers sont ensuite enregistrés dans la base
// de données (table `fichiers`), pas sur le disque, qui n'est pas persistant sans
// volume Railway payant.
const storage = multer.memoryStorage();

const typesAutorises = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

function filtreFichier(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (typesAutorises.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non autorisé. Formats acceptés : PDF, DOC, DOCX, JPG, PNG.'));
  }
}

const maxSizeMo = parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10);

const upload = multer({
  storage,
  fileFilter: filtreFichier,
  limits: { fileSize: maxSizeMo * 1024 * 1024 }
});

module.exports = upload;
