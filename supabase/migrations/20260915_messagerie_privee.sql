-- =============================================================================
-- Messagerie privée, à deux.
--
-- Pas de nouvelle table : `chat_messages` a déjà une colonne `recipient_id`,
-- que l'app mobile utilise en lecture pour isoler le fil public de l'église
-- (`recipient_id is null`). Cette migration ajoute ce qui manquait pour s'en
-- servir aussi côté privé : les policies qui autorisent la lecture et
-- l'écriture d'un message entre deux personnes précises, un index pour
-- retrouver une conversation vite, une fonction qui liste les conversations
-- d'un utilisateur, et une notification quand un message privé arrive.
--
-- Hypothèse posée ici, à vérifier si l'app renvoie une erreur de policy à la
-- première utilisation : `chat_messages` a bien les colonnes `id`, `user_id`,
-- `recipient_id` (uuid, nullable), `content`, `created_at`. Elles sont déjà
-- lues par l'app mobile (`src/app/(tabs)/chat.tsx`) donc elles existent ;
-- cette migration ne fait que poser les bonnes règles d'accès dessus.
-- =============================================================================

alter table public.chat_messages enable row level security;

drop policy if exists "Lire le fil public ou ses messages privés" on public.chat_messages;
create policy "Lire le fil public ou ses messages privés"
  on public.chat_messages for select
  to authenticated
  using (
    recipient_id is null
    or auth.uid() = user_id
    or auth.uid() = recipient_id
  );

drop policy if exists "Écrire un message, public ou privé" on public.chat_messages;
create policy "Écrire un message, public ou privé"
  on public.chat_messages for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Retrouver une conversation entre deux personnes, vite, peu importe qui a
-- écrit en premier.
create index if not exists chat_messages_conversation_idx
  on public.chat_messages (least(user_id, recipient_id), greatest(user_id, recipient_id), created_at)
  where recipient_id is not null;

-- Une ligne par correspondant, avec son dernier message — pour l'écran
-- "Messages". Pas de compteur de non-lus pour l'instant : ça demanderait une
-- colonne de plus (lu_le), volontairement laissée de côté pour ne toucher
-- qu'aux policies aujourd'hui.
create or replace function public.conversations_privees()
returns table (correspondant_id uuid, dernier_message text, dernier_le timestamptz)
language sql stable security definer set search_path = public as $$
  with mine as (
    select
      case when user_id = auth.uid() then recipient_id else user_id end as correspondant_id,
      content,
      created_at
    from public.chat_messages
    where recipient_id is not null
      and (user_id = auth.uid() or recipient_id = auth.uid())
  )
  select distinct on (correspondant_id) correspondant_id, content, created_at
  from mine
  order by correspondant_id, created_at desc;
$$;

grant execute on function public.conversations_privees() to authenticated;

-- Notification à l'arrivée d'un message privé — sans effet tant que
-- public.app_config n'est pas renseigné, comme les autres déclencheurs de
-- 20260904_notifications_mobiles.sql, dont dépend cette fonction.
create or replace function public.notifier_message_prive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.recipient_id is null then
    return new;
  end if;

  perform public.appeler_notifier(jsonb_build_object(
    'type', 'message_prive',
    'auteur', new.user_id,
    'destinataire', new.recipient_id,
    'apercu', left(new.content, 140)
  ));

  return new;
end;
$$;

drop trigger if exists trg_message_prive_notifie on public.chat_messages;
create trigger trg_message_prive_notifie
  after insert on public.chat_messages
  for each row execute function public.notifier_message_prive();
