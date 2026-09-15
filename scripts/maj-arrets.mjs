/**
 * Régénère src/data/arrets-dijon.json depuis OpenStreetMap.
 *
 *   node scripts/maj-arrets.mjs
 *
 * Interroge Overpass pour les nœuds `highway=bus_stop` et `railway=tram_stop` de
 * l'agglomération dijonnaise, fusionne les deux sens d'un même arrêt et écrit un
 * fichier compact trié par nom. À relancer si le réseau Divia change.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = path.join(RACINE, "src", "data", "arrets-dijon.json");

// Sud-ouest et nord-est de la zone couverte.
const ZONE = [47.24, 4.93, 47.42, 5.2];

const REQUETE = `[out:json][timeout:90];
(
  node["highway"="bus_stop"](${ZONE.join(",")});
  node["railway"="tram_stop"](${ZONE.join(",")});
);
out body;`;

const normalise = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function distanceM(a, b) {
  const R = 6371000;
  const r = (x) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLng = r(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(r(a.lat)) * Math.cos(r(b.lat));
  return 2 * R * Math.asin(Math.sqrt(h));
}

const reponse = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  body: REQUETE,
  headers: { "Content-Type": "text/plain" },
});
if (!reponse.ok) throw new Error("Overpass a répondu " + reponse.status);

const { elements } = await reponse.json();

const groupes = [];
for (const e of elements) {
  if (!e.tags?.name) continue;
  const clef = normalise(e.tags.name);
  const point = { lat: e.lat, lng: e.lon };
  const tram = e.tags.railway === "tram_stop";
  // Même nom et moins de 800 m : c'est le même arrêt, dans l'autre sens.
  const g = groupes.find((g) => g.clef === clef && distanceM(g.points[0], point) < 800);
  if (g) {
    g.points.push(point);
    if (tram) g.tram = true;
  } else {
    groupes.push({ clef, nom: e.tags.name.trim(), points: [point], tram });
  }
}

const arrets = groupes
  .map((g) => ({
    n: g.nom,
    t: g.tram ? "tram" : "bus",
    lat: Number((g.points.reduce((s, p) => s + p.lat, 0) / g.points.length).toFixed(6)),
    lng: Number((g.points.reduce((s, p) => s + p.lng, 0) / g.points.length).toFixed(6)),
  }))
  .sort((a, b) => a.n.localeCompare(b.n, "fr"));

fs.writeFileSync(SORTIE, JSON.stringify(arrets));
console.log(
  `${arrets.length} arrêts écrits (${arrets.filter((a) => a.t === "tram").length} tram) — ` +
    `${(fs.statSync(SORTIE).size / 1024).toFixed(1)} Ko`,
);
