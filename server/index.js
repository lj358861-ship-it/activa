require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const candidatRoutes = require('./routes/candidat');
const employeurRoutes = require('./routes/employeur');
const rechercheRoutes = require('./routes/recherche');
const adminRoutes = require('./routes/admin');
const contenuPublicRoutes = require('./routes/contenu-public');
const contactRoutes = require('./routes/contact');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fichiers uploadés (CV, photos) accessibles publiquement (nécessaire pour les liens WhatsApp)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API
app.use('/api/auth', authRoutes);
app.use('/api/candidats', candidatRoutes);
app.use('/api/employeurs', employeurRoutes);
app.use('/api/recherche', rechercheRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', contenuPublicRoutes);
app.use('/api/contact', contactRoutes);

// Frontend statique
app.use(express.static(path.join(__dirname, '..', 'public')));

// Gestion des erreurs multer / erreurs génériques
app.use((err, req, res, next) => {
  if (err) {
    console.error(err);
    return res.status(400).json({ erreur: err.message || 'Une erreur est survenue.' });
  }
  next();
});

app.get('/api/sante', (req, res) => res.json({ statut: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur APRJ démarré sur le port ${PORT}`);
});
