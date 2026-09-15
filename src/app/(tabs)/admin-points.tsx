import { useCallback, useEffect, useMemo, useState } from "react";
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
import Feather from "@expo/vector-icons/Feather";
import { requestPosition, readPositionIfAllowed } from "@/lib/location";
import { chercherArrets, type Arret } from "@/lib/arrets";
import { aDesArrets, filtreEglise } from "@/lib/eglise";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { notify } from "@/lib/notify";
import { AdminGuard, GradientButton, styles as s } from "@/components/AdminKit";
import { FadeIn } from "@/components/Motion";
import { C } from "@/lib/theme";

type Zone = { id: string; name: string; lat: number; lng: number };

/** Géocodage via Nominatim, pour les lieux qui ne sont pas un arrêt. */
async function geocode(address: string) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(address);
  const res = await fetch(url, { headers: { Accept: "application/json", "Accept-Language": "fr" } });
  if (!res.ok) throw new Error("Géocodage indisponible");
  const json = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!json.length) throw new Error("Adresse introuvable");
  return { lat: Number(json[0].lat), lng: Number(json[0].lon) };
}

export default function AdminPoints() {
  const { session, profile, eglise, isAdmin } = useSession();
  // La liste embarquee ne couvre que Dijon : ailleurs on retombe sur le geocodage.
  const arretsDispo = aDesArrets(eglise?.city);

  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [choisi, setChoisi] = useState<Arret | null>(null);
  const [nom, setNom] = useState("");
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);

  const load = useCallback(async () => {
    const { data } = await filtreEglise(
      supabase.from("rally_zones").select("id, name, lat, lng"),
      profile?.church_id,
    ).order("name");
    setZones((data as Zone[]) ?? []);
    setLoading(false);
  }, [profile?.church_id]);

  useEffect(() => {
    load();
    readPositionIfAllowed().then(setMe);
  }, [load]);

  const resultats = useMemo(
    () => (arretsDispo ? chercherArrets(query, 40) : []),
    [query, arretsDispo],
  );
  const dejaPose = useMemo(
    () => new Set(zones.map((z) => z.name.toLowerCase().trim())),
    [zones],
  );

  if (!isAdmin) return <AdminGuard />;

  function selectionner(a: Arret) {
    setChoisi(a);
    setNom(a.n);
    setQuery(a.n);
    setOuvert(false);
  }

  function reinitialiser() {
    setChoisi(null);
    setNom("");
    setQuery("");
    setOuvert(false);
  }

  async function creer() {
    const libelle = nom.trim() || choisi?.n.trim() || query.trim();
    if (!libelle) {
      notify("Nom manquant", "Choisis un arrêt dans la liste, ou saisis un nom.");
      return;
    }
    setBusy(true);
    try {
      // Un arrêt sélectionné apporte ses propres coordonnées ; sinon on géocode le
      // texte saisi, et en dernier recours on prend la position de l'appareil.
      const pos = choisi
        ? { lat: choisi.lat, lng: choisi.lng }
        : query.trim()
          ? await geocode(query.trim())
          : await requestPosition();

      const { error } = await supabase.from("rally_zones").insert({
        name: libelle,
        lat: pos.lat,
        lng: pos.lng,
        radius_m: 500,
        created_by: session?.user.id ?? null,
        church_id: profile?.church_id ?? null,
      });
      if (error) throw new Error(error.message);
      reinitialiser();
      notify("Point créé", libelle + " apparaît aussi sur covoitchurch.com.");
      load();
    } catch (e) {
      notify("Création impossible", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, label: string) {
    const { error } = await supabase.from("rally_zones").delete().eq("id", id);
    if (error) {
      notify("Suppression impossible", error.message);
      return;
    }
    notify("Point supprimé", label);
    load();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.canvas }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 56 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.card}>
          <Text style={s.cardTitle}>Nouveau point de rassemblement</Text>
          <Text style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 4, lineHeight: 20 }}>
            {arretsDispo
              ? "Cherche un arrêt de bus ou de tram de l'agglomération : ses coordonnées sont déjà connues, tu n'as rien à saisir."
              : "Saisis une adresse : elle sera géocodée. La liste des arrêts n'est embarquée que pour certaines villes."}
          </Text>

          <Text style={s.label}>{arretsDispo ? "Arrêt de bus ou de tram" : "Adresse du point"}</Text>
          <View style={{ position: "relative" }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1.5,
                borderColor: ouvert ? C.brand : C.line,
                borderRadius: 14,
                paddingHorizontal: 14,
                backgroundColor: C.white,
              }}
            >
              <Feather name="search" size={17} color={ouvert ? C.brand : C.inkFaint} />
              <TextInput
                value={query}
                onChangeText={(t) => {
                  setQuery(t);
                  setChoisi(null);
                  setOuvert(true);
                }}
                onFocus={() => setOuvert(true)}
                placeholder={arretsDispo ? "Nom de l'arrêt…" : "Rue, ville"}
                placeholderTextColor={C.inkFaint}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 10,
                  fontSize: 16,
                  color: C.ink,
                }}
              />
              {query ? (
                <Pressable onPress={reinitialiser} hitSlop={10}>
                  <Feather name="x-circle" size={17} color={C.inkFaint} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {ouvert && arretsDispo ? (
            <View
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: C.line,
                borderRadius: 14,
                backgroundColor: C.white,
                overflow: "hidden",
                maxHeight: 320,
              }}
            >
              <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {resultats.length === 0 ? (
                  <Text style={{ padding: 16, color: C.inkSoft, fontSize: 14.5 }}>
                    Aucun arrêt ne correspond. Tu peux quand même valider : le texte saisi sera
                    géocodé comme une adresse.
                  </Text>
                ) : (
                  resultats.map((a) => {
                    const existe = dejaPose.has(a.n.toLowerCase().trim());
                    return (
                      <Pressable
                        key={a.t + a.n + a.lat}
                        onPress={() => selectionner(a)}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: C.line,
                          backgroundColor: pressed ? C.brandSoft : C.white,
                        })}
                      >
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: a.t === "tram" ? C.brandSoft : C.navySoft,
                          }}
                        >
                          <Feather
                            name={a.t === "tram" ? "git-commit" : "truck"}
                            size={15}
                            color={a.t === "tram" ? C.brand : C.navy}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15.5, color: C.navy, fontWeight: "600" }}>
                            {a.n}
                          </Text>
                          <Text style={{ fontSize: 12.5, color: C.inkFaint, marginTop: 1 }}>
                            {a.t === "tram" ? "Tram" : "Bus"}
                            {me ? "  ·  " + formatDistance(distanceMeters(me, a)) : ""}
                            {existe ? "  ·  déjà utilisé" : ""}
                          </Text>
                        </View>
                        {existe ? (
                          <Feather name="check" size={17} color={C.inkFaint} />
                        ) : (
                          <Feather name="chevron-right" size={18} color={C.inkFaint} />
                        )}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          ) : null}

          {choisi ? (
            <FadeIn from={8}>
              <View
                style={{
                  marginTop: 14,
                  backgroundColor: C.brandSoft,
                  borderRadius: 14,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Feather name="map-pin" size={18} color={C.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, color: C.navy, fontWeight: "700" }}>
                    {choisi.n} · {choisi.t === "tram" ? "tram" : "bus"}
                  </Text>
                  <Text
                    style={{ fontSize: 12.5, color: C.inkSoft, fontVariant: ["tabular-nums"] }}
                  >
                    {choisi.lat.toFixed(5)}, {choisi.lng.toFixed(5)}
                  </Text>
                </View>
              </View>
            </FadeIn>
          ) : null}

          <Text style={s.label}>Nom affiché aux membres</Text>
          <TextInput
            value={nom}
            onChangeText={setNom}
            placeholder="Reprend le nom de l'arrêt par défaut"
            placeholderTextColor={C.inkFaint}
            style={s.input}
          />

          <GradientButton label="Créer le point" icon="plus" onPress={creer} busy={busy} />

          <Text style={{ fontSize: 12, color: C.inkFaint, marginTop: 12, lineHeight: 17 }}>
            {arretsDispo
              ? "499 arrêts de l'agglomération dijonnaise, dont 34 stations de tram. Source OpenStreetMap."
              : ""}{" "}
            Sans arrêt sélectionné, le texte saisi est géocodé comme une adresse ; laissé vide, le
            point prend ta position actuelle.
          </Text>
        </View>

        <Text style={s.section}>POINTS EXISTANTS</Text>

        {loading ? (
          <ActivityIndicator color={C.brand} />
        ) : zones.length === 0 ? (
          <Text style={{ color: C.inkSoft, fontSize: 15 }}>Aucun point pour l&apos;instant.</Text>
        ) : (
          zones.map((z, i) => (
            <FadeIn key={z.id} delay={i * 60}>
              <View style={[s.card, { flexDirection: "row", alignItems: "center", gap: 14 }]}>
                <View style={s.pin}>
                  <Feather name="map-pin" size={17} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15.5, color: C.navy, fontWeight: "700" }}>{z.name}</Text>
                  <Text
                    style={{
                      fontSize: 12.5,
                      color: C.inkFaint,
                      fontVariant: ["tabular-nums"],
                      marginTop: 2,
                    }}
                  >
                    {z.lat.toFixed(5)}, {z.lng.toFixed(5)}
                    {me ? "  ·  " + formatDistance(distanceMeters(me, { lat: z.lat, lng: z.lng })) : ""}
                  </Text>
                </View>
                <Pressable onPress={() => remove(z.id, z.name)} hitSlop={8}>
                  <Feather name="trash-2" size={19} color={C.danger} />
                </Pressable>
              </View>
            </FadeIn>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
