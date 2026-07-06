const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { verifierToken, autoriserRoles } = require('../middleware/auth');

const router = express.Router();

// Inscription employeur (compte créé mais non validé -> en attente d'admin)
router.post('/inscription', async (req, res) => {
  const { email, mot_de_passe, telephone, nom_societe, secteur, telephone_societe, ville } = req.body;

  if (!email || !mot_de_passe || !telephone || !nom_societe || !telephone_societe) {
    return res.status(400).json({ erreur: 'Merci de remplir tous les champs obligatoires.' });
  }

  const connexion = await pool.getConnection();
  try {
    await connexion.beginTransaction();

    const [existant] = await connexion.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existant.length > 0) {
      await connexion.rollback();
      return res.status(409).json({ erreur: 'Un compte existe déjà avec cet email.' });
    }

    const hash = await bcrypt.hash(mot_de_passe, 10);
    const [resultUser] = await connexion.query(
      'INSERT INTO users (role, email, password_hash, telephone) VALUES ("employeur", ?, ?, ?)',
      [email, hash, telephone]
    );
    const userId = resultUser.insertId;

    await connexion.query(
      `INSERT INTO employeurs (user_id, nom_societe, secteur, telephone_societe, ville)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, nom_societe, secteur || null, telephone_societe, ville || null]
    );

    await connexion.commit();
    res.status(201).json({
      message: 'Inscription envoyée ! Ton compte entreprise sera activé après vérification par l\'APRJ.'
    });
  } catch (e) {
    await connexion.rollback();
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur lors de l\'inscription.' });
  } finally {
    connexion.release();
  }
});

// Déposer une demande de recrutement (employeur connecté et validé)
router.post('/demandes', verifierToken, autoriserRoles('employeur'), async (req, res) => {
  const { poste, domaine, niveau_etude_requis, qualifications, description, nombre_postes } = req.body;
  if (!poste || !domaine || !niveau_etude_requis) {
    return res.status(400).json({ erreur: 'Poste, domaine et niveau d\'étude requis sont obligatoires.' });
  }
  try {
    const [empRows] = await pool.query('SELECT id, is_valide FROM employeurs WHERE user_id = ?', [req.utilisateur.id]);
    if (!empRows.length) return res.status(404).json({ erreur: 'Profil employeur introuvable.' });
    if (!empRows[0].is_valide) return res.status(403).json({ erreur: 'Compte en attente de validation par l\'APRJ.' });

    const [result] = await pool.query(
      `INSERT INTO demandes (employeur_id, poste, domaine, niveau_etude_requis, qualifications, description, nombre_postes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [empRows[0].id, poste, domaine, niveau_etude_requis, qualifications || null, description || null, nombre_postes || 1]
    );
    res.status(201).json({ message: 'Demande enregistrée.', demande_id: result.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Liste des demandes de l'employeur connecté
router.get('/demandes', verifierToken, autoriserRoles('employeur'), async (req, res) => {
  try {
    const [empRows] = await pool.query('SELECT id FROM employeurs WHERE user_id = ?', [req.utilisateur.id]);
    if (!empRows.length) return res.status(404).json({ erreur: 'Profil employeur introuvable.' });
    const [demandes] = await pool.query('SELECT * FROM demandes WHERE employeur_id = ? ORDER BY created_at DESC', [empRows[0].id]);
    res.json({ demandes });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

module.exports = router;
