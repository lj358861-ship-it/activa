const axios = require('axios');

/*
  Service WhatsApp Business Cloud API (Meta).

  IMPORTANT - à savoir avant de déployer :
  Meta impose que toute conversation lancée PAR l'entreprise (donc pas en réponse
  à un message reçu dans les dernières 24h) passe par un "message modèle" (template)
  validé au préalable dans le Meta Business Manager. Un simple message texte libre
  sera refusé si aucune conversation n'est ouverte.

  -> Étape à faire une seule fois dans Meta Business Manager :
     1. Créer un template nommé comme WHATSAPP_TEMPLATE_NAME (ex: "nouvelle_candidature")
     2. Catégorie : Utility
     3. Corps du message avec variables, ex :
        "Nouvelle candidature reçue sur Activa Recrutement.
         Nom : {{1}}
         Poste souhaité / domaine : {{2}}
         Niveau d'étude : {{3}}
         Téléphone : {{4}}
         CV : {{5}}"
     4. Attendre la validation Meta (généralement quelques heures à 1-2 jours)

  Une fois validé, la fonction envoyerNotificationCandidature() ci-dessous fonctionnera
  directement en prod. En attendant la validation du template, ce service loggue
  l'erreur sans bloquer l'inscription du candidat (le profil reste bien enregistré en base).
*/

const GRAPH_API_VERSION = 'v20.0';

function urlEnvoiMessage() {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

function enteteAuth() {
  return {
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
}

/**
 * Envoie une notification "nouvelle candidature" au numéro WhatsApp d'Activa
 * via un template Meta approuvé.
 */
async function envoyerNotificationCandidature({ nomComplet, domaine, niveauEtude, telephone, cvUrl }) {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.ADMIN_WHATSAPP_NUMBER) {
    console.warn('[WhatsApp] Configuration incomplète (.env) — notification non envoyée, profil quand même sauvegardé.');
    return { envoye: false, raison: 'configuration_incomplete' };
  }

  const corps = {
    messaging_product: 'whatsapp',
    to: process.env.ADMIN_WHATSAPP_NUMBER,
    type: 'template',
    template: {
      name: process.env.WHATSAPP_TEMPLATE_NAME || 'nouvelle_candidature',
      language: { code: 'fr' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: nomComplet },
            { type: 'text', text: domaine },
            { type: 'text', text: niveauEtude },
            { type: 'text', text: telephone },
            { type: 'text', text: cvUrl || 'Non fourni' }
          ]
        }
      ]
    }
  };

  try {
    const reponse = await axios.post(urlEnvoiMessage(), corps, enteteAuth());
    return { envoye: true, id: reponse.data.messages?.[0]?.id };
  } catch (erreur) {
    console.error('[WhatsApp] Échec envoi notification:', erreur.response?.data || erreur.message);
    return { envoye: false, raison: 'erreur_api', details: erreur.response?.data || erreur.message };
  }
}

/**
 * Envoie un message texte libre (uniquement possible si une conversation est
 * déjà ouverte dans les 24h, ex: l'admin a déjà écrit au bot).
 */
async function envoyerMessageTexte(destinataire, texte) {
  const corps = {
    messaging_product: 'whatsapp',
    to: destinataire,
    type: 'text',
    text: { body: texte }
  };
  try {
    const reponse = await axios.post(urlEnvoiMessage(), corps, enteteAuth());
    return { envoye: true, id: reponse.data.messages?.[0]?.id };
  } catch (erreur) {
    console.error('[WhatsApp] Échec envoi texte:', erreur.response?.data || erreur.message);
    return { envoye: false, raison: 'erreur_api' };
  }
}

module.exports = { envoyerNotificationCandidature, envoyerMessageTexte };
