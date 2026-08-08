const axios = require('axios');

/*
  Service de notification WhatsApp vers l'APRJ, envoyé dès qu'un nouveau
  candidat s'inscrit (voir routes/candidat.js -> envoyerNotificationCandidature).

  Ce service est OPTIONNEL : tant que les variables d'environnement WhatsApp
  ne sont pas configurées, il ne fait rien et renvoie simplement
  { envoye: false, raison: 'configuration_incomplete' } — l'inscription du
  candidat continue de fonctionner normalement (l'email de vérification reste
  envoyé quoi qu'il arrive).

  Pour activer l'envoi WhatsApp plus tard (ex. via l'API Cloud de Meta) :
    WHATSAPP_TOKEN=xxxxxxxx           (token d'accès permanent Meta)
    WHATSAPP_PHONE_ID=xxxxxxxx        (ID du numéro expéditeur WhatsApp Business)
    WHATSAPP_DESTINATAIRE=2376xxxxxxx (numéro de l'APRJ qui reçoit la notif, format international sans +)
*/

function estConfigure() {
  return Boolean(
    process.env.WHATSAPP_TOKEN &&
    process.env.WHATSAPP_PHONE_ID &&
    process.env.WHATSAPP_DESTINATAIRE
  );
}

/**
 * Envoie une notification WhatsApp à l'APRJ pour signaler une nouvelle
 * candidature. Ne lève jamais d'exception : en cas d'échec ou d'absence de
 * configuration, renvoie simplement { envoye: false, ... } pour ne jamais
 * bloquer l'inscription du candidat.
 */
async function envoyerNotificationCandidature({ nomComplet, domaine, niveauEtude, telephone, cvUrl }) {
  if (!estConfigure()) {
    console.warn('[WhatsApp] Non configuré (.env) — notification non envoyée.');
    return { envoye: false, raison: 'configuration_incomplete' };
  }

  const texte = [
    `📋 Nouvelle candidature APRJ`,
    `Nom : ${nomComplet || 'N/A'}`,
    `Domaine : ${domaine || 'N/A'}`,
    `Niveau d'étude : ${niveauEtude || 'N/A'}`,
    `Téléphone : ${telephone || 'N/A'}`,
    cvUrl ? `CV : ${cvUrl}` : null
  ].filter(Boolean).join('\n');

  try {
    const reponse = await axios.post(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: process.env.WHATSAPP_DESTINATAIRE,
        type: 'text',
        text: { body: texte }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    return { envoye: true, id: reponse.data?.messages?.[0]?.id };
  } catch (erreur) {
    console.error('[WhatsApp] Échec envoi:', erreur.response?.data || erreur.message);
    return { envoye: false, raison: 'erreur_whatsapp', details: erreur.response?.data || erreur.message };
  }
}

module.exports = { envoyerNotificationCandidature };
