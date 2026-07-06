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
      'INSERT INTO users (role, email, password_hash, telephone) VALUES ("admin", "admin@activa-assurance.com", ?, "0000000000")',
      [hash]
    );
    console.log('Compte admin créé -> email: admin@activa-assurance.com | mot de passe temporaire: ' + tempPassword);
    console.log('IMPORTANT: connecte-toi et change ce mot de passe immédiatement.');
  } else {
    console.log('Un compte admin existe déjà, aucune action.');
  }

  await connection.end();
  console.log('Base de données initialisée avec succès.');
}

main().catch((err) => {
  console.error('Erreur lors de l\'initialisation de la base:', err);
  process.exit(1);
});
