const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dossierUploads = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(dossierUploads)) fs.mkdirSync(dossierUploads, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dossierUploads),
  filename: (req, file, cb) => {
    const horodatage = Date.now();
    const extension = path.extname(file.originalname);
    const nomPropre = file.fieldname + '-' + horodatage + extension;
    cb(null, nomPropre);
  }
});

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
