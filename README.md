# Activa Recrutement

Plateforme de recrutement avec préparation à l'emploi (formation + entretien en conditions réelles), développée pour le service recrutement d'Activa Assurance.

## Fonctionnement

- **Candidats** : créent un profil (parcours pédagogique, professionnel, atouts, CV). Le profil est enregistré en base **et** une notification est envoyée automatiquement sur le WhatsApp d'Activa Assurance.
- **Employeurs** : créent un compte entreprise (avec le numéro affilié à la société). Le compte doit être **validé par un admin** avant de pouvoir déposer des demandes.
- **Demandes** : un employeur validé publie une demande (poste, domaine, niveau d'étude requis, qualifications). Il clique sur "Faire une recherche" pour voir les profils candidats correspondants (mêmes domaine + niveau d'étude suffisant), avec un score de correspondance.
- **Admin** : valide/refuse les comptes employeurs, consulte tous les candidats et les statistiques globales.

## Stack technique

- Backend : Node.js + Express
- Frontend : HTML / CSS / JS natif (aucun framework)
- Base de données : MySQL
- Authentification : JWT + bcrypt
- Upload fichiers : Multer (CV, photo)
- Notifications : WhatsApp Business Cloud API (Meta)

## Installation en local

```bash
npm install
cp .env.example .env
# renseigner .env avec tes accès MySQL locaux
npm run init-db     # crée les tables + un compte admin par défaut
npm run dev          # démarre le serveur sur http://localhost:3000
```

Compte admin créé automatiquement par `npm run init-db` :
- Email : `admin@activa-assurance.com`
- Mot de passe temporaire : `ChangeMoi123!`

**Change ce mot de passe dès la première connexion** (mets à jour le hash en base avec `npm run hash-password "NouveauMotDePasse"`, puis `UPDATE users SET password_hash = '...' WHERE email = 'admin@activa-assurance.com';`).

## Déploiement sur Railway

1. Pousse ce projet sur un dépôt GitHub.
2. Sur [railway.app](https://railway.app), crée un nouveau projet → **Deploy from GitHub repo**.
3. Ajoute le plugin **MySQL** au projet (bouton "+ New" → Database → MySQL). Railway génère automatiquement les variables `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT` — le code les détecte automatiquement, rien à faire de ton côté pour la connexion DB.
4. Dans les **Variables** du service web, ajoute :
   - `JWT_SECRET` (chaîne aléatoire longue)
   - `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `ADMIN_WHATSAPP_NUMBER`, `WHATSAPP_TEMPLATE_NAME` (voir section WhatsApp ci-dessous)
   - `PUBLIC_BASE_URL` = l'URL Railway générée (ex: `https://activa-recrutement.up.railway.app`)
5. Une fois le premier déploiement terminé, ouvre un terminal Railway (ou lance en local en pointant sur la base Railway) et exécute :
   ```bash
   npm run init-db
   ```
6. Le site est en ligne. Connecte-toi avec le compte admin et change le mot de passe.

### Stockage des fichiers uploadés (CV)

Railway ne garantit pas la persistance du disque entre redéploiements. Pour la production, ajoute un **Volume** Railway monté sur `/app/uploads`, ou migre vers un stockage externe (S3, Cloudinary) si le volume de candidatures devient important. En phase de lancement, le volume Railway suffit largement.

## Configuration WhatsApp Business Cloud API (Meta)

L'inscription candidat envoie une notification WhatsApp au numéro d'Activa via un **template** — Meta impose qu'une conversation initiée par une entreprise (et non par le client) passe par un message modèle validé.

**Étapes (une seule fois) :**

1. Créer une app sur [developers.facebook.com](https://developers.facebook.com) → produit **WhatsApp**.
2. Récupérer `WHATSAPP_TOKEN` (jeton d'accès permanent, via un utilisateur système) et `WHATSAPP_PHONE_NUMBER_ID` (numéro expéditeur configuré côté Meta).
3. Dans le Meta Business Manager, créer un template (catégorie **Utility**) nommé par exemple `nouvelle_candidature`, avec un corps du type :
   ```
   Nouvelle candidature reçue sur Activa Recrutement.
   Nom : {{1}}
   Domaine : {{2}}
   Niveau d'étude : {{3}}
   Téléphone : {{4}}
   CV : {{5}}
   ```
4. Attendre la validation Meta (quelques heures à 2 jours).
5. Renseigner `WHATSAPP_TEMPLATE_NAME=nouvelle_candidature` dans les variables d'environnement.

En attendant la validation du template, les inscriptions candidats fonctionnent normalement (profil enregistré en base) — seule la notification WhatsApp est différée, avec un message clair dans les logs serveur.

## Structure du projet

```
server/
  index.js              -> point d'entrée Express
  db.js                 -> connexion MySQL (pool)
  sql/schema.sql         -> schéma des tables
  scripts/init-db.js     -> initialise la base + compte admin
  scripts/hash-password.js
  middleware/auth.js      -> vérification JWT + rôles
  middleware/upload.js    -> upload CV/photo (Multer)
  routes/auth.js          -> connexion
  routes/candidat.js      -> inscription candidat + notif WhatsApp
  routes/employeur.js     -> inscription employeur + demandes
  routes/recherche.js     -> matching candidats <-> demande
  routes/admin.js         -> validation employeurs, stats
  services/whatsapp.js    -> appels API Meta

public/
  index.html                  -> page d'accueil
  inscription-candidat.html
  inscription-employeur.html
  connexion.html
  dashboard-employeur.html    -> publier une demande + rechercher
  dashboard-admin.html        -> valider employeurs, stats
  css/style.css
  js/commun.js
```

## Points à surveiller avant mise en production

- Changer le mot de passe admin par défaut.
- Définir un `JWT_SECRET` fort et unique.
- Faire valider le template WhatsApp par Meta.
- Ajouter un volume persistant Railway pour `/uploads` (ou migrer vers S3).
- Le matching candidat/demande est actuellement basé sur domaine identique + niveau d'étude suffisant ; il peut être affiné avec des mots-clés sur les qualifications si besoin.
