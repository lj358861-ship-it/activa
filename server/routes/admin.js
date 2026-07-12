const express = require('express');
const pool = require('../db');
const { verifierToken, autoriserRoles } = require('../middleware/auth');
const uploadImage = require('../middleware/upload-image');
const { envoyerNotificationSelection, formaterCreneau } = require('../services/whatsapp');
const { envoyerEmailSelection, diplomesRequis, FRAIS_DOSSIER_FCFA, FRAIS_FORMATION_ENTRETIEN_FCFA } = require('../services/email');
const { enregistrerFichier } = require('../services/fichiers');

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
    const [rows] = await pool.query(
      `SELECT c.*, u.telephone, u.email
       FROM candidats c
       JOIN users u ON u.id = c.user_id
       ORDER BY c.created_at DESC`
    );
    res.json({ candidats: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Supprime définitivement un candidat (son compte utilisateur, ce qui supprime
// en cascade son profil, ses mises en relation et ses notifications liées).
router.delete('/candidats/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id FROM candidats WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ erreur: 'Candidat introuvable.' });
    await pool.query('DELETE FROM users WHERE id = ?', [rows[0].user_id]);
    res.json({ message: 'Candidat supprimé.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Supprime définitivement un employeur (son compte utilisateur, ce qui supprime
// en cascade ses demandes et les mises en relation associées).
router.delete('/employeurs/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id FROM employeurs WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ erreur: 'Employeur introuvable.' });
    await pool.query('DELETE FROM users WHERE id = ?', [rows[0].user_id]);
    res.json({ message: 'Employeur supprimé.' });
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

/* ================= SERVICES & ACTIVITÉS ================= */

// Liste complète (y compris inactifs) pour la gestion admin
router.get('/services', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM services ORDER BY ordre ASC, id ASC');
    res.json({ services: rows });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.post('/services', uploadImage.single('photo'), async (req, res) => {
  const { titre, description, icone, ordre } = req.body;
  if (!titre) return res.status(400).json({ erreur: 'Le titre est obligatoire.' });
  try {
    const photoPath = await enregistrerFichier(req.file);
    const [result] = await pool.query(
      'INSERT INTO services (titre, description, icone, photo_path, ordre) VALUES (?, ?, ?, ?, ?)',
      [titre, description || null, icone || '📌', photoPath, ordre || 0]
    );
    res.status(201).json({ message: 'Service ajouté.', id: result.insertId });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.put('/services/:id', uploadImage.single('photo'), async (req, res) => {
  const { titre, description, icone, ordre, actif } = req.body;
  try {
    const photoPath = await enregistrerFichier(req.file);
    if (photoPath) {
      await pool.query(
        'UPDATE services SET titre = ?, description = ?, icone = ?, photo_path = ?, ordre = ?, actif = ? WHERE id = ?',
        [titre, description || null, icone || '📌', photoPath, ordre || 0, actif === undefined ? true : actif, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE services SET titre = ?, description = ?, icone = ?, ordre = ?, actif = ? WHERE id = ?',
        [titre, description || null, icone || '📌', ordre || 0, actif === undefined ? true : actif, req.params.id]
      );
    }
    res.json({ message: 'Service mis à jour.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.delete('/services/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM services WHERE id = ?', [req.params.id]);
    res.json({ message: 'Service supprimé.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

/* ================= ÉVÉNEMENTS (séminaires, festivals, formations) ================= */

router.get('/evenements', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM evenements ORDER BY ordre ASC, date_debut ASC');
    res.json({ evenements: rows });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.post('/evenements', uploadImage.single('image'), async (req, res) => {
  const { type, titre, description, lieu, date_debut, date_fin, ordre } = req.body;
  if (!titre) return res.status(400).json({ erreur: 'Le titre est obligatoire.' });
  try {
    const imagePath = await enregistrerFichier(req.file);
    const [result] = await pool.query(
      `INSERT INTO evenements (type, titre, description, lieu, date_debut, date_fin, image_path, ordre)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [type || 'autre', titre, description || null, lieu || null, date_debut || null, date_fin || null, imagePath, ordre || 0]
    );
    res.status(201).json({ message: 'Événement ajouté.', id: result.insertId });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.put('/evenements/:id', uploadImage.single('image'), async (req, res) => {
  const { type, titre, description, lieu, date_debut, date_fin, ordre, actif } = req.body;
  try {
    const champs = [
      'type = ?', 'titre = ?', 'description = ?', 'lieu = ?',
      'date_debut = ?', 'date_fin = ?', 'ordre = ?', 'actif = ?'
    ];
    const valeurs = [
      type || 'autre', titre, description || null, lieu || null,
      date_debut || null, date_fin || null, ordre || 0, actif === undefined ? true : actif
    ];
    if (req.file) { champs.push('image_path = ?'); valeurs.push(await enregistrerFichier(req.file)); }
    valeurs.push(req.params.id);
    await pool.query(`UPDATE evenements SET ${champs.join(', ')} WHERE id = ?`, valeurs);
    res.json({ message: 'Événement mis à jour.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.delete('/evenements/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM evenements WHERE id = ?', [req.params.id]);
    res.json({ message: 'Événement supprimé.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

/* ================= COLLABORATEURS ================= */

router.get('/collaborateurs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM collaborateurs ORDER BY ordre ASC, id ASC');
    res.json({ collaborateurs: rows });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.post('/collaborateurs', uploadImage.single('photo'), async (req, res) => {
  const { nom, poste, bio, ordre } = req.body;
  if (!nom) return res.status(400).json({ erreur: 'Le nom est obligatoire.' });
  try {
    const photoPath = await enregistrerFichier(req.file);
    const [result] = await pool.query(
      'INSERT INTO collaborateurs (nom, poste, bio, photo_path, ordre) VALUES (?, ?, ?, ?, ?)',
      [nom, poste || null, bio || null, photoPath, ordre || 0]
    );
    res.status(201).json({ message: 'Collaborateur ajouté.', id: result.insertId });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.put('/collaborateurs/:id', uploadImage.single('photo'), async (req, res) => {
  const { nom, poste, bio, ordre, actif } = req.body;
  try {
    const champs = ['nom = ?', 'poste = ?', 'bio = ?', 'ordre = ?', 'actif = ?'];
    const valeurs = [nom, poste || null, bio || null, ordre || 0, actif === undefined ? true : actif];
    if (req.file) { champs.push('photo_path = ?'); valeurs.push(await enregistrerFichier(req.file)); }
    valeurs.push(req.params.id);
    await pool.query(`UPDATE collaborateurs SET ${champs.join(', ')} WHERE id = ?`, valeurs);
    res.json({ message: 'Collaborateur mis à jour.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.delete('/collaborateurs/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM collaborateurs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Collaborateur supprimé.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

/* ================= MESSAGES DE CONTACT ================= */

router.get('/messages-contact', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM messages_contact ORDER BY created_at DESC');
    res.json({ messages: rows });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.post('/messages-contact/:id/lu', async (req, res) => {
  try {
    await pool.query('UPDATE messages_contact SET lu = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Marqué comme lu.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.delete('/messages-contact/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM messages_contact WHERE id = ?', [req.params.id]);
    res.json({ message: 'Message supprimé.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

/* ================= CONTENU HERO (carrousel photo + slogan par page) ================= */

router.get('/contenu-hero', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM contenu_hero ORDER BY page_cle ASC, ordre ASC');
    res.json({ diapositives: rows });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.post('/contenu-hero', uploadImage.single('image'), async (req, res) => {
  const { page_cle, slogan, sous_texte, ordre } = req.body;
  if (!page_cle || !slogan) return res.status(400).json({ erreur: 'Page et slogan sont obligatoires.' });
  try {
    const imagePath = await enregistrerFichier(req.file);
    const [result] = await pool.query(
      'INSERT INTO contenu_hero (page_cle, image_path, slogan, sous_texte, ordre) VALUES (?, ?, ?, ?, ?)',
      [page_cle, imagePath, slogan, sous_texte || null, ordre || 0]
    );
    res.status(201).json({ message: 'Diapositive ajoutée.', id: result.insertId });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.put('/contenu-hero/:id', uploadImage.single('image'), async (req, res) => {
  const { page_cle, slogan, sous_texte, ordre, actif } = req.body;
  try {
    const champs = ['page_cle = ?', 'slogan = ?', 'sous_texte = ?', 'ordre = ?', 'actif = ?'];
    const valeurs = [page_cle, slogan, sous_texte || null, ordre || 0, actif === undefined ? true : actif];
    if (req.file) { champs.push('image_path = ?'); valeurs.push(await enregistrerFichier(req.file)); }
    valeurs.push(req.params.id);
    await pool.query(`UPDATE contenu_hero SET ${champs.join(', ')} WHERE id = ?`, valeurs);
    res.json({ message: 'Diapositive mise à jour.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.delete('/contenu-hero/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM contenu_hero WHERE id = ?', [req.params.id]);
    res.json({ message: 'Diapositive supprimée.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

/* ================= DEMANDES (offres employeurs) ================= */

router.get('/demandes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, e.nom_societe, e.ville AS ville_employeur
       FROM demandes d JOIN employeurs e ON e.id = d.employeur_id
       ORDER BY d.created_at DESC`
    );
    res.json({ demandes: rows });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

router.delete('/demandes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM demandes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Demande supprimée.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

/* ================= MISE EN RELATION (matching) ================= */

// Propose un candidat pour une demande : historise la mise en relation et notifie
// le candidat (opportunité) ET l'employeur (profil complet du candidat, avec photo).
router.post('/demandes/:demandeId/proposer/:candidatId', async (req, res) => {
  try {
    const [demandeRows] = await pool.query(
      `SELECT d.*, e.user_id AS employeur_user_id, e.nom_societe
       FROM demandes d JOIN employeurs e ON e.id = d.employeur_id WHERE d.id = ?`,
      [req.params.demandeId]
    );
    if (!demandeRows.length) return res.status(404).json({ erreur: 'Demande introuvable.' });
    const demande = demandeRows[0];

    const [candidatRows] = await pool.query('SELECT * FROM candidats WHERE id = ?', [req.params.candidatId]);
    if (!candidatRows.length) return res.status(404).json({ erreur: 'Candidat introuvable.' });
    const candidat = candidatRows[0];

    await pool.query(
      'INSERT INTO mises_en_relation (demande_id, candidat_id, score_correspondance) VALUES (?, ?, ?)',
      [demande.id, candidat.id, req.body.score || 0]
    );

    // Notification au candidat
    await pool.query(
      `INSERT INTO notifications (user_id, type, titre, message, demande_id)
       VALUES (?, 'opportunite_emploi', ?, ?, ?)`,
      [
        candidat.user_id,
        `Une opportunité chez ${demande.nom_societe}`,
        `Ton profil a été proposé pour le poste "${demande.poste}" chez ${demande.nom_societe}. L'entreprise a reçu ton profil complet et pourra te contacter directement.`,
        demande.id
      ]
    );

    // Notification à l'employeur avec le profil complet du candidat (photo + tous les détails)
    const profilComplet = JSON.stringify({
      nom_complet: candidat.nom_complet,
      ville: candidat.ville,
      niveau_etude: candidat.niveau_etude,
      domaine: candidat.domaine,
      parcours_pedagogique: candidat.parcours_pedagogique,
      parcours_professionnel: candidat.parcours_professionnel,
      atouts: candidat.atouts,
      photo_path: candidat.photo_path,
      cv_path: candidat.cv_path
    });
    await pool.query(
      `INSERT INTO notifications (user_id, type, titre, message, demande_id, candidat_id)
       VALUES (?, 'proposition_candidat', ?, ?, ?, ?)`,
      [demande.employeur_user_id, `Profil proposé pour "${demande.poste}"`, profilComplet, demande.id, candidat.id]
    );

    res.json({ message: 'Profil proposé avec succès au candidat et à l\'entreprise.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// Liste des profils proposés par l'admin à un employeur, en attente de sa décision
// (statut 'propose' = pas encore sélectionné par l'employeur). Permet à l'admin de
// retirer une proposition qui ne l'intéresse plus (ex: proposée par erreur, doublon...).
router.get('/propositions', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT mer.id, mer.created_at,
              d.id AS demande_id, d.poste, e.nom_societe,
              c.id AS candidat_id, c.nom_complet, c.ville, c.niveau_etude, c.domaine, c.photo_path
       FROM mises_en_relation mer
       JOIN demandes d ON d.id = mer.demande_id
       JOIN employeurs e ON e.id = d.employeur_id
       JOIN candidats c ON c.id = mer.candidat_id
       WHERE mer.statut = 'propose'
       ORDER BY mer.created_at DESC`
    );
    res.json({ propositions: rows });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// Liste des profils sélectionnés par un employeur (+ rendez-vous confirmés, dossiers
// incomplets ou rendez-vous annulés) — tout ce qui n'est plus au stade "proposé".
router.get('/selections', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT mer.id, mer.statut, mer.score_correspondance, mer.selectionne_le, mer.notifie_le,
              mer.entretien_date, mer.entretien_lieu, mer.entretien_notes,
              mer.rdv_paiement_date, mer.rdv_paiement_lieu,
              d.id AS demande_id, d.poste, e.nom_societe,
              c.id AS candidat_id, c.nom_complet, c.ville, c.niveau_etude, c.domaine, c.photo_path,
              u.telephone AS telephone_candidat
       FROM mises_en_relation mer
       JOIN demandes d ON d.id = mer.demande_id
       JOIN employeurs e ON e.id = d.employeur_id
       JOIN candidats c ON c.id = mer.candidat_id
       JOIN users u ON u.id = c.user_id
       WHERE mer.statut IN ('selectionne', 'notifie', 'rejete', 'annule')
       ORDER BY mer.selectionne_le DESC`
    );
    res.json({ selections: rows });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// Supprime une mise en relation (proposition, sélection, rendez-vous annulé ou dossier
// rejeté) — permet à l'admin de nettoyer/trier facilement les listes.
router.delete('/mises-en-relation/:id', async (req, res) => {
  try {
    const [resultat] = await pool.query('DELETE FROM mises_en_relation WHERE id = ?', [req.params.id]);
    if (!resultat.affectedRows) return res.status(404).json({ erreur: 'Profil introuvable.' });
    res.json({ message: 'Profil retiré de la liste.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// Confirme le rendez-vous de paiement et dépôt de dossier : l'ADMIN choisit d'abord
// une date/heure (et un lieu) pour ce rendez-vous, puis le mail complet (créneau
// d'entretien + rendez-vous de paiement/dépôt + frais + documents à fournir) part
// au candidat. Le WhatsApp (créneau d'entretien uniquement, template Meta) reste
// une notification complémentaire, pas obligatoire.
router.post('/mises-en-relation/:id/notifier', async (req, res) => {
  try {
    const { rdv_paiement_date, rdv_paiement_lieu } = req.body;
    if (!rdv_paiement_date) {
      return res.status(400).json({ erreur: 'Merci de choisir une date ET une heure pour le rendez-vous de paiement et dépôt de dossier.' });
    }
    const correspondance = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(rdv_paiement_date);
    if (!correspondance) {
      return res.status(400).json({ erreur: 'Format de date invalide pour le rendez-vous de paiement.' });
    }
    const rdvPaiementSql = `${correspondance[1]} ${correspondance[2]}:00`;

    const [rows] = await pool.query(
      `SELECT mer.*, d.poste, e.nom_societe, c.nom_complet, c.niveau_etude, c.user_id AS candidat_user_id,
              u.telephone, u.email
       FROM mises_en_relation mer
       JOIN demandes d ON d.id = mer.demande_id
       JOIN employeurs e ON e.id = d.employeur_id
       JOIN candidats c ON c.id = mer.candidat_id
       JOIN users u ON u.id = c.user_id
       WHERE mer.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erreur: 'Sélection introuvable.' });
    const sel = rows[0];

    await pool.query(
      `UPDATE mises_en_relation SET rdv_paiement_date = ?, rdv_paiement_lieu = ? WHERE id = ?`,
      [rdvPaiementSql, rdv_paiement_lieu || null, req.params.id]
    );

    const resultatWhatsapp = await envoyerNotificationSelection({
      telephoneCandidat: sel.telephone,
      nomCandidat: sel.nom_complet,
      nomSociete: sel.nom_societe,
      poste: sel.poste,
      entretienDate: sel.entretien_date,
      entretienLieu: sel.entretien_lieu,
      entretienNotes: sel.entretien_notes
    });

    // Le mail est TOUJOURS envoyé (pas seulement en secours du WhatsApp) car
    // c'est lui qui porte le détail complet : rendez-vous de paiement et dépôt
    // de dossier (créneau choisi par l'admin ci-dessus), frais de dossier, frais
    // de formation à l'entretien et liste des documents à fournir (le template
    // WhatsApp Meta, lui, reste limité à un texte court pré-approuvé).
    const rdvPaiementTexte = formaterCreneau(rdvPaiementSql);
    const resultatEmail = await envoyerEmailSelection({
      emailCandidat: sel.email,
      nomCandidat: sel.nom_complet,
      nomSociete: sel.nom_societe,
      poste: sel.poste,
      creneauTexte: formaterCreneau(sel.entretien_date),
      entretienLieu: sel.entretien_lieu,
      entretienNotes: sel.entretien_notes,
      niveauEtude: sel.niveau_etude,
      rdvPaiementTexte,
      rdvPaiementLieu: rdv_paiement_lieu
    });

    await pool.query(`UPDATE mises_en_relation SET statut = 'notifie', notifie_le = NOW() WHERE id = ?`, [req.params.id]);

    const creneauTexte = formaterCreneau(sel.entretien_date);
    const documentsAFournir = diplomesRequis(sel.niveau_etude).map((d) => `Diplôme : ${d}`);
    const messageNotification = `L'entreprise ${sel.nom_societe} a sélectionné ton profil pour le poste "${sel.poste}".\n`
      + `Entretien prévu : ${creneauTexte}\n`
      + `Lieu de l'entretien : ${sel.entretien_lieu || 'à confirmer'}\n`
      + (sel.entretien_notes ? `Informations complémentaires : ${sel.entretien_notes}\n` : '')
      + `Rendez-vous de paiement et dépôt de dossier : ${rdvPaiementTexte}${rdv_paiement_lieu ? ` — ${rdv_paiement_lieu}` : ''}\n`
      + `Frais de dossier : ${FRAIS_DOSSIER_FCFA.toLocaleString('fr-FR')} FCFA — Frais de formation à l'entretien : ${FRAIS_FORMATION_ENTRETIEN_FCFA.toLocaleString('fr-FR')} FCFA\n`
      + `Diplômes à fournir (copies légalisées) : ${documentsAFournir.map((d) => d.replace('Diplôme : ', '')).join(', ')}\n`
      + `⚠️ Consulte bien ton EMAIL : la liste complète des documents à fournir t'y a été envoyée.\n`
      + `Tu vas être recontacté(e) prochainement.`;

    await pool.query(
      `INSERT INTO notifications (user_id, type, titre, message, demande_id, candidat_id)
       VALUES (?, 'opportunite_emploi', ?, ?, ?, ?)`,
      [
        sel.candidat_user_id,
        `Tu as été sélectionné(e) par ${sel.nom_societe} !`,
        messageNotification,
        sel.demande_id,
        sel.candidat_id
      ]
    );

    const raisonsWhatsapp = {
      configuration_incomplete: 'la configuration WhatsApp (.env) est incomplète sur le serveur.',
      telephone_manquant: 'le numéro de téléphone du candidat est manquant ou invalide.',
      erreur_api: 'l\'API WhatsApp a refusé l\'envoi (voir détails techniques).'
    };
    const raisonsEmail = {
      configuration_incomplete: 'la configuration email (Brevo/SMTP, .env) est incomplète sur le serveur.',
      email_manquant: 'le candidat n\'a pas d\'adresse email valide.',
      erreur_brevo: 'l\'envoi via Brevo a échoué (voir détails techniques).',
      erreur_smtp: 'l\'envoi de l\'email a échoué (voir détails techniques).'
    };

    const emailOk = resultatEmail && resultatEmail.envoye;
    const whatsappOk = resultatWhatsapp.envoye;

    let message;
    if (emailOk && whatsappOk) {
      message = 'Rendez-vous confirmé : le candidat a été notifié par WhatsApp ET a reçu le mail complet '
        + '(entretien, rendez-vous de paiement/dépôt de dossier, frais et liste des documents à fournir).';
    } else if (emailOk) {
      message = 'Rendez-vous confirmé : le mail complet (entretien, rendez-vous de paiement/dépôt, frais et documents à fournir) a bien été envoyé au candidat. '
        + `L'envoi WhatsApp, lui, a échoué (${raisonsWhatsapp[resultatWhatsapp.raison] || resultatWhatsapp.raison}).`;
    } else {
      message = 'Candidat marqué comme notifié, mais ni WhatsApp ni l\'email n\'ont pu être envoyés '
        + `(WhatsApp : ${raisonsWhatsapp[resultatWhatsapp.raison] || resultatWhatsapp.raison} ; `
        + `Email : ${raisonsEmail[resultatEmail?.raison] || resultatEmail?.raison}). `
        + 'La notification (avec le créneau, les frais et les documents) reste bien visible dans son espace candidat.';
    }

    return res.json({ message, whatsapp: resultatWhatsapp, email: resultatEmail });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// Annule un rendez-vous de paiement/dépôt de dossier déjà confirmé (ex: empêchement,
// erreur de créneau...). Le candidat en est informé dans son espace personnel.
router.post('/mises-en-relation/:id/annuler', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT mer.*, d.poste, e.nom_societe, c.user_id AS candidat_user_id
       FROM mises_en_relation mer
       JOIN demandes d ON d.id = mer.demande_id
       JOIN employeurs e ON e.id = d.employeur_id
       JOIN candidats c ON c.id = mer.candidat_id
       WHERE mer.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erreur: 'Sélection introuvable.' });
    const sel = rows[0];

    await pool.query(`UPDATE mises_en_relation SET statut = 'annule' WHERE id = ?`, [req.params.id]);

    await pool.query(
      `INSERT INTO notifications (user_id, type, titre, message, demande_id, candidat_id)
       VALUES (?, 'info', ?, ?, ?, ?)`,
      [
        sel.candidat_user_id,
        'Rendez-vous annulé',
        `Le rendez-vous de paiement et dépôt de dossier pour le poste "${sel.poste}" chez ${sel.nom_societe} a été annulé. `
          + 'L\'équipe APRJ te recontactera pour te proposer un nouveau créneau si besoin.',
        sel.demande_id,
        sel.candidat_id
      ]
    );

    res.json({ message: 'Rendez-vous annulé. Le candidat a été informé dans son espace personnel.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// Marque le dossier du candidat comme incomplet (documents manquants au dépôt).
// Le candidat en est informé dans son espace personnel.
router.post('/mises-en-relation/:id/dossier-incomplet', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT mer.*, d.poste, e.nom_societe, c.user_id AS candidat_user_id
       FROM mises_en_relation mer
       JOIN demandes d ON d.id = mer.demande_id
       JOIN employeurs e ON e.id = d.employeur_id
       JOIN candidats c ON c.id = mer.candidat_id
       WHERE mer.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erreur: 'Sélection introuvable.' });
    const sel = rows[0];

    await pool.query(`UPDATE mises_en_relation SET statut = 'rejete' WHERE id = ?`, [req.params.id]);

    await pool.query(
      `INSERT INTO notifications (user_id, type, titre, message, demande_id, candidat_id)
       VALUES (?, 'info', ?, ?, ?, ?)`,
      [
        sel.candidat_user_id,
        'Dossier incomplet',
        `Ton dossier pour le poste "${sel.poste}" chez ${sel.nom_societe} a été reçu incomplet. `
          + 'Merci de contacter l\'équipe APRJ pour régulariser les documents manquants.',
        sel.demande_id,
        sel.candidat_id
      ]
    );

    res.json({ message: 'Dossier marqué comme incomplet. Le candidat a été informé dans son espace personnel.' });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

module.exports = router;
