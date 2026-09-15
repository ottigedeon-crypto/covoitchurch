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
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { notify } from "@/lib/notify";
import { nomsPublics, type NomPublic } from "@/lib/trajets";
import { C } from "@/lib/theme";

type Message = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export default function Chat() {
  const { session, profile } = useSession();
  const userId = session?.user.id ?? null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [noms, setNoms] = useState<Record<string, NomPublic>>({});

  const load = useCallback(async () => {
    // Le fil public de l'eglise : recipient_id vide. Lisible par tout membre connecte.
    const { data } = await supabase
      .from("chat_messages")
      .select("id, user_id, content, created_at")
      .is("recipient_id", null)
      .order("created_at", { ascending: false })
      .limit(100);
    const liste = (data as Message[]) ?? [];
    setMessages(liste);
    setNoms(await nomsPublics(liste.map((m) => m.user_id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("chat-public")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function send() {
    const body = draft.trim();
    if (!body || !userId) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      user_id: userId,
      content: body,
      church_id: profile?.church_id ?? null,
    });
    setSending(false);
    if (error) {
      notify("Envoi impossible", error.message);
      return;
    }
    setDraft("");
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.canvas }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        inverted
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          <Text style={{ color: C.inkSoft, fontSize: 15, textAlign: "center", marginTop: 40 }}>
            Aucun message. Lance la conversation.
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
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color: isMine ? "rgba(255,255,255,0.75)" : C.brand,
                  marginBottom: 3,
                }}
              >
                {isMine ? "MOI" : (noms[item.user_id]?.nom ?? "Un membre").toUpperCase()}
              </Text>
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
          placeholder="Écrire un message"
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
  );
}
