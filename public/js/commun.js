// Utilitaires partagés par toutes les pages
const API = '/api';

function enregistrerSession(token, role, email) {
  localStorage.setItem('activa_token', token);
  localStorage.setItem('activa_role', role);
  localStorage.setItem('activa_email', email);
}

function obtenirToken() { return localStorage.getItem('activa_token'); }
function obtenirRole() { return localStorage.getItem('activa_role'); }

function deconnecter() {
  localStorage.removeItem('activa_token');
  localStorage.removeItem('activa_role');
  localStorage.removeItem('activa_email');
  window.location.href = '/connexion.html';
}

function exigerRole(roleAttendu) {
  const role = obtenirRole();
  const token = obtenirToken();
  if (!token || role !== roleAttendu) {
    window.location.href = '/connexion.html';
  }
}

async function appelApi(chemin, options = {}) {
  const entetes = options.entetes || {};
  const token = obtenirToken();
  if (token) entetes['Authorization'] = `Bearer ${token}`;

  const config = { method: options.method || 'GET', headers: entetes };

  if (options.corpsJson) {
    entetes['Content-Type'] = 'application/json';
    config.body = JSON.stringify(options.corpsJson);
  } else if (options.corpsFormData) {
    config.body = options.corpsFormData; // ne pas fixer Content-Type, le navigateur gère le multipart
  }

  const reponse = await fetch(`${API}${chemin}`, config);
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    const erreur = new Error(donnees.erreur || 'Une erreur est survenue.');
    if (donnees.code) erreur.code = donnees.code;
    throw erreur;
  }
  return donnees;
}

function afficherMessage(conteneur, texte, type = 'erreur') {
  conteneur.innerHTML = `<div class="message message-${type}">${texte}</div>`;
}

/* ===== Écran de vérification par code (7 caractères, ex: B99E76X) =====
   Insère dans "conteneur" un mini-formulaire à cases séparées avec renvoi
   de code. Appelle onVerifie(code) quand les 7 cases sont remplies ; celui-ci
   doit renvoyer une Promise qui rejette avec un message d'erreur en cas d'échec. */
function construireEcranCode({ conteneur, email, onVerifie, onRenvoyer, sousTitre }) {
  const LONGUEUR = 7;
  conteneur.innerHTML = `
    <div class="verif-icone">📧</div>
    <p style="text-align:center; margin:0 0 4px; font-weight:700; color:var(--marine);">Vérifie ton adresse email</p>
    <p style="text-align:center; font-size:0.88rem; color:var(--ardoise-douce); margin:0 0 4px;">
      ${sousTitre || `Un code à 7 caractères a été envoyé à <strong>${email}</strong>. Saisis-le ci-dessous.`}
    </p>
    <div class="verif-code-groupe" id="verifCodeGroupe">
      ${Array.from({ length: LONGUEUR }).map((_, i) => `<input type="text" maxlength="1" inputmode="text" autocomplete="off" data-index="${i}">`).join('')}
    </div>
    <div id="verifCodeMessage"></div>
    <p style="text-align:center; font-size:0.85rem; margin-top:10px;">
      Rien reçu ? <a href="#" id="verifRenvoyerLien">Renvoyer le code</a>
    </p>
  `;
  const inputs = [...conteneur.querySelectorAll('.verif-code-groupe input')];
  const zoneMessage = conteneur.querySelector('#verifCodeMessage');
  const lienRenvoyer = conteneur.querySelector('#verifRenvoyerLien');

  function codeComplet() { return inputs.map((i) => i.value).join(''); }

  async function tenterVerification() {
    const code = codeComplet();
    if (code.length < LONGUEUR) return;
    inputs.forEach((i) => (i.disabled = true));
    try {
      await onVerifie(code);
    } catch (err) {
      afficherMessage(zoneMessage, err.message, 'erreur');
      inputs.forEach((i) => { i.disabled = false; i.value = ''; });
      inputs[0].focus();
    }
  }

  inputs.forEach((input, idx) => {
    input.addEventListener('input', () => {
      input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (input.value && idx < LONGUEUR - 1) inputs[idx + 1].focus();
      if (codeComplet().length === LONGUEUR) tenterVerification();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) inputs[idx - 1].focus();
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const texte = (e.clipboardData.getData('text') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LONGUEUR);
      texte.split('').forEach((car, i) => { if (inputs[i]) inputs[i].value = car; });
      if (texte.length === LONGUEUR) tenterVerification(); else inputs[Math.min(texte.length, LONGUEUR - 1)].focus();
    });
  });
  inputs[0].focus();

  lienRenvoyer.addEventListener('click', async (e) => {
    e.preventDefault();
    if (lienRenvoyer.dataset.enCours) return;
    lienRenvoyer.dataset.enCours = '1';
    const texteOriginal = lienRenvoyer.textContent;
    lienRenvoyer.textContent = 'Envoi...';
    try {
      await onRenvoyer();
      afficherMessage(zoneMessage, 'Un nouveau code a été envoyé.', 'succes');
    } catch (err) {
      afficherMessage(zoneMessage, err.message, 'erreur');
    } finally {
      lienRenvoyer.textContent = texteOriginal;
      setTimeout(() => { delete lienRenvoyer.dataset.enCours; }, 15000);
    }
  });
}

/* ===== Cloche de notifications (candidat / employeur) =====
   basePath : '/candidats' ou '/employeurs' — les deux exposent
   GET {basePath}/notifications et POST {basePath}/notifications/:id/lu.
   Interroge le serveur toutes les 35s pour un effet "temps réel" léger. */
function initClocheNotifications(basePath) {
  const zoneActions = document.getElementById('menuMobile');
  if (!zoneActions) return;

  const lienDeconnexion = zoneActions.querySelector('a[onclick="deconnecter()"]');
  const enveloppe = document.createElement('div');
  enveloppe.className = 'cloche-enveloppe';
  enveloppe.innerHTML = `
    <button type="button" class="cloche-bouton" id="clocheBouton" aria-label="Notifications">
      🔔<span class="cloche-badge" id="clocheBadge" style="display:none;">0</span>
    </button>
    <div class="cloche-panneau" id="clochePanneau" style="display:none;">
      <div class="cloche-panneau-entete">
        <strong>Notifications</strong>
        <button type="button" id="clocheToutLu">Tout marquer lu</button>
      </div>
      <div class="cloche-panneau-liste" id="clochePanneauListe"><p class="cloche-vide">Chargement...</p></div>
    </div>
  `;
  if (lienDeconnexion) zoneActions.insertBefore(enveloppe, lienDeconnexion);
  else zoneActions.appendChild(enveloppe);

  const bouton = document.getElementById('clocheBouton');
  const badge = document.getElementById('clocheBadge');
  const panneau = document.getElementById('clochePanneau');
  const liste = document.getElementById('clochePanneauListe');
  let notificationsCache = [];

  bouton.addEventListener('click', (e) => {
    e.stopPropagation();
    panneau.style.display = panneau.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', (e) => {
    if (!enveloppe.contains(e.target)) panneau.style.display = 'none';
  });

  document.getElementById('clocheToutLu').addEventListener('click', async () => {
    const nonLues = notificationsCache.filter((n) => !n.lu);
    await Promise.all(nonLues.map((n) => appelApi(`${basePath}/notifications/${n.id}/lu`, { method: 'POST' }).catch(() => {})));
    rafraichirCloche();
  });

  function rendreListe() {
    if (!notificationsCache.length) {
      liste.innerHTML = '<p class="cloche-vide">Aucune notification pour le moment.</p>';
      return;
    }
    liste.innerHTML = notificationsCache.slice(0, 15).map((n) => `
      <div class="cloche-item ${n.lu ? '' : 'non-lue'}">
        <p class="cloche-item-titre">${n.titre}</p>
        <p class="cloche-item-message">${n.message || ''}</p>
        <p class="cloche-item-date">${new Date(n.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    `).join('');
  }

  async function rafraichirCloche() {
    try {
      const { notifications } = await appelApi(`${basePath}/notifications`);
      notificationsCache = notifications;
      const nonLues = notifications.filter((n) => !n.lu).length;
      if (nonLues > 0) {
        badge.textContent = nonLues > 9 ? '9+' : nonLues;
        badge.style.display = 'flex';
        bouton.classList.add('cloche-agitee');
        setTimeout(() => bouton.classList.remove('cloche-agitee'), 700);
      } else {
        badge.style.display = 'none';
      }
      rendreListe();
    } catch (err) { /* silencieux : ne pas gêner le reste du tableau de bord */ }
  }

  rafraichirCloche();
  setInterval(rafraichirCloche, 35000);
}

/* ===== Menu mobile (burger) : ouverture/fermeture + fermeture auto ===== */
(function () {
  const bouton = document.getElementById('boutonBurger');
  const panneau = document.getElementById('menuMobile');
  if (!bouton || !panneau) return;

  function basculer(ouvrir) {
    const doitOuvrir = ouvrir !== undefined ? ouvrir : !panneau.classList.contains('ouvert');
    panneau.classList.toggle('ouvert', doitOuvrir);
    bouton.classList.toggle('ouvert', doitOuvrir);
    bouton.setAttribute('aria-expanded', String(doitOuvrir));
  }

  bouton.addEventListener('click', () => basculer());

  // Ferme le menu si on clique un lien à l'intérieur, ou en dehors du menu
  panneau.querySelectorAll('a').forEach((lien) => lien.addEventListener('click', () => basculer(false)));
  document.addEventListener('click', (e) => {
    if (panneau.classList.contains('ouvert') && !panneau.contains(e.target) && !bouton.contains(e.target)) {
      basculer(false);
    }
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 860) basculer(false); });
})();

/* ===== Finitions visuelles : en-tête au scroll + animations d'apparition ===== */
(function () {
  const entete = document.querySelector('.entete');
  if (entete) {
    window.addEventListener('scroll', () => {
      entete.classList.toggle('entete-ombree', window.scrollY > 12);
    }, { passive: true });
  }

  const observateur = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => {
      if (entree.isIntersecting) {
        entree.target.classList.add('visible');
        observateur.unobserve(entree.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  window.reveler = function reveler(racine = document) {
    racine.querySelectorAll('.reveal:not(.visible)').forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i * 60, 300)}ms`;
      observateur.observe(el);
    });
  };

  document.addEventListener('DOMContentLoaded', () => window.reveler());
})();

function squelette(nombre = 3, hauteur = 90) {
  return Array.from({ length: nombre }).map(() =>
    `<div class="squelette" style="height:${hauteur}px;"></div>`
  ).join('');
}

// Calcule un âge (en années) à partir d'une date de naissance (string ou Date).
// Retourne null si la date est absente/invalide, pour permettre un affichage
// "Âge non renseigné" plutôt qu'un chiffre erroné.
function calculerAge(dateNaissance) {
  if (!dateNaissance) return null;
  const naissance = new Date(dateNaissance);
  if (isNaN(naissance.getTime())) return null;
  const aujourdhui = new Date();
  let age = aujourdhui.getFullYear() - naissance.getFullYear();
  const moisPasse = aujourdhui.getMonth() - naissance.getMonth();
  if (moisPasse < 0 || (moisPasse === 0 && aujourdhui.getDate() < naissance.getDate())) age--;
  return age;
}

/* ===== Animation "compteur" : fait défiler une valeur de 0 jusqu'à sa cible.
   Utilisé sur les cartes de statistiques (tableau de bord admin, caisse & finances)
   pour donner un rendu plus vivant/professionnel qu'un simple affichage figé. ===== */
function animerCompteurs(racine = document, dureeMs = 800) {
  racine.querySelectorAll('[data-compteur]').forEach((el) => {
    const cible = Number(el.dataset.compteur) || 0;
    const suffixe = el.dataset.suffixe || '';
    const debut = performance.now();
    function etape(maintenant) {
      const t = Math.min((maintenant - debut) / dureeMs, 1);
      const progression = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const valeur = Math.round(cible * progression);
      el.textContent = `${valeur.toLocaleString('fr-FR')}${suffixe}`;
      if (t < 1) requestAnimationFrame(etape);
    }
    requestAnimationFrame(etape);
  });
}
