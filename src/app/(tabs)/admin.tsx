import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { AdminGuard, styles as s } from "@/components/AdminKit";
import { C } from "@/lib/theme";

type Counts = { zones: number; events: number; members: number; responses: number };

export default function Admin() {
  const { isAdmin, profile } = useSession();
  const router = useRouter();

  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const head = { count: "exact" as const, head: true };
    const [z, e, m, r] = await Promise.all([
      supabase.from("rally_zones").select("id", head),
      supabase.from("events").select("id", head),
      supabase.from("profiles").select("id", head),
      supabase.from("event_responses").select("id", head),
    ]);
    setCounts({
      zones: z.count ?? 0,
      events: e.count ?? 0,
      members: m.count ?? 0,
      responses: r.count ?? 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAdmin) return <AdminGuard />;

  const tiles = [
    { label: "Points", value: counts?.zones, icon: "map-pin" as const, tone: C.brand, bg: C.brandSoft },
    { label: "Événements", value: counts?.events, icon: "calendar" as const, tone: C.navy, bg: C.navySoft },
    { label: "Membres", value: counts?.members, icon: "users" as const, tone: C.brand, bg: C.brandSoft },
    { label: "Réponses", value: counts?.responses, icon: "check-circle" as const, tone: C.navy, bg: C.navySoft },
  ];

  const links = [
    {
      label: "Gérer les églises",
      hint: "Ajouter une église, l'activer ou la suspendre",
      icon: "home" as const,
      route: "/admin-eglises",
    },
    {
      label: "Gérer les points de rassemblement",
      hint: "Créer, situer et supprimer les points",
      icon: "map-pin" as const,
      route: "/admin-points",
    },
    {
      label: "Gérer les événements",
      hint: "Annoncer un culte, une sortie, une réunion",
      icon: "calendar" as const,
      route: "/admin-evenements",
    },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: C.canvas }}
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={C.brand} />}
    >
      <Text style={{ fontSize: 22, fontWeight: "800", color: C.navy }}>
        Bonjour {profile?.first_name || profile?.display_name || ""}
      </Text>
      <Text style={{ fontSize: 15, color: C.inkSoft, marginTop: 6, lineHeight: 22 }}>
        Tu as les droits d&apos;administration. Ce que tu crées ici apparaît immédiatement sur
        covoitchurch.com : c&apos;est la même base.
      </Text>

      {loading ? (
        <ActivityIndicator color={C.brand} style={{ marginTop: 30 }} />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 22 }}>
          {tiles.map((t) => (
            <View
              key={t.label}
              style={{
                flexGrow: 1,
                flexBasis: "45%",
                backgroundColor: t.bg,
                borderRadius: 18,
                padding: 18,
              }}
            >
              <Feather name={t.icon} size={19} color={t.tone} />
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: "800",
                  color: t.tone,
                  marginTop: 8,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {t.value ?? "—"}
              </Text>
              <Text style={{ fontSize: 13.5, color: C.inkSoft, fontWeight: "600" }}>{t.label}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={s.section}>ACTIONS</Text>

      {links.map((l) => (
        <Pressable
          key={l.route}
          onPress={() => router.navigate(l.route)}
          style={({ pressed }) => [
            s.card,
            {
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              transform: [{ scale: pressed ? 0.99 : 1 }],
            },
          ]}
        >
          <View style={s.pin}>
            <Feather name={l.icon} size={18} color={C.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: C.navy }}>{l.label}</Text>
            <Text style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 2 }}>{l.hint}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={C.inkFaint} />
        </Pressable>
      ))}

      <View
        style={{
          marginTop: 18,
          backgroundColor: C.warnBg,
          borderRadius: 14,
          padding: 16,
        }}
      >
        <Text style={{ fontSize: 13, color: C.warnInk, lineHeight: 19 }}>
          En administrateur tu vois aussi les profils, les réponses aux événements et les trajets de
          tous les membres. Les présences sur la carte et les pointages, eux, ne sont partagés qu'en
          nombre : personne, pas même toi, ne voit qui attend où.
        </Text>
      </View>
    </ScrollView>
  );
}
