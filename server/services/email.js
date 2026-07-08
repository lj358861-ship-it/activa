const nodemailer = require('nodemailer');

/*
  Service d'envoi d'email — utilisé en SECOURS quand la notification WhatsApp
  échoue (configuration manquante, template non approuvé, quota dépassé, etc.).

  Fonctionne avec n'importe quel fournisseur SMTP. Variables à définir dans .env :
    SMTP_HOTE=smtp.gmail.com
    SMTP_PORT=465
    SMTP_UTILISATEUR=votre-adresse@gmail.com
    SMTP_MOT_DE_PASSE=xxxxxxxxxxxxxxxx   (mot de passe d'application, pas le mot de passe normal)
    SMTP_EXPEDITEUR="APRJ Recrutement <votre-adresse@gmail.com>"

  Voir le guide fourni pour la création d'un compte SMTP gratuit (Gmail ou Brevo).
*/

function transporteurDisponible() {
  return !!(process.env.SMTP_HOTE && process.env.SMTP_UTILISATEUR && process.env.SMTP_MOT_DE_PASSE);
}

function creerTransporteur() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOTE,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true pour le port 465, false pour 587/25
    auth: {
      user: process.env.SMTP_UTILISATEUR,
      pass: process.env.SMTP_MOT_DE_PASSE
    }
  });
}

/**
 * Envoie au candidat un email l'informant de sa sélection, avec le créneau d'entretien.
 * Utilisée automatiquement en secours si l'envoi WhatsApp échoue.
 */
async function envoyerEmailSelection({
  emailCandidat, nomCandidat, nomSociete, poste,
  creneauTexte, entretienLieu, entretienNotes
}) {
  if (!transporteurDisponible()) {
    console.warn('[Email] Configuration SMTP incomplète (.env) — email de secours non envoyé.');
    return { envoye: false, raison: 'configuration_incomplete' };
  }
  if (!emailCandidat) {
    return { envoye: false, raison: 'email_manquant' };
  }

  const html = `
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

  try {
    const transporteur = creerTransporteur();
    const info = await transporteur.sendMail({
      from: process.env.SMTP_EXPEDITEUR || process.env.SMTP_UTILISATEUR,
      to: emailCandidat,
      subject: `Tu as été sélectionné(e) par ${nomSociete} !`,
      html
    });
    return { envoye: true, id: info.messageId };
  } catch (erreur) {
    console.error('[Email] Échec envoi email de secours:', erreur.message);
    return { envoye: false, raison: 'erreur_smtp', details: erreur.message };
  }
}

module.exports = { envoyerEmailSelection };
