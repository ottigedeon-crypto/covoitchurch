import { supabase } from "./supabase";

/**
 * Messagerie privée, à deux.
 *
 * Réutilise `chat_messages`, la même table que le fil public de l'église : un
 * message y est privé dès que `recipient_id` est renseigné plutôt que vide.
 * Rien de nouveau à créer côté schéma, juste des policies qui autorisent la
 * lecture à deux — voir `supabase/migrations/20260915_messagerie_privee.sql`.
 */
export type MessagePrive = {
  id: string;
  user_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
};

export type Conversation = {
  correspondant_id: string;
  dernier_message: string;
  dernier_le: string;
};

/** Une conversation par correspondant, triée par dernier message. */
export async function conversations(): Promise<Conversation[]> {
  const { data, error } = await supabase.rpc("conversations_privees");
  if (error || !Array.isArray(data)) return [];
  return data as Conversation[];
}

/** Tous les messages échangés avec une personne précise. */
export async function messagesAvec(autreId: string): Promise<MessagePrive[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, user_id, recipient_id, content, created_at")
    .or(
      `and(user_id.eq.${user.id},recipient_id.eq.${autreId}),and(user_id.eq.${autreId},recipient_id.eq.${user.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return [];
  return (data ?? []) as MessagePrive[];
}

export async function envoyerMessagePrive(destinataireId: string, contenu: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Non connecté") };

  return supabase.from("chat_messages").insert({
    user_id: user.id,
    recipient_id: destinataireId,
    content: contenu,
  });
}
