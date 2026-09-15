import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Variables manquantes : EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY doivent etre definies dans .env",
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Flux PKCE : le retour OAuth porte un code, echange ensuite contre une session.
    flowType: "pkce",
  },
});

export type Profile = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  home_address: string | null;
  home_lat: number | null;
  home_lng: number | null;
  has_vehicle: boolean | null;
  available_for_carpool: boolean | null;
  church_id: string | null;
};

export type PresenceRow = {
  user_id: string;
  role: "driver" | "passenger";
  lat: number;
  lng: number;
  expires_at: string;
  taken: boolean;
};
