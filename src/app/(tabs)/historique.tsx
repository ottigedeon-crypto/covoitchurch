import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { C } from "@/lib/theme";

type Trip = {
  id: string;
  driver_id: string;
  passenger_id: string;
  started_at: string | null;
  ended_at: string | null;
  distance_km: number | null;
  created_at: string;
};

export default function Historique() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("trips")
      .select("id, driver_id, passenger_id, started_at, ended_at, distance_km, created_at")
      .or("driver_id.eq." + userId + ",passenger_id.eq." + userId)
      .order("created_at", { ascending: false })
      .limit(100);
    setTrips((data as Trip[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: C.white }}>
        <ActivityIndicator color={C.brand} />
      </View>
    );
  }

  const totalKm = trips.reduce((sum, t) => sum + (t.distance_km ?? 0), 0);

  return (
    <FlatList
      style={{ backgroundColor: C.canvas }}
      contentContainerStyle={{ padding: 18, gap: 11, paddingBottom: 40 }}
      data={trips}
      keyExtractor={(t) => t.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={C.brand} />}
      ListHeaderComponent={
        trips.length > 0 ? (
          <View
            style={{
              backgroundColor: C.brandSoft,
              borderRadius: 14,
              padding: 18,
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 30, fontWeight: "800", color: C.brand }}>
              {trips.length}
            </Text>
            <Text style={{ fontSize: 14, color: C.inkSoft }}>
              trajet{trips.length > 1 ? "s" : ""} partagé{trips.length > 1 ? "s" : ""}
              {totalKm > 0 ? "  ·  " + totalKm.toFixed(0) + " km" : ""}
            </Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={{ paddingTop: 40 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: C.navy, textAlign: "center" }}>
            Aucun trajet pour l&apos;instant
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
            Tes trajets apparaîtront ici dès qu&apos;un conducteur t&apos;aura pris en charge.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const asDriver = item.driver_id === userId;
        const d = new Date(item.started_at ?? item.created_at);
        return (
          <View
            style={{
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 14,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            }}
          >
            <Feather name={asDriver ? "truck" : "user"} size={18} color={C.brand} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15.5, fontWeight: "700", color: C.navy }}>
                {asDriver ? "Tu conduisais" : "Tu étais passager"}
              </Text>
              <Text style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 2 }}>
                {d.toLocaleDateString("fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                })}
                {item.distance_km ? "  ·  " + item.distance_km.toFixed(1) + " km" : ""}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}
