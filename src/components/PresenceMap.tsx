import { View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import Feather from "@expo/vector-icons/Feather";
import type { PresenceRow } from "@/lib/supabase";
import { distanceMeters, formatDistance, formatDuree } from "@/lib/geo";
import { C } from "@/lib/theme";

export type PresenceMapProps = {
  region: Region;
  others: PresenceRow[];
  me: { lat: number; lng: number } | null;
};

/**
 * Un badge rond plutôt que l'épingle par défaut — le repère visuel d'une
 * voiture ou d'un passager en un coup d'œil, façon VTC, sans dépendre d'une
 * image externe (icône vectorielle déjà embarquée dans l'app).
 */
function Badge({ role }: { role: "driver" | "passenger" }) {
  const teinte = role === "driver" ? C.brand : C.violet;
  return (
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: teinte,
        borderWidth: 3,
        borderColor: C.white,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 5,
      }}
    >
      <Feather name={role === "driver" ? "navigation-2" : "user"} size={17} color={C.white} />
    </View>
  );
}

export default function PresenceMap({ region, others, me }: PresenceMapProps) {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={region}
      showsUserLocation
      showsMyLocationButton={false}
    >
      {others.map((p) => {
        // Distance a vol d'oiseau seulement : ni identite ni contact ne sont
        // exposes tant qu'aucune place n'a ete acceptee — voir contacts_trajet.
        const d = me ? distanceMeters(me, { lat: p.lat, lng: p.lng }) : null;
        return (
          <Marker
            key={p.user_id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.role === "driver" ? "Conducteur" : "Passager"}
            description={d != null ? formatDistance(d) + " · " + formatDuree(d) : undefined}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <Badge role={p.role} />
          </Marker>
        );
      })}
    </MapView>
  );
}
