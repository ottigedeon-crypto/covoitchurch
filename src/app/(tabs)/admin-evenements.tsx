import { useCallback, useEffect, useState } from "react";
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
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { notify } from "@/lib/notify";
import ChampDateHeure from "@/components/ChampDateHeure";
import { AdminGuard, GradientButton, styles as s } from "@/components/AdminKit";
import { C } from "@/lib/theme";

type EventRow = { id: string; title: string; event_at: string; church_id: string | null };

/** Un événement concerne soit sa propre église, soit toutes à la fois. */
type Portee = "eglise" | "commun";

export default function AdminEvenements() {
  const { session, profile, eglise, isAdmin } = useSession();

  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [when, setWhen] = useState<Date | null>(null);
  const [portee, setPortee] = useState<Portee>("eglise");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("events")
      .select("id, title, event_at, church_id")
      .order("event_at", { ascending: false })
      .limit(50);
    setRows((data as EventRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAdmin) return <AdminGuard />;

  async function create() {
    const date = when;
    if (!title.trim()) {
      notify("Titre manquant", "Donne un titre à l'événement.");
      return;
    }
    if (!date) {
      notify("Date manquante", "Choisis le jour et l'heure de l'événement.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("events").insert({
      title: title.trim(),
      description: desc.trim() || null,
      event_at: date.toISOString(),
      popup_lead_minutes: 180,
      created_by: session?.user.id ?? null,
      // Un événement commun n'appartient à aucune église : il est alors visible
      // par toutes, le filtrage laissant passer les lignes sans église.
      church_id: portee === "commun" ? null : (profile?.church_id ?? null),
    });
    setBusy(false);
    if (error) {
      notify("Création impossible", error.message);
      return;
    }
    setTitle("");
    setDesc("");
    setWhen(null);
    notify(
      "Événement créé",
      portee === "commun"
        ? "Toutes les églises le voient dans leur onglet Événements."
        : "Les membres de ton église le voient dans leur onglet Événements.",
    );
    load();
  }

  async function remove(id: string, label: string) {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      notify("Suppression impossible", error.message);
      return;
    }
    notify("Événement supprimé", label);
    load();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.canvas }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 56 }}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Nouvel événement</Text>

          <Text style={s.label}>Titre</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Culte du dimanche"
            placeholderTextColor={C.inkFaint}
            style={s.input}
          />

          <Text style={s.label}>Description</Text>
          <TextInput
            value={desc}
            onChangeText={setDesc}
            multiline
            placeholder="Facultatif"
            placeholderTextColor={C.inkFaint}
            style={[s.input, { minHeight: 78, textAlignVertical: "top" }]}
          />

          <Text style={s.label}>Quand</Text>
          <ChampDateHeure valeur={when} onChange={setWhen} />

          <GradientButton label="Créer l'événement" icon="plus" onPress={create} busy={busy} />
        </View>

        <Text style={s.section}>ÉVÉNEMENTS EXISTANTS</Text>

        {loading ? (
          <ActivityIndicator color={C.brand} />
        ) : rows.length === 0 ? (
          <Text style={{ color: C.inkSoft, fontSize: 15 }}>Aucun événement.</Text>
        ) : (
          rows.map((e) => {
            const d = new Date(e.event_at);
            const past = d.getTime() < Date.now();
            return (
              <View
                key={e.id}
                style={[s.card, { flexDirection: "row", alignItems: "center", gap: 14 }]}
              >
                <View style={[s.pin, past ? { backgroundColor: C.line } : null]}>
                  <Feather name="calendar" size={17} color={past ? C.inkFaint : C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15.5,
                      color: past ? C.inkFaint : C.navy,
                      fontWeight: "700",
                    }}
                  >
                    {e.title}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: C.inkFaint, marginTop: 2 }}>
                    {d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    {" · "}
                    {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  {e.church_id === null ? (
                    <View
                      style={{
                        alignSelf: "flex-start",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        marginTop: 6,
                        backgroundColor: C.brandSoft,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 20,
                      }}
                    >
                      <Feather name="globe" size={11} color={C.brand} />
                      <Text style={{ fontSize: 10.5, fontWeight: "800", color: C.brand }}>
                        TOUTES LES ÉGLISES
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Pressable onPress={() => remove(e.id, e.title)} hitSlop={8}>
                  <Feather name="trash-2" size={19} color={C.danger} />
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
