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
    throw new Error(donnees.erreur || 'Une erreur est survenue.');
  }
  return donnees;
}

function afficherMessage(conteneur, texte, type = 'erreur') {
  conteneur.innerHTML = `<div class="message message-${type}">${texte}</div>`;
}
