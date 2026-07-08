require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { initialiserBaseDeDonnees } = require('./scripts/init-db');
const pool = require('./db');
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

// Fichiers uploadés (CV, photos) : servis depuis la base de données (table `fichiers`),
// pas depuis le disque, qui n'est pas persistant sans volume Railway payant.
app.get('/uploads/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT mimetype, donnees FROM fichiers WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).send('Fichier introuvable.');
    res.set('Content-Type', rows[0].mimetype);
    res.set('Cache-Control', 'public, max-age=31536000');
    res.send(rows[0].donnees);
  } catch (e) {
    console.error(e);
    res.status(500).send('Erreur serveur.');
  }
});

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

// Initialise automatiquement les tables + le compte admin si besoin, à chaque démarrage.
// Sans danger à rejouer : ne fait rien si tout existe déjà. Permet de ne jamais avoir
// à lancer une commande manuelle (npm run init-db) sur Railway.
initialiserBaseDeDonnees()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Serveur APRJ démarré sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Erreur lors de l\'initialisation automatique de la base:', err);
    // On démarre quand même le serveur : mieux vaut un site en ligne avec un message
    // d'erreur clair dans les logs qu'un déploiement qui ne démarre jamais.
    app.listen(PORT, () => {
      console.log(`Serveur APRJ démarré sur le port ${PORT} (⚠️ init base échouée, voir logs ci-dessus)`);
    });
  });
