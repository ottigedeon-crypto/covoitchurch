-- =============================================================================
-- Notifications déclenchées par la base, pour que le site ET les apps natives
-- préviennent les membres de la même façon.
--
-- Aujourd'hui les envois partent du code serveur du site (server functions
-- TanStack). Une écriture faite depuis l'app mobile passe donc à côté : le
-- pointage est enregistré mais personne n'est prévenu. En déplaçant le
-- déclenchement dans PostgreSQL, l'origine de l'écriture n'a plus d'importance.
--
-- À APPLIQUER APRÈS AVOIR DÉPLOYÉ LA FONCTION `notifier`, et après avoir
-- renseigné public.app_config (voir la fin du fichier).
-- =============================================================================

-- 1. Jetons d'appareil (Expo) ------------------------------------------------
-- push_subscriptions reste réservé au Web Push du site ; le natif a ses jetons.
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_token text not null unique,
  plateforme text not null check (plateforme in ('ios', 'android', 'web')),
  appareil text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists device_tokens_user_idx on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

drop policy if exists "Chacun gère ses jetons" on public.device_tokens;
create policy "Chacun gère ses jetons"
  on public.device_tokens for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_device_tokens_updated on public.device_tokens;
create trigger trg_device_tokens_updated
  before update on public.device_tokens
  for each row execute function public.update_updated_at_column();

-- 2. Configuration lue par les déclencheurs ----------------------------------
-- RLS activé SANS aucune policy : ni anon ni authenticated ne peuvent lire cette
-- table. Seules les fonctions SECURITY DEFINER ci-dessous y accèdent.
create table if not exists public.app_config (
  cle text primary key,
  valeur text not null
);

alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

-- 3. Appel de la fonction Edge depuis un déclencheur -------------------------
create extension if not exists pg_net with schema extensions;

create or replace function public.appeler_notifier(charge jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  url text;
  secret text;
begin
  select valeur into url from public.app_config where cle = 'notifier_url';
  select valeur into secret from public.app_config where cle = 'notifier_secret';

  -- Sans configuration, on ne fait rien : jamais d'échec d'écriture métier
  -- à cause d'une notification.
  if url is null or secret is null then
    return;
  end if;

  perform extensions.net.http_post(
    url := url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notifier-secret', secret
    ),
    body := charge,
    timeout_milliseconds := 5000
  );
exception
  when others then
    -- Une notification qui échoue ne doit jamais annuler un pointage.
    raise warning 'notifier: %', sqlerrm;
end;
$$;

-- 4. Pointage à un point de rassemblement ------------------------------------
create or replace function public.notifier_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nom_point text;
begin
  if new.expires_at <= now() then
    return new;
  end if;

  select name into nom_point from public.rally_zones where id = new.point_id;

  perform public.appeler_notifier(jsonb_build_object(
    'type', 'mp_checkin',
    'auteur', new.user_id,
    'point_id', new.point_id,
    'point_nom', coalesce(nom_point, 'un point de rassemblement'),
    'statut', new.status,
    'nombre', coalesce(new.group_size, 1)
  ));

  return new;
end;
$$;

drop trigger if exists trg_checkin_notifie on public.meeting_point_checkins;
create trigger trg_checkin_notifie
  after insert on public.meeting_point_checkins
  for each row execute function public.notifier_checkin();

-- 5. Présence sur la carte ---------------------------------------------------
create or replace function public.notifier_presence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Seulement quand quelqu'un devient visible : création, ou prolongation
  -- après expiration. Un simple rafraîchissement de position ne notifie pas.
  if new.expires_at <= now() or new.taken then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.expires_at > now()
     and old.role = new.role
     and not old.taken then
    return new;
  end if;

  perform public.appeler_notifier(jsonb_build_object(
    'type', 'presence_ready',
    'auteur', new.user_id,
    'role', new.role,
    'expire_le', new.expires_at
  ));

  return new;
end;
$$;

drop trigger if exists trg_presence_notifie on public.presence;
create trigger trg_presence_notifie
  after insert or update on public.presence
  for each row execute function public.notifier_presence();

-- =============================================================================
-- À exécuter une fois la fonction Edge déployée, en remplaçant les valeurs :
--
--   insert into public.app_config (cle, valeur) values
--     ('notifier_url', 'https://bvkumnzemmsgmafrmjhd.supabase.co/functions/v1/notifier'),
--     ('notifier_secret', '<un secret long et aléatoire, le même que côté fonction>')
--   on conflict (cle) do update set valeur = excluded.valeur;
--
-- Tant que ces deux lignes ne sont pas présentes, les déclencheurs ne font rien :
-- l'application continue de fonctionner normalement, simplement sans notification.
-- =============================================================================
