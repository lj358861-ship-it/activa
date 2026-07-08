const nodemailer = require('nodemailer');
const axios = require('axios');

/*
  Service d'envoi d'email — utilisé en SECOURS quand la notification WhatsApp
  échoue (configuration manquante, quota dépassé, etc.).

  DEUX MODES POSSIBLES :

  1) BREVO_API_KEY (RECOMMANDÉ) — passe par l'API HTTP de Brevo (port 443,
     jamais bloqué par les hébergeurs cloud). Beaucoup plus fiable que le SMTP
     classique, qui est souvent bloqué par Railway/Render/etc. pour lutter
     contre le spam (c'est ce qui causait les "Load failed").
       BREVO_API_KEY=xkeysib-xxxxxxxx
       SMTP_EXPEDITEUR=APRJ Recrutement <votre-adresse@gmail.com>
       (l'adresse doit être un "expéditeur validé" dans votre compte Brevo)

  2) SMTP classique (nodemailer) — gardé en repli si BREVO_API_KEY n'est pas
     défini, mais peut rester bloqué sur certains hébergeurs :
       SMTP_HOTE=smtp.gmail.com
       SMTP_PORT=465
       SMTP_UTILISATEUR=votre-adresse@gmail.com
       SMTP_MOT_DE_PASSE=xxxxxxxxxxxxxxxx
       SMTP_EXPEDITEUR=APRJ Recrutement <votre-adresse@gmail.com>
*/

function construireHtml({ nomCandidat, nomSociete, poste, creneauTexte, entretienLieu, entretienNotes }) {
  return `
    <p>Bonjour ${nomCandidat},</p>
    <p>L'entreprise <strong>${nomSociete}</strong> a sélectionné ton profil pour le poste
       <strong>${poste}</strong>.</p>
    <p>
      <strong>Entretien prévu :</strong> ${creneauTexte}<br>
      <strong>Lieu :</strong> ${entretienLieu || 'à confirmer'}<br>
      ${entretienNotes ? `<strong>Informations complémentaires :</strong> ${entretienNotes}<br>` : ''}
    </p>
    <p>Tu vas être recontacté(e) prochainement par l'équipe APRJ ou directement par l'entreprise.</p>
    <p>Bonne chance !<br>L'équipe APRJ</p>
  `;
}

function extraireNomEtEmailExpediteur() {
  const brut = process.env.SMTP_EXPEDITEUR || process.env.SMTP_UTILISATEUR || '';
  const correspondance = brut.match(/^(.*)<(.+)>$/);
  if (correspondance) {
    return { nom: correspondance[1].trim() || 'APRJ Recrutement', email: correspondance[2].trim() };
  }
  return { nom: 'APRJ Recrutement', email: brut.trim() };
}

async function envoyerViaBrevoApi({ emailCandidat, sujet, html }) {
  const { nom, email } = extraireNomEtEmailExpediteur();
  const reponse = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { name: nom, email },
      to: [{ email: emailCandidat }],
      subject: sujet,
      htmlContent: html
    },
    {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      timeout: 10000
    }
  );
  return { envoye: true, id: reponse.data.messageId };
}

async function envoyerViaSmtp({ emailCandidat, sujet, html }) {
  const transporteur = nodemailer.createTransport({
    host: process.env.SMTP_HOTE,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_UTILISATEUR, pass: process.env.SMTP_MOT_DE_PASSE },
    connectionTimeout: 10000, // évite que la requête reste bloquée si le port SMTP est filtré par l'hébergeur
    greetingTimeout: 10000,
    socketTimeout: 10000
  });
  const info = await transporteur.sendMail({
    from: process.env.SMTP_EXPEDITEUR || process.env.SMTP_UTILISATEUR,
    to: emailCandidat,
    subject: sujet,
    html
  });
  return { envoye: true, id: info.messageId };
}

/**
 * Envoie au candidat un email l'informant de sa sélection, avec le créneau d'entretien.
 * Utilisée automatiquement en secours si l'envoi WhatsApp échoue.
 * Utilise l'API Brevo si BREVO_API_KEY est défini (recommandé), sinon le SMTP classique.
 */
async function envoyerEmailSelection({
  emailCandidat, nomCandidat, nomSociete, poste,
  creneauTexte, entretienLieu, entretienNotes
}) {
  if (!emailCandidat) {
    return { envoye: false, raison: 'email_manquant' };
  }

  const html = construireHtml({ nomCandidat, nomSociete, poste, creneauTexte, entretienLieu, entretienNotes });
  const sujet = `Tu as été sélectionné(e) par ${nomSociete} !`;

  if (process.env.BREVO_API_KEY) {
    try {
      return await envoyerViaBrevoApi({ emailCandidat, sujet, html });
    } catch (erreur) {
      console.error('[Email] Échec envoi via Brevo API:', erreur.response?.data || erreur.message);
      return { envoye: false, raison: 'erreur_brevo', details: erreur.response?.data || erreur.message };
    }
  }

  if (process.env.SMTP_HOTE && process.env.SMTP_UTILISATEUR && process.env.SMTP_MOT_DE_PASSE) {
    try {
      return await envoyerViaSmtp({ emailCandidat, sujet, html });
    } catch (erreur) {
      console.error('[Email] Échec envoi via SMTP:', erreur.message);
      return { envoye: false, raison: 'erreur_smtp', details: erreur.message };
    }
  }

  console.warn('[Email] Aucune configuration email trouvée (.env) — email de secours non envoyé.');
  return { envoye: false, raison: 'configuration_incomplete' };
}

module.exports = { envoyerEmailSelection };
