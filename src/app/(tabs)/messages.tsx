import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useSession } from "@/lib/session";
import { conversations, type Conversation } from "@/lib/messages";
import { nomsPublics, type NomPublic } from "@/lib/trajets";
import { C } from "@/lib/theme";

/**
 * Liste des conversations privées, une par correspondant.
 *
 * On y arrive surtout depuis un trajet accepté (bouton « Écrire dans
 * l'application »), mais une conversation déjà commencée reste ici pour y
 * revenir plus tard sans repasser par le trajet.
 */
export default function Messages() {
  const router = useRouter();
  const { session } = useSession();

  const [rows, setRows] = useState<Conversation[]>([]);
  const [noms, setNoms] = useState<Record<string, NomPublic>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    const liste = await conversations();
    setRows(liste);
    setNoms(await nomsPublics(liste.map((c) => c.correspondant_id)));
    setLoading(false);
  }, [session]);

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

  return (
    <FlatList
      style={{ backgroundColor: C.canvas }}
      contentContainerStyle={{ padding: 18, gap: 10, paddingBottom: 40 }}
      data={rows}
      keyExtractor={(c) => c.correspondant_id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={C.brand} />}
      ListEmptyComponent={
        <Text style={{ color: C.inkSoft, fontSize: 15, lineHeight: 22 }}>
          Aucune conversation pour l&apos;instant. Elles apparaissent ici dès que tu écris à
          quelqu&apos;un depuis un trajet.
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: "/message/[id]", params: { id: item.correspondant_id } })}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 13,
            backgroundColor: C.white,
            borderRadius: 15,
            padding: 15,
            borderWidth: 1,
            borderColor: C.line,
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: C.brandSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="user" size={18} color={C.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15.5, fontWeight: "700", color: C.navy }}>
              {noms[item.correspondant_id]?.nom ?? "Un membre"}
            </Text>
            <Text style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 2 }} numberOfLines={1}>
              {item.dernier_message}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={C.inkFaint} />
        </Pressable>
      )}
    />
  );
}
