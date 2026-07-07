const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const upload = require('../middleware/upload');
const uploadImage = require('../middleware/upload-image');
const { verifierToken, autoriserRoles } = require('../middleware/auth');
const { envoyerNotificationCandidature } = require('../services/whatsapp');

const router = express.Router();

// Inscription candidat : infos compte + profil + CV en une seule soumission
router.post(
  '/inscription',
  upload.fields([{ name: 'cv', maxCount: 1 }, { name: 'photo', maxCount: 1 }]),
  async (req, res) => {
    const {
      email, mot_de_passe, telephone,
      nom_complet, ville, niveau_etude, domaine,
      parcours_pedagogique, parcours_professionnel, atouts
    } = req.body;

    if (!email || !mot_de_passe || !telephone || !nom_complet || !niveau_etude || !domaine) {
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
        'INSERT INTO users (role, email, password_hash, telephone) VALUES ("candidat", ?, ?, ?)',
        [email, hash, telephone]
      );
      const userId = resultUser.insertId;

      const cvPath = req.files?.cv?.[0]?.filename || null;
      const photoPath = req.files?.photo?.[0]?.filename || null;

      await connexion.query(
        `INSERT INTO candidats
         (user_id, nom_complet, ville, niveau_etude, domaine, parcours_pedagogique, parcours_professionnel, atouts, cv_path, photo_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, nom_complet, ville || null, niveau_etude, domaine, parcours_pedagogique || null, parcours_professionnel || null, atouts || null, cvPath, photoPath]
      );

      await connexion.commit();

      // Notification WhatsApp vers l'APRJ (ne bloque pas la réponse si ça échoue)
      const cvUrl = cvPath ? `${process.env.PUBLIC_BASE_URL || ''}/uploads/${cvPath}` : null;
      const resultatWhatsapp = await envoyerNotificationCandidature({
        nomComplet: nom_complet,
        domaine,
        niveauEtude: niveau_etude,
        telephone,
        cvUrl
      });

      if (resultatWhatsapp.envoye) {
        await pool.query('UPDATE candidats SET whatsapp_envoye = TRUE WHERE user_id = ?', [userId]);
      }

      res.status(201).json({
        message: 'Inscription réussie ! Ton profil a été enregistré.',
        notification_whatsapp: resultatWhatsapp.envoye
      });
    } catch (e) {
      await connexion.rollback();
      console.error(e);
      res.status(500).json({ erreur: 'Erreur serveur lors de l\'inscription.' });
    } finally {
      connexion.release();
    }
  }
);

// Profil du candidat connecté
router.get('/moi', verifierToken, autoriserRoles('candidat'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.email, u.telephone AS telephone_compte FROM candidats c
       JOIN users u ON u.id = c.user_id WHERE c.user_id = ?`,
      [req.utilisateur.id]
    );
    if (!rows.length) return res.status(404).json({ erreur: 'Profil introuvable.' });
    res.json({ candidat: rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// Mise à jour du profil (infos + éventuellement nouvelle photo / nouveau CV)
router.put(
  '/moi',
  verifierToken, autoriserRoles('candidat'),
  upload.fields([{ name: 'cv', maxCount: 1 }, { name: 'photo', maxCount: 1 }]),
  async (req, res) => {
    const { nom_complet, ville, niveau_etude, domaine, parcours_pedagogique, parcours_professionnel, atouts } = req.body;
    try {
      const champs = [
        'nom_complet = ?', 'ville = ?', 'niveau_etude = ?', 'domaine = ?',
        'parcours_pedagogique = ?', 'parcours_professionnel = ?', 'atouts = ?'
      ];
      const valeurs = [
        nom_complet, ville || null, niveau_etude, domaine,
        parcours_pedagogique || null, parcours_professionnel || null, atouts || null
      ];
      if (req.files?.cv?.[0]) { champs.push('cv_path = ?'); valeurs.push(req.files.cv[0].filename); }
      if (req.files?.photo?.[0]) { champs.push('photo_path = ?'); valeurs.push(req.files.photo[0].filename); }
      valeurs.push(req.utilisateur.id);
      await pool.query(`UPDATE candidats SET ${champs.join(', ')} WHERE user_id = ?`, valeurs);
      res.json({ message: 'Profil mis à jour.' });
    } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
  }
);

// Notifications du candidat connecté (propositions d'opportunités envoyées par l'APRJ)
router.get('/notifications', verifierToken, autoriserRoles('candidat'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.utilisateur.id]
    );
    res.json({ notifications: rows });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.post('/notifications/:id/lu', verifierToken, autoriserRoles('candidat'), async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET lu = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.utilisateur.id]);
    res.json({ message: 'Notification marquée comme lue.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

module.exports = router;
