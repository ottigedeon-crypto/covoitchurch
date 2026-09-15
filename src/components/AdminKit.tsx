import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Feather from "@expo/vector-icons/Feather";
import { C, G } from "@/lib/theme";

/** Écran affiché aux comptes non administrateurs. */
export function AdminGuard() {
  return (
    <View style={{ flex: 1, padding: 30, justifyContent: "center", backgroundColor: C.canvas }}>
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: C.navySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="lock" size={26} color={C.navy} />
        </View>
        <Text
          style={{ fontSize: 20, fontWeight: "800", color: C.navy, marginTop: 16, textAlign: "center" }}
        >
          Réservé aux responsables
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: C.inkSoft,
            marginTop: 8,
            lineHeight: 22,
            textAlign: "center",
          }}
        >
          Ton compte n&apos;a pas le rôle administrateur. Ces écrans n&apos;apparaissent dans le menu
          que pour les responsables de l&apos;église.
        </Text>
      </View>
    </View>
  );
}

export function GradientButton({
  label,
  icon,
  onPress,
  busy = false,
  tone = "brand",
}: {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  busy?: boolean;
  tone?: keyof typeof G;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => ({
        marginTop: 20,
        borderRadius: 16,
        overflow: "hidden",
        transform: [{ scale: pressed ? 0.98 : 1 }],
        opacity: busy ? 0.75 : 1,
      })}
    >
      <LinearGradient
        colors={G[tone]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
          paddingVertical: 17,
        }}
      >
        {busy ? (
          <ActivityIndicator color={C.white} />
        ) : (
          <>
            {icon ? <Feather name={icon} size={18} color={C.white} /> : null}
            <Text style={{ color: C.white, fontWeight: "800", fontSize: 16.5 }}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export const styles = {
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    shadowColor: C.navy,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: C.navy,
    marginBottom: 4,
  },
  section: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: C.brand,
    letterSpacing: 0.9,
    marginTop: 22,
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
  pin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.brandSoft,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
};
