import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedBackground from "@/components/AnimatedBackground";
import ChoixEgliseListe from "@/components/ChoixEgliseListe";
import { Bouncy } from "@/components/Motion";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { notify } from "@/lib/notify";
import { C, G } from "@/lib/theme";

/**
 * Écran de rattachement. Il s'affiche à la connexion tant que le compte n'est
 * lié à aucune église : sans elle, ni les points, ni les événements, ni les
 * présences ne veulent dire quoi que ce soit.
 */
export default function ChoixEglise() {
  const router = useRouter();
  const { session, profile, refreshProfile } = useSession();

  const [choisie, setChoisie] = useState<string | null>(profile?.church_id ?? null);
  const [busy, setBusy] = useState(false);

  async function valider() {
    if (!session || !choisie) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ church_id: choisie, updated_at: new Date().toISOString() })
      .eq("id", session.user.id);
    setBusy(false);
    if (error) {
      notify("Enregistrement impossible", error.message);
      return;
    }
    await refreshProfile();
    router.replace("/(tabs)/carte");
  }

  return (
    <AnimatedBackground intensity={0.7}>
      <ScrollView contentContainerStyle={{ padding: 26, paddingTop: 70, paddingBottom: 48 }}>
        <Text style={{ fontSize: 29, fontWeight: "800", color: C.navy, letterSpacing: -0.5 }}>
          Quelle est ton église ?
        </Text>
        <Text style={{ fontSize: 15.5, color: C.inkSoft, marginTop: 10, lineHeight: 23 }}>
          Tu ne verras que les trajets, les points de rassemblement et les événements de cette
          église. Un responsable peut te rattacher ailleurs plus tard.
        </Text>

        <View style={{ marginTop: 26 }}>
          <ChoixEgliseListe choisie={choisie} onChoisir={setChoisie} />
        </View>

        <Bouncy
          onPress={valider}
          disabled={busy || !choisie}
          style={{
            marginTop: 28,
            borderRadius: 16,
            overflow: "hidden",
            opacity: choisie ? 1 : 0.45,
          }}
        >
          <LinearGradient
            colors={G.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 18, alignItems: "center" }}
          >
            {busy ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={{ color: C.white, fontSize: 17, fontWeight: "800" }}>Continuer</Text>
            )}
          </LinearGradient>
        </Bouncy>
      </ScrollView>
    </AnimatedBackground>
  );
}
