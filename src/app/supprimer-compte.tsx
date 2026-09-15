import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { notify } from "@/lib/notify";
import { Bouncy } from "@/components/Motion";
import { C } from "@/lib/theme";

/** Le mot à recopier pour confirmer : un bouton seul serait trop facile à toucher. */
const CONFIRMATION = "SUPPRIMER";

const CE_QUI_PART = [
  "Ton profil, ton nom, ton téléphone et ton adresse",
  "Tes trajets proposés et tes demandes de place",
  "Tes messages dans le chat",
  "Tes réponses aux événements et tes pointages",
  "Ton historique de trajets",
];

export default function SupprimerCompte() {
  const router = useRouter();
  const { session, signOut } = useSession();

  const [saisie, setSaisie] = useState("");
  const [busy, setBusy] = useState(false);

  const pretAConfirmer = saisie.trim().toUpperCase() === CONFIRMATION;

  async function supprimer() {
    if (!pretAConfirmer || !session) return;
    setBusy(true);
    const { error } = await supabase.rpc("supprimer_mon_compte");
    if (error) {
      setBusy(false);
      notify("Suppression impossible", error.message);
      return;
    }
    // Le compte n'existe plus : la session locale doit partir aussi.
    await signOut();
    setBusy(false);
    router.replace("/login");
    notify("Compte supprimé", "Toutes tes données ont été effacées.");
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.canvas }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 48 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: 20 }}>
          <Feather name="arrow-left" size={22} color={C.navy} />
        </Pressable>

        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: C.dangerSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="trash-2" size={25} color={C.danger} />
        </View>

        <Text style={{ fontSize: 26, fontWeight: "800", color: C.navy, marginTop: 18 }}>
          Supprimer mon compte
        </Text>
        <Text style={{ fontSize: 15.5, color: C.inkSoft, marginTop: 10, lineHeight: 23 }}>
          C&apos;est définitif. Il n&apos;y a pas de corbeille, pas de délai de rétractation, et
          personne ne pourra restaurer tes données — pas même un administrateur.
        </Text>

        <View
          style={{
            marginTop: 22,
            backgroundColor: C.white,
            borderRadius: 16,
            padding: 18,
            borderWidth: 1,
            borderColor: C.line,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "800", color: C.danger, letterSpacing: 0.5 }}>
            CE QUI SERA EFFACÉ
          </Text>
          {CE_QUI_PART.map((ligne) => (
            <View
              key={ligne}
              style={{ flexDirection: "row", gap: 9, marginTop: 10, alignItems: "flex-start" }}
            >
              <Feather name="x" size={15} color={C.danger} style={{ marginTop: 2 }} />
              <Text style={{ fontSize: 14.5, color: C.inkSoft, flex: 1, lineHeight: 21 }}>
                {ligne}
              </Text>
            </View>
          ))}

          <View style={{ height: 1, backgroundColor: C.line, marginVertical: 16 }} />

          <Text style={{ fontSize: 13, fontWeight: "800", color: C.inkSoft, letterSpacing: 0.5 }}>
            CE QUI RESTE
          </Text>
          <Text style={{ fontSize: 14.5, color: C.inkSoft, marginTop: 9, lineHeight: 21 }}>
            Les points de rassemblement et les événements que tu as créés appartiennent à ton
            église : ils sont conservés, mais ne portent plus ton nom.
          </Text>
        </View>

        <Text style={{ fontSize: 14, color: C.inkSoft, marginTop: 24, lineHeight: 21 }}>
          Pour confirmer, recopie <Text style={{ fontWeight: "800", color: C.navy }}>
            {CONFIRMATION}
          </Text> ci-dessous.
        </Text>

        <TextInput
          value={saisie}
          onChangeText={setSaisie}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={CONFIRMATION}
          placeholderTextColor={C.inkFaint}
          style={{
            borderWidth: 2,
            borderColor: pretAConfirmer ? C.danger : C.line,
            borderRadius: 14,
            paddingHorizontal: 15,
            paddingVertical: 14,
            fontSize: 17,
            fontWeight: "700",
            color: C.ink,
            backgroundColor: C.white,
            marginTop: 10,
            letterSpacing: 1,
          }}
        />

        <Bouncy
          onPress={supprimer}
          disabled={!pretAConfirmer || busy}
          style={{
            marginTop: 22,
            backgroundColor: pretAConfirmer ? C.danger : "#D9D3D3",
            borderRadius: 16,
            paddingVertical: 17,
            alignItems: "center",
          }}
        >
          {busy ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={{ color: C.white, fontSize: 16.5, fontWeight: "800" }}>
              Supprimer définitivement
            </Text>
          )}
        </Bouncy>

        <Pressable onPress={() => router.back()} style={{ marginTop: 16, alignItems: "center" }}>
          <Text style={{ color: C.brand, fontWeight: "700", fontSize: 15 }}>
            Non, je garde mon compte
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
