import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { notify } from "@/lib/notify";
import { geocodeAdresse } from "@/lib/geo";
import { C } from "@/lib/theme";

export default function Profil() {
  const router = useRouter();
  const { session, profile, eglise, refreshProfile, signOut } = useSession();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [hasVehicle, setHasVehicle] = useState(false);
  const [available, setAvailable] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setPhone(profile.phone ?? "");
    setAddress(profile.home_address ?? "");
    setHasVehicle(Boolean(profile.has_vehicle));
    setAvailable(Boolean(profile.available_for_carpool));
  }, [profile]);

  async function save() {
    if (!session) return;
    setSaving(true);

    const adresse = address.trim();
    // Sans coordonnees, la distance jusqu aux trajets ne peut pas s afficher :
    // on ne re-geocode que si l adresse a change, pour ne pas appeler Nominatim
    // a chaque enregistrement.
    let lat = profile?.home_lat ?? null;
    let lng = profile?.home_lng ?? null;
    if (adresse && adresse !== (profile?.home_address ?? "")) {
      try {
        const pos = await geocodeAdresse(adresse);
        lat = pos.lat;
        lng = pos.lng;
      } catch {
        lat = null;
        lng = null;
      }
    } else if (!adresse) {
      lat = null;
      lng = null;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        phone: phone.trim() || null,
        home_address: adresse || null,
        home_lat: lat,
        home_lng: lng,
        has_vehicle: hasVehicle,
        available_for_carpool: available,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);
    setSaving(false);
    if (error) {
      notify("Enregistrement impossible", error.message);
      return;
    }
    await refreshProfile();
    notify("Profil enregistré");
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: C.white }}>
        <ActivityIndicator color={C.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: C.canvas }}
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
    >
      <Text style={{ fontSize: 13, color: C.inkSoft }}>{session?.user.email}</Text>

      <Pressable
        onPress={() => router.push("/choix-eglise")}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          backgroundColor: C.brandSoft,
          borderRadius: 14,
          padding: 16,
          marginTop: 16,
        }}
      >
        <Feather name="home" size={19} color={C.brand} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: C.brand, letterSpacing: 0.5 }}>
            MON ÉGLISE
          </Text>
          <Text style={{ fontSize: 15.5, color: C.navy, fontWeight: "700", marginTop: 3 }}>
            {eglise?.name ?? "Aucune église"}
          </Text>
          {eglise?.city ? (
            <Text style={{ fontSize: 13, color: C.inkSoft }}>{eglise.city}</Text>
          ) : null}
        </View>
        <Feather name="chevron-right" size={20} color={C.brand} />
      </Pressable>

      <Text style={styles.label}>Nom affiché</Text>
      <TextInput value={displayName} onChangeText={setDisplayName} style={styles.input} />

      <Text style={styles.label}>Téléphone</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={styles.input}
      />

      <Text style={styles.label}>Adresse</Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        multiline
        style={[styles.input, { minHeight: 74, textAlignVertical: "top" }]}
      />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>J&apos;ai un véhicule</Text>
        <Switch
          value={hasVehicle}
          onValueChange={setHasVehicle}
          trackColor={{ true: C.brand, false: C.line }}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Disponible pour covoiturer</Text>
        <Switch
          value={available}
          onValueChange={setAvailable}
          trackColor={{ true: C.brand, false: C.line }}
        />
      </View>

      <Pressable
        onPress={save}
        disabled={saving}
        style={{
          marginTop: 26,
          backgroundColor: C.brand,
          paddingVertical: 16,
          borderRadius: 14,
          alignItems: "center",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? (
          <ActivityIndicator color={C.white} />
        ) : (
          <Text style={{ color: C.white, fontWeight: "700", fontSize: 16 }}>Enregistrer</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => router.push("/confidentialite")}
        style={{
          marginTop: 26,
          flexDirection: "row",
          alignItems: "center",
          gap: 11,
          paddingVertical: 14,
        }}
      >
        <Feather name="lock" size={17} color={C.inkSoft} />
        <Text style={{ color: C.navy, fontWeight: "600", fontSize: 15, flex: 1 }}>
          Confidentialité et données
        </Text>
        <Feather name="chevron-right" size={18} color={C.inkFaint} />
      </Pressable>

      <View style={{ height: 1, backgroundColor: C.line }} />

      <Pressable
        onPress={async () => {
          await signOut();
          router.replace("/login");
        }}
        style={{ marginTop: 18, paddingVertical: 15, alignItems: "center" }}
      >
        <Text style={{ color: C.navy, fontWeight: "700", fontSize: 15 }}>Se déconnecter</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/supprimer-compte")}
        style={{ marginTop: 6, paddingVertical: 15, alignItems: "center" }}
      >
        <Text style={{ color: C.danger, fontWeight: "600", fontSize: 14.5 }}>
          Supprimer mon compte
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = {
  label: {
    fontSize: 12.5,
    fontWeight: "700" as const,
    color: C.inkSoft,
    marginTop: 20,
    marginBottom: 7,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: C.ink,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginTop: 20,
  },
  rowLabel: { fontSize: 15.5, color: C.navy, fontWeight: "500" as const },
};
