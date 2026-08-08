const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const upload = require('../middleware/upload');
const uploadImage = require('../middleware/upload-image');
const { verifierToken, autoriserRoles } = require('../middleware/auth');
const { envoyerNotificationCandidature } = require('../services/whatsapp');
const { enregistrerFichier } = require('../services/fichiers');
const { genererCodeCandidat } = require('../services/identifiants');
const { genererCodeVerification, DUREE_VALIDITE_MINUTES } = require('../services/verification');
const { envoyerEmailVerification } = require('../services/email');
const {
  questionsPubliques, questionsBonusPubliques, toutesLesQuestions,
  corriger, formaterReponsesBonus
} = require('../data/quiz-aptitude');

const router = express.Router();

// Inscription candidat : infos compte + profil + CV en une seule soumission
router.post(
  '/inscription',
  upload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'diplome', maxCount: 1 },
    { name: 'cni', maxCount: 1 }
  ]),
  async (req, res) => {
    const {
      email, mot_de_passe, telephone,
      nom_complet, date_naissance, ville, niveau_etude, domaine,
      parcours_pedagogique, parcours_professionnel, atouts
    } = req.body;

    if (
      !email || !mot_de_passe || !telephone || !nom_complet || !date_naissance || !ville ||
      !niveau_etude || !domaine || !parcours_pedagogique || !atouts
    ) {
      return res.status(400).json({ erreur: 'Merci de remplir tous les champs obligatoires (seul le parcours professionnel est optionnel).' });
    }

    // Vérifie que la date de naissance est plausible : pas dans le futur, et un âge
    // raisonnable (16 à 100 ans), pour éviter les erreurs de saisie.
    const naissance = new Date(date_naissance);
    if (isNaN(naissance.getTime())) {
      return res.status(400).json({ erreur: 'Date de naissance invalide.' });
    }
    const ageCalcule = Math.floor((Date.now() - naissance.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (naissance > new Date() || ageCalcule < 16 || ageCalcule > 100) {
      return res.status(400).json({ erreur: 'Merci de vérifier la date de naissance (âge attendu entre 16 et 100 ans).' });
    }
    if (!req.files?.cv?.[0]) {
      return res.status(400).json({ erreur: 'Le CV est obligatoire.' });
    }
    if (!req.files?.photo?.[0]) {
      return res.status(400).json({ erreur: 'La photo est obligatoire.' });
    }
    if (!req.files?.diplome?.[0]) {
      return res.status(400).json({ erreur: 'Le scan de ton diplôme est obligatoire.' });
    }
    if (!req.files?.cni?.[0]) {
      return res.status(400).json({ erreur: 'Le scan de ta CNI est obligatoire.' });
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
      const codeVerification = genererCodeVerification();
      const codeExpire = new Date(Date.now() + DUREE_VALIDITE_MINUTES * 60 * 1000);
      const [resultUser] = await connexion.query(
        'INSERT INTO users (role, email, password_hash, telephone, email_verifie, code_verification, code_verification_expire) VALUES ("candidat", ?, ?, ?, FALSE, ?, ?)',
        [email, hash, telephone, codeVerification, codeExpire]
      );
      const userId = resultUser.insertId;

      const cvPath = await enregistrerFichier(req.files?.cv?.[0], connexion);
      const photoPath = await enregistrerFichier(req.files?.photo?.[0], connexion);
      const diplomePath = await enregistrerFichier(req.files?.diplome?.[0], connexion);
      const cniPath = await enregistrerFichier(req.files?.cni?.[0], connexion);
      const codeCandidat = await genererCodeCandidat(connexion);

      const [resultCandidat] = await connexion.query(
        `INSERT INTO candidats
         (user_id, code_candidat, nom_complet, date_naissance, ville, niveau_etude, domaine, parcours_pedagogique, parcours_professionnel, atouts, cv_path, photo_path, diplome_path, cni_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, codeCandidat, nom_complet, date_naissance, ville || null, niveau_etude, domaine, parcours_pedagogique || null, parcours_professionnel || null, atouts || null, cvPath, photoPath, diplomePath, cniPath]
      );
      const candidatId = resultCandidat.insertId;

      await connexion.commit();

      // Envoi du code de vérification d'email (ne bloque pas l'inscription si Brevo échoue —
      // le candidat pourra toujours demander un renvoi de code depuis l'écran de vérification).
      const resultatVerifEmail = await envoyerEmailVerification({ email, nomComplet: nom_complet, code: codeVerification });

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
        candidat_id: candidatId,
        code_candidat: codeCandidat,
        notification_whatsapp: resultatWhatsapp.envoye,
        necessite_verification_email: true,
        email_verification_envoye: resultatVerifEmail.envoye
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
  upload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'diplome', maxCount: 1 },
    { name: 'cni', maxCount: 1 }
  ]),
  async (req, res) => {
    const { nom_complet, date_naissance, ville, niveau_etude, domaine, parcours_pedagogique, parcours_professionnel, atouts } = req.body;
    try {
      const champs = [
        'nom_complet = ?', 'ville = ?', 'niveau_etude = ?', 'domaine = ?',
        'parcours_pedagogique = ?', 'parcours_professionnel = ?', 'atouts = ?'
      ];
      const valeurs = [
        nom_complet, ville || null, niveau_etude, domaine,
        parcours_pedagogique || null, parcours_professionnel || null, atouts || null
      ];
      if (date_naissance) { champs.push('date_naissance = ?'); valeurs.push(date_naissance); }
      if (req.files?.cv?.[0]) { champs.push('cv_path = ?'); valeurs.push(await enregistrerFichier(req.files.cv[0])); }
      if (req.files?.photo?.[0]) { champs.push('photo_path = ?'); valeurs.push(await enregistrerFichier(req.files.photo[0])); }
      if (req.files?.diplome?.[0]) { champs.push('diplome_path = ?'); valeurs.push(await enregistrerFichier(req.files.diplome[0])); }
      if (req.files?.cni?.[0]) { champs.push('cni_path = ?'); valeurs.push(await enregistrerFichier(req.files.cni[0])); }
      valeurs.push(req.utilisateur.id);
      await pool.query(`UPDATE candidats SET ${champs.join(', ')} WHERE user_id = ?`, valeurs);
      res.json({ message: 'Profil mis à jour.' });
    } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
  }
);

// Suivi de candidature : liste des mises en relation du candidat connecté,
// avec le statut à jour (proposé / sélectionné / notifié / rejeté / annulé)
// et les infos de l'entreprise + du poste, pour un affichage en étapes côté front.
router.get('/candidatures', verifierToken, autoriserRoles('candidat'), async (req, res) => {
  try {
    const [candRows] = await pool.query('SELECT id FROM candidats WHERE user_id = ?', [req.utilisateur.id]);
    if (!candRows.length) return res.status(404).json({ erreur: 'Profil candidat introuvable.' });

    const [rows] = await pool.query(
      `SELECT mer.id, mer.statut, mer.score_correspondance, mer.selectionne_le, mer.notifie_le,
              mer.entretien_date, mer.entretien_lieu, mer.created_at,
              d.poste, d.domaine,
              e.nom_societe, e.ville AS employeur_ville
       FROM mises_en_relation mer
       JOIN demandes d ON d.id = mer.demande_id
       JOIN employeurs e ON e.id = d.employeur_id
       WHERE mer.candidat_id = ?
       ORDER BY mer.created_at DESC`,
      [candRows[0].id]
    );
    res.json({ candidatures: rows });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

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

// ===== Test d'aptitude professionnelle (une seule tentative par candidat) =====
// 30 questions QCM notées sur 300 points (15 communes + 15 propres au domaine
// choisi par le candidat à l'inscription) + 5 questions bonus non notées sur
// ses objectifs de carrière, ajoutées à son profil ("À propos du candidat").

// Récupère les questions (sans les bonnes réponses) + indique si déjà passé.
router.get('/quiz', verifierToken, autoriserRoles('candidat'), async (req, res) => {
  try {
    const [candRows] = await pool.query('SELECT id, domaine FROM candidats WHERE user_id = ?', [req.utilisateur.id]);
    if (!candRows.length) return res.status(404).json({ erreur: 'Profil candidat introuvable.' });

    const [resultatExistant] = await pool.query(
      'SELECT score, nombre_bonnes_reponses, total_questions, created_at FROM quiz_resultats WHERE candidat_id = ?',
      [candRows[0].id]
    );
    if (resultatExistant.length) {
      return res.json({ deja_complete: true, resultat: resultatExistant[0] });
    }
    res.json({
      deja_complete: false,
      questions: questionsPubliques(candRows[0].domaine),
      questions_bonus: questionsBonusPubliques()
    });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// Vérifie une réponse à la volée (pour l'animation vert/rouge immédiate),
// sans jamais exposer la banque complète des bonnes réponses au client.
router.post('/quiz/verifier', verifierToken, autoriserRoles('candidat'), async (req, res) => {
  try {
    const [candRows] = await pool.query('SELECT domaine FROM candidats WHERE user_id = ?', [req.utilisateur.id]);
    if (!candRows.length) return res.status(404).json({ erreur: 'Profil candidat introuvable.' });

    const { id, choix } = req.body;
    const question = toutesLesQuestions(candRows[0].domaine).find((q) => q.id === id);
    if (!question) return res.status(400).json({ erreur: 'Question inconnue.' });
    res.json({ correct: choix === question.correcte, correcte: question.correcte });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// Soumission finale : recalcule le score côté serveur (jamais confiance au
// client) et enregistre le résultat + les réponses bonus. Une seule
// tentative possible.
router.post('/quiz', verifierToken, autoriserRoles('candidat'), async (req, res) => {
  try {
    const [candRows] = await pool.query('SELECT id, domaine FROM candidats WHERE user_id = ?', [req.utilisateur.id]);
    if (!candRows.length) return res.status(404).json({ erreur: 'Profil candidat introuvable.' });
    const candidatId = candRows[0].id;
    const domaine = candRows[0].domaine;

    const [existant] = await pool.query('SELECT id FROM quiz_resultats WHERE candidat_id = ?', [candidatId]);
    if (existant.length) {
      return res.status(409).json({ erreur: 'Tu as déjà passé ce test, une seule tentative est autorisée.' });
    }

    const { reponses, reponses_bonus } = req.body;
    const questionsAttendues = toutesLesQuestions(domaine).length;
    if (!Array.isArray(reponses) || reponses.length !== questionsAttendues) {
      return res.status(400).json({ erreur: 'Merci de répondre à toutes les questions.' });
    }

    const { score, bonnes, total, detail } = corriger(reponses, domaine);
    const bonusFormate = formaterReponsesBonus(reponses_bonus);

    await pool.query(
      `INSERT INTO quiz_resultats
       (candidat_id, score, nombre_bonnes_reponses, total_questions, domaine_teste, reponses, reponses_bonus)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [candidatId, score, bonnes, total, domaine || null, JSON.stringify(detail), JSON.stringify(bonusFormate)]
    );
    res.status(201).json({ score, bonnes, total, detail, reponses_bonus: bonusFormate });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

module.exports = router;
