import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Feather from "@expo/vector-icons/Feather";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Bouncy, FadeIn, Pulse } from "@/components/Motion";
import { supabase } from "@/lib/supabase";
import LogoGoogle from "@/components/LogoGoogle";
import { connexionGoogle } from "@/lib/google";
import { C, G } from "@/lib/theme";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyGoogle, setBusyGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Entre ton adresse email et ton mot de passe.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (err) {
      setError(
        err.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : err.message,
      );
      return;
    }
    router.replace("/(tabs)/carte");
  }

  async function google() {
    setError(null);
    setBusyGoogle(true);
    const r = await connexionGoogle();
    setBusyGoogle(false);
    if (r.ok) {
      router.replace("/(tabs)/carte");
      return;
    }
    if (!r.annule) setError(r.raison);
  }

  return (
    <AnimatedBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 26 }}>
          <FadeIn delay={80}>
            <View style={{ alignItems: "center", marginBottom: 32 }}>
              <Pulse opacite={false}>
                <View
                  style={{
                    borderRadius: 24,
                    shadowColor: C.brand,
                    shadowOpacity: 0.35,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 6,
                  }}
                >
                  <Image
                    source={require("../../assets/icon.png")}
                    style={{ width: 88, height: 88, borderRadius: 24 }}
                  />
                </View>
              </Pulse>
              <Text
                style={{
                  fontSize: 33,
                  fontWeight: "800",
                  color: C.navy,
                  letterSpacing: -0.6,
                  marginTop: 20,
                }}
              >
                Covoit&apos;Church
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: C.inkSoft,
                  marginTop: 8,
                  textAlign: "center",
                  lineHeight: 23,
                }}
              >
                Que plus personne ne vienne à l&apos;église seul.
              </Text>
            </View>
          </FadeIn>

          <FadeIn delay={200}>
            <View
              style={{
                backgroundColor: C.white,
                borderRadius: 24,
                padding: 22,
                shadowColor: C.navy,
                shadowOpacity: 0.09,
                shadowRadius: 22,
                shadowOffset: { width: 0, height: 8 },
                elevation: 4,
              }}
            >
              <Text style={styles.label}>Adresse email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="prenom@exemple.fr"
                placeholderTextColor={C.inkFaint}
                style={styles.input}
              />

              <Text style={[styles.label, { marginTop: 18 }]}>Mot de passe</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
                placeholder="Ton mot de passe"
                placeholderTextColor={C.inkFaint}
                style={styles.input}
                onSubmitEditing={submit}
                returnKeyType="go"
              />

              {error ? (
                <FadeIn from={6}>
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
                    <Text style={{ color: C.danger, fontSize: 14, flex: 1, lineHeight: 20 }}>
                      {error}
                    </Text>
                  </View>
                </FadeIn>
              ) : null}

              <Bouncy
                onPress={submit}
                disabled={busy}
                style={{ marginTop: 22, borderRadius: 16, overflow: "hidden", opacity: busy ? 0.8 : 1 }}
              >
                <LinearGradient
                  colors={G.brand}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ paddingVertical: 17, alignItems: "center" }}
                >
                  {busy ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <Text style={{ color: C.white, fontSize: 17, fontWeight: "800" }}>
                      Se connecter
                    </Text>
                  )}
                </LinearGradient>
              </Bouncy>
            </View>
          </FadeIn>

          <FadeIn delay={330}>
            <Bouncy
              onPress={google}
              disabled={busyGoogle}
              style={{
                marginTop: 18,
                borderWidth: 1.5,
                borderColor: C.line,
                borderRadius: 16,
                paddingVertical: 15,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                backgroundColor: C.white,
              }}
            >
              {busyGoogle ? (
                <ActivityIndicator color={C.brand} />
              ) : (
                <>
                  <LogoGoogle taille={19} />
                  <Text style={{ color: C.navy, fontSize: 15.5, fontWeight: "700" }}>
                    Continuer avec Google
                  </Text>
                </>
              )}
            </Bouncy>

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 24 }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
              <Text style={{ color: C.inkFaint, fontSize: 13 }}>première fois ici ?</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
            </View>

            <Bouncy
              onPress={() => router.push("/inscription")}
              style={{
                borderWidth: 2,
                borderColor: C.brand,
                borderRadius: 16,
                paddingVertical: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                backgroundColor: "rgba(255,255,255,0.7)",
              }}
            >
              <Feather name="user-plus" size={18} color={C.brand} />
              <Text style={{ color: C.brand, fontSize: 16.5, fontWeight: "800" }}>
                Créer mon compte
              </Text>
            </Bouncy>

            <Text
              style={{
                fontSize: 12.5,
                color: C.inkFaint,
                textAlign: "center",
                marginTop: 22,
                lineHeight: 19,
              }}
            >
              Même compte que sur covoitchurch.com.
            </Text>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </AnimatedBackground>
  );
}

const styles = {
  label: {
    fontSize: 12.5,
    fontWeight: "700" as const,
    color: C.inkSoft,
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
