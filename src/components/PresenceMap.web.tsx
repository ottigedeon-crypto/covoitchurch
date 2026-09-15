import { Text, View } from "react-native";
import { C } from "@/lib/theme";
import type { PresenceRow } from "@/lib/supabase";
import type { Region } from "react-native-maps";

export type PresenceMapProps = {
  region: Region;
  others: PresenceRow[];
  me: { lat: number; lng: number } | null;
};

/**
 * react-native-maps n'existe pas sur le web. Cette version de secours sert
 * uniquement a faire tourner l'app dans un navigateur pour verifier la logique :
 * position, presences, minuteur. Sur telephone, c'est PresenceMap.tsx (carte native)
 * qui est chargee automatiquement par Metro.
 */
export default function PresenceMap({ others, me }: PresenceMapProps) {
  return (
    <View style={{ flex: 1, backgroundColor: "#EEF1F6", justifyContent: "center", padding: 28 }}>
      <View
        style={{
          alignSelf: "center",
          maxWidth: 460,
          width: "100%",
          backgroundColor: C.white,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: C.line,
          padding: 24,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            letterSpacing: 1,
            fontWeight: "700",
            color: C.brand,
          }}
        >
          APERÇU NAVIGATEUR
        </Text>
        <Text style={{ fontSize: 19, fontWeight: "700", color: C.navy, marginTop: 8 }}>
          La carte s&apos;affiche sur le téléphone
        </Text>
        <Text style={{ fontSize: 14, color: C.inkSoft, marginTop: 8, lineHeight: 21 }}>
          Google Maps natif ne tourne pas dans un navigateur. Tout le reste de l&apos;écran est bien
          réel : position GPS, écriture de la présence, minuteur.
        </Text>

        <View style={{ height: 1, backgroundColor: C.line, marginVertical: 18 }} />

        <Text style={{ fontSize: 12.5, color: C.inkSoft, fontWeight: "700", letterSpacing: 0.4 }}>
          TA POSITION
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: C.navy,
            marginTop: 5,
            fontVariant: ["tabular-nums"],
          }}
        >
          {me ? me.lat.toFixed(5) + "  ·  " + me.lng.toFixed(5) : "localisation en cours…"}
        </Text>

        <Text
          style={{
            fontSize: 12.5,
            color: C.inkSoft,
            fontWeight: "700",
            letterSpacing: 0.4,
            marginTop: 18,
          }}
        >
          MEMBRES VISIBLES
        </Text>
        {others.length === 0 ? (
          <Text style={{ fontSize: 15, color: C.inkSoft, marginTop: 5 }}>Aucun pour l&apos;instant</Text>
        ) : (
          others.map((p) => (
            <View
              key={p.user_id}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: p.role === "driver" ? C.brand : C.navy,
                }}
              />
              <Text style={{ fontSize: 15, color: C.navy }}>
                {p.role === "driver" ? "Conducteur" : "Passager"}
              </Text>
              <Text style={{ fontSize: 13, color: C.inkSoft, fontVariant: ["tabular-nums"] }}>
                {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
