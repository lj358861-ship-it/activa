const express = require('express');
const pool = require('../db');

const router = express.Router();

// Services & activités actifs, triés
router.get('/services', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM services WHERE actif = TRUE ORDER BY ordre ASC, id ASC');
    res.json({ services: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Événements actifs (séminaires, festivals, formations...), triés par date
router.get('/evenements', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM evenements WHERE actif = TRUE ORDER BY ordre ASC, date_debut ASC'
    );
    res.json({ evenements: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Collaborateurs actifs, triés
router.get('/collaborateurs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM collaborateurs WHERE actif = TRUE ORDER BY ordre ASC, id ASC');
    res.json({ collaborateurs: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Contenu du carrousel (image + slogan) pour une page donnée : /api/contenu-hero/accueil
router.get('/contenu-hero/:pageCle', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM contenu_hero WHERE page_cle = ? AND actif = TRUE ORDER BY ordre ASC, id ASC',
      [req.params.pageCle]
    );
    res.json({ diapositives: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

module.exports = router;
