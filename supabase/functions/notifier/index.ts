/**
 * Fonction Edge `notifier`.
 *
 * Appelée par les déclencheurs PostgreSQL (voir la migration
 * 20260904_notifications_mobiles.sql) quand quelqu'un pointe à un point de
 * rassemblement ou devient visible sur la carte. Elle choisit les destinataires,
 * puis pousse vers les appareils natifs (Expo Push).
 *
 * Elle tourne avec la clé de service : c'est le seul endroit d'où l'on peut lire
 * qui sont les autres membres, les policies RLS l'interdisant côté client.
 *
 * Secrets attendus :
 *   NOTIFIER_SECRET   partagé avec public.app_config.notifier_secret
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   fournis par la plateforme
 *
 * Déploiement :  supabase functions deploy notifier --no-verify-jwt
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Charge = {
  type:
    | "mp_checkin"
    | "presence_ready"
    | "nouveau_trajet"
    | "reservation_acceptee"
    | "message_prive";
  auteur: string;
  role?: "driver" | "passenger";
  point_nom?: string;
  statut?: "here" | "eta_5" | "eta_10plus";
  nombre?: number;
  // Trajets partages
  eglise_id?: string;
  places?: number;
  depart_le?: string;
  depart_adresse?: string;
  destinataire?: string;
  // Messagerie privee
  apercu?: string;
};

const LIBELLE_STATUT: Record<string, string> = {
  here: "est déjà sur place",
  eta_5: "arrive dans 5 minutes",
  eta_10plus: "arrive dans plus de 10 minutes",
};

const EXPO_PUSH = "https://exp.host/--/api/v2/push/send";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erreur: "méthode non permise" }, 405);

  const attendu = Deno.env.get("NOTIFIER_SECRET");
  if (!attendu || req.headers.get("x-notifier-secret") !== attendu) {
    return json({ erreur: "non autorisé" }, 401);
  }

  const charge = (await req.json()) as Charge;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // --- Qui est l'auteur, et dans quelle église ? ----------------------------
  const { data: auteur } = await supabase
    .from("profiles")
    .select("id, display_name, first_name, church_id")
    .eq("id", charge.auteur)
    .maybeSingle();

  const nomAuteur = auteur?.first_name || auteur?.display_name || "Un membre";

  // --- Qui prévenir ? ------------------------------------------------------
  // Un passager qui se signale intéresse les conducteurs, et inversement.
  const destinataires = new Set<string>();

  // Une place acceptee, ou un message prive, ne concerne qu une personne.
  if (
    (charge.type === "reservation_acceptee" || charge.type === "message_prive") &&
    charge.destinataire
  ) {
    destinataires.add(charge.destinataire);
  }

  // Un trajet propose interesse les membres de l eglise de destination.
  else if (charge.type === "nouveau_trajet" && charge.eglise_id) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("church_id", charge.eglise_id);
    for (const p of data ?? []) destinataires.add(p.id as string);
  }

  const cherchesDesConducteurs =
    charge.type === "mp_checkin" || charge.role === "passenger";

  if (destinataires.size === 0 && cherchesDesConducteurs) {
    let q = supabase.from("profiles").select("id").eq("has_vehicle", true);
    if (auteur?.church_id) q = q.eq("church_id", auteur.church_id);
    const { data } = await q;
    for (const p of data ?? []) destinataires.add(p.id as string);
  } else if (destinataires.size === 0) {
    // Un conducteur devient visible : on prévient les passagers actuellement
    // visibles, ceux qui cherchent une place maintenant.
    const { data } = await supabase
      .from("presence")
      .select("user_id")
      .eq("role", "passenger")
      .eq("taken", false)
      .gt("expires_at", new Date().toISOString());
    for (const p of data ?? []) destinataires.add(p.user_id as string);
  }

  destinataires.delete(charge.auteur);
  if (destinataires.size === 0) return json({ envoyes: 0, raison: "aucun destinataire" });

  // --- Message -------------------------------------------------------------
  let titre: string;
  let corps: string;

  if (charge.type === "nouveau_trajet") {
    const quand = charge.depart_le
      ? new Date(charge.depart_le).toLocaleString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "bientot";
    const n = charge.places ?? 1;
    titre = nomAuteur + " propose " + n + " place" + (n > 1 ? "s" : "");
    corps = quand + (charge.depart_adresse ? " — depart de " + charge.depart_adresse : "");
  } else if (charge.type === "reservation_acceptee") {
    titre = nomAuteur + " a accepte ta demande";
    corps = "Ta place est confirmee. Retrouve ses coordonnees dans l application.";
  } else if (charge.type === "mp_checkin") {
    const combien = charge.nombre && charge.nombre > 1 ? ` (${charge.nombre} personnes)` : "";
    titre = `${nomAuteur} attend à ${charge.point_nom}`;
    corps = `Il ${LIBELLE_STATUT[charge.statut ?? "here"]}${combien}. Peux-tu passer le prendre ?`;
  } else if (charge.type === "message_prive") {
    titre = nomAuteur;
    corps = charge.apercu ?? "Nouveau message";
  } else if (charge.role === "driver") {
    titre = `${nomAuteur} conduit et peut prendre du monde`;
    corps = "Ouvre la carte pour voir où il se trouve.";
  } else {
    titre = `${nomAuteur} cherche une place`;
    corps = "Il est visible sur la carte en ce moment.";
  }

  // --- Envoi aux appareils natifs -----------------------------------------
  const { data: jetons } = await supabase
    .from("device_tokens")
    .select("expo_token")
    .in("user_id", [...destinataires]);

  const tokens = (jetons ?? []).map((j) => j.expo_token as string);
  if (tokens.length === 0) return json({ envoyes: 0, raison: "aucun appareil enregistré" });

  // L'API Expo accepte 100 messages par appel.
  let envoyes = 0;
  const echecs: unknown[] = [];

  for (let i = 0; i < tokens.length; i += 100) {
    const lot = tokens.slice(i, i + 100).map((to) => ({
      to,
      sound: "default",
      title: titre,
      body: corps,
      data: {
        type: charge.type,
        url:
          charge.type === "mp_checkin"
            ? "/points"
            : charge.type === "nouveau_trajet" || charge.type === "reservation_acceptee"
              ? "/trajets"
              : charge.type === "message_prive"
                ? "/message/" + charge.auteur
                : "/carte",
      },
      channelId: "default",
    }));

    const res = await fetch(EXPO_PUSH, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(lot),
    });

    if (!res.ok) {
      echecs.push(await res.text());
      continue;
    }

    const resultat = await res.json();
    const tickets = resultat?.data ?? [];
    envoyes += tickets.filter((t: { status?: string }) => t.status === "ok").length;

    // Un jeton refusé ne vaut plus rien : on le retire pour ne pas réessayer.
    for (let k = 0; k < tickets.length; k++) {
      const t = tickets[k];
      if (t?.status === "error" && t?.details?.error === "DeviceNotRegistered") {
        await supabase.from("device_tokens").delete().eq("expo_token", lot[k].to);
      }
    }
  }

  return json({ envoyes, destinataires: destinataires.size, echecs });
});
