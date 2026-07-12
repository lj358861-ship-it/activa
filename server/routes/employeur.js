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

// Supprimer une de ses propres demandes
router.delete('/demandes/:id', verifierToken, autoriserRoles('employeur'), async (req, res) => {
  try {
    const [empRows] = await pool.query('SELECT id FROM employeurs WHERE user_id = ?', [req.utilisateur.id]);
    if (!empRows.length) return res.status(404).json({ erreur: 'Profil employeur introuvable.' });
    const [result] = await pool.query('DELETE FROM demandes WHERE id = ? AND employeur_id = ?', [req.params.id, empRows[0].id]);
    if (result.affectedRows === 0) return res.status(404).json({ erreur: 'Demande introuvable.' });
    res.json({ message: 'Demande supprimée.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Notifications de l'employeur connecté (profils de candidats proposés par l'APRJ)
router.get('/notifications', verifierToken, autoriserRoles('employeur'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.utilisateur.id]
    );
    res.json({ notifications: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

router.post('/notifications/:id/lu', verifierToken, autoriserRoles('employeur'), async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET lu = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.utilisateur.id]);
    res.json({ message: 'Notification marquée comme lue.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Liste des profils proposés par l'APRJ pour les demandes de cet employeur,
// avec le profil complet du candidat (photo, CV, détails).
router.get('/propositions', verifierToken, autoriserRoles('employeur'), async (req, res) => {
  try {
    const [empRows] = await pool.query('SELECT id FROM employeurs WHERE user_id = ?', [req.utilisateur.id]);
    if (!empRows.length) return res.status(404).json({ erreur: 'Profil employeur introuvable.' });

    const [rows] = await pool.query(
      `SELECT mer.id, mer.statut, mer.score_correspondance, mer.selectionne_le, mer.notifie_le, mer.created_at,
              d.id AS demande_id, d.poste,
              c.id AS candidat_id, c.code_candidat, c.nom_complet, c.ville, c.niveau_etude, c.domaine, c.date_naissance,
              c.parcours_pedagogique, c.parcours_professionnel, c.atouts, c.photo_path, c.cv_path, c.diplome_path
       FROM mises_en_relation mer
       JOIN demandes d ON d.id = mer.demande_id
       JOIN candidats c ON c.id = mer.candidat_id
       WHERE d.employeur_id = ?
       ORDER BY d.id DESC, mer.score_correspondance DESC`,
      [empRows[0].id]
    );
    res.json({ propositions: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// L'employeur sélectionne un des profils proposés pour une demande donnée,
// et choisit dans la foulée un créneau d'entretien (date/heure obligatoires,
// lieu et notes complémentaires optionnels). Ces informations seront incluses
// dans le message WhatsApp envoyé au candidat par l'APRJ.
router.put('/mises-en-relation/:id/selectionner', verifierToken, autoriserRoles('employeur'), async (req, res) => {
  const { entretien_date, entretien_lieu, entretien_notes } = req.body;

  if (!entretien_date) {
    return res.status(400).json({ erreur: 'Merci de choisir une date et une heure d\'entretien.' });
  }
  // Format attendu du front : "YYYY-MM-DDTHH:MM" (ex: 2026-07-10T14:00).
  // On le convertit en "YYYY-MM-DD HH:MM:00" pour MySQL SANS passer par un objet
  // JS Date, pour éviter toute conversion de fuseau horaire imprévisible :
  // l'heure tapée par l'employeur reste EXACTEMENT celle stockée et affichée.
  const correspondance = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(entretien_date);
  if (!correspondance) {
    return res.status(400).json({ erreur: 'Date d\'entretien invalide.' });
  }
  const entretienDateSql = `${correspondance[1]} ${correspondance[2]}:00`;

  try {
    const [empRows] = await pool.query('SELECT id FROM employeurs WHERE user_id = ?', [req.utilisateur.id]);
    if (!empRows.length) return res.status(404).json({ erreur: 'Profil employeur introuvable.' });

    const [rows] = await pool.query(
      `SELECT mer.id FROM mises_en_relation mer
       JOIN demandes d ON d.id = mer.demande_id
       WHERE mer.id = ? AND d.employeur_id = ?`,
      [req.params.id, empRows[0].id]
    );
    if (!rows.length) return res.status(404).json({ erreur: 'Proposition introuvable.' });

    await pool.query(
      `UPDATE mises_en_relation
       SET statut = 'selectionne', selectionne_le = NOW(),
           entretien_date = ?, entretien_lieu = ?, entretien_notes = ?
       WHERE id = ?`,
      [entretienDateSql, entretien_lieu || null, entretien_notes || null, req.params.id]
    );
    res.json({ message: 'Profil sélectionné avec le créneau d\'entretien. L\'APRJ va notifier le candidat.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// L'employeur retire un profil proposé qui ne l'intéresse pas. Possible uniquement
// tant que le profil est encore au statut 'propose' (pas encore sélectionné) —
// au-delà, c'est le suivi de sélection (côté admin) qui prend le relais.
router.delete('/propositions/:id', verifierToken, autoriserRoles('employeur'), async (req, res) => {
  try {
    const [empRows] = await pool.query('SELECT id FROM employeurs WHERE user_id = ?', [req.utilisateur.id]);
    if (!empRows.length) return res.status(404).json({ erreur: 'Profil employeur introuvable.' });

    const [rows] = await pool.query(
      `SELECT mer.id, mer.statut FROM mises_en_relation mer
       JOIN demandes d ON d.id = mer.demande_id
       WHERE mer.id = ? AND d.employeur_id = ?`,
      [req.params.id, empRows[0].id]
    );
    if (!rows.length) return res.status(404).json({ erreur: 'Proposition introuvable.' });
    if (rows[0].statut !== 'propose') {
      return res.status(400).json({ erreur: 'Ce profil a déjà été sélectionné, il ne peut plus être retiré depuis cette liste.' });
    }

    await pool.query('DELETE FROM mises_en_relation WHERE id = ?', [req.params.id]);
    res.json({ message: 'Profil retiré de tes propositions.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

module.exports = router;
