import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "./supabase";

/** Les notifications reçues app ouverte s'affichent quand même. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type ResultatEnregistrement =
  | { ok: true; jeton: string }
  | { ok: false; raison: string };

/**
 * Demande l'autorisation, récupère le jeton Expo de l'appareil et l'enregistre
 * dans `device_tokens`. C'est ce jeton que la fonction Edge `notifier` utilise
 * pour joindre l'appareil.
 */
export async function enregistrerAppareil(userId: string): Promise<ResultatEnregistrement> {
  if (Platform.OS === "web") {
    return { ok: false, raison: "Le web utilise le Web Push du site, pas Expo." };
  }
  if (!Device.isDevice) {
    return { ok: false, raison: "Les notifications ne fonctionnent pas sur un simulateur." };
  }

  const { status: existant } = await Notifications.getPermissionsAsync();
  let status = existant;
  if (status !== "granted") {
    const demande = await Notifications.requestPermissionsAsync();
    status = demande.status;
  }
  if (status !== "granted") {
    return { ok: false, raison: "Notifications refusées dans les réglages du téléphone." };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Covoiturage",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0BB39B",
    });
  }

  // Expo exige l'identifiant du projet EAS pour délivrer un jeton.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    return {
      ok: false,
      raison:
        "Aucun projet EAS configuré : lance `eas init` pour obtenir un identifiant, sans quoi Expo ne délivre pas de jeton.",
    };
  }

  let jeton: string;
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId });
    jeton = res.data;
  } catch (e) {
    return { ok: false, raison: e instanceof Error ? e.message : String(e) };
  }

  const { error } = await supabase.from("device_tokens").upsert(
    {
      user_id: userId,
      expo_token: jeton,
      plateforme: Platform.OS,
      appareil: Device.modelName ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "expo_token" },
  );

  if (error) return { ok: false, raison: error.message };
  return { ok: true, jeton };
}

/** Retire le jeton de cet appareil — à la déconnexion. */
export async function oublierAppareil() {
  if (Platform.OS === "web" || !Device.isDevice) return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const { data: jeton } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from("device_tokens").delete().eq("expo_token", jeton);
  } catch {
    // Un jeton qu'on ne peut plus lire finira retiré par la fonction Edge,
    // qui supprime les jetons refusés par Expo.
  }
}

/**
 * Ouvre l'écran visé quand l'utilisateur tape sur une notification.
 * `aller` reçoit une route de l'application.
 */
export function suivreLesTaps(aller: (route: string) => void) {
  const sub = Notifications.addNotificationResponseReceivedListener((reponse) => {
    const url = reponse.notification.request.content.data?.url;
    if (typeof url === "string" && url.startsWith("/")) aller(url);
  });
  return () => sub.remove();
}
