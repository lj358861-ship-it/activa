# APRJ — Plateforme de recrutement

Plateforme de recrutement avec préparation à l'emploi (formation + entretien en conditions réelles), développée pour l'**Association A.P.R.J.** — *Ensemble pour demain*.

## Identité visuelle

- Logo retouché (nettoyage du fond, contraste et netteté améliorés, sans modification du design) dans `public/img/logo.png` (version complète) et `public/img/logo-embleme.png` (emblème seul, utilisé en en-tête et favicon).
- Favicon et icône iOS générés automatiquement à partir du logo (`public/img/favicon.png`, `public/img/apple-touch-icon.png`).
- **Animation de lancement** : à la première visite (par session navigateur), le logo apparaît en fondu/zoom sur fond marine avant de laisser place au site. Elle ne se rejoue pas tant que la session du navigateur reste active (`sessionStorage`).
- Remplace `public/img/logo.png` et `logo-embleme.png` par une version encore plus soignée (ex: fournie par un graphiste) si besoin — aucun autre fichier à modifier, ils sont référencés partout par ce chemin.

## Fonctionnement

- **Candidats** : créent un profil (parcours pédagogique, professionnel, atouts, CV). Le profil est enregistré en base **et** une notification est envoyée automatiquement sur le WhatsApp de l'APRJ.
- **Employeurs** : créent un compte entreprise (avec le numéro affilié à la société). Le compte doit être **validé par un admin** avant de pouvoir déposer des demandes.
- **Demandes** : un employeur validé publie une demande (poste, domaine, niveau d'étude requis, qualifications). Il clique sur "Faire une recherche" pour voir les profils candidats correspondants (mêmes domaine + niveau d'étude suffisant), avec un score de correspondance.
- **Admin** : pilote l'intégralité du site depuis un seul back-office :
  - Valide/refuse les comptes employeurs
  - Consulte tous les candidats inscrits et les statistiques globales
  - Gère les **services & activités** affichés sur le site
  - Gère les **événements** (séminaires, festivals, formations) avec image, lieu et dates
  - Gère la page **collaborateurs** (nom, poste, bio, photo)
  - Consulte et traite les **messages du formulaire de contact**
  - Gère les **images + slogans du carrousel** affiché en haut de chaque page (accueil, services, collaborateurs, contact, inscriptions) — c'est ici que tu ajoutes tes vraies photos et textes dès que tu les as.
- **Pages publiques** : Accueil (avec carrousel + aperçu services + section contact), Services & activités (séminaires/festivals/formations), Collaborateurs, Contact (formulaire).
- **Design** : palette marine/or, typographies Fraunces + Inter, animations au scroll, effet Ken Burns sur le carrousel, skeleton loaders pendant le chargement, transitions soignées sur les boutons/cartes/navigation.

## Stack technique

- Backend : Node.js + Express
- Frontend : HTML / CSS / JS natif (aucun framework)
- Base de données : MySQL
- Authentification : JWT + bcrypt
- Upload fichiers : Multer (CV, photo, images d'événements/collaborateurs/carrousel)
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
- Email : `admin@aprj.org`
- Mot de passe temporaire : `ChangeMoi123!`

**Change ce mot de passe dès la première connexion** (mets à jour le hash en base avec `npm run hash-password "NouveauMotDePasse"`, puis `UPDATE users SET password_hash = '...' WHERE email = 'admin@aprj.org';`).

## Déploiement sur Railway

1. Pousse ce projet sur un dépôt GitHub.
2. Sur [railway.app](https://railway.app), crée un nouveau projet → **Deploy from GitHub repo**.
3. Ajoute le plugin **MySQL** au projet (bouton "+ New" → Database → MySQL). Railway génère automatiquement les variables `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT` — le code les détecte automatiquement, rien à faire de ton côté pour la connexion DB.
4. Dans les **Variables** du service web, ajoute :
   - `JWT_SECRET` (chaîne aléatoire longue)
   - `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `ADMIN_WHATSAPP_NUMBER`, `WHATSAPP_TEMPLATE_NAME` (voir section WhatsApp ci-dessous)
   - `PUBLIC_BASE_URL` = l'URL Railway générée (ex: `https://aprj-recrutement.up.railway.app`)
5. Une fois le premier déploiement terminé, ouvre un terminal Railway (ou lance en local en pointant sur la base Railway) et exécute :
   ```bash
   npm run init-db
   ```
6. Le site est en ligne. Connecte-toi avec le compte admin et change le mot de passe.

### Stockage des fichiers uploadés (CV)

Railway ne garantit pas la persistance du disque entre redéploiements. Pour la production, ajoute un **Volume** Railway monté sur `/app/uploads`, ou migre vers un stockage externe (S3, Cloudinary) si le volume de candidatures devient important. En phase de lancement, le volume Railway suffit largement.

## Configuration WhatsApp Business Cloud API (Meta)

L'inscription candidat envoie une notification WhatsApp au numéro de l'APRJ via un **template** — Meta impose qu'une conversation initiée par une entreprise (et non par le client) passe par un message modèle validé.

**Étapes (une seule fois) :**

1. Créer une app sur [developers.facebook.com](https://developers.facebook.com) → produit **WhatsApp**.
2. Récupérer `WHATSAPP_TOKEN` (jeton d'accès permanent, via un utilisateur système) et `WHATSAPP_PHONE_NUMBER_ID` (numéro expéditeur configuré côté Meta).
3. Dans le Meta Business Manager, créer un template (catégorie **Utility**) nommé par exemple `nouvelle_candidature`, avec un corps du type :
   ```
   Nouvelle candidature reçue sur APRJ.
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
  index.html                  -> page d'accueil (carrousel + services + contact)
  services.html                -> services & activités (séminaires, festivals, formations)
  collaborateurs.html          -> page équipe / collaborateurs
  contact.html                 -> formulaire de contact
  inscription-candidat.html
  inscription-employeur.html
  connexion.html
  dashboard-employeur.html    -> publier une demande + rechercher
  dashboard-admin.html        -> gère TOUT le site (employeurs, candidats, services, événements, collaborateurs, messages, carrousel)
  css/style.css
  js/commun.js                -> utilitaires + animations (reveal au scroll, en-tête au scroll)
  js/carrousel.js              -> composant carrousel réutilisable (image + slogan)
```

## Ajouter tes vrais contenus (photos, textes) demain

Tout se fait depuis l'espace admin (`/dashboard-admin.html`), sans toucher au code :
1. Onglet **"Images & slogans (accueil)"** : ajoute une diapositive par page (accueil, services, collaborateurs, contact...) avec ton image et ton slogan.
2. Onglet **Services** : modifie les 4 services de démonstration ou ajoute les tiens.
3. Onglet **Événements** : ajoute tes séminaires/festivals/formations avec image, lieu et dates.
4. Onglet **Collaborateurs** : ajoute les membres de l'équipe avec leur photo.

Tant qu'aucune image n'est ajoutée, le carrousel affiche un fond dégradé marine avec le slogan — le site reste donc présentable dès maintenant.

## Points à surveiller avant mise en production

- Changer le mot de passe admin par défaut.
- Définir un `JWT_SECRET` fort et unique.
- Faire valider le template WhatsApp par Meta.
- Ajouter un volume persistant Railway pour `/uploads` (ou migrer vers S3).
- Le matching candidat/demande est actuellement basé sur domaine identique + niveau d'étude suffisant ; il peut être affiné avec des mots-clés sur les qualifications si besoin.
