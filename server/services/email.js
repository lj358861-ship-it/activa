const nodemailer = require('nodemailer');
const axios = require('axios');

/*
  Service d'envoi d'email au candidat sélectionné par une entreprise.
  Ce mail est TOUJOURS envoyé (indépendamment du succès/échec de la notification
  WhatsApp) car c'est lui qui porte le détail complet : créneau d'entretien,
  frais de dossier, frais de formation à l'entretien, et liste des documents
  à fournir (diplômes en cascade selon le niveau d'étude du candidat).

  DEUX MODES POSSIBLES POUR L'ENVOI :

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

// ===== Frais facturés au candidat lors du dépôt de dossier =====
// Modifiables ici si les tarifs changent — utilisés uniquement dans le mail
// de confirmation de sélection ci-dessous.
const FRAIS_DOSSIER_FCFA = 10000;
const FRAIS_FORMATION_ENTRETIEN_FCFA = 5000;

// ===== Hiérarchie des diplômes (du plus bas au plus élevé) =====
// Doit rester dans le même ordre que les <option> du formulaire d'inscription
// candidat (public/inscription-candidat.html, champ "niveau_etude").
const HIERARCHIE_DIPLOMES = [
  'CEP', 'BEPC', 'Probatoire', 'Baccalauréat', 'BTS', 'Licence', 'Master', 'Doctorat'
];

/**
 * À partir du niveau d'étude renseigné par le candidat, renvoie la liste des
 * diplômes à fournir : son diplôme + tous les diplômes de niveau inférieur.
 * Ex : "BTS" -> ["BTS", "Baccalauréat", "Probatoire", "BEPC", "CEP"]
 *      "Master" -> ["Master", "Licence", "BTS", "Baccalauréat", "Probatoire", "BEPC", "CEP"]
 * Si le niveau n'est pas reconnu (saisie libre ancienne), on renvoie juste ce niveau.
 */
function diplomesRequis(niveauEtude) {
  const index = HIERARCHIE_DIPLOMES.findIndex(
    (d) => d.toLowerCase() === String(niveauEtude || '').trim().toLowerCase()
  );
  if (index === -1) return niveauEtude ? [niveauEtude] : [];
  return HIERARCHIE_DIPLOMES.slice(0, index + 1).reverse();
}

/**
 * Liste des documents à fournir lors du dépôt de dossier, en incluant les
 * copies légalisées des diplômes en cascade (voir diplomesRequis ci-dessus).
 */
function construireListeDocuments(niveauEtude) {
  const diplomes = diplomesRequis(niveauEtude);
  const documentsGeneraux = [
    'Une demande manuscrite adressée à l\'entreprise',
    'Un Curriculum Vitae (CV) actualisé',
    'Une photocopie légalisée de la Carte Nationale d\'Identité (CNI)',
    'Un extrait d\'acte de naissance',
    '04 photos d\'identité',
    'Un certificat médical de moins de 3 mois',
    'Un casier judiciaire (bulletin n°3) de moins de 3 mois'
  ];
  const documentsDiplomes = diplomes.map((d) => `Une copie légalisée du diplôme : ${d}`);
  return [...documentsGeneraux, ...documentsDiplomes];
}

function construireHtml({
  nomCandidat, nomSociete, poste, creneauTexte, entretienLieu, entretienNotes, niveauEtude,
  rdvPaiementTexte, rdvPaiementLieu
}) {
  const documents = construireListeDocuments(niveauEtude);
  return `
    <p>Bonjour ${nomCandidat},</p>
    <p>L'entreprise <strong>${nomSociete}</strong> a sélectionné ton profil pour le poste
       <strong>${poste}</strong>.</p>
    <p>
      <strong>Entretien prévu :</strong> ${creneauTexte}<br>
      <strong>Lieu :</strong> ${entretienLieu || 'à confirmer'}<br>
      ${entretienNotes ? `<strong>Informations complémentaires :</strong> ${entretienNotes}<br>` : ''}
    </p>
    <div style="border:2px solid #d4a017; background:#fff8e6; padding:14px 16px; margin:16px 0; border-radius:6px;">
      <p style="margin:0 0 8px 0;"><strong>📌 Rendez-vous de paiement et dépôt de dossier</strong></p>
      <p style="margin:0;">
        <strong>Date :</strong> ${rdvPaiementTexte || 'à confirmer'}<br>
        <strong>Lieu :</strong> ${rdvPaiementLieu || 'à confirmer'}
      </p>
    </div>
    <p>Merci de te présenter avec ton dossier complet à ce rendez-vous. Les frais suivants sont à régler ce jour-là :</p>
    <ul>
      <li><strong>Frais de dossier :</strong> ${FRAIS_DOSSIER_FCFA.toLocaleString('fr-FR')} FCFA</li>
      <li><strong>Frais de formation à l'entretien :</strong> ${FRAIS_FORMATION_ENTRETIEN_FCFA.toLocaleString('fr-FR')} FCFA</li>
    </ul>
    <p><strong>Documents à fournir</strong> ${niveauEtude ? `(niveau d'étude renseigné : ${niveauEtude})` : ''} :</p>
    <ul>
      ${documents.map((d) => `<li>${d}</li>`).join('\n      ')}
    </ul>
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
 * Envoie au candidat un email l'informant de sa sélection : créneau d'entretien,
 * frais de dossier et de formation à l'entretien, et liste des documents à
 * fournir (diplômes en cascade selon niveauEtude).
 * Utilise l'API Brevo si BREVO_API_KEY est défini (recommandé), sinon le SMTP classique.
 */
async function envoyerEmailSelection({
  emailCandidat, nomCandidat, nomSociete, poste,
  creneauTexte, entretienLieu, entretienNotes, niveauEtude,
  rdvPaiementTexte, rdvPaiementLieu
}) {
  if (!emailCandidat) {
    return { envoye: false, raison: 'email_manquant' };
  }

  const html = construireHtml({
    nomCandidat, nomSociete, poste, creneauTexte, entretienLieu, entretienNotes, niveauEtude,
    rdvPaiementTexte, rdvPaiementLieu
  });
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

module.exports = { envoyerEmailSelection, diplomesRequis, FRAIS_DOSSIER_FCFA, FRAIS_FORMATION_ENTRETIEN_FCFA };
