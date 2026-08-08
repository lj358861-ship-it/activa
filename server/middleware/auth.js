const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { genererCodeVerification, DUREE_VALIDITE_MINUTES } = require('../services/verification');
const { envoyerEmailVerification } = require('../services/email');

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

    // Adresse email pas encore confirmée par le code reçu à l'inscription :
    // on bloque la connexion et on renvoie un code d'erreur dédié que le
    // front reconnaît pour afficher l'écran de saisie du code.
    if (!utilisateur.email_verifie) {
      return res.status(403).json({
        erreur: 'Adresse email non vérifiée. Saisis le code reçu par email pour activer ton compte.',
        code: 'EMAIL_NON_VERIFIE'
      });
    }

    // Si employeur, vérifier la validation par l'admin
    if (utilisateur.role === 'employeur') {
      const [empRows] = await pool.query('SELECT is_valide FROM employeurs WHERE user_id = ?', [utilisateur.id]);
      if (empRows.length && !empRows[0].is_valide) {
        return res.status(403).json({ erreur: 'Ton compte entreprise est en attente de vérification par l\'APRJ.' });
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

// Vérifie le code alphanumérique reçu par email juste après l'inscription.
router.post('/verifier-email', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ erreur: 'Email et code requis.' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(404).json({ erreur: 'Compte introuvable.' });
    const utilisateur = rows[0];

    if (utilisateur.email_verifie) {
      return res.json({ message: 'Adresse déjà vérifiée.', deja_verifie: true });
    }
    if (!utilisateur.code_verification || utilisateur.code_verification !== code.trim().toUpperCase()) {
      return res.status(400).json({ erreur: 'Code incorrect.' });
    }
    if (utilisateur.code_verification_expire && new Date(utilisateur.code_verification_expire) < new Date()) {
      return res.status(400).json({ erreur: 'Ce code a expiré, demande-en un nouveau.' });
    }

    await pool.query(
      'UPDATE users SET email_verifie = TRUE, code_verification = NULL, code_verification_expire = NULL WHERE id = ?',
      [utilisateur.id]
    );
    res.json({ message: 'Adresse email vérifiée avec succès.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur, réessaie plus tard.' });
  }
});

// Régénère et renvoie un nouveau code (si le premier email n'est jamais arrivé, ou a expiré).
router.post('/renvoyer-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ erreur: 'Email requis.' });
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email_verifie,
              COALESCE(c.nom_complet, e.nom_societe) AS nom
       FROM users u
       LEFT JOIN candidats c ON c.user_id = u.id
       LEFT JOIN employeurs e ON e.user_id = u.id
       WHERE u.email = ?`,
      [email]
    );
    if (!rows.length) return res.status(404).json({ erreur: 'Compte introuvable.' });
    const utilisateur = rows[0];
    if (utilisateur.email_verifie) {
      return res.json({ message: 'Adresse déjà vérifiée.', deja_verifie: true });
    }

    const code = genererCodeVerification();
    const expire = new Date(Date.now() + DUREE_VALIDITE_MINUTES * 60 * 1000);
    await pool.query('UPDATE users SET code_verification = ?, code_verification_expire = ? WHERE id = ?', [code, expire, utilisateur.id]);
    const resultatEnvoi = await envoyerEmailVerification({ email, nomComplet: utilisateur.nom, code });
    res.json({ message: 'Un nouveau code a été envoyé.', email_envoye: resultatEnvoi.envoye });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur, réessaie plus tard.' });
  }
});

module.exports = router;
