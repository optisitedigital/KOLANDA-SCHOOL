function login_(email, password) {
  const users = sheetToObjects_(getSheet_(CONFIG.SHEETS.UTILISATEURS));
  const user = users.find(u => String(u.Email).toLowerCase() === String(email).toLowerCase());

  if (!user || user.Statut !== 'Actif') {
    throw new Error('Identifiants invalides.');
  }
  if (hashPassword_(password) !== user.MotDePasseHash) {
    throw new Error('Identifiants invalides.');
  }

  // Jeton de session simple, stocké côté serveur (cache), jamais le mot de passe
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put(
    'session_' + token,
    JSON.stringify({ userId: user.UtilisateurID, role: user.Role }),
    CONFIG.SESSION_DURATION_SECONDS
  );

  return {
    token: token,
    nom: user.Nom,
    role: user.Role,
    classesAssignees: user.ClassesAssignées || null
  };
}

function requireSession_(token, allowedRoles) {
  const raw = CacheService.getScriptCache().get('session_' + token);
  if (!raw) throw new Error('Session expirée. Veuillez vous reconnecter.');
  const session = JSON.parse(raw);
  if (allowedRoles && allowedRoles.indexOf(session.role) === -1) {
    throw new Error('Accès refusé pour ce rôle.');
  }
  return session;
}
