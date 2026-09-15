import { Linking, Platform } from "react-native";

/** Distance a vol d'oiseau entre deux points, en metres. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number): string {
  if (m < 950) return Math.round(m / 10) * 10 + " m";
  return (m / 1000).toFixed(m < 10000 ? 1 : 0) + " km";
}

/**
 * Estimation du temps de trajet en voiture, sans API payante : une vitesse
 * moyenne unique, ville et route confondues. Volontairement approximatif —
 * il donne un ordre de grandeur, pas un horaire d'arrivée.
 */
const VITESSE_MOYENNE_KMH = 40;

export function formatDuree(m: number): string {
  const minutes = Math.max(1, Math.round((m / 1000 / VITESSE_MOYENNE_KMH) * 60));
  if (minutes < 60) return "~" + minutes + " min";
  const h = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return "~" + h + "h" + (reste > 0 ? String(reste).padStart(2, "0") : "");
}

/** Géocodage via Nominatim : gratuit, sans clé API. */
export async function geocodeAdresse(adresse: string): Promise<{ lat: number; lng: number }> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(adresse);
  const res = await fetch(url, { headers: { Accept: "application/json", "Accept-Language": "fr" } });
  if (!res.ok) throw new Error("Géocodage indisponible");
  const json = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!json.length) throw new Error("Adresse introuvable");
  return { lat: Number(json[0].lat), lng: Number(json[0].lon) };
}

type Destination = { lat?: number | null; lng?: number | null; adresse: string };

/**
 * Ouvre l'app de plans du telephone pour l'itineraire vers une adresse.
 *
 * Chaque plateforme a son propre schema d'URL (maps: sur iOS, geo: sur
 * Android) ; sans coordonnees on retombe sur la recherche par texte, que
 * l'app de plans resout elle-meme.
 */
export function ouvrirItineraire(destination: Destination): Promise<boolean> {
  const label = encodeURIComponent(destination.adresse);
  const coord =
    destination.lat != null && destination.lng != null
      ? `${destination.lat},${destination.lng}`
      : null;

  const url =
    Platform.OS === "ios"
      ? coord
        ? `maps:0,0?q=${label}@${coord}`
        : `maps:0,0?q=${label}`
      : Platform.OS === "android"
        ? coord
          ? `geo:0,0?q=${coord}(${label})`
          : `geo:0,0?q=${label}`
        : `https://www.google.com/maps/dir/?api=1&destination=${coord ?? label}`;

  return Linking.openURL(url).then(
    () => true,
    () =>
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${coord ?? label}`,
      ).then(
        () => true,
        () => false,
      ),
  );
}
