const jwt = require('jsonwebtoken');

/*
  Middleware d'authentification par token JWT (Bearer), utilisé sur toutes
  les routes protégées (candidat, employeur, admin).

  Le token est signé dans routes/auth.js lors de la connexion avec le payload
  { id, role, email } et process.env.JWT_SECRET (voir router.post('/connexion')).
*/

// Vérifie la présence et la validité du token JWT envoyé dans l'en-tête
// "Authorization: Bearer <token>". Si valide, attache l'utilisateur décodé
// à req.utilisateur pour que les routes suivantes puissent l'utiliser.
function verifierToken(req, res, next) {
  const entete = req.headers.authorization || '';
  const [type, token] = entete.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ erreur: 'Authentification requise.' });
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    req.utilisateur = decode; // { id, role, email }
    next();
  } catch (e) {
    return res.status(401).json({ erreur: 'Session invalide ou expirée, merci de te reconnecter.' });
  }
}

// Factory : renvoie un middleware qui vérifie que req.utilisateur.role fait
// partie des rôles autorisés passés en argument.
// Usage : autoriserRoles('candidat') ou autoriserRoles('admin', 'employeur')
function autoriserRoles(...rolesAutorises) {
  return (req, res, next) => {
    if (!req.utilisateur || !rolesAutorises.includes(req.utilisateur.role)) {
      return res.status(403).json({ erreur: 'Accès refusé.' });
    }
    next();
  };
}

module.exports = { verifierToken, autoriserRoles };
