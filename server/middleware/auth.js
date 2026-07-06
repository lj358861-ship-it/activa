const jwt = require('jsonwebtoken');

function verifierToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ erreur: 'Connexion requise.' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.utilisateur = payload; // { id, role, email }
    next();
  } catch (e) {
    return res.status(401).json({ erreur: 'Session invalide ou expirée, merci de te reconnecter.' });
  }
}

function autoriserRoles(...rolesAutorises) {
  return (req, res, next) => {
    if (!req.utilisateur || !rolesAutorises.includes(req.utilisateur.role)) {
      return res.status(403).json({ erreur: 'Accès refusé pour ce type de compte.' });
    }
    next();
  };
}

module.exports = { verifierToken, autoriserRoles };
