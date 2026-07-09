const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost',
  port: process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306,
  user: process.env.MYSQL_USER || process.env.MYSQLUSER || 'root',
  password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'activa_recrutement',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // IMPORTANT : évite que mysql2 convertisse les colonnes DATETIME en objets JS Date
  // (ce qui déclenche des conversions de fuseau horaire imprévisibles selon le
  // fuseau du serveur, du navigateur, etc.). On garde des chaînes brutes
  // "YYYY-MM-DD HH:MM:SS" partout, sans aucune conversion de fuseau.
  dateStrings: true
});

module.exports = pool;
