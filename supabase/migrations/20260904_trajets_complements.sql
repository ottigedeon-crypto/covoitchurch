-- =============================================================================
-- Compléments au modèle des trajets partagés. Appliqué en production.
--
-- Trois sujets : le sens du trajet, ce que les membres voient les uns des
-- autres, et l'ajout d'une église à l'inscription.
-- =============================================================================

-- 1. Aller ou retour -----------------------------------------------------------
-- Le retour reposait sur les présences temporaires, illisibles chez les autres à
-- cause des policies : l'écran restait vide. Un retour devient un trajet comme
-- un autre, qui part de l'église au lieu d'y aller. Même table, mêmes demandes,
-- mêmes notifications.
alter table public.trajets
  add column if not exists sens text not null default 'aller'
  check (sens in ('aller', 'retour'));

create index if not exists trajets_sens_idx on public.trajets (sens, depart_le);

-- 2. Ce que les membres voient les uns des autres -------------------------------
-- Plutôt que d'ouvrir la vue public_profiles à tous — ce qui exposerait le
-- téléphone et l'adresse de chacun — deux fonctions étroites.

-- Minuscules sans accents, sans dépendre de l'extension unaccent.
create or replace function public.unaccent_lower(t text)
returns text language sql immutable as $$
  select lower(translate(coalesce(t, ''),
    'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñŸÿ',
    'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYy'));
$$;
grant execute on function public.unaccent_lower(text) to authenticated;

-- Nom affiché et avatar. Ni email, ni téléphone, ni adresse.
create or replace function public.noms_publics(ids uuid[])
returns table (id uuid, nom text, avatar text)
language sql stable security definer set search_path = public as $$
  select p.id,
         coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.first_name), ''), 'Un membre'),
         p.avatar_url
  from public.profiles p
  where p.id = any(ids);
$$;
grant execute on function public.noms_publics(uuid[]) to authenticated;

-- Le téléphone n'apparaît qu'une fois la place acceptée, et seulement entre les
-- deux personnes concernées.
create or replace function public.contacts_trajet(trajet uuid)
returns table (id uuid, nom text, telephone text, role text)
language plpgsql stable security definer set search_path = public as $$
begin
  if exists (select 1 from public.trajets t where t.id = trajet and t.conducteur_id = auth.uid()) then
    return query
      select p.id,
             coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.first_name), ''), 'Un membre'),
             p.phone, 'passager'::text
      from public.reservations r
      join public.profiles p on p.id = r.passager_id
      where r.trajet_id = trajet and r.statut = 'acceptee';
  elsif exists (
    select 1 from public.reservations r
    where r.trajet_id = trajet and r.passager_id = auth.uid() and r.statut = 'acceptee'
  ) then
    return query
      select p.id,
             coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.first_name), ''), 'Un membre'),
             p.phone, 'conducteur'::text
      from public.trajets t
      join public.profiles p on p.id = t.conducteur_id
      where t.id = trajet;
  end if;
end;
$$;
grant execute on function public.contacts_trajet(uuid) to authenticated;

-- Places restantes pour toute une liste, en un seul appel.
create or replace function public.places_restantes_lot(ids uuid[])
returns table (trajet_id uuid, restantes integer)
language sql stable security definer set search_path = public as $$
  select t.id,
         greatest(0, t.places - (
           select count(*)::int from public.reservations r
           where r.trajet_id = t.id and r.statut = 'acceptee'
         ))
  from public.trajets t
  where t.id = any(ids);
$$;
grant execute on function public.places_restantes_lot(uuid[]) to authenticated;

-- 3. Ajouter son église à l'inscription -----------------------------------------
-- `churches` reste en écriture réservée aux admins, et c'est bien. Mais bloquer
-- une inscription faute d'église ferait perdre la personne. Cette fonction ne
-- permet qu'une chose : créer une église si aucune du même nom et de la même
-- ville n'existe. Elle renvoie l'identifiant, existant ou nouveau.
create or replace function public.proposer_eglise(nom text, ville text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  nom_propre text := btrim(nom);
  ville_propre text := btrim(ville);
  trouve uuid;
  nouveau uuid;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  if length(nom_propre) < 3 or length(ville_propre) < 2 then
    raise exception 'Nom ou ville trop court';
  end if;

  select c.id into trouve
  from public.churches c
  where public.unaccent_lower(c.name) = public.unaccent_lower(nom_propre)
    and public.unaccent_lower(coalesce(c.city, '')) = public.unaccent_lower(ville_propre)
  limit 1;

  if trouve is not null then return trouve; end if;

  insert into public.churches (name, city, slug, active)
  values (
    nom_propre, ville_propre,
    left(regexp_replace(public.unaccent_lower(ville_propre || '-' || nom_propre), '[^a-z0-9]+', '-', 'g'), 60),
    true
  )
  returning id into nouveau;

  return nouveau;
end;
$$;
grant execute on function public.proposer_eglise(text, text) to authenticated;

-- 4. Notifications liées aux trajets --------------------------------------------
-- Inertes tant que public.app_config n'est pas renseignée.
create or replace function public.notifier_nouveau_trajet()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.statut <> 'ouvert' or new.depart_le <= now() then return new; end if;
  perform public.appeler_notifier(jsonb_build_object(
    'type', 'nouveau_trajet',
    'auteur', new.conducteur_id,
    'eglise_id', new.eglise_id,
    'places', new.places,
    'depart_le', new.depart_le,
    'depart_adresse', new.depart_adresse
  ));
  return new;
end;
$$;
drop trigger if exists trg_trajet_notifie on public.trajets;
create trigger trg_trajet_notifie after insert on public.trajets
  for each row execute function public.notifier_nouveau_trajet();

create or replace function public.notifier_reservation()
returns trigger language plpgsql security definer set search_path = public as $$
declare conducteur uuid;
begin
  if new.statut <> 'acceptee' or old.statut = 'acceptee' then return new; end if;
  select t.conducteur_id into conducteur from public.trajets t where t.id = new.trajet_id;
  perform public.appeler_notifier(jsonb_build_object(
    'type', 'reservation_acceptee',
    'auteur', conducteur,
    'destinataire', new.passager_id
  ));
  return new;
end;
$$;
drop trigger if exists trg_reservation_notifie on public.reservations;
create trigger trg_reservation_notifie after update on public.reservations
  for each row execute function public.notifier_reservation();
