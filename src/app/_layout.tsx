import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "@/lib/session";
import { C } from "@/lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: C.white },
            headerTintColor: C.navy,
            headerTitleStyle: { fontWeight: "700" },
            contentStyle: { backgroundColor: C.canvas },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="inscription" options={{ headerShown: false }} />
          <Stack.Screen name="choix-eglise" options={{ headerShown: false }} />
          <Stack.Screen name="confidentialite" options={{ headerShown: false }} />
          <Stack.Screen name="supprimer-compte" options={{ headerShown: false }} />
          <Stack.Screen name="message/[id]" options={{ headerShown: true }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
