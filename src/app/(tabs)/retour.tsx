import { Redirect } from "expo-router";

/**
 * Le retour n'est plus un mécanisme à part.
 *
 * Il reposait sur les présences temporaires, que les policies RLS empêchent de
 * lire chez les autres — l'écran restait donc désespérément vide. Depuis que les
 * trajets portent un sens, un retour est simplement un trajet qui part de
 * l'église : même table, mêmes demandes de place, mêmes notifications.
 *
 * Cette route reste pour ne casser ni le menu ni les liens de notification.
 */
export default function Retour() {
  return <Redirect href={{ pathname: "/trajets", params: { sens: "retour" } }} />;
}
