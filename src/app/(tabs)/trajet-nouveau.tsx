import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { notify } from "@/lib/notify";
import { geocodeAdresse, ouvrirItineraire } from "@/lib/geo";
import {
  eglisesActives,
  formatDepart,
  mesTrajets,
  reservationsDe,
  contactsTrajet,
  type ContactTrajet,
  type EgliseBreve,
  type Reservation,
  nomsPublics,
  type NomPublic,
  type Trajet,
} from "@/lib/trajets";
import ChampDateHeure from "@/components/ChampDateHeure";
import { Bouncy, FadeIn } from "@/components/Motion";
import { GradientButton, styles as s } from "@/components/AdminKit";
import { C } from "@/lib/theme";

export default function TrajetNouveau() {
  const router = useRouter();
  const { session, profile } = useSession();
  const userId = session?.user.id ?? null;

  const [eglises, setEglises] = useState<EgliseBreve[]>([]);
  const [egliseId, setEgliseId] = useState<string | null>(null);
  const [quand, setQuand] = useState<Date | null>(null);
  const [adresse, setAdresse] = useState("");
  const [sens, setSens] = useState<"aller" | "retour">("aller");
  const [places, setPlaces] = useState(3);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const [miens, setMiens] = useState<Trajet[]>([]);
  const [demandes, setDemandes] = useState<Reservation[]>([]);
  const [noms, setNoms] = useState<Record<string, NomPublic>>({});
  const [contacts, setContacts] = useState<Record<string, ContactTrajet[]>>({});

  useEffect(() => {
    eglisesActives().then((liste) => {
      setEglises(liste);
      if (!egliseId && profile?.church_id) setEgliseId(profile.church_id);
    });
  }, [profile?.church_id]);

  useEffect(() => {
    if (!adresse && profile?.home_address) setAdresse(profile.home_address);
  }, [profile?.home_address]);

  const charger = useCallback(async () => {
    if (!userId) return;
    const { trajets } = await mesTrajets(userId);
    setMiens(trajets);
    const { reservations } = await reservationsDe(trajets.map((t) => t.id));
    setDemandes(reservations);
    setNoms(await nomsPublics(reservations.map((r) => r.passager_id)));

    // Coordonnees des passagers acceptes : une seule fonction par trajet concerne.
    const trajetsAvecAcceptes = trajets.filter((t) =>
      reservations.some((r) => r.trajet_id === t.id && r.statut === "acceptee"),
    );
    const table: Record<string, ContactTrajet[]> = {};
    for (const t of trajetsAvecAcceptes) table[t.id] = await contactsTrajet(t.id);
    setContacts(table);
  }, [userId]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function proposer() {
    if (!userId) return;
    const date = quand;
    if (!egliseId) {
      notify("Église manquante", "Indique où tu te rends.");
      return;
    }
    if (!date) {
      notify("Date manquante", "Choisis le jour et l'heure de départ.");
      return;
    }
    if (date.getTime() < Date.now()) {
      notify("Date passée", "Choisis une date à venir.");
      return;
    }
    if (!adresse.trim()) {
      notify("Départ manquant", "Indique d'où tu pars, pour que les passagers se repèrent.");
      return;
    }

    setBusy(true);
    try {
      // Sans coordonnées, le trajet reste valide : il ne pourra simplement pas
      // être trié par distance chez les passagers.
      let pos: { lat: number; lng: number } | null = null;
      try {
        pos = await geocodeAdresse(adresse.trim());
      } catch {
        pos = null;
      }

      const { error } = await supabase.from("trajets").insert({
        conducteur_id: userId,
        eglise_id: egliseId,
        depart_le: date.toISOString(),
        depart_adresse: adresse.trim(),
        depart_lat: pos?.lat ?? null,
        depart_lng: pos?.lng ?? null,
        places,
        sens,
        notes: notes.trim() || null,
      });
      if (error) throw new Error(error.message);

      setQuand(null);
      setNotes("");
      notify("Trajet proposé", "Il apparaît maintenant pour tous les membres.");
      charger();
    } catch (e) {
      notify("Publication impossible", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function repondre(r: Reservation, statut: "acceptee" | "refusee") {
    if (statut === "acceptee") {
      const trajet = miens.find((t) => t.id === r.trajet_id);
      const dejaPrises = demandes.filter(
        (d) => d.trajet_id === r.trajet_id && d.statut === "acceptee",
      ).length;
      if (trajet && dejaPrises >= trajet.places) {
        notify(
          "Plus de place",
          "Toutes les places de ce trajet sont prises. Libère une place ou augmente leur nombre.",
        );
        return;
      }
    }
    const { error } = await supabase
      .from("reservations")
      .update({ statut, updated_at: new Date().toISOString() })
      .eq("id", r.id);
    if (error) {
      notify("Réponse impossible", error.message);
      return;
    }
    notify(
      statut === "acceptee" ? "Place accordée" : "Demande refusée",
      statut === "acceptee"
        ? "Le passager est prévenu et voit désormais ton numéro."
        : "Le passager en est informé.",
    );
    charger();
  }

  async function annulerTrajet(t: Trajet) {
    const { error } = await supabase
      .from("trajets")
      .update({ statut: "annule", updated_at: new Date().toISOString() })
      .eq("id", t.id);
    if (error) {
      notify("Annulation impossible", error.message);
      return;
    }
    notify("Trajet annulé", "Il n'apparaît plus dans les recherches.");
    charger();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.canvas }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 56 }}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Je propose un trajet</Text>
          <Text style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 4, lineHeight: 20 }}>
            Dis où tu vas, quand tu pars et combien de places tu as. Les membres pourront te
            demander une place.
          </Text>

          <Text style={s.label}>Dans quel sens ?</Text>
          <View style={{ flexDirection: "row", gap: 9 }}>
            {(["aller", "retour"] as const).map((v) => {
              const actif = sens === v;
              return (
                <Pressable
                  key={v}
                  onPress={() => setSens(v)}
                  style={{
                    flex: 1,
                    borderWidth: 2,
                    borderColor: actif ? C.brand : C.line,
                    backgroundColor: actif ? C.brandSoft : C.white,
                    borderRadius: 13,
                    paddingVertical: 13,
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Feather
                    name={v === "aller" ? "arrow-right-circle" : "corner-down-left"}
                    size={17}
                    color={actif ? C.brand : C.inkFaint}
                  />
                  <Text
                    style={{ fontSize: 14, fontWeight: "700", color: actif ? C.brand : C.inkSoft }}
                  >
                    {v === "aller" ? "Vers l'église" : "Retour"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={s.label}>{sens === "aller" ? "Je me rends à" : "Je repars de"}</Text>
          <View style={{ gap: 8 }}>
            {eglises.map((eg) => {
              const actif = egliseId === eg.id;
              return (
                <Pressable
                  key={eg.id}
                  onPress={() => setEgliseId(eg.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 11,
                    borderWidth: 2,
                    borderColor: actif ? C.brand : C.line,
                    backgroundColor: actif ? C.brandSoft : C.white,
                    borderRadius: 13,
                    padding: 13,
                  }}
                >
                  <Feather name="home" size={16} color={actif ? C.brand : C.inkFaint} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: C.navy }}>{eg.name}</Text>
                    {eg.city ? (
                      <Text style={{ fontSize: 12.5, color: C.inkSoft }}>{eg.city}</Text>
                    ) : null}
                  </View>
                  {actif ? <Feather name="check-circle" size={18} color={C.brand} /> : null}
                </Pressable>
              );
            })}
          </View>

          <Text style={s.label}>{sens === "aller" ? "Je pars" : "Je quitte l'église"}</Text>
          <ChampDateHeure valeur={quand} onChange={setQuand} />

          <Text style={s.label}>{sens === "aller" ? "Je pars de" : "Je rentre vers"}</Text>
          <TextInput
            value={adresse}
            onChangeText={setAdresse}
            placeholder={sens === "aller" ? "Adresse ou quartier de départ" : "Quartier ou ville où je rentre"}
            placeholderTextColor={C.inkFaint}
            style={s.input}
          />

          <Text style={s.label}>Places disponibles</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Pressable
                key={n}
                onPress={() => setPlaces(n)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: places === n ? C.brand : C.line,
                  backgroundColor: places === n ? C.brandSoft : C.white,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontWeight: "800", fontSize: 15, color: places === n ? C.brand : C.inkSoft }}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>Précision — facultatif</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Je peux faire un détour par le centre"
            placeholderTextColor={C.inkFaint}
            style={[s.input, { minHeight: 70, textAlignVertical: "top" }]}
          />

          <GradientButton label="Publier mon trajet" icon="send" onPress={proposer} busy={busy} />
        </View>

        <Text style={s.section}>MES TRAJETS</Text>

        {miens.length === 0 ? (
          <Text style={{ color: C.inkSoft, fontSize: 15 }}>
            Tu n&apos;as encore rien proposé.
          </Text>
        ) : (
          miens.map((t, i) => {
            const pour = demandes.filter((d) => d.trajet_id === t.id);
            const enAttente = pour.filter((d) => d.statut === "en_attente");
            const acceptees = pour.filter((d) => d.statut === "acceptee");
            const passe = new Date(t.depart_le).getTime() < Date.now();

            return (
              <FadeIn key={t.id} delay={i * 70}>
                <View style={s.card}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: t.statut === "annule" || passe ? C.inkFaint : C.navy,
                    }}
                  >
                    {formatDepart(t.depart_le)}
                  </Text>
                  <Text style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 3 }}>
                    {t.depart_adresse} · {acceptees.length}/{t.places} place
                    {t.places > 1 ? "s" : ""} prise{acceptees.length > 1 ? "s" : ""}
                    {t.statut === "annule" ? " · annulé" : ""}
                  </Text>

                  {enAttente.length > 0 ? (
                    <View style={{ marginTop: 12, gap: 9 }}>
                      {enAttente.map((d) => (
                        <View
                          key={d.id}
                          style={{
                            backgroundColor: C.sunnySoft,
                            borderRadius: 12,
                            padding: 12,
                          }}
                        >
                          <Text style={{ fontSize: 14.5, color: C.warnInk, fontWeight: "800" }}>
                            {noms[d.passager_id]?.nom ?? "Un membre"} demande une place
                          </Text>
                          {d.prise_en_charge ? (
                            <Text style={{ fontSize: 13, color: C.inkSoft, marginTop: 3 }}>
                              À prendre : {d.prise_en_charge}
                            </Text>
                          ) : null}
                          <View style={{ flexDirection: "row", gap: 9, marginTop: 10 }}>
                            <Bouncy
                              onPress={() => repondre(d, "acceptee")}
                              style={{
                                flex: 1,
                                backgroundColor: C.brand,
                                paddingVertical: 11,
                                borderRadius: 11,
                                alignItems: "center",
                              }}
                            >
                              <Text style={{ color: C.white, fontWeight: "800", fontSize: 14 }}>
                                J&apos;accepte
                              </Text>
                            </Bouncy>
                            <Pressable
                              onPress={() => repondre(d, "refusee")}
                              style={{
                                paddingVertical: 11,
                                paddingHorizontal: 16,
                                borderRadius: 11,
                                borderWidth: 1.5,
                                borderColor: C.line,
                                alignItems: "center",
                              }}
                            >
                              <Text style={{ color: C.danger, fontWeight: "700", fontSize: 14 }}>
                                Refuser
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {acceptees.length > 0 ? (
                    <View style={{ marginTop: 12, gap: 9 }}>
                      {acceptees.map((r) => {
                        const c = contacts[t.id]?.find((c) => c.id === r.passager_id);
                        return (
                          <View
                            key={r.id}
                            style={{ backgroundColor: C.brandSoft, borderRadius: 12, padding: 12, gap: 10 }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                              <Feather name="check-circle" size={15} color={C.brand} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14.5, fontWeight: "700", color: C.navy }}>
                                  {c?.nom ?? noms[r.passager_id]?.nom ?? "Un membre"}
                                </Text>
                                {r.prise_en_charge ? (
                                  <Text style={{ fontSize: 12.5, color: C.inkSoft }}>
                                    À prendre : {r.prise_en_charge}
                                  </Text>
                                ) : null}
                              </View>
                              {c?.telephone ? (
                                <Pressable
                                  onPress={() => Linking.openURL("tel:" + c.telephone)}
                                  style={{
                                    backgroundColor: C.brand,
                                    paddingHorizontal: 14,
                                    paddingVertical: 9,
                                    borderRadius: 10,
                                  }}
                                >
                                  <Text style={{ color: C.white, fontWeight: "800", fontSize: 13 }}>
                                    Appeler
                                  </Text>
                                </Pressable>
                              ) : null}
                            </View>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                              <Pressable
                                onPress={() =>
                                  router.push({ pathname: "/message/[id]", params: { id: r.passager_id } })
                                }
                                style={{
                                  flex: 1,
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 8,
                                  backgroundColor: C.white,
                                  borderWidth: 1.5,
                                  borderColor: C.brand,
                                  paddingVertical: 10,
                                  borderRadius: 10,
                                }}
                              >
                                <Feather name="message-circle" size={14} color={C.brand} />
                                <Text style={{ color: C.brand, fontWeight: "800", fontSize: 13 }}>
                                  Écrire
                                </Text>
                              </Pressable>
                              {r.prise_en_charge ? (
                                <Pressable
                                  onPress={() =>
                                    ouvrirItineraire({ adresse: r.prise_en_charge as string })
                                  }
                                  style={{
                                    flex: 1,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                    borderWidth: 1.5,
                                    borderColor: C.brand,
                                    paddingVertical: 10,
                                    borderRadius: 10,
                                  }}
                                >
                                  <Feather name="navigation" size={14} color={C.brand} />
                                  <Text style={{ color: C.brand, fontWeight: "800", fontSize: 13 }}>
                                    Itinéraire
                                  </Text>
                                </Pressable>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}

                  {t.statut !== "annule" && !passe ? (
                    <Pressable onPress={() => annulerTrajet(t)} style={{ marginTop: 12 }}>
                      <Text style={{ color: C.danger, fontWeight: "700", fontSize: 13.5 }}>
                        Annuler ce trajet
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </FadeIn>
            );
          })
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
