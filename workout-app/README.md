# Workout Ranks

Carnet d'entraînement gratuit inspiré de Varro : bibliothèque de 61 exercices,
séances (séries / poids / reps, échauffements, minuteur de repos), rangs par exercice,
par muscle et global (Novice → Legend), et un schéma anatomique détaillé (homme/femme,
face/dos) coloré selon ton volume de la semaine ou tes rangs.

PWA (React + TypeScript + Vite) : s'installe sur l'écran d'accueil du téléphone, marche
hors-ligne, aucune donnée ne quitte l'appareil, aucun serveur à payer.

## Lancer

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests du moteur de rangs
npm run build    # build statique dans dist/
```

## Installer sur le téléphone (sans ligne de commande)

Hébergement gratuit via GitHub Pages ; le workflow `.github/workflows/deploy-workout-app.yml`
construit et publie l'app à chaque push sur `main` qui touche `workout-app/`.

1. **Settings → Pages → Build and deployment → Source : « GitHub Actions »** (une fois).
2. Fusionne la branche dans `main` (pull request → *Merge*). Le déploiement se lance
   seul (onglet **Actions**, ~1 min), ou via *Run workflow*.
3. Ouvre `https://<utilisateur>.github.io/<repo>/` sur le téléphone, puis :
   - **iPhone** (Safari) : Partager → « Sur l'écran d'accueil » ;
   - **Android** (Chrome) : ⋮ → « Installer l'application ».

Utilise ensuite toujours l'icône : sur iPhone, l'app installée a son propre stockage,
séparé de l'onglet Safari. Les mises à jour arrivent toutes seules à la réouverture.

## Organisation

```
src/
  domain/        logique pure, sans React (testée)
    types.ts       modèle de données
    muscles.ts     les 15 groupes musculaires
    ranking.ts     1RM estimé, paliers, score continu, agrégations, historique
    volume.ts      séries par muscle et par semaine, rampe de couleurs
    stats.ts       durée / tonnage / titre d'une séance, records
  data/
    exercises.ts   bibliothèque (instructions, muscles, calibrage)
  storage/
    createStore.ts mini store externe (useSyncExternalStore)
    store.ts       données persistées (localStorage, migration)
    actions.ts     toutes les mutations
    ui.ts          minuteur de repos, dialogues, toasts
  components/
    body/          schéma anatomique (BodyMap) + vignettes zoomées (MuscleThumb)
    Rank.tsx       emblèmes de rang, pastilles, jauges
    ProgressChart  courbe de progression sur fond de paliers
    RestTimer, ExercisePicker, WeekStrip, ui/ (Sheet, Stat, hôtes dialogue/toast)
  lib/           formatage FR, retours haptique/son, wake lock, hooks
  styles/        tokens.css (design tokens) → base → components → pages
  pages/         Séance, Exercices, Corps, Rangs, Profil
```

## Les rangs

Paliers : Novice → Intermédiaire → Avancé → Élite → Monster → Legend.

1. **Exercice** : on prend la meilleure série validée. Pour un exo chargé :
   1RM estimé (Epley, `poids × (1 + reps/30)`) ÷ poids de corps. Pour les exos au
   poids du corps avec lest (tractions, dips), le poids du corps est compté dans la
   charge. Pour pompes, gainage, etc. : nombre de reps (ou secondes).
   Cette valeur est convertie en **score continu de 0 à 6** par interpolation entre
   les seuils (partie entière = palier, décimale = progression).
2. **Groupe musculaire** : moyenne des meilleurs scores des exercices *réalisés* qui
   ciblent ce groupe en muscle principal.
3. **Global** : moyenne des scores des groupes classés (chaque groupe pèse pareil).

Chaque exercice n'a qu'un nombre à calibrer (`scoring.ref` = seuil « Avancé » pour un
homme) ; les autres seuils suivent une courbe commune (`TIER_CURVE`) et les barèmes
femmes sont dérivés (`FEMALE_FACTOR`). Les rangs ne sont jamais stockés : ils sont
recalculés depuis les séries brutes, donc modifier un calibrage met à jour tout
l'historique.

## Couleurs

- **Rangs** : échelle « chaleur » où chaque palier est plus clair que le précédent
  (violet éteint → magenta → orange → or → blanc glacé). L'ordre se lit même en niveaux
  de gris ; validé pour le daltonisme (ΔE ≥ 9,7 entre paliers voisins). Chaque emblème
  ajoute une forme (anneau, 1 à 3 chevrons, flamme, couronne) : la couleur n'est jamais
  le seul indice.
- **Volume** : une seule teinte (bleu), du sombre au clair. C'est une quantité, donc
  pas d'arc-en-ciel.
- Tous les tokens sont dans `src/styles/tokens.css`.

## Ergonomie en séance

- Colonne **Précédent** (touche-la pour recopier la valeur de la dernière fois).
- Touche le numéro d'une série pour la marquer **échauffement** (exclue du volume et
  des rangs).
- **Minuteur de repos** lancé à chaque série validée (−15 s / +15 s / passer), vibration
  et bip à la fin, durée réglable dans le profil.
- **Refaire une séance** en un geste depuis l'accueil ou l'historique.
- L'écran reste allumé pendant la séance (Wake Lock), saisie à 17 px pour éviter le
  zoom iOS, cibles tactiles de 44 px minimum.

## Ajouter un exercice

Ajoute une entrée dans `src/data/exercises.ts` : `id` unique, muscles `primary` /
`secondary`, `scoring` (`{ kind: 'load', ref }` ou `{ kind: 'reps', ref }`), étapes et
conseils. C'est tout.

## Sauvegarde

Les données vivent dans le `localStorage` du navigateur. Profil → Exporter crée un
fichier JSON ; Importer le restaure (changement de téléphone, etc.).

## Crédits

Tracés anatomiques : [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter)
(licence MIT, © 2022 ELABBASSI Hicham), recadrés et intégrés dans
`src/components/body/bodyPaths.ts` (notice de licence incluse).
