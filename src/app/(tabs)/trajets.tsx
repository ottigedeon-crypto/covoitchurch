import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Feather from "@expo/vector-icons/Feather";
import { Linking } from "react-native";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { notify } from "@/lib/notify";
import { distanceMeters, formatDistance, formatDuree, ouvrirItineraire } from "@/lib/geo";
import {
  eglisesActives,
  formatDepart,
  reservationsDe,
  trajetsAVenir,
  type EgliseBreve,
  type Reservation,
  nomsPublics,
  placesRestantesLot,
  contactsTrajet,
  type ContactTrajet,
  type NomPublic,
  type Trajet,
} from "@/lib/trajets";
import { Bouncy, FadeIn } from "@/components/Motion";
import { C, G } from "@/lib/theme";

/**
 * La place de marché des trajets.
 *
 * Le filtre par défaut est l'église de l'utilisateur — c'est le cas courant —
 * mais rien n'empêche de regarder toutes les églises : quelqu'un qui passe près
 * de chez toi peut t'emmener même s'il ne va pas au même endroit que toi.
 */
export default function Trajets() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sens?: string }>();
  const { session, profile } = useSession();
  const userId = session?.user.id ?? null;

  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [mesResa, setMesResa] = useState<Record<string, Reservation>>({});
  const [eglises, setEglises] = useState<EgliseBreve[]>([]);
  const [filtreEgliseId, setFiltreEgliseId] = useState<string | null>(null);
  const [toutesEglises, setToutesEglises] = useState(false);
  const [sens, setSens] = useState<"aller" | "retour">("aller");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [noms, setNoms] = useState<Record<string, NomPublic>>({});
  const [places, setPlaces] = useState<Record<string, number>>({});
  const [contacts, setContacts] = useState<Record<string, ContactTrajet[]>>({});

  const monDomicile = useMemo(
    () =>
      profile?.home_lat != null && profile?.home_lng != null
        ? { lat: profile.home_lat, lng: profile.home_lng }
        : null,
    [profile?.home_lat, profile?.home_lng],
  );

  useEffect(() => {
    eglisesActives().then(setEglises);
  }, []);

  // On peut arriver ici depuis « Le retour » du menu, ou depuis une notification.
  useEffect(() => {
    if (params.sens === "retour" || params.sens === "aller") setSens(params.sens);
  }, [params.sens]);

  useEffect(() => {
    if (profile?.church_id && filtreEgliseId === null && !toutesEglises) {
      setFiltreEgliseId(profile.church_id);
    }
  }, [profile?.church_id, filtreEgliseId, toutesEglises]);

  const load = useCallback(async () => {
    const { trajets: liste, error } = await trajetsAVenir(
      toutesEglises ? null : (filtreEgliseId ?? profile?.church_id ?? null),
      sens,
    );
    if (error) {
      setErreur(error.message);
      setLoading(false);
      return;
    }
    setErreur(null);
    setTrajets(liste);

    const ids = liste.map((t) => t.id);
    const { reservations } = await reservationsDe(ids);
    const mien: Record<string, Reservation> = {};
    for (const r of reservations) if (r.passager_id === userId) mien[r.trajet_id] = r;
    setMesResa(mien);

    // Noms des conducteurs et places restantes, chacun en un seul appel.
    const [tableNoms, tablePlaces] = await Promise.all([
      nomsPublics(liste.map((t) => t.conducteur_id)),
      placesRestantesLot(ids),
    ]);
    setNoms(tableNoms);
    setPlaces(tablePlaces);

    // Le telephone n arrive que pour les trajets ou ma place est acceptee.
    const acceptes = Object.values(mien).filter((r) => r.statut === "acceptee");
    const tableContacts: Record<string, ContactTrajet[]> = {};
    for (const r of acceptes) tableContacts[r.trajet_id] = await contactsTrajet(r.trajet_id);
    setContacts(tableContacts);

    setLoading(false);
  }, [toutesEglises, filtreEgliseId, profile?.church_id, userId, sens]);

  useEffect(() => {
    load();
  }, [load]);

  const nomEglise = (id: string) => eglises.find((e) => e.id === id)?.name ?? "Une église";
  const villeEglise = (id: string) => eglises.find((e) => e.id === id)?.city ?? null;

  async function demander(t: Trajet) {
    if (!userId) return;
    setBusyId(t.id);
    const { error } = await supabase.from("reservations").insert({
      trajet_id: t.id,
      passager_id: userId,
      prise_en_charge: profile?.home_address ?? null,
    });
    setBusyId(null);
    if (error) {
      // 23505 : contrainte d unicite — une demande existe deja pour ce trajet.
      const lisible = error.code === "23505"
        ? "Tu as déjà demandé une place sur ce trajet."
        : error.message;
      notify("Demande impossible", lisible);
      return;
    }
    notify("Demande envoyée", "Le conducteur va la voir et te répondre.");
    load();
  }

  async function annuler(r: Reservation) {
    setBusyId(r.trajet_id);
    const { error } = await supabase.from("reservations").delete().eq("id", r.id);
    setBusyId(null);
    if (error) {
      notify("Annulation impossible", error.message);
      return;
    }
    load();
  }

  return (
    <ScrollView
      style={{ backgroundColor: C.canvas }}
      contentContainerStyle={{ padding: 18, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={C.brand} />}
    >
      <Text style={{ fontSize: 15, color: C.inkSoft, lineHeight: 22 }}>
        Quelqu&apos;un qui a une voiture indique où il se rend et combien de places il a. Tu
        demandes une place, il accepte. Sans argent.
      </Text>

      {/* Proposer */}
      <Bouncy
        onPress={() => router.navigate("/trajet-nouveau")}
        style={{ marginTop: 16, borderRadius: 16, overflow: "hidden" }}
      >
        <LinearGradient
          colors={G.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingVertical: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
          }}
        >
          <Feather name="plus-circle" size={18} color={C.white} />
          <Text style={{ color: C.white, fontSize: 16, fontWeight: "800" }}>
            Je conduis, je propose des places
          </Text>
        </LinearGradient>
      </Bouncy>

      {/* Aller ou retour */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: C.white,
          borderRadius: 14,
          padding: 4,
          marginTop: 20,
          borderWidth: 1,
          borderColor: C.line,
        }}
      >
        {(["aller", "retour"] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSens(s)}
            style={{
              flex: 1,
              paddingVertical: 11,
              borderRadius: 11,
              alignItems: "center",
              backgroundColor: sens === s ? C.navy : "transparent",
            }}
          >
            <Text
              style={{
                color: sens === s ? C.white : C.inkSoft,
                fontWeight: "700",
                fontSize: 14.5,
              }}
            >
              {s === "aller" ? "Aller à l'église" : "Retour"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Portée de la recherche */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: C.white,
          borderRadius: 14,
          padding: 4,
          marginTop: 20,
          borderWidth: 1,
          borderColor: C.line,
        }}
      >
        {[
          { cle: false, texte: "Mon église" },
          { cle: true, texte: "Toutes les églises" },
        ].map((opt) => (
          <Pressable
            key={String(opt.cle)}
            onPress={() => setToutesEglises(opt.cle)}
            style={{
              flex: 1,
              paddingVertical: 11,
              borderRadius: 11,
              alignItems: "center",
              backgroundColor: toutesEglises === opt.cle ? C.brand : "transparent",
            }}
          >
            <Text
              style={{
                color: toutesEglises === opt.cle ? C.white : C.inkSoft,
                fontWeight: "700",
                fontSize: 14.5,
              }}
            >
              {opt.texte}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text
        style={{
          fontSize: 12,
          fontWeight: "800",
          color: C.brand,
          letterSpacing: 0.8,
          marginTop: 24,
          marginBottom: 12,
        }}
      >
        {sens === "aller" ? "TRAJETS VERS L'ÉGLISE" : "RETOURS PROPOSÉS"}
      </Text>

      {loading ? (
        <ActivityIndicator color={C.brand} />
      ) : erreur ? (
        <View style={{ backgroundColor: C.warnBg, borderRadius: 14, padding: 16 }}>
          <Text style={{ fontSize: 13.5, color: C.warnInk, lineHeight: 20 }}>{erreur}</Text>
        </View>
      ) : trajets.length === 0 ? (
        <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: C.line }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: C.navy, textAlign: "center" }}>
            Aucun trajet proposé
          </Text>
          <Text
            style={{
              fontSize: 14.5,
              color: C.inkSoft,
              textAlign: "center",
              marginTop: 8,
              lineHeight: 21,
            }}
          >
            {toutesEglises
              ? "Personne n'a encore proposé de place. Sois le premier."
              : "Rien pour ton église. Essaie « Toutes les églises » : quelqu'un peut passer près de chez toi."}
          </Text>
        </View>
      ) : (
        trajets.map((t, i) => {
          const resa = mesResa[t.id];
          const aMoi = t.conducteur_id === userId;
          const busy = busyId === t.id;
          const complet = places[t.id] === 0;
          const distance =
            monDomicile && t.depart_lat != null && t.depart_lng != null
              ? distanceMeters(monDomicile, { lat: t.depart_lat, lng: t.depart_lng })
              : null;

          return (
            <FadeIn key={t.id} delay={i * 70}>
              <View
                style={{
                  backgroundColor: C.white,
                  borderRadius: 16,
                  padding: 17,
                  marginBottom: 11,
                  borderWidth: 1.5,
                  borderColor: resa ? C.brand : C.line,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Feather name="navigation" size={13} color={C.brand} />
                  <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.brand, flex: 1 }}>
                    {nomEglise(t.eglise_id).toUpperCase()}
                    {villeEglise(t.eglise_id) ? " · " + villeEglise(t.eglise_id) : ""}
                  </Text>
                </View>

                <Text style={{ fontSize: 17.5, fontWeight: "700", color: C.navy, marginTop: 7 }}>
                  {noms[t.conducteur_id]?.nom ?? "Un membre"}
                </Text>
                <Text style={{ fontSize: 14.5, color: C.inkSoft, marginTop: 2 }}>
                  {formatDepart(t.depart_le)}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <Feather name="map-pin" size={14} color={C.inkFaint} />
                  <Text style={{ fontSize: 14.5, color: C.inkSoft, flex: 1 }}>
                    Départ : {t.depart_adresse}
                    {distance != null
                      ? "  ·  à " + formatDistance(distance) + " (" + formatDuree(distance) + ") de chez toi"
                      : ""}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 }}>
                  <Feather name="users" size={14} color={C.inkFaint} />
                  <Text style={{ fontSize: 14.5, color: C.inkSoft }}>
                    {places[t.id] !== undefined
                      ? places[t.id] === 0
                        ? "Complet"
                        : places[t.id] + " place" + (places[t.id] > 1 ? "s" : "") + " restante" + (places[t.id] > 1 ? "s" : "") + " sur " + t.places
                      : t.places + " place" + (t.places > 1 ? "s" : "")}
                  </Text>
                </View>

                {t.notes ? (
                  <Text style={{ fontSize: 14, color: C.inkSoft, marginTop: 8, fontStyle: "italic" }}>
                    « {t.notes} »
                  </Text>
                ) : null}

                {aMoi ? (
                  <View
                    style={{
                      alignSelf: "flex-start",
                      marginTop: 12,
                      backgroundColor: C.navySoft,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 20,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "800", color: C.navy }}>
                      C&apos;EST TON TRAJET
                    </Text>
                  </View>
                ) : resa ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 13 }}>
                    <View
                      style={{
                        backgroundColor: resa.statut === "acceptee" ? C.brand : C.sunnySoft,
                        paddingHorizontal: 11,
                        paddingVertical: 6,
                        borderRadius: 20,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: "800",
                          color: resa.statut === "acceptee" ? C.white : C.warnInk,
                        }}
                      >
                        {resa.statut === "acceptee"
                          ? "PLACE CONFIRMÉE"
                          : resa.statut === "refusee"
                            ? "REFUSÉE"
                            : "DEMANDE ENVOYÉE"}
                      </Text>
                    </View>
                    <Pressable onPress={() => annuler(resa)} disabled={busy} hitSlop={8}>
                      <Text style={{ color: C.danger, fontWeight: "700", fontSize: 13.5 }}>
                        Retirer
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {/* Le telephone n apparait qu une fois la place acceptee. */}
                {resa?.statut === "acceptee" && contacts[t.id]?.length ? (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {contacts[t.id].map((c) => (
                      <View
                        key={c.id}
                        style={{
                          gap: 10,
                          backgroundColor: C.brandSoft,
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                          <Feather name="phone" size={15} color={C.brand} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14.5, fontWeight: "700", color: C.navy }}>
                              {c.nom}
                            </Text>
                            <Text style={{ fontSize: 12.5, color: C.inkSoft }}>
                              {c.telephone ?? "téléphone non renseigné"}
                            </Text>
                          </View>
                          {c.telephone ? (
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
                              router.push({ pathname: "/message/[id]", params: { id: c.id } })
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
                          <Pressable
                            onPress={() =>
                              ouvrirItineraire({
                                lat: t.depart_lat,
                                lng: t.depart_lng,
                                adresse: t.depart_adresse,
                              })
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
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                {!aMoi && !resa ? (
                  complet ? (
                    <View
                      style={{
                        marginTop: 14,
                        borderWidth: 2,
                        borderColor: C.line,
                        borderRadius: 13,
                        paddingVertical: 13,
                        alignItems: "center",
                        backgroundColor: C.navySoft,
                      }}
                    >
                      <Text style={{ color: C.inkFaint, fontWeight: "800", fontSize: 15 }}>
                        Complet
                      </Text>
                    </View>
                  ) : (
                    <Bouncy
                      onPress={() => demander(t)}
                      disabled={busy}
                      style={{
                        marginTop: 14,
                        borderWidth: 2,
                        borderColor: C.brand,
                        borderRadius: 13,
                        paddingVertical: 13,
                        alignItems: "center",
                      }}
                    >
                      {busy ? (
                        <ActivityIndicator color={C.brand} />
                      ) : (
                        <Text style={{ color: C.brand, fontWeight: "800", fontSize: 15 }}>
                          Demander une place
                        </Text>
                      )}
                    </Bouncy>
                  )
                ) : null}
              </View>
            </FadeIn>
          );
        })
      )}
    </ScrollView>
  );
}
