import { useState } from "react";
import { Redirect } from "expo-router";
import IntroVoiture from "@/components/IntroVoiture";
import { useSession } from "@/lib/session";

export default function Index() {
  const { session, profile, loading } = useSession();
  const [introFinie, setIntroFinie] = useState(false);

  // L'ouverture se joue pendant que la session se charge : elle ne coûte donc
  // aucune seconde à l'utilisateur, elle occupe une attente qui existait déjà.
  if (!introFinie || loading) {
    return <IntroVoiture onFini={() => setIntroFinie(true)} />;
  }

  if (!session) return <Redirect href="/login" />;

  // Un compte sans église ne peut rien voir de pertinent : on demande d'abord.
  if (profile && !profile.church_id) return <Redirect href="/choix-eglise" />;

  return <Redirect href="/(tabs)/carte" />;
}
