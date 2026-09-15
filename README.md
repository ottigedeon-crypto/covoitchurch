# Covoit'Church Mobile

Application native Expo (SDK 57) branchée sur le **même backend Supabase** que la
PWA covoitchurch.com. Mêmes comptes, mêmes tables, aucune donnée dupliquée.

## Lancer

Sur téléphone, avec Expo Go, l'appareil et le PC sur le même réseau :

    npm start        # le QR code s'affiche dans le terminal

Dans un navigateur :

    npm run web      # http://localhost:8082

Si Metro s'arrête avec « heap out of memory », vérifie l'espace libre sur `C:` —
c'est le fichier d'échange qui ne peut plus grandir, pas la limite de tas.

## Le modèle

L'application était d'abord un outil **interne à une église** : présences
temporaires sur une carte, points de rassemblement, tout cloisonné.

Elle est devenue une **place de marché entre toutes les églises**, sur le principe
de BlaBlaCar mais sans argent : n'importe qui propose un trajet vers l'église où
il se rend, n'importe qui demande une place.

### Trajets partagés — le cœur

Table `trajets` : conducteur, église de destination, date et heure, adresse de
départ géocodée, nombre de places, note libre, statut. Table `reservations` :
la demande d'un passager, avec son statut.

Le cloisonnement s'inverse volontairement ici : **les trajets sont lisibles par
tous les membres connectés, toutes églises confondues**. Un trajet que personne
ne voit ne sert à rien. Seul son conducteur peut le modifier ; les réservations
ne sont visibles que du passager et du conducteur concernés.

Le téléphone n'apparaît **qu'une fois la place acceptée**, et seulement entre les
deux personnes — c'est la fonction `contacts_trajet`. Les noms affichés passent
par `noms_publics`, qui ne renvoie que le nom et l'avatar : ni email, ni
téléphone, ni adresse.

### Églises

`churches` contient les églises, créées par un administrateur ou proposées par un
membre à l'inscription via `proposer_eglise`, qui rapproche d'abord les noms
existants pour éviter les doublons. Un compte sans église est redirigé vers
l'écran de rattachement avant d'entrer dans l'application.

Les points de rassemblement et les événements restent, eux, cloisonnés par
église — sauf les événements créés « pour toutes les églises », qui portent un
`church_id` vide.

### Écrans hérités

Carte de présence temporaire, points de rassemblement, écran de retour, chat,
historique, guide. Ils fonctionnent toujours et se recoupent en partie avec les
trajets partagés : c'est le chantier de simplification à venir.

## Notifications

Les envois partent de **la base de données**, pas du code applicatif : des
déclencheurs PostgreSQL appellent la fonction Edge `notifier`. Ainsi, que
l'écriture vienne du site, d'un iPhone ou d'un Android, tout le monde est prévenu
de la même façon.

Déclencheurs en place : nouveau trajet proposé (prévient les membres de l'église
de destination), réservation acceptée (prévient le passager), pointage à un point
de rassemblement, présence sur la carte.

**Rien ne part encore.** Il manque deux choses : déployer la fonction
(`supabase functions deploy notifier --no-verify-jwt`) et renseigner
`public.app_config` avec `notifier_url` et `notifier_secret`. Tant que cette table
est vide, les déclencheurs ne font rien — l'application fonctionne normalement,
simplement sans notification.

Côté appareil, Expo ne délivre un jeton que si le projet a un identifiant EAS.
Sans lui, l'enregistrement échoue proprement et l'écrit dans la console.

## Connexion

Email et mot de passe, plus **Continuer avec Google** par flux navigateur :
l'application ouvre un onglet, Supabase mène l'échange, l'application récupère le
code au retour. Aucun identifiant OAuth natif à créer, aucun compte Apple requis.

Deux réglages restent à faire dans Supabase : renseigner le Client ID et le
Client Secret du fournisseur Google, et autoriser les URLs de retour
`covoitchurch://**` et `exp://**`.

## Repères de code

| Fichier | Rôle |
|---|---|
| `src/lib/trajets.ts` | Requêtes et types de la place de marché |
| `src/lib/eglise.ts` | Cloisonnement par église |
| `src/lib/location.ts` | Position, mobile et navigateur |
| `src/lib/push.ts` | Enregistrement du jeton de notification |
| `src/lib/arrets.ts` | 499 arrêts de bus et tram (source OpenStreetMap) |
| `src/components/ChampDateHeure.tsx` | Choix de date sans clavier |
| `src/components/IntroVoiture.tsx` | Animation d'ouverture |
| `src/components/SceneRoute.tsx` | Décor vectoriel de l'animation |
| `supabase/migrations/` | Schéma, appliqué en production |
| `supabase/functions/notifier/` | Envoi des notifications, **non déployé** |

## Reste à faire

- Déployer la fonction `notifier` et renseigner `app_config`
- Identifiants Google et URLs de retour dans Supabase
- Compte Apple Developer et Google Play, puis `eas init` (phase 0 du plan)
- Sign in with Apple, obligatoire dès lors que Google est proposé
- Simplifier : décider quels écrans hérités gardent leur place
