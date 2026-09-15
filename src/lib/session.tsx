import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Profile } from "./supabase";
import { reprendreChoix } from "./pending-role";

export type Eglise = {
  id: string;
  name: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
};

type Ctx = {
  session: Session | null;
  profile: Profile | null;
  eglise: Eglise | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [eglise, setEglise] = useState<Eglise | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    // Role choisi a l inscription mais pas encore ecrit, faute de session a ce moment-la.
    const choix = await reprendreChoix();
    if (choix) {
      const conduit = choix.role === "driver";
      await supabase
        .from("profiles")
        .update({
          has_vehicle: conduit,
          available_for_carpool: conduit,
          ...(choix.churchId ? { church_id: choix.churchId } : {}),
        })
        .eq("id", userId);
    }

    const { data } = await supabase
      .from("profiles")
      .select(
        "id, display_name, first_name, last_name, avatar_url, phone, home_address, home_lat, home_lng, has_vehicle, available_for_carpool, church_id",
      )
      .eq("id", userId)
      .maybeSingle();
    const fiche = (data as Profile) ?? null;
    setProfile(fiche);

    if (fiche?.church_id) {
      const { data: eg } = await supabase
        .from("churches")
        .select("id, name, city, lat, lng")
        .eq("id", fiche.church_id)
        .maybeSingle();
      setEglise((eg as Eglise) ?? null);
    } else {
      setEglise(null);
    }

    // user_roles est lisible pour sa propre ligne : l'app sait si tu es admin
    // sans passer par le serveur.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(Boolean(roles));
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (next) {
        await loadProfile(next.user.id);
      } else {
        setProfile(null);
        setEglise(null);
        setIsAdmin(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider
      value={{
        session,
        profile,
        eglise,
        isAdmin,
        loading,
        refreshProfile: async () => {
          if (session) await loadProfile(session.user.id);
        },
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession doit etre utilise dans SessionProvider");
  return ctx;
}
