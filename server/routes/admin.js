const express = require('express');
const pool = require('../db');
const { verifierToken, autoriserRoles } = require('../middleware/auth');

const router = express.Router();

router.use(verifierToken, autoriserRoles('admin'));

// Liste des employeurs en attente de validation
router.get('/employeurs/en-attente', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, u.email FROM employeurs e JOIN users u ON u.id = e.user_id WHERE e.is_valide = FALSE ORDER BY e.created_at DESC`
    );
    res.json({ employeurs: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Liste de tous les employeurs
router.get('/employeurs', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, u.email FROM employeurs e JOIN users u ON u.id = e.user_id ORDER BY e.created_at DESC`
    );
    res.json({ employeurs: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Valider un compte employeur
router.post('/employeurs/:id/valider', async (req, res) => {
  try {
    await pool.query(
      'UPDATE employeurs SET is_valide = TRUE, valide_par = ?, valide_le = NOW() WHERE id = ?',
      [req.utilisateur.id, req.params.id]
    );
    res.json({ message: 'Compte employeur validé.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Refuser/désactiver un compte employeur
router.post('/employeurs/:id/refuser', async (req, res) => {
  try {
    await pool.query('UPDATE employeurs SET is_valide = FALSE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Compte employeur refusé / désactivé.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Liste de tous les candidats enregistrés
router.get('/candidats', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM candidats ORDER BY created_at DESC');
    res.json({ candidats: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Statistiques globales pour le tableau de bord admin
router.get('/statistiques', async (req, res) => {
  try {
    const [[{ total_candidats }]] = await pool.query('SELECT COUNT(*) AS total_candidats FROM candidats');
    const [[{ total_employeurs }]] = await pool.query('SELECT COUNT(*) AS total_employeurs FROM employeurs');
    const [[{ employeurs_en_attente }]] = await pool.query('SELECT COUNT(*) AS employeurs_en_attente FROM employeurs WHERE is_valide = FALSE');
    const [[{ demandes_ouvertes }]] = await pool.query('SELECT COUNT(*) AS demandes_ouvertes FROM demandes WHERE statut = "ouverte"');
    res.json({ total_candidats, total_employeurs, employeurs_en_attente, demandes_ouvertes });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

module.exports = router;
