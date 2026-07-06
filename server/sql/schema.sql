-- Base de données : Activa Recrutement
-- Compatible MySQL 8+ (Railway MySQL plugin)

CREATE DATABASE IF NOT EXISTS activa_recrutement CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE activa_recrutement;

-- Comptes utilisateurs (candidat, employeur, admin)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('candidat', 'employeur', 'admin') NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  telephone VARCHAR(30) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Profils candidats (employés / demandeurs d'emploi)
CREATE TABLE IF NOT EXISTS candidats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  nom_complet VARCHAR(150) NOT NULL,
  date_naissance DATE NULL,
  ville VARCHAR(100),
  niveau_etude VARCHAR(100) NOT NULL,
  domaine VARCHAR(150) NOT NULL,
  parcours_pedagogique TEXT,
  parcours_professionnel TEXT,
  atouts TEXT,
  cv_path VARCHAR(255),
  photo_path VARCHAR(255),
  whatsapp_envoye BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Profils employeurs (entreprises partenaires)
CREATE TABLE IF NOT EXISTS employeurs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  nom_societe VARCHAR(150) NOT NULL,
  secteur VARCHAR(150),
  telephone_societe VARCHAR(30) NOT NULL,
  ville VARCHAR(100),
  is_valide BOOLEAN DEFAULT FALSE,
  valide_par INT NULL,
  valide_le TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Demandes de recrutement soumises par les employeurs
CREATE TABLE IF NOT EXISTS demandes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employeur_id INT NOT NULL,
  poste VARCHAR(150) NOT NULL,
  domaine VARCHAR(150) NOT NULL,
  niveau_etude_requis VARCHAR(100) NOT NULL,
  qualifications TEXT,
  description TEXT,
  nombre_postes INT DEFAULT 1,
  statut ENUM('ouverte', 'fermee') DEFAULT 'ouverte',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employeur_id) REFERENCES employeurs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Historique des recherches / mises en relation (traçabilité)
CREATE TABLE IF NOT EXISTS mises_en_relation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  demande_id INT NOT NULL,
  candidat_id INT NOT NULL,
  score_correspondance INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (demande_id) REFERENCES demandes(id) ON DELETE CASCADE,
  FOREIGN KEY (candidat_id) REFERENCES candidats(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Compte admin par défaut (mot de passe à changer immédiatement après déploiement)
-- Le hash ci-dessous correspond au mot de passe temporaire "ChangeMoi123!"
-- Génère un nouveau hash avec: node server/scripts/hash-password.js
