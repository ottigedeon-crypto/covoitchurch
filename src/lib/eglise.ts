/**
 * Cloisonnement par église.
 *
 * Chaque église a ses points de rassemblement et ses événements. Une requête non
 * filtrée montrerait ceux des autres.
 *
 * Les lignes sans `church_id` datent d'avant la séparation : on les garde
 * visibles partout plutôt que de les faire disparaître sans prévenir.
 */
export function filtreEglise<T extends { or: (f: string) => T }>(
  requete: T,
  churchId: string | null | undefined,
): T {
  if (!churchId) return requete;
  return requete.or(`church_id.eq.${churchId},church_id.is.null`);
}

/**
 * Villes dont la liste des arrêts de transport est embarquée dans l'application.
 * Ailleurs, la saisie retombe sur le géocodage d'adresse — rien n'est bloqué.
 * Pour ajouter une ville : voir scripts/maj-arrets.mjs et sa zone geographique.
 */
export const VILLES_AVEC_ARRETS = ["Dijon"];

export function aDesArrets(ville: string | null | undefined): boolean {
  return !!ville && VILLES_AVEC_ARRETS.includes(ville);
}
