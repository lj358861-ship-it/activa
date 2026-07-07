const express = require('express');
const pool = require('../db');
const { verifierToken, autoriserRoles } = require('../middleware/auth');
const uploadImage = require('../middleware/upload-image');

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
    const photoPath = req.file?.filename || null;
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
    const photoPath = req.file?.filename || null;
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
    const imagePath = req.file ? req.file.filename : null;
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
    if (req.file) { champs.push('image_path = ?'); valeurs.push(req.file.filename); }
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
    const photoPath = req.file ? req.file.filename : null;
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
    if (req.file) { champs.push('photo_path = ?'); valeurs.push(req.file.filename); }
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
    const imagePath = req.file ? req.file.filename : null;
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
    if (req.file) { champs.push('image_path = ?'); valeurs.push(req.file.filename); }
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

module.exports = router;
