-- =============================================================================
-- Trajets partagés — le cœur du nouveau modèle.
--
-- Jusqu'ici l'application organisait le covoiturage À L'INTÉRIEUR d'une église :
-- présences temporaires, points de rassemblement, tout cloisonné par church_id.
--
-- Le modèle devient celui d'une place de marché entre toutes les églises :
-- n'importe qui propose un trajet vers l'église où il se rend, n'importe qui
-- peut demander une place. Sans argent. Deux tables suffisent.
--
-- Différence essentielle avec l'existant : ces tables sont VOLONTAIREMENT
-- lisibles par tous les membres connectés. Un trajet que personne ne voit ne
-- sert à rien — c'est la raison d'être d'une place de marché.
-- =============================================================================

-- 1. L'offre du conducteur -----------------------------------------------------
create table if not exists public.trajets (
  id uuid primary key default gen_random_uuid(),
  conducteur_id uuid not null references auth.users (id) on delete cascade,

  -- Destination : l'église où le conducteur se rend.
  eglise_id uuid not null references public.churches (id) on delete cascade,

  depart_le timestamptz not null,
  depart_adresse text not null,
  depart_lat double precision,
  depart_lng double precision,

  places smallint not null default 3 check (places between 1 and 8),
  notes text,

  statut text not null default 'ouvert'
    check (statut in ('ouvert', 'complet', 'annule', 'termine')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trajets_depart_idx on public.trajets (depart_le);
create index if not exists trajets_eglise_idx on public.trajets (eglise_id);
create index if not exists trajets_conducteur_idx on public.trajets (conducteur_id);

alter table public.trajets enable row level security;

drop policy if exists "Trajets visibles par tous les membres" on public.trajets;
create policy "Trajets visibles par tous les membres"
  on public.trajets for select
  to authenticated
  using (true);

drop policy if exists "Le conducteur gère ses trajets" on public.trajets;
create policy "Le conducteur gère ses trajets"
  on public.trajets for all
  to authenticated
  using (auth.uid() = conducteur_id)
  with check (auth.uid() = conducteur_id);

drop trigger if exists trg_trajets_updated on public.trajets;
create trigger trg_trajets_updated
  before update on public.trajets
  for each row execute function public.update_updated_at_column();

-- 2. La demande du passager ----------------------------------------------------
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  trajet_id uuid not null references public.trajets (id) on delete cascade,
  passager_id uuid not null references auth.users (id) on delete cascade,

  -- Où récupérer le passager, s'il précise autre chose que son domicile.
  prise_en_charge text,

  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'acceptee', 'refusee', 'annulee')),

  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Une seule demande par personne et par trajet.
  unique (trajet_id, passager_id)
);

create index if not exists reservations_trajet_idx on public.reservations (trajet_id);

alter table public.reservations enable row level security;

-- Le passager voit les siennes ; le conducteur voit celles de ses trajets.
drop policy if exists "Réservations visibles par les deux parties" on public.reservations;
create policy "Réservations visibles par les deux parties"
  on public.reservations for select
  to authenticated
  using (
    auth.uid() = passager_id
    or exists (
      select 1 from public.trajets t
      where t.id = trajet_id and t.conducteur_id = auth.uid()
    )
  );

drop policy if exists "Chacun demande pour soi" on public.reservations;
create policy "Chacun demande pour soi"
  on public.reservations for insert
  to authenticated
  with check (auth.uid() = passager_id);

-- Le passager peut annuler, le conducteur peut accepter ou refuser.
drop policy if exists "Passager annule, conducteur décide" on public.reservations;
create policy "Passager annule, conducteur décide"
  on public.reservations for update
  to authenticated
  using (
    auth.uid() = passager_id
    or exists (
      select 1 from public.trajets t
      where t.id = trajet_id and t.conducteur_id = auth.uid()
    )
  );

drop policy if exists "Le passager retire sa demande" on public.reservations;
create policy "Le passager retire sa demande"
  on public.reservations for delete
  to authenticated
  using (auth.uid() = passager_id);

drop trigger if exists trg_reservations_updated on public.reservations;
create trigger trg_reservations_updated
  before update on public.reservations
  for each row execute function public.update_updated_at_column();

-- 3. Voir qui conduit ----------------------------------------------------------
-- NON RETENU : ouvrir public_profiles exposerait le telephone et l adresse de
-- chaque membre a tous les inscrits. Voir 20260904_trajets_complements.sql, qui
-- passe par deux fonctions etroites : noms_publics et contacts_trajet.

-- 4. Places restantes ----------------------------------------------------------
-- Calculée à la demande plutôt que stockée : pas de compteur à resynchroniser.
create or replace function public.places_restantes(trajet uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    (select t.places from public.trajets t where t.id = trajet)
    - (select count(*)::int from public.reservations r
       where r.trajet_id = trajet and r.statut = 'acceptee')
  );
$$;

grant execute on function public.places_restantes(uuid) to authenticated;
