import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Choix faits à l'inscription (rôle et église). Quand Supabase demande une
 * confirmation par email, il n'y a pas encore de session pour écrire dans
 * `profiles` : on garde ces choix ici et on les applique à la première connexion.
 */
const KEY = "covoitchurch-inscription-en-attente";

export type ChoixInscription = {
  role: "driver" | "passenger";
  churchId: string | null;
};

export async function memoriserChoix(choix: ChoixInscription) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(choix));
  } catch {
    // sans stockage local, tout se règle depuis l'écran Profil
  }
}

export async function reprendreChoix(): Promise<ChoixInscription | null> {
  try {
    const brut = await AsyncStorage.getItem(KEY);
    if (!brut) return null;
    await AsyncStorage.removeItem(KEY);
    const choix = JSON.parse(brut) as ChoixInscription;
    if (choix.role === "driver" || choix.role === "passenger") return choix;
  } catch {
    // valeur illisible : on l'ignore
  }
  return null;
}
