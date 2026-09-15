import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { supabase } from "./supabase";

/**
 * Connexion Google, par le navigateur.
 *
 * Le compte Google n'est jamais interrogé directement par l'application : c'est
 * Supabase qui mène l'échange, dans un onglet sécurisé, avec le client OAuth
 * déjà configuré pour le site. L'application ne fait qu'ouvrir cet onglet et
 * récupérer le code au retour.
 *
 * Conséquence pratique : aucun identifiant OAuth natif à créer dans Google Cloud
 * Console, aucun compte Apple nécessaire. Une seule condition, côté Supabase :
 * l'URL de retour doit figurer dans la liste blanche des Redirect URLs.
 *
 * URLs à autoriser dans Supabase (Authentication > URL Configuration) :
 *   covoitchurch://auth/callback     pour les builds
 *   exp://* et exp+covoitchurch://*  pour Expo Go pendant le développement
 */

// Referme l'onglet dès que l'authentification est terminée.
WebBrowser.maybeCompleteAuthSession();

export type ResultatGoogle =
  | { ok: true }
  | { ok: false; annule: true }
  | { ok: false; annule: false; raison: string };

export function urlDeRetour(): string {
  // En Expo Go, cela donne exp://192.168.x.x:8081/--/auth/callback ;
  // dans un build, covoitchurch://auth/callback.
  return Linking.createURL("auth/callback");
}

export async function connexionGoogle(): Promise<ResultatGoogle> {
  if (Platform.OS === "web") {
    // Sur le web, le navigateur gère la redirection lui-même.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    return error ? { ok: false, annule: false, raison: error.message } : { ok: true };
  }

  const redirectTo = urlDeRetour();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error) return { ok: false, annule: false, raison: error.message };
  if (!data?.url) {
    return { ok: false, annule: false, raison: "Supabase n'a pas renvoyé d'URL d'autorisation." };
  }

  const resultat = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (resultat.type === "cancel" || resultat.type === "dismiss") {
    return { ok: false, annule: true };
  }
  if (resultat.type !== "success") {
    return { ok: false, annule: false, raison: "L'authentification s'est interrompue." };
  }

  // Le retour porte soit un code (flux PKCE), soit une erreur explicite.
  const retour = new URL(resultat.url);
  const erreur = retour.searchParams.get("error_description") ?? retour.searchParams.get("error");
  if (erreur) return { ok: false, annule: false, raison: erreur };

  const code = retour.searchParams.get("code");
  if (!code) {
    return {
      ok: false,
      annule: false,
      raison:
        "Aucun code d'autorisation reçu. Vérifie que l'URL de retour est bien autorisée dans Supabase.",
    };
  }

  const { error: echange } = await supabase.auth.exchangeCodeForSession(code);
  if (echange) return { ok: false, annule: false, raison: echange.message };

  return { ok: true };
}
