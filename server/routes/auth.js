const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

router.post('/connexion', async (req, res) => {
  const { email, mot_de_passe } = req.body;
  if (!email || !mot_de_passe) {
    return res.status(400).json({ erreur: 'Email et mot de passe requis.' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect.' });
    }
    const utilisateur = rows[0];
    const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.password_hash);
    if (!motDePasseValide) {
      return res.status(401).json({ erreur: 'Email ou mot de passe incorrect.' });
    }

    // Si employeur, vérifier la validation par l'admin
    if (utilisateur.role === 'employeur') {
      const [empRows] = await pool.query('SELECT is_valide FROM employeurs WHERE user_id = ?', [utilisateur.id]);
      if (empRows.length && !empRows[0].is_valide) {
        return res.status(403).json({ erreur: 'Ton compte entreprise est en attente de vérification par Activa Assurance.' });
      }
    }

    const token = jwt.sign(
      { id: utilisateur.id, role: utilisateur.role, email: utilisateur.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, role: utilisateur.role, email: utilisateur.email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur, réessaie plus tard.' });
  }
});

module.exports = router;
