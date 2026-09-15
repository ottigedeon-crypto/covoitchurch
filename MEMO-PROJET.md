# Mémo du projet — Covoit'Church Mobile

> Ce fichier résume tout ce qui a été construit, l'état réel du projet, et les
> étapes qui restent avant la sortie en store. Il est mis à jour à chaque
> session de travail avec Claude — à lire en premier avant de reprendre le
> développement.

**Dernière mise à jour : 15 septembre 2026 (session 2)**
**Emplacement du projet :** `D:\Projets APP\Projet 2\covoitchurch-mobile`
**Dépôt git :** initialisé, premier commit fait, relié à
[github.com/ottigedeon-crypto/covoitchurch](https://github.com/ottigedeon-crypto/covoitchurch)
(dépôt public).

**Autres documents à lire à côté de celui-ci :**
- `Covoit-Church-Guide-Complet.docx` — le fonctionnement de l'application
  expliqué en langage très simple, écran par écran.
- `Covoit-Church-Reste-A-Faire.docx` — la version courte, en liste, de ce qui
  reste à faire (reprend la section 7 ci-dessous).

---

## 1. Le concept

Covoit'Church est devenu une **place de marché de covoiturage entre églises**,
sur le principe de BlaBlaCar mais sans argent : n'importe quel membre inscrit
propose un trajet vers l'église où il se rend (ou en repart), et n'importe quel
autre membre demande une place.

L'application native (Expo/React Native) partage **exactement le même backend
Supabase** que la PWA covoitchurch.com : mêmes comptes, mêmes tables, aucune
donnée dupliquée. Un utilisateur peut basculer entre le site et le téléphone
sans rien reconfigurer.

### Parcours utilisateur cible (celui que tu as décrit)

1. **Inscription** : Google en un clic, ou formulaire (prénom, nom, email,
   téléphone, mot de passe) avec acceptation de la politique de confidentialité
   (RGPD). À l'inscription, on **recherche le nom de son église** dans une
   liste (avec recherche par nom/ville), ou on l'ajoute si elle n'existe pas
   encore.
2. **Connexion** : le compte n'est utile qu'une fois rattaché à une église —
   sinon un écran dédié le demande avant de laisser entrer dans l'app.
3. **Une fois dans l'église choisie** : on voit les événements de *cette*
   église (organisés par son administrateur), les points de rassemblement de
   *cette* église, et les trajets vers *cette* église (ou toutes, au choix).
4. **Carte "sur le moment"** : on se déclare visible comme conducteur ou
   passager pour une durée choisie (15/30/45/60 min) ; on voit les autres
   membres visibles autour de soi.
5. **Trajets partagés (aller/retour)** : un conducteur publie un trajet (vers
   l'église, ou en repartant de l'église) avec adresse de départ, date/heure,
   nombre de places. Un passager demande une place ; le conducteur accepte ou
   refuse. **Le téléphone n'apparaît qu'une fois la place acceptée**, et
   seulement entre les deux personnes concernées.
6. **Contact une fois la place acceptée** : bouton **Appeler** (numéro
   direct) et bouton **Itinéraire** (ouvre l'app Plans du téléphone avec la
   direction à suivre) — ajoutés aujourd'hui, voir section 4.

---

## 2. Fonctionnalités déjà construites (avant cette session)

| Domaine | Écran(s) | Détail |
|---|---|---|
| Connexion | `login.tsx` | Email/mot de passe + "Continuer avec Google" (OAuth par navigateur, aucun SDK natif Google requis) |
| Inscription | `inscription.tsx` | Prénom/nom/email/téléphone/mot de passe, choix du rôle (conducteur/passager), choix de l'église, lien RGPD |
| Recherche/ajout d'église | `components/ChoixEgliseListe.tsx` | Recherche par nom/ville insensible aux accents ; création via `proposer_eglise` (rapproche les doublons) |
| Rattachement obligatoire | `choix-eglise.tsx` | Bloque l'entrée dans l'app tant qu'aucune église n'est choisie |
| Trajets partagés | `trajets.tsx`, `trajet-nouveau.tsx` | Publier un trajet (aller/retour), demander une place, accepter/refuser, annuler ; filtrage "mon église" ou "toutes les églises" ; distance depuis le domicile |
| Contact post-acceptation | `lib/trajets.ts` (`contacts_trajet`) | Le téléphone n'est révélé qu'aux deux personnes concernées, jamais avant |
| Carte de présence | `carte.tsx`, `components/PresenceMap.tsx` | Déclaration "Je suis là" en tant que conducteur/passager pour une durée choisie, visible par l'église |
| Points de rassemblement | `points.tsx`, `admin-points.tsx` | Pointage "déjà là / ~5 min / +10 min", compteur de personnes (jamais leur identité) |
| Événements | `evenements.tsx`, `admin-evenements.tsx` | Créés par un admin, par église ou "toutes les églises" ; réponse passager/conducteur + "je suis prêt" |
| Chat | `chat.tsx` | Fil public par église |
| Messagerie privée | `messages.tsx`, `message/[id].tsx`, `lib/messages.ts` | Conversation à deux, ajoutée en session 2 (voir section 4bis) |
| Administration | `admin.tsx`, `admin-eglises.tsx`, `admin-points.tsx`, `admin-evenements.tsx` | Un compte admin par église gère ses événements, ses points, ses infos |
| Profil | `profil.tsx` | Nom, téléphone, adresse, véhicule ; suppression de compte (`supprimer-compte.tsx`) |
| Confidentialité (RGPD) | `confidentialite.tsx` + `docs/confidentialite.html` | Politique complète, droits, contact, conforme RGPD |
| Notifications | `supabase/functions/notifier`, `lib/push.ts` | Déclenchées côté base (triggers PostgreSQL), pas depuis le code : marche pareil que ce soit le site ou le téléphone qui écrit |
| Écrans hérités | `historique.tsx`, `guide.tsx`, `retour.tsx` | `retour.tsx` redirige maintenant vers `trajets.tsx?sens=retour` (fusionné avec les trajets partagés) |

---

## 3. Vérifications faites aujourd'hui

- **TypeScript** : `npx tsc --noEmit` → aucune erreur, avant et après les
  modifications.
- **`expo-doctor`** : 3 problèmes trouvés, tous corrigés (voir section 4).
  Résultat final : **21/21 checks OK**.
- **Revue de code complète** de l'authentification, du choix d'église, des
  trajets, de la carte, des points de rassemblement, des événements, du chat,
  du menu et de la navigation (gardes de session/église cohérentes partout).

---

## 4. Corrections apportées aujourd'hui

1. **`assets/icon.png` était en réalité un fichier JPEG mal nommé.**
   `expo-doctor` l'a détecté — cela aurait pu faire planter la génération de
   l'icône Android/iOS au moment du build. Reconverti en vrai PNG (512×512).
   L'original est conservé sous `assets/icon.original.jpg.bak` par précaution.
2. **Dépendance manquante `expo-font`**, requise par les icônes
   (`@expo/vector-icons`). Sans elle, l'app pouvait planter en dehors d'Expo
   Go (builds réels). Installée.
3. **12 paquets Expo légèrement désynchronisés** du SDK 57 (patchs mineurs
   uniquement). Réalignés avec `npx expo install`.
4. **Bouton "Itinéraire" (ouvrir Maps) ajouté** — c'est ce qui manquait par
   rapport à ta description ("contacter dans l'app, appeler, ou ouvrir le
   chemin sur Maps"). Nouvelle fonction `ouvrirItineraire()` dans
   `lib/geo.ts` : ouvre l'app Plans native (iOS/Android) avec l'adresse et les
   coordonnées si connues, avec repli sur Google Maps web si l'app native ne
   répond pas.
5. **Le conducteur ne voyait jamais les passagers qu'il avait acceptés**
   (ni leur nom, ni leur téléphone, ni leur adresse de prise en charge) —
   c'était une vraie lacune : la fonction serveur `contacts_trajet` renvoyait
   bien l'information dans les deux sens, mais l'écran `trajet-nouveau.tsx` ne
   l'appelait jamais côté conducteur. Ajouté : bloc "passagers acceptés" avec
   nom, bouton **Appeler**, et bouton **Itinéraire pour le récupérer**.
6. **Les distances ne s'affichaient jamais**, même quand un utilisateur avait
   rempli son adresse dans Profil : `profil.tsx` enregistrait `home_address`
   mais ne calculait jamais `home_lat`/`home_lng` (les coordonnées), qui sont
   pourtant ce qu'utilisent les trajets et les points de rassemblement pour
   calculer une distance. Corrigé : l'adresse est maintenant géocodée
   (service gratuit OpenStreetMap Nominatim, déjà utilisé ailleurs dans
   l'app) à chaque enregistrement du profil si elle a changé.
7. **Ajout d'une estimation en minutes**, en plus de la distance en km,
   partout où une distance s'affichait (trajets, points de rassemblement,
   carte de présence) — c'est ce que tu avais demandé ("le nombre de minutes
   qu'il y a par rapport à lui"). C'est une estimation à vitesse moyenne
   (40 km/h), pas un vrai calcul d'itinéraire routier : configurer une vraie
   API d'itinéraire (Google Directions ou Mapbox) coûterait une clé payante
   et n'a pas été mise en place — voir section 6 si tu veux aller plus loin.

Tous ces changements ont été revérifiés avec `npx tsc --noEmit` : aucune
erreur.

---

## 4bis. Ajouts de la session 2 (15 septembre 2026)

1. **Messagerie privée à deux**, ajoutée comme demandé. Nouveaux écrans
   `messages.tsx` (liste des conversations) et `message/[id].tsx` (une
   conversation). Accessible depuis le menu, et depuis le bouton **Écrire**
   qui apparaît maintenant à côté d'Appeler et Itinéraire, une fois une place
   acceptée — aussi bien côté passager que côté conducteur.
   - Techniquement : pas de nouvelle table. `chat_messages` avait déjà une
     colonne `recipient_id`, déjà utilisée en lecture par le chat public pour
     ne montrer que les messages sans destinataire. La migration
     `20260915_messagerie_privee.sql` ajoute les règles de sécurité (RLS) qui
     autorisent la lecture et l'écriture d'un message entre deux personnes
     précises, plus une fonction `conversations_privees()` qui liste les
     conversations d'un utilisateur. **Cette migration doit être appliquée à
     la base Supabase avant que la messagerie ne fonctionne réellement** — à
     ce stade, seul le code est prêt, pas encore poussé sur la base.
   - La fonction de notification (`notifier`) sait maintenant reconnaître un
     message privé et l'envoyer à la bonne personne, une fois déployée.
2. **Carte façon VTC** : les points sur la carte de présence ne sont plus de
   simples épingles rouges par défaut, mais des badges ronds bleu marine
   (conducteur) ou violet (passager) avec une icône, comme sur une
   application de VTC. Un appui sur un point affiche maintenant la distance
   et le temps estimé. Une vraie animation de voiture qui se déplace en
   temps réel (comme Uber pendant une course en cours) est un chantier bien
   plus large — voir section 7.
3. **Dépôt Git créé en local**, `.env` retiré du suivi de version (remplacé
   par `.env.example`, un modèle sans les vraies valeurs) — voir section 7
   pour la suite (GitHub).
4. **Deux documents Word créés**, en français simple, à la racine du projet
   (voir en haut de ce mémo).
5. **Nouveau logo** : un pin de localisation blanc sur fond bleu marine
   (`#032451`), avec une petite croix blanche dans un cercle marine cerclé de
   violet (`#5B2D8E`, l'accent déjà présent dans `lib/theme.ts`) — l'idée
   d'un lieu de culte qu'on rejoint. Remplace l'ancienne boussole dans
   `assets/icon.png` (1024×1024, régénéré en PNG). C'est l'icône et l'icône
   adaptative Android qui en dépendent, via `app.json`.
6. **Écran de démarrage (splash) avec le nom de l'application** : nouveau
   fichier `assets/splash.png`, avec le même pin, et en dessous le texte
   « Covoit'Church » et « Personne ne rentre seul. » directement dessinés
   dans l'image (un écran de démarrage natif ne peut afficher qu'une image
   fixe, pas du texte dynamique — le texte est donc « gravé » dedans).
   Branché dans `app.json` (plugin `expo-splash-screen`). C'est ce qui
   s'affiche en tout premier à l'ouverture de l'application, avant même que
   l'animation de la voiture ne démarre — le nom de l'app est donc visible
   dès le lancement, comme demandé.

---

## 5. Choix de conception à connaître (pas des bugs)

- **La carte de présence ("Je suis là") ne montre jamais l'identité ni le
  téléphone des autres**, seulement leur position et leur rôle
  (conducteur/passager), avec maintenant la distance et le temps estimé
  au clic sur un point. C'est volontaire : l'identité et le contact
  n'apparaissent qu'une fois qu'une place est explicitement acceptée sur un
  trajet. Changer ça serait un choix de produit à valider avec toi avant de
  coder, pas quelque chose que j'ai modifié de mon propre chef.
- **Le chat de l'église reste un fil public**, distinct de la messagerie
  privée ajoutée en session 2 (section 4bis) : les deux coexistent, l'un pour
  toute l'église, l'autre pour une conversation à deux.
- **Le "retour" utilise l'adresse de domicile enregistrée dans le profil**,
  pas une adresse de destination saisie à chaque recherche. En pratique ça
  couvre le cas courant (rentrer chez soi après le culte). Si tu veux que
  quelqu'un puisse taper une adresse différente à chaque fois (ex. : "je
  rentre chez un ami ce dimanche"), c'est une petite extension possible.

---

## 6. Comment tester sur Expo Go, maintenant

1. Installer l'app **Expo Go** sur le téléphone (App Store / Google Play).
2. Vérifier que le téléphone et le PC sont sur **le même réseau Wi-Fi**.
3. Dans le dossier du projet :
   ```
   npm start
   ```
4. Un QR code s'affiche dans le terminal :
   - **Android** : ouvrir Expo Go, scanner le QR code directement.
   - **iPhone** : ouvrir l'app Appareil photo, viser le QR code, appuyer sur
     la bannière qui propose d'ouvrir dans Expo Go.
5. Si Metro refuse de démarrer avec « heap out of memory », c'est l'espace
   libre sur le disque `C:` qu'il faut vérifier (fichier d'échange Windows),
   pas la RAM.

**Ce qui marchera tout de suite dans Expo Go** : connexion (email + Google),
choix d'église, trajets aller/retour, carte de présence, points de
rassemblement, événements, chat, profil, administration.

**Avant de tester la messagerie privée**, la nouvelle migration doit être
appliquée à la base Supabase (elle ne l'est pas automatiquement) :
```
supabase db push
```
ou, sans la CLI Supabase, en collant le contenu de
`supabase/migrations/20260915_messagerie_privee.sql` dans l'éditeur SQL du
tableau de bord Supabase, en ligne. Sans cette étape, les autres écrans
fonctionnent normalement mais les messages privés seront refusés.

**Ce qui ne marchera pas encore dans Expo Go**, et c'est normal :
- **Les notifications push** : Expo exige un identifiant de projet EAS pour
  délivrer un jeton (`eas init`, jamais fait sur ce projet). Sans lui,
  l'app le signale proprement dans la console et continue de fonctionner
  normalement, juste sans notification.
- **La connexion Google**, tant que les URLs de retour `exp://**` ne sont pas
  autorisées dans Supabase (voir section 7, point 1). Sans ça, l'onglet
  s'ouvre mais ne revient jamais dans l'app.

---

## 7. Prochaines étapes jusqu'à l'application finie

### Côté configuration (aucun code à écrire, juste des réglages)

1. **Créer les identifiants Google** (si le site covoitchurch.com n'en a pas
   déjà, auquel cas passer directement à l'étape 2 avec les mêmes
   identifiants) :
   - Aller sur [console.cloud.google.com](https://console.cloud.google.com),
     créer un projet (ou utiliser celui du site).
   - Menu **APIs & Services → Credentials → Create Credentials → OAuth
     client ID**.
   - Type d'application : **Web application**.
   - Dans **Authorized redirect URIs**, ajouter l'URL de callback fournie par
     Supabase — elle se trouve dans Supabase, Authentication → Providers →
     Google, sous la forme
     `https://bvkumnzemmsgmafrmjhd.supabase.co/auth/v1/callback`.
   - Une fois créé, Google donne un **Client ID** et un **Client Secret** :
     les garder de côté pour l'étape 2.
2. **Activer Google dans Supabase** : tableau de bord Supabase →
   **Authentication → Providers → Google** → l'activer, coller le Client ID
   et le Client Secret obtenus à l'étape 1, puis enregistrer.
3. **Autoriser les adresses de retour de l'application** : toujours dans
   Supabase, **Authentication → URL Configuration → Redirect URLs**, ajouter
   ces deux lignes (l'une pour l'application une fois publiée, l'autre pour
   les tests avec Expo Go pendant le développement) :
   ```
   covoitchurch://**
   exp://**
   ```
   Sans cette étape précise, l'écran Google s'ouvre bien, mais ne revient
   jamais dans l'application après la connexion.
4. **Déployer la fonction de notification** :
   ```
   supabase functions deploy notifier --no-verify-jwt
   ```
   puis renseigner `public.app_config` avec `notifier_url` et
   `notifier_secret`. Tant que cette table est vide, aucune notification ne
   part — l'app fonctionne normalement, juste en silence.

### Côté build réel (au-delà d'Expo Go)

5. **`eas init`** pour obtenir un identifiant de projet EAS — nécessaire pour
   que les notifications push fonctionnent, même en version de test.
6. **Compte Apple Developer** (99 $/an) et **Google Play Console** (25 $ une
   fois) — obligatoires pour publier sur les deux stores.
7. **Sign in with Apple** : obligatoire sur iOS dès qu'un autre bouton de
   connexion sociale (ici Google) est proposé (règle 4.8 de l'App Store).
   Ce n'est pas fait aujourd'hui — techniquement, ça se branche sur Supabase
   comme un provider OAuth de plus, avec `expo-apple-authentication` côté
   app.
8. **Icônes et écran de démarrage définitifs** : l'icône (512×512, corrigée
   aujourd'hui) fonctionne, mais les stores demandent en général un artwork
   1024×1024 sans coins arrondis ni transparence pour l'App Store. À
   préparer avant la soumission.
9. **`eas build`** : générer un build de développement ou de preview, pour
   tester les notifications push et le retour de connexion Google (schéma
   `covoitchurch://`) dans un vrai binaire — Expo Go ne peut pas tester ces
   deux choses-là correctement.
10. **Tests internes** : TestFlight (iOS, via `eas submit`) et piste de test
    interne Google Play, avec quelques personnes de différentes églises pour
    valider le parcours complet avant la sortie publique.
11. **Fiches store** : captures d'écran, description, formulaire de
    confidentialité des données (Apple "App Privacy" / Google "Data safety")
    — le texte de `confidentialite.tsx` peut servir de base, et
    `docs/confidentialite.html` doit être publié sur une URL publique
    (covoitchurch.com) car les deux stores l'exigent.
12. **Soumission** aux deux stores.

### Nettoyage à prévoir (déjà noté avant cette session, toujours valable)

- Décider quels écrans hérités (`historique.tsx`, `guide.tsx`) gardent leur
  place maintenant que les trajets partagés sont devenus le cœur de l'app —
  certains se recoupent.
- Le dépôt Git est en place et relié à GitHub (public). Pour la suite,
  chaque changement se commite avec `git add` + `git commit`, puis
  `git push` pour le mettre en ligne — je peux le faire à ta demande, ou tu
  peux le faire toi-même si tu préfères garder la main dessus.

---

## 8. Repères techniques

- **Stack** : Expo SDK 57, React Native 0.86, Expo Router (navigation par
  fichiers), Supabase (base de données, auth, Edge Functions).
- **Variables d'environnement** (`.env`) : `EXPO_PUBLIC_SUPABASE_URL` et
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`, déjà configurées et pointant sur le même
  projet Supabase que le site.
- **Fichiers clés** :
  | Fichier | Rôle |
  |---|---|
  | `src/lib/trajets.ts` | Requêtes et types de la place de marché des trajets |
  | `src/lib/eglise.ts` | Cloisonnement par église |
  | `src/lib/geo.ts` | Distance, durée estimée, ouverture de l'itinéraire dans Maps |
  | `src/lib/messages.ts` | Messagerie privée à deux (réutilise `chat_messages`) |
  | `src/lib/location.ts` | Position GPS, mobile et navigateur |
  | `src/lib/push.ts` | Enregistrement du jeton de notification |
  | `src/lib/session.tsx` | Session, profil, église et rôle admin courants |
  | `supabase/migrations/` | Schéma de base, appliqué en production |
  | `supabase/functions/notifier/` | Envoi des notifications, non déployé (voir section 7) |

---

## 9. Historique des sessions

**15 septembre 2026, session 1** — Reprise du projet. Audit complet du code
existant, correction de 3 problèmes de configuration Expo (icône, dépendance
manquante, versions de paquets), correction d'un bug empêchant l'affichage
des distances (adresse jamais géocodée dans le profil), ajout du bouton
Itinéraire et de la visibilité des passagers acceptés côté conducteur, ajout
d'une estimation en minutes à côté des distances. Création de ce mémo.

**15 septembre 2026, session 2** — Ajout de la messagerie privée (écrans +
migration SQL `20260915_messagerie_privee.sql`, à appliquer sur Supabase).
Carte de présence redessinée avec des badges façon VTC. Nouveau logo (pin +
croix, bleu marine/blanc/violet). Dépôt Git créé et relié à
github.com/ottigedeon-crypto/covoitchurch (public). Rédaction des
instructions détaillées pour activer la connexion Google dans Supabase.
Création des deux documents Word (guide complet en langage simple, et liste
courte du reste à faire).
