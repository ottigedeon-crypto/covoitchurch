import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { notify } from "@/lib/notify";
import { AdminGuard, GradientButton, styles as s } from "@/components/AdminKit";
import { FadeIn } from "@/components/Motion";
import { C } from "@/lib/theme";

type Eglise = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  active: boolean | null;
  slug: string | null;
  membres?: number;
};

/** Géocodage via Nominatim, comme le site : gratuit, sans clé API. */
async function geocode(adresse: string) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(adresse);
  const res = await fetch(url, { headers: { Accept: "application/json", "Accept-Language": "fr" } });
  if (!res.ok) throw new Error("Géocodage indisponible");
  const json = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!json.length) throw new Error("Adresse introuvable");
  return { lat: Number(json[0].lat), lng: Number(json[0].lon) };
}

/** "Nom de l'église - Ville" -> "ville-nom-de-l-eglise" */
function versSlug(nom: string, ville: string): string {
  return (ville + "-" + nom)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function AdminEglises() {
  const { isAdmin } = useSession();

  const [eglises, setEglises] = useState<Eglise[]>([]);
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const [adresse, setAdresse] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("churches")
      .select("id, name, city, address, active, slug")
      .order("city");
    const liste = (data ?? []) as Eglise[];

    // Le compte de membres n'est lisible que par un admin — d'où cet écran.
    const avecMembres = await Promise.all(
      liste.map(async (e) => {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("church_id", e.id);
        return { ...e, membres: count ?? 0 };
      }),
    );
    setEglises(avecMembres);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAdmin) return <AdminGuard />;

  async function creer() {
    if (!nom.trim() || !ville.trim()) {
      notify("Champs manquants", "Le nom et la ville sont nécessaires.");
      return;
    }
    setBusy(true);
    try {
      // L'adresse est facultative : sans elle, l'église existe sans position.
      let coord: { lat: number; lng: number } | null = null;
      if (adresse.trim()) {
        try {
          coord = await geocode(adresse.trim() + ", " + ville.trim());
        } catch {
          coord = null;
        }
      }

      const { error } = await supabase.from("churches").insert({
        name: nom.trim(),
        city: ville.trim(),
        address: adresse.trim() || null,
        slug: versSlug(nom.trim(), ville.trim()),
        active: true,
        ...(coord ? { lat: coord.lat, lng: coord.lng } : {}),
      });
      if (error) throw new Error(error.message);

      setNom("");
      setVille("");
      setAdresse("");
      notify(
        "Église créée",
        coord
          ? "Elle apparaît désormais dans le choix à l'inscription."
          : "Adresse non localisée : l'église est créée sans position.",
      );
      load();
    } catch (e) {
      notify("Création impossible", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function basculer(eg: Eglise) {
    const { error } = await supabase
      .from("churches")
      .update({ active: !eg.active, updated_at: new Date().toISOString() })
      .eq("id", eg.id);
    if (error) {
      notify("Modification impossible", error.message);
      return;
    }
    load();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.canvas }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 56 }}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Nouvelle église</Text>
          <Text style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 4, lineHeight: 20 }}>
            Chaque église a ses membres, ses points de rassemblement et ses événements. Rien n&apos;est
            partagé entre elles.
          </Text>

          <Text style={s.label}>Nom</Text>
          <TextInput
            value={nom}
            onChangeText={setNom}
            placeholder="Nom de l'église"
            placeholderTextColor={C.inkFaint}
            style={s.input}
          />

          <Text style={s.label}>Ville</Text>
          <TextInput
            value={ville}
            onChangeText={setVille}
            placeholder="Ville"
            placeholderTextColor={C.inkFaint}
            style={s.input}
          />

          <Text style={s.label}>Adresse du lieu de culte — facultatif</Text>
          <TextInput
            value={adresse}
            onChangeText={setAdresse}
            placeholder="Adresse du lieu de culte"
            placeholderTextColor={C.inkFaint}
            style={s.input}
          />

          <GradientButton label="Créer l'église" icon="plus" onPress={creer} busy={busy} />
        </View>

        <Text style={s.section}>ÉGLISES ENREGISTRÉES</Text>

        {loading ? (
          <ActivityIndicator color={C.brand} />
        ) : (
          eglises.map((eg, i) => (
            <FadeIn key={eg.id} delay={i * 70}>
              <View style={s.card}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View style={[s.pin, !eg.active ? { backgroundColor: C.line } : null]}>
                    <Feather name="home" size={17} color={eg.active ? C.brand : C.inkFaint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15.5,
                        fontWeight: "700",
                        color: eg.active ? C.navy : C.inkFaint,
                      }}
                    >
                      {eg.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: C.inkSoft, marginTop: 2 }}>
                      {eg.city ?? "ville non renseignée"} · {eg.membres} membre
                      {(eg.membres ?? 0) > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Switch
                    value={!!eg.active}
                    onValueChange={() => basculer(eg)}
                    trackColor={{ true: C.brand, false: C.line }}
                  />
                </View>
                {!eg.active ? (
                  <Text style={{ fontSize: 12.5, color: C.inkFaint, marginTop: 10 }}>
                    Désactivée : elle n&apos;apparaît plus au moment de l&apos;inscription. Ses
                    membres actuels ne sont pas touchés.
                  </Text>
                ) : null}
              </View>
            </FadeIn>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
