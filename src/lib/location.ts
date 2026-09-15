import { Platform } from "react-native";
import * as Location from "expo-location";

export type Coords = { lat: number; lng: number };

export class LocationDenied extends Error {
  constructor(message = "Localisation refusée") {
    super(message);
    this.name = "LocationDenied";
  }
}

/**
 * Recupere la position, sur mobile comme dans un navigateur.
 *
 * Sur le web, `requestForegroundPermissionsAsync` ne declenche PAS la demande du
 * navigateur : celui-ci n'affiche sa pastille qu'au moment ou on lit reellement la
 * position. Passer par la permission d'abord faisait conclure « refusee » sans avoir
 * jamais demande. On appelle donc directement navigator.geolocation.
 */
export async function requestPosition(): Promise<Coords> {
  if (Platform.OS === "web") {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      throw new LocationDenied("Ce navigateur ne fournit pas de géolocalisation.");
    }
    return new Promise<Coords>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            reject(
              new LocationDenied(
                "Le navigateur a refusé la position. Clique sur l'icône de cadenas dans la barre d'adresse et autorise la localisation.",
              ),
            );
          } else if (err.code === err.TIMEOUT) {
            reject(new LocationDenied("La position met trop de temps à arriver."));
          } else {
            reject(new LocationDenied("Position indisponible sur ce poste."));
          }
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
      );
    });
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new LocationDenied();
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

/** Position deja accordee, sans redemander. Renvoie null si indisponible. */
export async function readPositionIfAllowed(): Promise<Coords | null> {
  try {
    if (Platform.OS === "web") return await requestPosition();
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}
