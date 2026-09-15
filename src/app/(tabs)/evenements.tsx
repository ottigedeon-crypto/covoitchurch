import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { notify } from "@/lib/notify";
import { FadeIn } from "@/components/Motion";
import { filtreEglise } from "@/lib/eglise";
import { C } from "@/lib/theme";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_at: string;
  church_id: string | null;
};

type ResponseRow = {
  id: string;
  event_id: string;
  going: boolean | null;
  role: "driver" | "passenger" | null;
  is_ready: boolean | null;
};

export default function Evenements() {
  const { session, profile } = useSession();
  const userId = session?.user.id ?? null;
  const churchId = profile?.church_id ?? null;

  const [rows, setRows] = useState<EventRow[]>([]);
  const [responses, setResponses] = useState<Record<string, ResponseRow>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [evRes, respRes] = await Promise.all([
      filtreEglise(
        supabase.from("events").select("id, title, description, event_at, church_id"),
        churchId,
      )
        .gte("event_at", new Date(Date.now() - 6 * 3600 * 1000).toISOString())
        .order("event_at", { ascending: true })
        .limit(50),
      userId
        ? supabase
            .from("event_responses")
            .select("id, event_id, going, role, is_ready")
            .eq("user_id", userId)
        : Promise.resolve({ data: [], error: null } as const),
    ]);

    if (evRes.error) setError(evRes.error.message);
    else {
      setError(null);
      setRows((evRes.data as EventRow[]) ?? []);
    }

    const map: Record<string, ResponseRow> = {};
    for (const r of (respRes.data as ResponseRow[]) ?? []) map[r.event_id] = r;
    setResponses(map);
    setLoading(false);
  }, [userId, churchId]);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(eventId: string, role: "driver" | "passenger") {
    if (!userId) return;
    setBusyId(eventId);
    const existing = responses[eventId];
    const payload = { going: true, role, updated_at: new Date().toISOString() };
    const { error: err } = existing
      ? await supabase.from("event_responses").update(payload).eq("id", existing.id)
      : await supabase
          .from("event_responses")
          .insert({ event_id: eventId, user_id: userId, ...payload });
    setBusyId(null);
    if (err) {
      notify("Réponse impossible", err.message);
      return;
    }
    load();
  }

  async function setReady(eventId: string, ready: boolean) {
    const existing = responses[eventId];
    if (!existing) return;
    setBusyId(eventId);
    const { error: err } = await supabase
      .from("event_responses")
      .update({
        is_ready: ready,
        ready_at: ready ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    setBusyId(null);
    if (err) {
      notify("Erreur", err.message);
      return;
    }
    load();
  }

  async function withdraw(eventId: string) {
    const existing = responses[eventId];
    if (!existing) return;
    setBusyId(eventId);
    const { error: err } = await supabase
      .from("event_responses")
      .delete()
      .eq("id", existing.id);
    setBusyId(null);
    if (err) {
      notify("Erreur", err.message);
      return;
    }
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
    <FlatList
      style={{ backgroundColor: C.canvas }}
      contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 40 }}
      data={rows}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={C.brand} />}
      ListEmptyComponent={
        <Text style={{ color: C.inkSoft, fontSize: 15 }}>
          {error ?? "Aucun événement à venir."}
        </Text>
      }
      renderItem={({ item, index }) => {
        const d = new Date(item.event_at);
        const r = responses[item.id];
        const busy = busyId === item.id;
        return (
          <FadeIn delay={index * 80}>
          <View
            style={{
              borderWidth: 1.5,
              borderColor: r?.going ? C.brand : C.line,
              borderRadius: 16,
              padding: 17,
              backgroundColor: C.white,
            }}
          >
            <Text style={{ fontSize: 12, color: C.brand, fontWeight: "800", letterSpacing: 0.4 }}>
              {d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              {"  ·  "}
              {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </Text>
            <Text style={{ fontSize: 19, fontWeight: "700", color: C.navy, marginTop: 6 }}>
              {item.title}
            </Text>
            {item.church_id === null ? (
              <View
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 7,
                  backgroundColor: C.navySoft,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <Feather name="globe" size={11} color={C.navy} />
                <Text style={{ fontSize: 10.5, fontWeight: "800", color: C.navy }}>
                  TOUTES LES ÉGLISES
                </Text>
              </View>
            ) : null}
            {item.description ? (
              <Text style={{ fontSize: 14.5, color: C.inkSoft, marginTop: 6, lineHeight: 21 }}>
                {item.description}
              </Text>
            ) : null}

            {r?.going ? (
              <View style={{ marginTop: 14 }}>
                <View
                  style={{
                    alignSelf: "flex-start",
                    backgroundColor: C.brandSoft,
                    paddingHorizontal: 11,
                    paddingVertical: 5,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ color: C.brand, fontWeight: "800", fontSize: 12 }}>
                    TU Y VAS · {r.role === "driver" ? "CONDUCTEUR" : "PASSAGER"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <Pressable
                    disabled={busy}
                    onPress={() => setReady(item.id, !r.is_ready)}
                    style={{
                      flex: 1,
                      paddingVertical: 13,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: r.is_ready ? C.ok : C.white,
                      borderWidth: 1.5,
                      borderColor: r.is_ready ? C.ok : C.line,
                    }}
                  >
                    <Text
                      style={{
                        color: r.is_ready ? C.white : C.inkSoft,
                        fontWeight: "700",
                        fontSize: 14.5,
                      }}
                    >
                      {r.is_ready ? "Je suis prêt ✓" : "Je suis prêt"}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={busy}
                    onPress={() => withdraw(item.id)}
                    style={{
                      paddingVertical: 13,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      alignItems: "center",
                      borderWidth: 1.5,
                      borderColor: C.line,
                    }}
                  >
                    <Text style={{ color: C.danger, fontWeight: "700", fontSize: 14.5 }}>
                      Annuler
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Pressable
                  disabled={busy}
                  onPress={() => respond(item.id, "passenger")}
                  style={{
                    flex: 1,
                    backgroundColor: C.navy,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: C.white, fontWeight: "700", fontSize: 14.5 }}>
                    J&apos;y vais · passager
                  </Text>
                </Pressable>
                <Pressable
                  disabled={busy}
                  onPress={() => respond(item.id, "driver")}
                  style={{
                    flex: 1,
                    backgroundColor: C.brand,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: C.white, fontWeight: "700", fontSize: 14.5 }}>
                    Je conduis
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
          </FadeIn>
        );
      }}
    />
  );
}
