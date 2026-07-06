// Exécute le schema.sql sur la base MySQL configurée, puis crée le compte admin.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const host = process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost';
  const port = process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306;
  const user = process.env.MYSQL_USER || process.env.MYSQLUSER || 'root';
  const password = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || '';
  const database = process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'activa_recrutement';

  const connection = await mysql.createConnection({ host, port, user, password, multipleStatements: true });

  const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  console.log('Création des tables...');
  await connection.query(schemaSql);
  await connection.changeUser({ database });

  // Créer le compte admin par défaut s'il n'existe pas
  const [rows] = await connection.query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
  if (rows.length === 0) {
    const tempPassword = 'ChangeMoi123!';
    const hash = await bcrypt.hash(tempPassword, 10);
    await connection.query(
      'INSERT INTO users (role, email, password_hash, telephone) VALUES ("admin", "admin@aprj.org", ?, "0000000000")',
      [hash]
    );
    console.log('Compte admin créé -> email: admin@aprj.org | mot de passe temporaire: ' + tempPassword);
    console.log('IMPORTANT: connecte-toi et change ce mot de passe immédiatement.');
  } else {
    console.log('Un compte admin existe déjà, aucune action.');
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
    console.log('Services de démonstration ajoutés (à modifier depuis l\'espace admin).');
  }

  const [heroExistant] = await connection.query('SELECT COUNT(*) AS n FROM contenu_hero WHERE page_cle = "accueil"');
  if (heroExistant[0].n === 0) {
    await connection.query(
      `INSERT INTO contenu_hero (page_cle, slogan, sous_texte, ordre) VALUES
       ('accueil', 'Le bon poste ne suffit pas. Il faut être prêt à l\\'occuper.', 'Recrutement, formation et entretien en conditions réelles.', 1),
       ('accueil', 'Des talents formés, pas seulement des CV.', 'APRJ prépare chaque candidat avant la mise en relation.', 2)`
    );
    console.log('Diapositives de démonstration ajoutées pour la page d\'accueil (remplace-les par tes vraies images/slogans depuis l\'admin).');
  }

  await connection.end();
  console.log('Base de données initialisée avec succès.');
}

main().catch((err) => {
  console.error('Erreur lors de l\'initialisation de la base:', err);
  process.exit(1);
});
