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
        "Nouvelle candidature reçue sur APRJ.
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

/**
 * L'API WhatsApp Cloud exige le numéro en format international, chiffres uniquement
 * (pas de "+", espaces, tirets ou parenthèses). Les candidats/employeurs saisissent
 * souvent leur numéro en format local (ex: "699 11 22 33") ou avec un "+" devant.
 * Cette fonction nettoie et ajoute l'indicatif Cameroun (237) si absent.
 */
function normaliserTelephone(numero) {
  if (!numero) return numero;
  let chiffres = String(numero).replace(/[^\d]/g, '');
  // Retire un éventuel 00 international (ex: 00237...)
  if (chiffres.startsWith('00')) chiffres = chiffres.slice(2);
  // Numéro local camerounais (9 chiffres, commence par 6 ou 2) sans indicatif -> on l'ajoute
  if (chiffres.length === 9 && (chiffres.startsWith('6') || chiffres.startsWith('2'))) {
    chiffres = '237' + chiffres;
  }
  return chiffres;
}

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
 * Envoie une notification "nouvelle candidature" au numéro WhatsApp de l'APRJ
 * via un template Meta approuvé.
 */
async function envoyerNotificationCandidature({ nomComplet, domaine, niveauEtude, telephone, cvUrl }) {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.ADMIN_WHATSAPP_NUMBER) {
    console.warn('[WhatsApp] Configuration incomplète (.env) — notification non envoyée, profil quand même sauvegardé.');
    return { envoye: false, raison: 'configuration_incomplete' };
  }

  const corps = {
    messaging_product: 'whatsapp',
    to: normaliserTelephone(process.env.ADMIN_WHATSAPP_NUMBER),
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
    to: normaliserTelephone(destinataire),
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

/**
 * Notifie un CANDIDAT (via template Meta approuvé) qu'une entreprise a sélectionné
 * son profil pour un poste. Nécessite un template Meta distinct de celui utilisé
 * pour prévenir l'admin (voir note en tête de fichier).
 *
 * Étape à faire une seule fois dans Meta Business Manager :
 *   1. Créer un template nommé comme WHATSAPP_TEMPLATE_SELECTION_NAME (ex: "profil_selectionne")
 *   2. Catégorie : Utility
 *   3. Corps du message avec variables, ex :
 *      "Bonjour {{1}}, l'entreprise {{2}} a sélectionné ton profil pour le poste
 *       {{3}}. L'APRJ ou l'entreprise te contactera bientôt. Bonne chance !"
 */
async function envoyerNotificationSelection({ telephoneCandidat, nomCandidat, nomSociete, poste }) {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('[WhatsApp] Configuration incomplète (.env) — notification candidat non envoyée.');
    return { envoye: false, raison: 'configuration_incomplete' };
  }
  const corps = {
    messaging_product: 'whatsapp',
    to: normaliserTelephone(telephoneCandidat),
    type: 'template',
    template: {
      name: process.env.WHATSAPP_TEMPLATE_SELECTION_NAME || 'profil_selectionne',
      language: { code: 'fr' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: nomCandidat },
            { type: 'text', text: nomSociete },
            { type: 'text', text: poste }
          ]
        }
      ]
    }
  };
  try {
    const reponse = await axios.post(urlEnvoiMessage(), corps, enteteAuth());
    return { envoye: true, id: reponse.data.messages?.[0]?.id };
  } catch (erreur) {
    console.error('[WhatsApp] Échec envoi notification sélection:', erreur.response?.data || erreur.message);
    return { envoye: false, raison: 'erreur_api', details: erreur.response?.data || erreur.message };
  }
}

module.exports = { envoyerNotificationCandidature, envoyerMessageTexte, envoyerNotificationSelection, normaliserTelephone };
