-- Option A de la phase 2 : rendre les presences actives lisibles par les membres
-- connectes, pour que l'app native n'ait plus besoin d'un serveur intermediaire.
--
-- Ce que ca expose : user_id, role, lat, lng des personnes NON expirees et NON prises
-- en charge. Exactement ce que le site web montre deja a tout membre connecte.
-- La difference est que le controle passe du serveur Cloudflare aux policies Postgres.
--
-- A NE PAS EXECUTER SANS VALIDATION -- cela modifie la base de production.

-- 1. Lecture des presences actives par tout membre connecte
create policy "Membres voient les presences actives"
  on public.presence
  for select
  to authenticated
  using (
    expires_at > now()
    and taken = false
  );

-- 2. Lecture des profils des membres (nom, photo, telephone)
--
--    NE PAS ajouter de policy select sur `profiles` : une policy RLS ne filtre pas
--    les colonnes, donc elle exposerait aussi l'email et les champs RGPD a tous les
--    membres. Le web, lui, ne selectionne qu'une liste de colonnes precise.
--
--    La vue `public_profiles` contient deja exactement les bonnes colonnes
--    (id, prenom, nom, nom affiche, avatar, telephone, adresse, coordonnees, vehicule).
--    Il suffit de la passer en security definer pour qu'elle cesse d'heriter des
--    policies de `profiles` -- l'exposition devient alors la vue, et rien d'autre.
alter view public.public_profiles set (security_invoker = false);
grant select on public.public_profiles to authenticated;
