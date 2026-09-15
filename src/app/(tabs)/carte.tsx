import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { Region } from "react-native-maps";
import { requestPosition } from "@/lib/location";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PresenceMap from "@/components/PresenceMap";
import { MenuButton } from "@/components/AppMenu";
import { Bouncy, Pulse } from "@/components/Motion";
import { LinearGradient } from "expo-linear-gradient";
import { supabase, type PresenceRow } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { notify } from "@/lib/notify";
import { presencesActives } from "@/lib/trajets";
import { C, G } from "@/lib/theme";

const DURATIONS = [15, 30, 45, 60] as const;

/** Repli quand le GPS n'est pas disponible : la France entière, cadrée large. */
const REPLI = { lat: 46.6, lng: 2.4, delta: 9 };

export default function Carte() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ role?: string }>();
  const { session, profile, eglise } = useSession();
  const userId = session?.user.id ?? null;

  const [region, setRegion] = useState<Region | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [locError, setLocError] = useState<string | null>(null);

  const [role, setRole] = useState<"passenger" | "driver">("passenger");
  const [minutes, setMinutes] = useState<(typeof DURATIONS)[number]>(30);
  const [mine, setMine] = useState<PresenceRow | null>(null);
  const [others, setOthers] = useState<PresenceRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);

  // --- position ---------------------------------------------------------
  const locate = useCallback(async () => {
    setPermission("unknown");
    setLocError(null);
    try {
      const next = await requestPosition();
      setPermission("granted");
      setCoords(next);
      setRegion({
        latitude: next.lat,
        longitude: next.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    } catch (e) {
      setLocError(e instanceof Error ? e.message : String(e));
      setPermission("denied");
    }
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  // Le menu peut arriver avec un role deja choisi (bloc Geolocalisation).
  useEffect(() => {
    if (params.role === "driver" || params.role === "passenger") setRole(params.role);
  }, [params.role]);

  /** Sans GPS, on cadre sur l'église de l'utilisateur si on la connaît, sinon large. */
  function browseWithoutGps() {
    setPermission("granted");
    setCoords(null);
    const surEglise = eglise?.lat != null && eglise?.lng != null;
    setRegion({
      latitude: surEglise ? (eglise!.lat as number) : REPLI.lat,
      longitude: surEglise ? (eglise!.lng as number) : REPLI.lng,
      latitudeDelta: surEglise ? 0.06 : REPLI.delta,
      longitudeDelta: surEglise ? 0.06 : REPLI.delta,
    });
  }

  // --- presences --------------------------------------------------------
  const load = useCallback(async () => {
    if (!userId) return;
    // Passe par une fonction dediee : les policies limitent la lecture directe
    // de la table presence a sa propre ligne, ce qui laissait la carte vide.
    const lignes = await presencesActives(profile?.church_id);
    const rows = lignes.map((l) => ({ ...l, taken: false })) as PresenceRow[];
    setMine(rows.find((r) => r.user_id === userId) ?? null);
    setOthers(rows.filter((r) => r.user_id !== userId));
  }, [userId, profile?.church_id]);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  // --- compte a rebours -------------------------------------------------
  useEffect(() => {
    if (!mine) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const left = Math.max(
        0,
        Math.floor((new Date(mine.expires_at).getTime() - Date.now()) / 1000),
      );
      setRemaining(left);
      if (left === 0) setMine(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mine]);

  async function declare() {
    if (!userId) return;
    if (!coords) {
      notify("Position introuvable", "Active la localisation pour te rendre visible.");
      return;
    }
    setBusy(true);
    const expiresAt = new Date(Date.now() + minutes * 60000).toISOString();
    const { error } = await supabase.from("presence").upsert(
      {
        user_id: userId,
        role,
        lat: coords.lat,
        lng: coords.lng,
        expires_at: expiresAt,
        taken: false,
        church_id: profile?.church_id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    setBusy(false);
    if (error) {
      notify("Impossible de te déclarer", error.message);
      return;
    }
    load();
  }

  async function stop() {
    if (!userId) return;
    setBusy(true);
    const { error } = await supabase.from("presence").delete().eq("user_id", userId);
    setBusy(false);
    if (error) {
      notify("Erreur", error.message);
      return;
    }
    setMine(null);
    load();
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  if (permission === "denied") {
    return (
      <View style={{ flex: 1, padding: 28, justifyContent: "center", backgroundColor: C.white }}>
        <MenuButton floating />
        <Text style={{ fontSize: 21, fontWeight: "700", color: C.navy }}>Localisation refusée</Text>
        <Text style={{ fontSize: 15, color: C.inkSoft, marginTop: 10, lineHeight: 22 }}>
          {locError ?? "Covoit'Church a besoin de ta position pour te placer sur la carte pendant la durée que tu choisis."}
        </Text>

        <Pressable
          onPress={locate}
          style={{
            marginTop: 22,
            backgroundColor: C.brand,
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: C.white, fontWeight: "700", fontSize: 16 }}>Réessayer</Text>
        </Pressable>

        <Pressable onPress={browseWithoutGps} style={{ marginTop: 14, alignItems: "center" }}>
          <Text style={{ color: C.brand, fontWeight: "600", fontSize: 15 }}>
            Continuer sans ma position
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!region) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: C.white }}>
        <MenuButton floating />
        <ActivityIndicator color={C.brand} size="large" />
        <Text style={{ textAlign: "center", marginTop: 14, color: C.inkSoft }}>
          Recherche de ta position...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      <PresenceMap region={region} others={others} me={coords} />

      <MenuButton floating />

      <View
        style={{
          position: "absolute",
          top: insets.top + 10,
          left: 72,
          right: 16,
          flexDirection: "row",
          backgroundColor: C.white,
          borderRadius: 12,
          padding: 4,
          borderWidth: 1,
          borderColor: C.line,
        }}
      >
        {(["passenger", "driver"] as const).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRole(r)}
            style={{
              flex: 1,
              paddingVertical: 11,
              borderRadius: 9,
              backgroundColor: role === r ? C.brand : "transparent",
              alignItems: "center",
            }}
          >
            <Text
              style={{ color: role === r ? C.white : C.inkSoft, fontWeight: "700", fontSize: 15 }}
            >
              {r === "passenger" ? "Passager" : "Conducteur"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: C.white,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 20,
          borderTopWidth: 1,
          borderColor: C.line,
        }}
      >
        {mine ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pulse>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.brand }} />
            </Pulse>
            <Text style={{ fontSize: 15, color: C.inkSoft }}>
              Tu es visible comme{" "}
              <Text style={{ color: C.navy, fontWeight: "700" }}>
                {mine.role === "driver" ? "conducteur" : "passager"}
              </Text>
            </Text>
            </View>
            <Text
              style={{
                fontSize: 40,
                fontWeight: "800",
                color: C.brand,
                marginTop: 4,
                fontVariant: ["tabular-nums"],
              }}
            >
              {mm}:{ss}
            </Text>
            <Pressable
              onPress={stop}
              disabled={busy}
              style={{
                marginTop: 12,
                borderWidth: 1.5,
                borderColor: C.danger,
                paddingVertical: 15,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: C.danger, fontWeight: "700", fontSize: 16 }}>
                Je ne suis plus là
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 13, color: C.inkSoft, fontWeight: "600", letterSpacing: 0.5 }}>
              VISIBLE PENDANT
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              {DURATIONS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setMinutes(d)}
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: minutes === d ? C.brand : C.line,
                    backgroundColor: minutes === d ? C.brandSoft : C.white,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: minutes === d ? C.brand : C.inkSoft,
                      fontWeight: "700",
                      fontSize: 15,
                    }}
                  >
                    {d === 60 ? "1 h" : d + " min"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Bouncy
              onPress={declare}
              disabled={busy || !coords}
              style={{ marginTop: 14, borderRadius: 18, overflow: "hidden", opacity: busy ? 0.75 : 1 }}
            >
              <LinearGradient
                colors={coords ? G.brand : ["#C3D2D0", "#AEC0BE"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 19, alignItems: "center" }}
              >
                {busy ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={{ color: C.white, fontSize: 19.5, fontWeight: "800" }}>Je suis là</Text>
                )}
              </LinearGradient>
            </Bouncy>
            {!coords ? (
              <Pressable onPress={locate} style={{ marginTop: 10, alignItems: "center" }}>
                <Text style={{ color: C.brand, fontSize: 13.5, fontWeight: "600" }}>
                  Active ta position pour te rendre visible
                </Text>
              </Pressable>
            ) : null}
          </>
        )}

        {others.length === 0 ? (
          <View style={{ marginTop: 14, backgroundColor: C.warnBg, padding: 12, borderRadius: 10 }}>
            <Text style={{ fontSize: 12.5, color: C.warnInk, lineHeight: 18 }}>
              Personne d&apos;autre n&apos;est visible en ce moment. Chacun n&apos;apparaît que pendant la
              durée qu&apos;il a choisie.
            </Text>
          </View>
        ) : (
          <Text style={{ marginTop: 12, fontSize: 13.5, color: C.inkSoft }}>
            {others.length} membre{others.length > 1 ? "s" : ""} visible
            {others.length > 1 ? "s" : ""} autour de toi
          </Text>
        )}
      </View>
    </View>
  );
}
