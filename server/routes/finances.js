const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { verifierToken, autoriserRoles } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes finances nécessitent déjà un compte admin connecté (token normal).
router.use(verifierToken, autoriserRoles('admin'));

// Durée de validité du déverrouillage PIN (en secondes). Après expiration,
// l'admin doit retaper le code pour continuer à consulter la caisse.
const DUREE_SESSION_PIN = 60 * 60 * 2; // 2 heures

// Vérifie le code PIN et délivre un jeton de session "finances" à part (distinct
// du token de connexion admin), à fournir dans l'en-tête X-Finance-Token pour
// toutes les autres routes de ce fichier.
router.post('/deverrouiller', (req, res) => {
  const pinAttendu = process.env.FINANCES_PIN;
  if (!pinAttendu) {
    return res.status(500).json({
      erreur: 'Aucun code PIN n\'est configuré côté serveur. Ajoute la variable d\'environnement FINANCES_PIN (Railway → Variables) puis redéploie.'
    });
  }
  const { pin } = req.body;
  if (!pin || String(pin) !== String(pinAttendu)) {
    return res.status(401).json({ erreur: 'Code PIN incorrect.' });
  }
  const token = jwt.sign(
    { admin_id: req.utilisateur.id, scope: 'finances' },
    process.env.JWT_SECRET,
    { expiresIn: DUREE_SESSION_PIN }
  );
  res.json({ token, expire_dans: DUREE_SESSION_PIN });
});

// Protège toutes les routes suivantes : nécessite un jeton "finances" valide,
// obtenu via /deverrouiller ci-dessus.
function verifierPin(req, res, next) {
  const header = req.headers['x-finance-token'];
  if (!header) return res.status(401).json({ erreur: 'Code PIN requis.', pin_requis: true });
  try {
    const payload = jwt.verify(header, process.env.JWT_SECRET);
    if (payload.scope !== 'finances') throw new Error('scope invalide');
    next();
  } catch (e) {
    return res.status(401).json({ erreur: 'Session PIN expirée ou invalide, merci de ressaisir le code.', pin_requis: true });
  }
}
router.use(verifierPin);

// Bornes de dates (MySQL, fuseau serveur) pour les périodes rapides.
function bornesPeriode(periode) {
  switch (periode) {
    case 'jour': return 'DATE(created_at) = CURDATE()';
    case 'semaine': return 'YEARWEEK(created_at, 3) = YEARWEEK(CURDATE(), 3)';
    case 'mois': return 'YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())';
    case 'annee': return 'YEAR(created_at) = YEAR(CURDATE())';
    default: return '1=1';
  }
}

// Résumé chiffré : totaux et nombre de transactions pour aujourd'hui, cette semaine,
// ce mois-ci, cette année, et depuis toujours. Sert pour les cartes en haut de page.
router.get('/resume', async (req, res) => {
  try {
    const periodes = ['jour', 'semaine', 'mois', 'annee', 'tout'];
    const resume = {};
    for (const p of periodes) {
      const condition = p === 'tout' ? '1=1' : bornesPeriode(p);
      const [[ligne]] = await pool.query(
        `SELECT COUNT(*) AS nombre, COALESCE(SUM(montant_total_fcfa), 0) AS total_fcfa
         FROM transactions WHERE ${condition}`
      );
      resume[p] = { nombre: ligne.nombre, total_fcfa: ligne.total_fcfa };
    }

    // Compteurs des rendez-vous de paiement (envoyés / confirmés / annulés / dossiers
    // incomplets), par période — basés sur les horodatages dédiés de chaque événement,
    // pas sur le statut actuel (qui peut changer ensuite, ex: un dossier incomplet
    // reprogrammé passe à nouveau en "paiement_propose").
    const rdv = {};
    for (const p of periodes) {
      const conditionEnvoyes = p === 'tout' ? 'rdv_paiement_envoye_le IS NOT NULL' : `${bornesPeriode(p).replace(/created_at/g, 'rdv_paiement_envoye_le')} AND rdv_paiement_envoye_le IS NOT NULL`;
      const conditionConfirmes = p === 'tout' ? 'notifie_le IS NOT NULL' : `${bornesPeriode(p).replace(/created_at/g, 'notifie_le')} AND notifie_le IS NOT NULL`;
      const conditionAnnules = p === 'tout' ? 'annule_le IS NOT NULL' : `${bornesPeriode(p).replace(/created_at/g, 'annule_le')} AND annule_le IS NOT NULL`;
      const conditionIncomplets = p === 'tout' ? 'rejete_le IS NOT NULL' : `${bornesPeriode(p).replace(/created_at/g, 'rejete_le')} AND rejete_le IS NOT NULL`;

      const [[{ n: envoyes }]] = await pool.query(`SELECT COUNT(*) AS n FROM mises_en_relation WHERE ${conditionEnvoyes}`);
      const [[{ n: confirmes }]] = await pool.query(`SELECT COUNT(*) AS n FROM mises_en_relation WHERE ${conditionConfirmes}`);
      const [[{ n: annules }]] = await pool.query(`SELECT COUNT(*) AS n FROM mises_en_relation WHERE ${conditionAnnules}`);
      const [[{ n: incomplets }]] = await pool.query(`SELECT COUNT(*) AS n FROM mises_en_relation WHERE ${conditionIncomplets}`);

      rdv[p] = { envoyes, confirmes, annules, incomplets };
    }

    // Photo instantanée (pas liée à une période) : combien de rendez-vous sont
    // actuellement en attente de décision (payé ? incomplet ? annulé ?).
    const [[{ n: en_attente }]] = await pool.query(
      `SELECT COUNT(*) AS n FROM mises_en_relation WHERE statut = 'paiement_propose'`
    );

    res.json({ resume, rdv, en_attente });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// Liste détaillée des transactions, filtrable par période rapide ou par plage de
// dates personnalisée (debut/fin au format YYYY-MM-DD), avec le total correspondant.
router.get('/transactions', async (req, res) => {
  try {
    const { periode, debut, fin } = req.query;
    let condition = '1=1';
    const valeurs = [];

    if (debut && fin) {
      condition = 'DATE(created_at) BETWEEN ? AND ?';
      valeurs.push(debut, fin);
    } else if (periode && periode !== 'tout') {
      condition = bornesPeriode(periode);
    }

    const [transactions] = await pool.query(
      `SELECT t.*, u.email AS valide_par_email
       FROM transactions t
       LEFT JOIN users u ON u.id = t.valide_par
       WHERE ${condition.replace(/created_at/g, 't.created_at')}
       ORDER BY t.created_at DESC`,
      valeurs
    );
    const [[{ total_fcfa }]] = await pool.query(
      `SELECT COALESCE(SUM(montant_total_fcfa), 0) AS total_fcfa FROM transactions WHERE ${condition}`,
      valeurs
    );
    res.json({ transactions, total_fcfa, nombre: transactions.length });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

// Évolution jour par jour sur les N derniers jours (par défaut 30), pour un
// graphique simple en barres dans la page finances.
router.get('/evolution', async (req, res) => {
  try {
    const jours = Math.min(Math.max(parseInt(req.query.jours, 10) || 30, 7), 366);
    const [rows] = await pool.query(
      `SELECT DATE(created_at) AS jour, COALESCE(SUM(montant_total_fcfa), 0) AS total_fcfa, COUNT(*) AS nombre
       FROM transactions
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY jour ASC`,
      [jours - 1]
    );
    res.json({ evolution: rows, jours });
  } catch (e) { console.error(e); res.status(500).json({ erreur: 'Erreur serveur.' }); }
});

module.exports = router;
