function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    switch (action) {
      case 'login':
        return jsonSuccess_(login_(body.email, body.password));

      case 'getDashboardStats':
        requireSession_(body.token, ['ADMIN', 'DIRECTION']);
        return jsonSuccess_(getDashboardStats_());

      default:
        return jsonError_('Action inconnue : ' + action);
    }
  } catch (err) {
    return jsonError_(err.message);
  }
}

// Placeholder minimal — sera enrichi à l'Étape 5 avec les vrais calculs
function getDashboardStats_() {
  const eleves = sheetToObjects_(getSheet_(CONFIG.SHEETS.ELEVES));
  const classes = sheetToObjects_(getSheet_(CONFIG.SHEETS.CLASSES));
  return {
    totalEleves: eleves.filter(e => e.Statut === 'Actif').length,
    totalClasses: classes.filter(c => c.Statut === 'Active').length
  };
}
