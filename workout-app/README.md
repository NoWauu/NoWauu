# Workout Ranks

Carnet d'entraînement gratuit inspiré de Varro : bibliothèque d'exercices, séances
(séries / poids / reps), rangs par exercice, par groupe musculaire et global, et une
carte du corps colorée selon le volume de la semaine ou ton rang.

PWA (React + TypeScript + Vite) : s'installe sur l'écran d'accueil du téléphone, marche
hors-ligne, aucune donnée ne quitte l'appareil, aucun serveur à payer.

## Lancer

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests du moteur de rangs
npm run build    # build statique dans dist/
```

## Installer sur le téléphone

Héberge `dist/` sur n'importe quel hébergeur statique gratuit (Vercel, Netlify,
Cloudflare Pages, GitHub Pages ; `base: './'` dans `vite.config.ts` fait marcher le
build sous un sous-chemin). Ouvre l'URL sur le téléphone puis
« Ajouter à l'écran d'accueil ». Sur Vercel : importe le repo, *Root Directory* =
`workout-app`, preset Vite.

## Organisation

```
src/
  domain/      logique pure, sans React (testée)
    types.ts     modèle de données
    muscles.ts   les 13 groupes musculaires
    ranking.ts   1RM estimé, paliers, score continu, agrégations
    volume.ts    séries par groupe et par semaine
  data/
    exercises.ts bibliothèque (instructions, muscles, calibrage)
  storage/     état persistant (localStorage) + actions
  hooks/       useRanks (rangs dérivés mémoïsés), useRoute (routing par hash)
  components/  BodyMap (SVG), Rank, ExercisePicker
  pages/       Séance, Exercices, Semaine, Rangs, Profil
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

## Ajouter un exercice

Ajoute une entrée dans `src/data/exercises.ts` : `id` unique, muscles `primary` /
`secondary`, `scoring` (`{ kind: 'load', ref }` ou `{ kind: 'reps', ref }`), étapes et
conseils. C'est tout.

## Sauvegarde

Les données vivent dans le `localStorage` du navigateur. Profil → Exporter crée un
fichier JSON ; Importer le restaure (changement de téléphone, etc.).
