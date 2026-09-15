import { supabase } from "./supabase";

export type Trajet = {
  id: string;
  conducteur_id: string;
  eglise_id: string;
  depart_le: string;
  depart_adresse: string;
  depart_lat: number | null;
  depart_lng: number | null;
  places: number;
  notes: string | null;
  statut: "ouvert" | "complet" | "annule" | "termine";
  /** Vers l'église, ou au retour depuis l'église. */
  sens: "aller" | "retour";
};

export type Reservation = {
  id: string;
  trajet_id: string;
  passager_id: string;
  statut: "en_attente" | "acceptee" | "refusee" | "annulee";
  message: string | null;
  prise_en_charge: string | null;
};

export type EgliseBreve = { id: string; name: string; city: string | null };

/** Trajets à venir, toutes églises confondues : c'est le principe de la place de marché. */
export async function trajetsAVenir(egliseId?: string | null, sens: "aller" | "retour" = "aller") {
  let q = supabase
    .from("trajets")
    .select("*")
    .eq("sens", sens)
    .eq("statut", "ouvert")
    .gt("depart_le", new Date().toISOString())
    .order("depart_le", { ascending: true })
    .limit(100);

  if (egliseId) q = q.eq("eglise_id", egliseId);

  const { data, error } = await q;
  return { trajets: (data ?? []) as Trajet[], error };
}

/** Les trajets que je propose, y compris ceux déjà passés. */
export async function mesTrajets(userId: string) {
  const { data, error } = await supabase
    .from("trajets")
    .select("*")
    .eq("conducteur_id", userId)
    .order("depart_le", { ascending: false })
    .limit(50);
  return { trajets: (data ?? []) as Trajet[], error };
}

/**
 * Réservations liées à une liste de trajets. Les policies font le tri : on ne
 * reçoit que les siennes, ou celles des trajets qu'on conduit.
 */
export async function reservationsDe(trajetIds: string[]) {
  if (trajetIds.length === 0) return { reservations: [] as Reservation[], error: null };
  const { data, error } = await supabase
    .from("reservations")
    .select("id, trajet_id, passager_id, statut, message, prise_en_charge")
    .in("trajet_id", trajetIds);
  return { reservations: (data ?? []) as Reservation[], error };
}

export async function eglisesActives() {
  const { data } = await supabase
    .from("churches")
    .select("id, name, city")
    .eq("active", true)
    .order("city");
  return (data ?? []) as EgliseBreve[];
}

/** Places encore libres, calculées côté base pour rester justes. */
export async function placesRestantes(trajetId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("places_restantes", { trajet: trajetId });
  if (error) return null;
  return typeof data === "number" ? data : null;
}

export function formatDepart(iso: string): string {
  const d = new Date(iso);
  const jour = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return jour + " à " + heure;
}

export const LIBELLE_STATUT: Record<Reservation["statut"], string> = {
  en_attente: "En attente",
  acceptee: "Acceptée",
  refusee: "Refusée",
  annulee: "Annulée",
};

export type NomPublic = { id: string; nom: string; avatar: string | null };

/**
 * Noms affichés des conducteurs et passagers.
 *
 * Passe par une fonction dédiée plutôt que par une ouverture générale de la
 * table des profils : elle ne renvoie que le nom et l'avatar. Ni email, ni
 * téléphone, ni adresse — une place de marché a besoin de savoir qui conduit,
 * pas de tout savoir sur lui.
 */
export async function nomsPublics(ids: string[]): Promise<Record<string, NomPublic>> {
  const uniques = Array.from(new Set(ids)).filter(Boolean);
  if (uniques.length === 0) return {};
  const { data, error } = await supabase.rpc("noms_publics", { ids: uniques });
  if (error || !Array.isArray(data)) return {};
  const table: Record<string, NomPublic> = {};
  for (const n of data as NomPublic[]) table[n.id] = n;
  return table;
}

/** Places encore libres pour toute une liste, en un seul appel. */
export async function placesRestantesLot(ids: string[]): Promise<Record<string, number>> {
  const uniques = Array.from(new Set(ids)).filter(Boolean);
  if (uniques.length === 0) return {};
  const { data, error } = await supabase.rpc("places_restantes_lot", { ids: uniques });
  if (error || !Array.isArray(data)) return {};
  const table: Record<string, number> = {};
  for (const l of data as { trajet_id: string; restantes: number }[]) {
    table[l.trajet_id] = l.restantes;
  }
  return table;
}

export type ContactTrajet = {
  id: string;
  nom: string;
  telephone: string | null;
  role: "conducteur" | "passager";
};

/**
 * Coordonnées échangées une fois la place acceptée, et seulement entre les deux
 * personnes concernées. Tant que rien n'est accepté, la liste revient vide.
 */
export async function contactsTrajet(trajetId: string): Promise<ContactTrajet[]> {
  const { data, error } = await supabase.rpc("contacts_trajet", { trajet: trajetId });
  if (error || !Array.isArray(data)) return [];
  return data as ContactTrajet[];
}

/** Présences actuellement visibles sur la carte, pour une église donnée. */
export async function presencesActives(egliseId?: string | null) {
  const { data, error } = await supabase.rpc("presences_actives", {
    eglise: egliseId ?? null,
  });
  if (error || !Array.isArray(data)) return [];
  return data as {
    user_id: string;
    role: "driver" | "passenger";
    lat: number;
    lng: number;
    expires_at: string;
  }[];
}

export type CompteurPoint = {
  point_id: string;
  total: number;
  deja_la: number;
  dans_5: number;
  plus_tard: number;
};

/** Combien de personnes attendent à chaque point — un compteur, pas une liste. */
export async function compteursPoints(ids: string[]): Promise<Record<string, CompteurPoint>> {
  const uniques = Array.from(new Set(ids)).filter(Boolean);
  if (uniques.length === 0) return {};
  const { data, error } = await supabase.rpc("compteurs_points", { ids: uniques });
  if (error || !Array.isArray(data)) return {};
  const table: Record<string, CompteurPoint> = {};
  for (const c of data as CompteurPoint[]) table[c.point_id] = c;
  return table;
}
