import { useEffect } from "react";
import { Redirect, Tabs, useRouter } from "expo-router";
import { ActivityIndicator, View, type ColorValue } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { MenuButton, MenuProvider } from "@/components/AppMenu";
import { useSession } from "@/lib/session";
import { enregistrerAppareil, suivreLesTaps } from "@/lib/push";
import { C } from "@/lib/theme";

function Icon({ nom, color }: { nom: keyof typeof Feather.glyphMap; color: ColorValue }) {
  return <Feather name={nom} size={19} color={color as string} />;
}

export default function TabsLayout() {
  const { session, profile, loading } = useSession();
  const router = useRouter();

  // Jeton de notification : une fois connecte, et a chaque changement de compte.
  useEffect(() => {
    if (!session) return;
    enregistrerAppareil(session.user.id).then((r) => {
      if (!r.ok) console.log("[push] non enregistre :", r.raison);
    });
  }, [session]);

  // Tap sur une notification : on ouvre l ecran vise.
  useEffect(() => suivreLesTaps((route) => router.navigate(route as never)), [router]);

  // Sans session, aucun de ces ecrans n a de sens : un lien de notification recu
  // deconnecte doit ramener a la connexion, pas afficher un ecran vide.
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: C.canvas }}>
        <ActivityIndicator color={C.brand} size="large" />
      </View>
    );
  }
  if (!session) return <Redirect href="/login" />;
  if (profile && !profile.church_id) return <Redirect href="/choix-eglise" />;

  return (
    <MenuProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: C.brand,
          tabBarInactiveTintColor: C.inkSoft,
          headerStyle: { backgroundColor: C.white },
          headerTintColor: C.navy,
          headerTitleStyle: { fontWeight: "700" },
          headerLeft: () => <MenuButton />,
          tabBarStyle: { borderTopColor: C.line },
          tabBarLabelStyle: { fontSize: 11 },
        }}
      >
        <Tabs.Screen
          name="trajets"
          options={{
            title: "Trajets",
            headerTitle: "Trajets partagés",
            tabBarIcon: ({ color }) => <Icon nom="navigation" color={color} />,
          }}
        />
        <Tabs.Screen
          name="carte"
          options={{
            title: "Carte",
            headerShown: false,
            tabBarIcon: ({ color }) => <Icon nom="map" color={color} />,
          }}
        />
        <Tabs.Screen
          name="points"
          options={{ title: "Points", headerTitle: "Points de rassemblement", href: null }}
        />
        <Tabs.Screen
          name="evenements"
          options={{
            title: "Événements",
            tabBarIcon: ({ color }) => <Icon nom="calendar" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profil"
          options={{
            title: "Profil",
            headerTitle: "Mon profil",
            tabBarIcon: ({ color }) => <Icon nom="user" color={color} />,
          }}
        />

        {/* Ecrans atteignables par le menu, volontairement hors de la barre d'onglets */}
        <Tabs.Screen name="trajet-nouveau" options={{ title: "Proposer un trajet", href: null }} />
        <Tabs.Screen name="retour" options={{ title: "Le retour", href: null }} />
        <Tabs.Screen name="chat" options={{ title: "Chat", href: null }} />
        <Tabs.Screen name="messages" options={{ title: "Messages", href: null }} />
        <Tabs.Screen name="historique" options={{ title: "Historique", href: null }} />
        <Tabs.Screen name="guide" options={{ title: "Guide", href: null }} />
        <Tabs.Screen name="admin" options={{ title: "Administration", href: null }} />
        <Tabs.Screen name="admin-eglises" options={{ title: "Gérer les églises", href: null }} />
        <Tabs.Screen name="admin-points" options={{ title: "Gérer les points", href: null }} />
        <Tabs.Screen name="admin-evenements" options={{ title: "Gérer les événements", href: null }} />
      </Tabs>
    </MenuProvider>
  );
}
