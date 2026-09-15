import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { notify } from "@/lib/notify";
import { messagesAvec, envoyerMessagePrive, type MessagePrive } from "@/lib/messages";
import { nomsPublics } from "@/lib/trajets";
import { C } from "@/lib/theme";

/**
 * Conversation privée avec une personne précise — un conducteur ou un
 * passager croisé sur un trajet, en général. `id` est son identifiant, pas
 * une conversation à part : voir lib/messages.ts sur le choix de réutiliser
 * chat_messages plutôt qu'une nouvelle table.
 */
export default function Message() {
  const params = useLocalSearchParams<{ id: string }>();
  const autreId = params.id;
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  const [nom, setNom] = useState("Conversation");
  const [messages, setMessages] = useState<MessagePrive[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!autreId) return;
    const [table, liste] = await Promise.all([nomsPublics([autreId]), messagesAvec(autreId)]);
    setNom(table[autreId]?.nom ?? "Un membre");
    setMessages(liste);
    setLoading(false);
  }, [autreId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("chat-prive-" + autreId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, autreId]);

  async function send() {
    const body = draft.trim();
    if (!body || !autreId) return;
    setSending(true);
    const { error } = await envoyerMessagePrive(autreId, body);
    setSending(false);
    if (error) {
      notify("Envoi impossible", error.message);
      return;
    }
    setDraft("");
    load();
  }

  return (
    <>
      <Stack.Screen options={{ title: nom, headerShown: true }} />
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", backgroundColor: C.white }}>
          <ActivityIndicator color={C.brand} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: C.canvas }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={90}
        >
          <FlatList
            inverted
            data={[...messages].reverse()}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            ListEmptyComponent={
              <Text style={{ color: C.inkSoft, fontSize: 15, textAlign: "center", marginTop: 40 }}>
                Écris le premier message à {nom}.
              </Text>
            }
            renderItem={({ item }) => {
              const isMine = item.user_id === userId;
              return (
                <View
                  style={{
                    alignSelf: isMine ? "flex-end" : "flex-start",
                    maxWidth: "82%",
                    backgroundColor: isMine ? C.brand : C.brandSoft,
                    borderRadius: 16,
                    borderBottomRightRadius: isMine ? 4 : 16,
                    borderBottomLeftRadius: isMine ? 16 : 4,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ fontSize: 15.5, color: isMine ? C.white : C.navy, lineHeight: 21 }}>
                    {item.content}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: isMine ? "rgba(255,255,255,0.7)" : C.inkSoft,
                      marginTop: 4,
                    }}
                  >
                    {new Date(item.created_at).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              );
            }}
          />

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              padding: 14,
              borderTopWidth: 1,
              borderColor: C.line,
              alignItems: "flex-end",
            }}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={"Écrire à " + nom}
              placeholderTextColor="#A9AEBC"
              multiline
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: C.line,
                borderRadius: 20,
                paddingHorizontal: 15,
                paddingVertical: 11,
                fontSize: 15.5,
                color: C.ink,
                maxHeight: 110,
                backgroundColor: C.white,
              }}
            />
            <Pressable
              onPress={send}
              disabled={sending || !draft.trim()}
              style={{
                backgroundColor: draft.trim() ? C.brand : "#C3BDD0",
                width: 46,
                height: 46,
                borderRadius: 23,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {sending ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={{ color: C.white, fontSize: 18 }}>↑</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </>
  );
}
