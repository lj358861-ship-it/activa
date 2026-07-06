const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dossierUploads = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(dossierUploads)) fs.mkdirSync(dossierUploads, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dossierUploads),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(null, 'image-' + Date.now() + extension);
  }
});

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
