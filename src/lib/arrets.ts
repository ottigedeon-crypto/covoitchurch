import data from "@/data/arrets-dijon.json";

export type Arret = {
  /** Nom de l'arrêt */
  n: string;
  /** Mode : tram ou bus */
  t: "tram" | "bus";
  lat: number;
  lng: number;
};

/**
 * Arrêts de bus et de tram de l'agglomération dijonnaise.
 *
 * Source : OpenStreetMap (Overpass), nœuds `highway=bus_stop` et `railway=tram_stop`
 * dans la zone 47.24–47.42 N / 4.93–5.20 E, relevés le 4 septembre 2026.
 * Les deux nœuds d'un même arrêt (un par sens) sont fusionnés : le nom est conservé
 * et les coordonnées moyennées. Deux arrêts homonymes distants de plus de 800 m
 * restent séparés.
 *
 * Pour rafraîchir la liste, voir `scripts/maj-arrets.mjs`.
 */
export const ARRETS = data as Arret[];

function normalise(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const INDEX = ARRETS.map((a) => ({ arret: a, clef: normalise(a.n) }));

/**
 * Recherche insensible à la casse et aux accents. Les arrêts dont le nom commence
 * par la requête remontent en premier, puis le tram avant le bus : sur un nom
 * partagé, le tram est presque toujours celui que l'on cherche.
 */
export function chercherArrets(requete: string, limite = 40): Arret[] {
  const q = normalise(requete);
  if (!q) return ARRETS.slice(0, limite);

  const resultats: { arret: Arret; score: number }[] = [];
  for (const { arret, clef } of INDEX) {
    const pos = clef.indexOf(q);
    if (pos === -1) continue;
    resultats.push({ arret, score: (pos === 0 ? 0 : 100 + pos) + (arret.t === "tram" ? 0 : 1) });
  }

  return resultats
    .sort((a, b) => a.score - b.score || a.arret.n.localeCompare(b.arret.n, "fr"))
    .slice(0, limite)
    .map((r) => r.arret);
}
