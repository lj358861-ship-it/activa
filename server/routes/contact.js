const express = require('express');
const pool = require('../db');

const router = express.Router();

router.post('/', async (req, res) => {
  const { nom, email, telephone, sujet, message } = req.body;
  if (!nom || !email || !message) {
    return res.status(400).json({ erreur: 'Nom, email et message sont obligatoires.' });
  }
  try {
    await pool.query(
      'INSERT INTO messages_contact (nom, email, telephone, sujet, message) VALUES (?, ?, ?, ?, ?)',
      [nom, email, telephone || null, sujet || null, message]
    );
    res.status(201).json({ message: 'Message envoyé avec succès. Nous te répondrons rapidement.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erreur: 'Erreur serveur lors de l\'envoi du message.' });
  }
});

module.exports = router;
