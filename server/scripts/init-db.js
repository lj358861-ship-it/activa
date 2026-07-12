// Exécute le schema.sql sur la base MySQL configurée, puis crée le compte admin.
// Ce script est SANS DANGER à relancer plusieurs fois : il ne fait rien si tout existe déjà
// (CREATE TABLE IF NOT EXISTS, et vérifications avant chaque insertion de démo).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function initialiserBaseDeDonnees() {
  const host = process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost';
  const port = process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306;
  const user = process.env.MYSQL_USER || process.env.MYSQLUSER || 'root';
  const password = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || '';
  const database = process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'activa_recrutement';

  const connection = await mysql.createConnection({ host, port, user, password, multipleStatements: true });

  const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  console.log('[init-db] Vérification des tables...');
  await connection.query(schemaSql);
  await connection.changeUser({ database });

  // Migration : ajoute la colonne photo_path à services si elle n'existe pas encore
  // (nécessaire pour les bases créées avant l'ajout de cette fonctionnalité).
  const [colonnes] = await connection.query(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'services' AND column_name = 'photo_path'`,
    [database]
  );
  if (colonnes[0].n === 0) {
    await connection.query('ALTER TABLE services ADD COLUMN photo_path VARCHAR(255) NULL AFTER icone');
    console.log('[init-db] Colonne photo_path ajoutée à la table services.');
  }

  // Migration : ajoute le suivi de statut à mises_en_relation (proposé -> sélectionné -> notifié)
  const [colonnesMER] = await connection.query(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'mises_en_relation' AND column_name = 'statut'`,
    [database]
  );
  if (colonnesMER[0].n === 0) {
    await connection.query(
      `ALTER TABLE mises_en_relation
       ADD COLUMN statut ENUM('propose', 'selectionne', 'notifie') DEFAULT 'propose' AFTER score_correspondance,
       ADD COLUMN selectionne_le TIMESTAMP NULL,
       ADD COLUMN notifie_le TIMESTAMP NULL`
    );
    console.log('[init-db] Colonnes de statut ajoutées à la table mises_en_relation.');
  }

  // Migration : ajoute les colonnes de créneau d'entretien (choisi par l'employeur)
  // si elles n'existent pas encore (filet de sécurité pour les bases où elles auraient
  // été ajoutées manuellement, ou pour une toute nouvelle base).
  const [colonnesEntretien] = await connection.query(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'mises_en_relation' AND column_name = 'entretien_date'`,
    [database]
  );
  if (colonnesEntretien[0].n === 0) {
    await connection.query(
      `ALTER TABLE mises_en_relation
       ADD COLUMN entretien_date DATETIME NULL,
       ADD COLUMN entretien_lieu VARCHAR(255) NULL,
       ADD COLUMN entretien_notes TEXT NULL`
    );
    console.log('[init-db] Colonnes entretien_date/entretien_lieu/entretien_notes ajoutées à mises_en_relation.');
  }

  // Migration : ajoute le rendez-vous de paiement/dépôt de dossier (choisi par l'ADMIN,
  // avant l'envoi du mail au candidat) + les statuts "rejete" (dossier incomplet) et
  // "annule" (rendez-vous annulé) au suivi des mises en relation.
  const [colonnesRdvPaiement] = await connection.query(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'mises_en_relation' AND column_name = 'rdv_paiement_date'`,
    [database]
  );
  if (colonnesRdvPaiement[0].n === 0) {
    await connection.query(
      `ALTER TABLE mises_en_relation
       ADD COLUMN rdv_paiement_date DATETIME NULL,
       ADD COLUMN rdv_paiement_lieu VARCHAR(255) NULL,
       MODIFY COLUMN statut ENUM('propose', 'selectionne', 'notifie', 'rejete', 'annule') DEFAULT 'propose'`
    );
    console.log('[init-db] Colonnes rdv_paiement_date/rdv_paiement_lieu ajoutées + statuts rejete/annule.');
  }

  // Créer le compte admin par défaut s'il n'existe pas
  const [rows] = await connection.query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
  if (rows.length === 0) {
    const tempPassword = 'ChangeMoi123!';
    const hash = await bcrypt.hash(tempPassword, 10);
    await connection.query(
      'INSERT INTO users (role, email, password_hash, telephone) VALUES ("admin", "admin@aprj.org", ?, "0000000000")',
      [hash]
    );
    console.log('[init-db] Compte admin créé -> email: admin@aprj.org | mot de passe temporaire: ' + tempPassword);
    console.log('[init-db] IMPORTANT: connecte-toi et change ce mot de passe immédiatement.');
  } else {
    console.log('[init-db] Un compte admin existe déjà, aucune action.');
  }

  // Contenu de démonstration (services, diapositives d'accueil) si les tables sont vides
  const [servicesExistants] = await connection.query('SELECT COUNT(*) AS n FROM services');
  if (servicesExistants[0].n === 0) {
    await connection.query(
      `INSERT INTO services (titre, description, icone, ordre) VALUES
       ('Recrutement ciblé', 'Nous identifions les profils qui correspondent exactement à vos besoins.', '🎯', 1),
       ('Formation à l\\'emploi', 'Préparation courte et concrète avant la prise de poste.', '📚', 2),
       ('Entretien en conditions réelles', 'Simulation d\\'entretien pour arriver confiant le jour J.', '🧭', 3),
       ('Séminaires & ateliers', 'Sessions collectives sur les compétences recherchées par les entreprises.', '🎤', 4)`
    );
    console.log('[init-db] Services de démonstration ajoutés (à modifier depuis l\'espace admin).');
  }

  const [heroExistant] = await connection.query('SELECT COUNT(*) AS n FROM contenu_hero WHERE page_cle = "accueil"');
  if (heroExistant[0].n === 0) {
    await connection.query(
      `INSERT INTO contenu_hero (page_cle, image_path, slogan, sous_texte, ordre) VALUES
       ('accueil', '/accueil-photo-1.jpeg', 'Le bon poste ne suffit pas. Il faut être prêt à l\\'occuper.', 'Recrutement, formation et entretien en conditions réelles.', 1),
       ('accueil', '/accueil-photo-2.webp', 'Des talents formés, pas seulement des CV.', 'APRJ prépare chaque candidat avant la mise en relation.', 2),
       ('accueil', '/accueil-photo-3.jpeg', 'Recruter vite, recruter juste.', 'Des profils vérifiés et qualifiés, prêts à rejoindre vos équipes.', 3),
       ('accueil', '/accueil-photo-4.webp', 'Une équipe qui avance ensemble, pour demain.', 'Un accompagnement humain à chaque étape du parcours.', 4),
       ('accueil', '/accueil-photo-5.jpeg', 'Ton talent mérite la bonne opportunité.', 'Dépose ton profil et laisse APRJ te mettre en relation.', 5)`
    );
    console.log('[init-db] Diapositives de démonstration ajoutées pour la page d\'accueil (remplace-les par tes vraies images/slogans depuis l\'admin).');
  }

  await connection.end();
  console.log('[init-db] Base de données initialisée avec succès.');
}

module.exports = { initialiserBaseDeDonnees };

// Permet de garder l'usage en ligne de commande : npm run init-db
if (require.main === module) {
  initialiserBaseDeDonnees().catch((err) => {
    console.error('Erreur lors de l\'initialisation de la base:', err);
    process.exit(1);
  });
}
