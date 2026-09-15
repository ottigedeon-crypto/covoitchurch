import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { supabase } from "@/lib/supabase";
import { notify } from "@/lib/notify";
import { C } from "@/lib/theme";

export type EgliseChoix = { id: string; name: string; city: string | null };

function normalise(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Liste des églises avec recherche, et création si la sienne manque.
 *
 * Bloquer une inscription parce que l'église n'est pas encore enregistrée serait
 * le meilleur moyen de perdre la personne. La création passe par une fonction
 * dédiée côté base : elle rapproche d'abord les noms existants, insensible à la
 * casse et aux accents, pour éviter dix variantes de la même église.
 */
export default function ChoixEgliseListe({
  choisie,
  onChoisir,
}: {
  choisie: string | null;
  onChoisir: (id: string) => void;
}) {
  const [eglises, setEglises] = useState<EgliseChoix[]>([]);
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);
  const [ajout, setAjout] = useState(false);
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const [busy, setBusy] = useState(false);

  async function charger() {
    const { data } = await supabase
      .from("churches")
      .select("id, name, city")
      .eq("active", true)
      .order("city");
    setEglises((data ?? []) as EgliseChoix[]);
    setChargement(false);
  }

  useEffect(() => {
    charger();
  }, []);

  const filtrees = useMemo(() => {
    const q = normalise(recherche);
    if (!q) return eglises;
    return eglises.filter(
      (e) => normalise(e.name).includes(q) || normalise(e.city ?? "").includes(q),
    );
  }, [eglises, recherche]);

  async function creer() {
    if (nom.trim().length < 3 || ville.trim().length < 2) {
      notify("Informations incomplètes", "Indique le nom de l'église et sa ville.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("proposer_eglise", {
      nom: nom.trim(),
      ville: ville.trim(),
    });
    setBusy(false);
    if (error) {
      notify("Ajout impossible", error.message);
      return;
    }
    await charger();
    if (typeof data === "string") onChoisir(data);
    setAjout(false);
    setNom("");
    setVille("");
    setRecherche("");
    notify("Église ajoutée", "Elle est désormais proposée aux autres membres.");
  }

  if (chargement) return <ActivityIndicator color={C.brand} style={{ marginVertical: 20 }} />;

  return (
    <View>
      {eglises.length > 5 ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1.5,
            borderColor: C.line,
            borderRadius: 13,
            paddingHorizontal: 13,
            backgroundColor: C.white,
            marginBottom: 11,
          }}
        >
          <Feather name="search" size={16} color={C.inkFaint} />
          <TextInput
            value={recherche}
            onChangeText={setRecherche}
            placeholder="Chercher une église ou une ville"
            placeholderTextColor={C.inkFaint}
            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 9, fontSize: 15, color: C.ink }}
          />
        </View>
      ) : null}

      <View style={{ gap: 9 }}>
        {filtrees.map((eg) => {
          const actif = choisie === eg.id;
          return (
            <Pressable
              key={eg.id}
              onPress={() => onChoisir(eg.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 13,
                borderWidth: 2,
                borderColor: actif ? C.brand : C.line,
                backgroundColor: actif ? C.brandSoft : C.white,
                borderRadius: 15,
                padding: 15,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: actif ? C.brand : C.navySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="home" size={17} color={actif ? C.white : C.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15.5, fontWeight: "700", color: C.navy }}>{eg.name}</Text>
                {eg.city ? (
                  <Text style={{ fontSize: 13, color: C.inkSoft, marginTop: 1 }}>{eg.city}</Text>
                ) : null}
              </View>
              {actif ? <Feather name="check-circle" size={20} color={C.brand} /> : null}
            </Pressable>
          );
        })}

        {filtrees.length === 0 ? (
          <Text style={{ fontSize: 14.5, color: C.inkSoft, paddingVertical: 8 }}>
            Aucune église ne correspond à « {recherche} ».
          </Text>
        ) : null}
      </View>

      {/* Ajouter la sienne */}
      {ajout ? (
        <View
          style={{
            marginTop: 14,
            borderWidth: 2,
            borderColor: C.brandLine,
            borderRadius: 15,
            padding: 15,
            backgroundColor: C.white,
          }}
        >
          <Text style={{ fontSize: 14.5, fontWeight: "800", color: C.navy }}>
            Ajouter mon église
          </Text>
          <Text style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4, lineHeight: 18 }}>
            Elle sera proposée à tous les prochains inscrits. Si elle existe déjà sous un autre
            orthographe, tu seras rattaché à celle qui existe.
          </Text>

          <TextInput
            value={nom}
            onChangeText={setNom}
            placeholder="Nom de l'église"
            placeholderTextColor={C.inkFaint}
            style={champ}
          />
          <TextInput
            value={ville}
            onChangeText={setVille}
            placeholder="Ville"
            placeholderTextColor={C.inkFaint}
            style={[champ, { marginTop: 9 }]}
          />

          <View style={{ flexDirection: "row", gap: 9, marginTop: 12 }}>
            <Pressable
              onPress={creer}
              disabled={busy}
              style={{
                flex: 1,
                backgroundColor: C.brand,
                paddingVertical: 13,
                borderRadius: 12,
                alignItems: "center",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={{ color: C.white, fontWeight: "800", fontSize: 14.5 }}>Ajouter</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => setAjout(false)}
              style={{
                paddingVertical: 13,
                paddingHorizontal: 18,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: C.line,
              }}
            >
              <Text style={{ color: C.inkSoft, fontWeight: "700", fontSize: 14.5 }}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            setAjout(true);
            if (!nom && recherche) setNom(recherche);
          }}
          style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <Feather name="plus-circle" size={17} color={C.brand} />
          <Text style={{ color: C.brand, fontWeight: "700", fontSize: 14.5 }}>
            Mon église n&apos;est pas dans la liste
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const champ = {
  borderWidth: 1.5,
  borderColor: C.line,
  borderRadius: 12,
  paddingHorizontal: 13,
  paddingVertical: 12,
  fontSize: 15,
  color: C.ink,
  marginTop: 11,
};
