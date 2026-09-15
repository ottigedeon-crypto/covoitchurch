import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { readPositionIfAllowed } from "@/lib/location";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { notify } from "@/lib/notify";
import { distanceMeters, formatDistance, formatDuree } from "@/lib/geo";
import { Bouncy, FadeIn } from "@/components/Motion";
import { filtreEglise } from "@/lib/eglise";
import { compteursPoints, type CompteurPoint } from "@/lib/trajets";
import { C } from "@/lib/theme";

type Zone = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_m: number | null;
};

type CheckinStatus = "here" | "eta_5" | "eta_10plus";

type Checkin = {
  id: string;
  point_id: string;
  status: CheckinStatus;
  group_size: number | null;
  expires_at: string;
};

const STATUS_LABEL: Record<CheckinStatus, string> = {
  here: "Je suis déjà là",
  eta_5: "J'arrive dans ~5 min",
  eta_10plus: "J'arrive dans +10 min",
};

const STATUS_SHORT: Record<CheckinStatus, string> = {
  here: "déjà là",
  eta_5: "5 min",
  eta_10plus: "+10 min",
};

const STATUS_COLOR: Record<CheckinStatus, string> = {
  here: "#1B6249",
  eta_5: "#B4530A",
  eta_10plus: "#5B6273",
};

/** Duree de validite d'un pointage, alignee sur la logique du site. */
const CHECKIN_MINUTES = 30;

export default function Points() {
  const { session, profile } = useSession();
  const userId = session?.user.id ?? null;
  const churchId = profile?.church_id ?? null;

  const [zones, setZones] = useState<Zone[]>([]);
  const [mine, setMine] = useState<Checkin | null>(null);
  const [compteurs, setCompteurs] = useState<Record<string, CompteurPoint>>({});
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Zone | null>(null);
  const [groupSize, setGroupSize] = useState(1);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [zoneRes, mineRes] = await Promise.all([
      filtreEglise(supabase.from("rally_zones").select("id, name, lat, lng, radius_m"), churchId).order("name"),
      userId
        ? supabase
            .from("meeting_point_checkins")
            .select("id, point_id, status, group_size, expires_at")
            .eq("user_id", userId)
            .gt("expires_at", new Date().toISOString())
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as const),
    ]);

    setZones((zoneRes.data as Zone[]) ?? []);
    setMine((mineRes.data as Checkin) ?? null);

    // Compteurs par point : une fonction dediee, car les pointages des autres
    // ne sont pas lisibles directement. Un total, jamais la liste des personnes.
    setCompteurs(await compteursPoints(((zoneRes.data as Zone[]) ?? []).map((z) => z.id)));
    setLoading(false);
  }, [userId, churchId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    readPositionIfAllowed().then(setMe);
  }, []);

  const sorted = useMemo(() => {
    if (!me) return zones;
    return [...zones].sort((a, b) => distanceMeters(me, a) - distanceMeters(me, b));
  }, [zones, me]);

  function peopleAt(zoneId: string) {
    return compteurs[zoneId]?.total ?? 0;
  }

  async function checkIn(zone: Zone, status: CheckinStatus) {
    if (!userId) return;
    setBusy(true);
    // Un seul pointage actif a la fois : on remplace le precedent.
    await supabase.from("meeting_point_checkins").delete().eq("user_id", userId);
    const { error } = await supabase.from("meeting_point_checkins").insert({
      point_id: zone.id,
      user_id: userId,
      status,
      group_size: groupSize,
      expires_at: new Date(Date.now() + CHECKIN_MINUTES * 60000).toISOString(),
    });
    setBusy(false);
    if (error) {
      notify("Pointage impossible", error.message);
      return;
    }
    setSelected(null);
    load();
  }

  async function cancel() {
    if (!userId) return;
    setBusy(true);
    const { error } = await supabase.from("meeting_point_checkins").delete().eq("user_id", userId);
    setBusy(false);
    if (error) {
      notify("Erreur", error.message);
      return;
    }
    setMine(null);
    setSelected(null);
    load();
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: C.white }}>
        <ActivityIndicator color={C.brand} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.canvas }}>
      <FlatList
        contentContainerStyle={{ padding: 18, gap: 12, paddingBottom: 40 }}
        data={sorted}
        keyExtractor={(z) => z.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={C.brand} />}
        ListHeaderComponent={
          mine ? (
            <View
              style={{
                backgroundColor: C.brandSoft,
                borderRadius: 14,
                padding: 16,
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "800", color: C.brand, letterSpacing: 0.6 }}>
                TU ES POINTÉ
              </Text>
              <Text style={{ fontSize: 16, color: C.navy, marginTop: 6, fontWeight: "600" }}>
                {zones.find((z) => z.id === mine.point_id)?.name ?? "Point inconnu"}
              </Text>
              <Text style={{ fontSize: 14, color: C.inkSoft, marginTop: 2 }}>
                {STATUS_LABEL[mine.status]} · {mine.group_size ?? 1} personne
                {(mine.group_size ?? 1) > 1 ? "s" : ""}
              </Text>
              <Pressable onPress={cancel} style={{ marginTop: 10 }}>
                <Text style={{ color: C.danger, fontWeight: "700", fontSize: 14 }}>
                  Annuler mon pointage
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={{ fontSize: 14.5, color: C.inkSoft, lineHeight: 21, marginBottom: 4 }}>
              Choisis le point où tu attends, dis quand tu y seras, et les conducteurs te voient.
            </Text>
          )
        }
        ListEmptyComponent={
          <Text style={{ color: C.inkSoft, fontSize: 15 }}>
            Aucun point de rassemblement pour l&apos;instant.
          </Text>
        }
        renderItem={({ item, index }) => {
          const isMine = mine?.point_id === item.id;
          const count = peopleAt(item.id);
          return (
            <FadeIn delay={index * 70}>
            <Pressable
              onPress={() => {
                setGroupSize(isMine ? (mine?.group_size ?? 1) : 1);
                setSelected(item);
              }}
              style={{
                borderWidth: 1.5,
                borderColor: isMine ? C.brand : C.line,
                borderRadius: 14,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: C.brandSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="map-pin" size={16} color={C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16.5, fontWeight: "700", color: C.navy }}>{item.name}</Text>
                <Text style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 3 }}>
                  {count === 0 ? "Personne pour l'instant" : count + " personne" + (count > 1 ? "s" : "")}
                  {me
                    ? "  ·  " +
                      formatDistance(distanceMeters(me, item)) +
                      " (" +
                      formatDuree(distanceMeters(me, item)) +
                      ")"
                    : ""}
                </Text>
              </View>
              {isMine ? (
                <View
                  style={{
                    backgroundColor: STATUS_COLOR[mine.status],
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ color: C.white, fontSize: 11, fontWeight: "800" }}>
                    {STATUS_SHORT[mine.status]}
                  </Text>
                </View>
              ) : null}
            </Pressable>
            </FadeIn>
          );
        }}
      />

      <Modal
        visible={selected !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(13,27,42,0.45)", justifyContent: "flex-end" }}>
          <ScrollView
            style={{
              maxHeight: "88%",
              backgroundColor: C.white,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
            }}
            contentContainerStyle={{ padding: 22, paddingBottom: 34 }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 21, fontWeight: "800", color: C.navy }}>
                  {selected?.name}
                </Text>
                <Text style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 2 }}>
                  Point de rassemblement
                </Text>
              </View>
              <Pressable onPress={() => setSelected(null)} hitSlop={12}>
                <Text style={{ fontSize: 22, color: C.inkSoft }}>✕</Text>
              </Pressable>
            </View>

            <View
              style={{
                backgroundColor: C.brandSoft,
                borderRadius: 14,
                padding: 18,
                alignItems: "center",
                marginTop: 18,
              }}
            >
              <Text style={{ fontSize: 34, fontWeight: "800", color: C.brand }}>
                {selected ? peopleAt(selected.id) : 0}
              </Text>
              <Text style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 2 }}>
                personne(s) attendue(s) ici
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderWidth: 1,
                borderColor: C.line,
                borderRadius: 14,
                paddingHorizontal: 18,
                paddingVertical: 14,
                marginTop: 16,
              }}
            >
              <Text style={{ fontSize: 16, color: C.navy, fontWeight: "600" }}>
                Combien êtes-vous ?
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
                <Pressable onPress={() => setGroupSize((n) => Math.max(1, n - 1))} hitSlop={10}>
                  <Text style={{ fontSize: 26, color: C.brand, fontWeight: "700" }}>−</Text>
                </Pressable>
                <Text
                  style={{
                    fontSize: 19,
                    fontWeight: "800",
                    color: C.navy,
                    minWidth: 24,
                    textAlign: "center",
                  }}
                >
                  {groupSize}
                </Text>
                <Pressable onPress={() => setGroupSize((n) => Math.min(9, n + 1))} hitSlop={10}>
                  <Text style={{ fontSize: 26, color: C.brand, fontWeight: "700" }}>＋</Text>
                </Pressable>
              </View>
            </View>

            {(["here", "eta_5", "eta_10plus"] as const).map((s) => (
              <Pressable
                key={s}
                disabled={busy}
                onPress={() => selected && checkIn(selected, s)}
                style={{
                  marginTop: 12,
                  borderWidth: 2,
                  borderColor: STATUS_COLOR[s],
                  borderRadius: 14,
                  paddingVertical: 17,
                  alignItems: "center",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                <Text style={{ color: STATUS_COLOR[s], fontWeight: "700", fontSize: 16 }}>
                  {STATUS_LABEL[s]}
                </Text>
              </Pressable>
            ))}

            {mine && selected && mine.point_id === selected.id ? (
              <Pressable onPress={cancel} style={{ marginTop: 16, alignItems: "center" }}>
                <Text style={{ color: C.danger, fontWeight: "700", fontSize: 15 }}>
                  Annuler mon pointage
                </Text>
              </Pressable>
            ) : null}

            <View style={{ marginTop: 18, backgroundColor: C.warnBg, padding: 12, borderRadius: 10 }}>
              <Text style={{ fontSize: 12.5, color: C.warnInk, lineHeight: 18 }}>
                Le compteur dit combien de personnes attendent ici. Leur identité reste privée :
                seul le nombre est partagé.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
