import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/lib/session";
import { C } from "@/lib/theme";

type MenuCtx = { open: () => void; close: () => void };
const Ctx = createContext<MenuCtx | null>(null);

export function useMenu() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMenu doit être utilisé dans MenuProvider");
  return ctx;
}

/** Le bouton à trois barres, en tête d'écran ou flottant sur la carte. */
export function MenuButton({ floating = false }: { floating?: boolean }) {
  const { open } = useMenu();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={open}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Ouvrir le menu"
      style={
        floating
          ? {
              position: "absolute",
              top: insets.top + 10,
              left: 16,
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: C.white,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: C.navy,
              shadowOpacity: 0.16,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4,
              zIndex: 30,
            }
          : { paddingHorizontal: 16, paddingVertical: 8 }
      }
    >
      <Feather name="menu" size={22} color={C.navy} />
    </Pressable>
  );
}

type Entry = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  adminOnly?: boolean;
};

/** Le trajet partagé en tête : c'est devenu le cœur de l'application. */
const TOP: Entry[] = [
  { label: "Trajets partagés", icon: "navigation", route: "/trajets" },
  { label: "Proposer un trajet", icon: "plus-circle", route: "/trajet-nouveau" },
  { label: "Points de rassemblement", icon: "target", route: "/points" },
  { label: "Carte, sur le moment", icon: "map", route: "/carte" },
  { label: "Le retour", icon: "corner-down-left", route: "/retour" },
];

const BOTTOM: Entry[] = [
  { label: "Mon profil", icon: "user", route: "/profil" },
  { label: "Messages", icon: "mail", route: "/messages" },
  { label: "Chat", icon: "message-circle", route: "/chat" },
  { label: "Événements", icon: "calendar", route: "/evenements" },
  { label: "Historique", icon: "rotate-ccw", route: "/historique" },
  { label: "Guide", icon: "book-open", route: "/guide" },
  { label: "Confidentialité", icon: "lock", route: "/confidentialite" },
  { label: "Gérer les églises (admin)", icon: "home", route: "/admin-eglises", adminOnly: true },
  { label: "Gérer les points (admin)", icon: "map-pin", route: "/admin-points", adminOnly: true },
  { label: "Événements (admin)", icon: "calendar", route: "/admin-evenements", adminOnly: true },
  { label: "Administration", icon: "shield", route: "/admin", adminOnly: true },
];

export function MenuProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  // Le tiroir glisse depuis la gauche a chaque ouverture.
  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 180,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [visible, slide]);
  const { profile, isAdmin, session } = useSession();

  const value = useMemo<MenuCtx>(
    () => ({ open: () => setVisible(true), close: () => setVisible(false) }),
    [],
  );

  function go(route: string) {
    setVisible(false);
    router.navigate(route);
  }

  function goWithRole(role: "driver" | "passenger") {
    setVisible(false);
    router.navigate({ pathname: "/carte", params: { role } });
  }

  function renderEntry(e: Entry) {
    if (e.adminOnly && !isAdmin) return null;
    return (
      <Pressable
        key={e.route}
        onPress={() => go(e.route)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          paddingHorizontal: 22,
          paddingVertical: 14,
          backgroundColor: pressed ? C.brandSoft : "transparent",
        })}
      >
        <Feather name={e.icon} size={20} color={C.navy} />
        <Text style={{ fontSize: 16.5, color: C.navy, fontWeight: "600" }}>{e.label}</Text>
      </Pressable>
    );
  }

  return (
    <Ctx.Provider value={value}>
      {children}

      <Modal
        visible={visible}
        animationType="fade"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <View style={{ flex: 1, flexDirection: "row" }}>
          <Animated.View
            style={{
              width: "86%",
              maxWidth: 390,
              backgroundColor: C.white,
              paddingTop: 50,
              transform: [
                { translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-340, 0] }) },
              ],
            }}
          >
            {/* En-tête */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 22,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderColor: C.line,
              }}
            >
              <Feather name="map-pin" size={20} color={C.brand} />
              <Text
                style={{
                  flex: 1,
                  fontSize: 20,
                  fontWeight: "800",
                  color: C.navy,
                  marginLeft: 10,
                }}
              >
                Covoit&apos;Church
              </Text>
              <Pressable
                onPress={() => setVisible(false)}
                hitSlop={12}
                accessibilityLabel="Fermer le menu"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  borderWidth: 1.5,
                  borderColor: C.brandLine,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="x" size={16} color={C.brand} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              {TOP.map(renderEntry)}

              {/* Bloc géolocalisation, comme sur le site */}
              <View
                style={{
                  marginHorizontal: 16,
                  marginVertical: 10,
                  backgroundColor: C.brandSoft,
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Feather name="map-pin" size={15} color={C.brand} />
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: "800",
                      color: C.brand,
                      letterSpacing: 0.6,
                    }}
                  >
                    GÉOLOCALISATION
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: C.inkSoft, marginTop: 6 }}>
                  Voir qui est autour (15 km)
                </Text>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <Pressable
                    onPress={() => goWithRole("driver")}
                    style={({ pressed }) => ({
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      backgroundColor: C.brand,
                      paddingVertical: 13,
                      borderRadius: 12,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Feather name="truck" size={16} color={C.white} />
                    <Text style={{ color: C.white, fontWeight: "700", fontSize: 14.5 }}>
                      Conducteur
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => goWithRole("passenger")}
                    style={({ pressed }) => ({
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      backgroundColor: C.navy,
                      paddingVertical: 13,
                      borderRadius: 12,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Feather name="user" size={16} color={C.white} />
                    <Text style={{ color: C.white, fontWeight: "700", fontSize: 14.5 }}>
                      Passager
                    </Text>
                  </Pressable>
                </View>
              </View>

              {BOTTOM.map(renderEntry)}

              <View
                style={{
                  marginTop: 12,
                  marginHorizontal: 22,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderColor: C.line,
                }}
              >
                <Text style={{ fontSize: 13, color: C.inkSoft }}>Connecté en tant que</Text>
                <Text style={{ fontSize: 15.5, color: C.navy, fontWeight: "700", marginTop: 2 }}>
                  {profile?.display_name || session?.user.email || "—"}
                </Text>
                {isAdmin ? (
                  <View
                    style={{
                      alignSelf: "flex-start",
                      marginTop: 8,
                      backgroundColor: C.navySoft,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 20,
                    }}
                  >
                    <Text style={{ color: C.navy, fontWeight: "800", fontSize: 11 }}>
                      ADMINISTRATEUR
                    </Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </Animated.View>

          <Pressable
            onPress={() => setVisible(false)}
            style={{ flex: 1, backgroundColor: "rgba(13,27,42,0.45)" }}
          />
        </View>
      </Modal>
    </Ctx.Provider>
  );
}
