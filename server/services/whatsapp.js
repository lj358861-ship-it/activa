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

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

/**
 * Formate une date (objet Date, ou chaîne "YYYY-MM-DD HH:MM:SS" / ISO) en
 * texte lisible en français, ex : "lundi 15 janvier 2024 à 14h30".
 * Renvoie une chaîne vide si la date est absente ou invalide.
 */
function formaterCreneau(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(String(date).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';

  const jour = JOURS[d.getDay()];
  const quantieme = d.getDate();
  const mois = MOIS[d.getMonth()];
  const annee = d.getFullYear();
  const heures = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  const jourCapitalise = jour.charAt(0).toUpperCase() + jour.slice(1);
  return `${jourCapitalise} ${quantieme} ${mois} ${annee} à ${heures}h${minutes}`;
}

/**
 * Normalise un numéro de téléphone camerounais vers le format international
 * attendu par l'API WhatsApp (indicatif 237, sans "+", sans espaces).
 * Renvoie null si le numéro est manquant ou manifestement invalide.
 */
function formaterTelephoneCameroun(telephone) {
  if (!telephone) return null;
  let n = String(telephone).replace(/[^\d]/g, ''); // garde uniquement les chiffres
  if (!n) return null;

  if (n.startsWith('00237')) n = n.slice(2); // 00237... -> 237...
  if (n.startsWith('237')) {
    n = n.slice(3);
  } else if (n.startsWith('0')) {
    n = n.slice(1); // numéro local avec 0 initial -> on l'enlève
  }
  // Un numéro mobile camerounais fait 9 chiffres (ex: 6XXXXXXXX)
  if (n.length !== 9) return null;

  return `237${n}`;
}

/**
 * Envoie au CANDIDAT, par WhatsApp, la notification de sélection avec le
 * créneau (et lieu) d'entretien. Ne lève jamais d'exception : en cas
 * d'échec ou d'absence de configuration/numéro, renvoie { envoye: false, ... }
 * pour ne jamais bloquer le reste du traitement (email, etc.).
 */
async function envoyerNotificationSelection({
  telephoneCandidat, nomCandidat, nomSociete, poste, entretienDate, entretienLieu, entretienNotes
}) {
  if (!estConfigure()) {
    console.warn('[WhatsApp] Non configuré (.env) — notification de sélection non envoyée.');
    return { envoye: false, raison: 'configuration_incomplete' };
  }

  const destinataire = formaterTelephoneCameroun(telephoneCandidat);
  if (!destinataire) {
    return { envoye: false, raison: 'telephone_manquant' };
  }

  const creneauTexte = formaterCreneau(entretienDate);
  const texte = [
    `✅ Félicitations ${nomCandidat || ''} !`,
    `L'entreprise ${nomSociete || ''} vous a sélectionné(e) pour le poste "${poste || ''}".`,
    creneauTexte ? `Entretien prévu : ${creneauTexte}` : null,
    entretienLieu ? `Lieu : ${entretienLieu}` : null,
    entretienNotes ? `Informations complémentaires : ${entretienNotes}` : null
  ].filter(Boolean).join('\n');

  try {
    const reponse = await axios.post(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: destinataire,
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
    console.error('[WhatsApp] Échec envoi notification sélection:', erreur.response?.data || erreur.message);
    return { envoye: false, raison: 'erreur_api', details: erreur.response?.data || erreur.message };
  }
}

module.exports = { envoyerNotificationCandidature, envoyerNotificationSelection, formaterCreneau };
