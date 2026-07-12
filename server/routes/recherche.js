const express = require('express');
const pool = require('../db');
const { verifierToken, autoriserRoles } = require('../middleware/auth');

const router = express.Router();

// Niveaux d'étude ordonnés pour permettre une correspondance "niveau requis ou supérieur"
const ORDRE_NIVEAUX = [
  'Aucun', 'CEP', 'BEPC', 'Probatoire', 'Baccalauréat',
  'BTS', 'Licence', 'Master', 'Doctorat'
];

function rangNiveau(niveau) {
  const i = ORDRE_NIVEAUX.findIndex((n) => n.toLowerCase() === String(niveau || '').toLowerCase());
  return i === -1 ? 0 : i;
}

// Lance une recherche de candidats correspondant à une demande donnée.
// Bouton "Faire une recherche" côté dashboard employeur.
router.get('/demandes/:id/candidats', verifierToken, autoriserRoles('employeur', 'admin'), async (req, res) => {
  try {
    const [demandeRows] = await pool.query('SELECT * FROM demandes WHERE id = ?', [req.params.id]);
    if (!demandeRows.length) return res.status(404).json({ erreur: 'Demande introuvable.' });
    const demande = demandeRows[0];

    // Vérifie que la demande appartient bien à l'employeur connecté (sauf admin)
    if (req.utilisateur.role === 'employeur') {
      const [empRows] = await pool.query('SELECT id FROM employeurs WHERE user_id = ?', [req.utilisateur.id]);
      if (!empRows.length || empRows[0].id !== demande.employeur_id) {
        return res.status(403).json({ erreur: 'Cette demande ne t\'appartient pas.' });
      }
    }

    const [candidats] = await pool.query(
      `SELECT id, nom_complet, ville, niveau_etude, domaine, parcours_pedagogique, parcours_professionnel, atouts, cv_path, photo_path, diplome_path
       FROM candidats WHERE domaine = ?`,
      [demande.domaine]
    );

    const rangRequis = rangNiveau(demande.niveau_etude_requis);

    // Score simple : domaine identique (déjà filtré) + niveau d'étude >= niveau requis
    const resultats = candidats
      .map((c) => {
        const rangCandidat = rangNiveau(c.niveau_etude);
        let score = 50; // même domaine
        if (rangCandidat >= rangRequis) score += 40;
        if (rangCandidat === rangRequis) score += 10;
        return { ...c, score_correspondance: score };
      })
      .filter((c) => rangNiveau(c.niveau_etude) >= rangRequis)
      .sort((a, b) => b.score_correspondance - a.score_correspondance);

    // Historiser les mises en relation proposées
    for (const c of resultats) {
      await pool.query(
        'INSERT INTO mises_en_relation (demande_id, candidat_id, score_correspondance) VALUES (?, ?, ?)',
        [demande.id, c.id, c.score_correspondance]
      );
    }

    res.json({ demande, resultats });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur lors de la recherche.' });
  }
});

module.exports = router;
