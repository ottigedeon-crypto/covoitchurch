import { useEffect, useState } from "react";
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
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Feather from "@expo/vector-icons/Feather";
import AnimatedBackground from "@/components/AnimatedBackground";
import ChoixEgliseListe from "@/components/ChoixEgliseListe";
import { Bouncy, FadeIn } from "@/components/Motion";
import { supabase } from "@/lib/supabase";
import { notify } from "@/lib/notify";
import { memoriserChoix } from "@/lib/pending-role";
import { C, G } from "@/lib/theme";

export default function Inscription() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"driver" | "passenger">("passenger");
  const [egliseId, setEgliseId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Indique ton prénom et ton nom : les autres membres doivent te reconnaître.");
      return;
    }
    if (!email.trim() || !password) {
      setError("L'adresse email et le mot de passe sont nécessaires.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (!egliseId) {
      setError("Choisis ton église : tu ne verras que les trajets de celle-ci.");
      return;
    }

    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        // Le trigger handle_new_user cree le profil a partir de ces metadonnees.
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
        },
      },
    });

    if (err) {
      setBusy(false);
      setError(
        err.message.includes("already registered")
          ? "Cette adresse a déjà un compte. Connecte-toi plutôt."
          : err.message,
      );
      return;
    }

    const wantsVehicle = role === "driver";

    if (data.session) {
      // Session immédiate : on complète le profil tout de suite.
      await supabase
        .from("profiles")
        .update({
          has_vehicle: wantsVehicle,
          available_for_carpool: wantsVehicle,
          ...(egliseId ? { church_id: egliseId } : {}),
        })
        .eq("id", data.session.user.id);
      setBusy(false);
      router.replace("/(tabs)/carte");
      return;
    }

    // Confirmation par email demandée : on garde le choix pour la première connexion.
    await memoriserChoix({ role, churchId: egliseId });
    setBusy(false);
    notify(
      "Vérifie tes emails",
      "Un lien de confirmation vient de partir. Ouvre-le, puis reviens te connecter.",
    );
    router.replace("/login");
  }

  const roles = [
    {
      key: "passenger" as const,
      title: "Passager",
      body: "Je cherche une place dans une voiture",
      icon: "user" as const,
      tint: C.navy,
      tintSoft: C.navySoft,
    },
    {
      key: "driver" as const,
      title: "Conducteur",
      body: "J'ai une voiture et je peux prendre du monde",
      icon: "truck" as const,
      tint: C.brand,
      tintSoft: C.brandSoft,
    },
  ];

  return (
    <AnimatedBackground intensity={0.75}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 26, paddingBottom: 56 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginBottom: 18 }}>
          <Feather name="arrow-left" size={22} color={C.navy} />
        </Pressable>

        <Text style={{ fontSize: 30, fontWeight: "800", color: C.navy, letterSpacing: -0.5 }}>
          Rejoindre l&apos;église
        </Text>
        <Text style={{ fontSize: 15.5, color: C.inkSoft, marginTop: 8, lineHeight: 23 }}>
          Quelques informations, et tu pourras proposer ou trouver une place dès dimanche.
        </Text>

        <Text style={styles.section}>MON ÉGLISE</Text>
        <ChoixEgliseListe choisie={egliseId} onChoisir={setEgliseId} />

        <Text style={styles.section}>JE VIENS PLUTÔT COMME</Text>
        <View style={{ gap: 11 }}>
          {roles.map((r) => {
            const active = role === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setRole(r.key)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  borderWidth: 2,
                  borderColor: active ? r.tint : C.line,
                  backgroundColor: active ? r.tintSoft : C.white,
                  borderRadius: 16,
                  padding: 16,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                })}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: active ? r.tint : C.line,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name={r.icon} size={20} color={active ? C.white : C.inkSoft} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: "800", color: C.navy }}>{r.title}</Text>
                  <Text style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 2 }}>{r.body}</Text>
                </View>
                {active ? <Feather name="check-circle" size={21} color={r.tint} /> : null}
              </Pressable>
            );
          })}
        </View>
        <Text style={{ fontSize: 12.5, color: C.inkFaint, marginTop: 9, lineHeight: 18 }}>
          Ce choix n&apos;est pas définitif : tu peux basculer à chaque trajet depuis la carte.
        </Text>

        <Text style={styles.section}>TES INFORMATIONS</Text>

        <View style={{ flexDirection: "row", gap: 11 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Nom</Text>
            <TextInput value={lastName} onChangeText={setLastName} style={styles.input} />
          </View>
        </View>

        <Text style={styles.label}>Adresse email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="prenom@exemple.fr"
          placeholderTextColor={C.inkFaint}
          style={styles.input}
        />

        <Text style={styles.label}>Téléphone</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="06 12 34 56 78"
          placeholderTextColor={C.inkFaint}
          style={styles.input}
        />
        <Text style={{ fontSize: 12.5, color: C.inkFaint, marginTop: 6 }}>
          Il permet à un conducteur de t&apos;appeler le jour même.
        </Text>

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="6 caractères minimum"
          placeholderTextColor={C.inkFaint}
          style={styles.input}
        />

        {error ? (
          <View
            style={{
              backgroundColor: C.dangerSoft,
              borderRadius: 12,
              padding: 13,
              marginTop: 16,
              flexDirection: "row",
              gap: 10,
            }}
          >
            <Feather name="alert-circle" size={17} color={C.danger} />
            <Text style={{ color: C.danger, fontSize: 14, flex: 1, lineHeight: 20 }}>{error}</Text>
          </View>
        ) : null}

        <Bouncy
          onPress={submit}
          disabled={busy}
          style={{ marginTop: 24, borderRadius: 16, overflow: "hidden", opacity: busy ? 0.8 : 1 }}
        >
          <LinearGradient
            colors={G.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 18, alignItems: "center" }}
          >
            {busy ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={{ color: C.white, fontSize: 17.5, fontWeight: "800" }}>
                Créer mon compte
              </Text>
            )}
          </LinearGradient>
        </Bouncy>

        <Pressable
          onPress={() => router.push("/confidentialite")}
          style={{ marginTop: 18, alignItems: "center" }}
        >
          <Text style={{ color: C.inkSoft, fontSize: 13, textAlign: "center", lineHeight: 19 }}>
            En créant ton compte, tu acceptes la{" "}
            <Text style={{ color: C.brand, fontWeight: "700" }}>politique de confidentialité</Text>.
          </Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/login")} style={{ marginTop: 16, alignItems: "center" }}>
          <Text style={{ color: C.brand, fontWeight: "700", fontSize: 15 }}>
            J&apos;ai déjà un compte
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
    </AnimatedBackground>
  );
}

const styles = {
  section: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: C.brand,
    letterSpacing: 0.9,
    marginTop: 28,
    marginBottom: 12,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "700" as const,
    color: C.inkSoft,
    marginTop: 16,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 16,
    color: C.ink,
    backgroundColor: C.white,
  },
};
