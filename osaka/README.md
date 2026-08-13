# Osaka — refonte UX/UI de l'application tablette

Prototype complet et interactif de l'application client du **Restaurant Osaka**
(cuisine japonaise), utilisée par les clients sur tablette en salle.

**Ouvrir :** `osaka/index.html` dans un navigateur. Aucune dépendance, aucun build,
aucune ressource externe — un seul fichier.

Cible : **tablette Android 10–13", mode paysage**, tactile, sans formation ni
intervention d'un serveur. Adaptation prévue en portrait et sur écran plus petit.

---

## Ce qui a changé par rapport à l'existant

| Application actuelle | Refonte |
|---|---|
| Composants minuscules, visée au doigt | Cibles tactiles **48–56 px minimum**, 68–78 px pour les actions fréquentes |
| Panier en tableau type logiciel de gestion | Panier en **cards**, sidebar permanente de 25 % + écran complet |
| Boutons `[-] 1 [+]` microscopiques | Sélecteur de quantité **dédié**, boutons ronds de 52 px dans un contenant délimité |
| CTA discret | CTA primaire rouge, pleine largeur, prix inclus dans le bouton |
| Grandes zones vides | Paysage exploité : **20 % catégories / 55 % catalogue / 25 % panier** |
| Placeholders gris disproportionnés | **Visuels vectoriels** homogènes en 4:3, un par plat, cadrage et fond identiques |
| Vocabulaire interne (« document », « fonctionnement / état ») | Langage client (« Une demande particulière ? », « Sous-total ») |
| Hiérarchie faible, typo minuscule | Échelle typographique lisible à 50–80 cm, serif éditorial pour la marque |
| Aucun retour visuel | Toasts, « ✓ Ajouté », squelettes, timeline de commande, animations < 300 ms |

---

## Écrans couverts

**Commande** — accueil · catalogue · catégories · recherche · filtres · cards produit ·
fiche produit (tiroir) · options obligatoires et facultatives · suppléments payants ·
remarque produit · ajout au panier · panier sidebar · panier complet · modification de
quantité · remarque générale · validation · confirmation · suivi de commande (timeline) ·
commande supplémentaire · numéro de table.

**Réservation** — nombre de personnes · maintenant / plus tard · dates rapides ·
calendrier · horaires (disponible / presque complet / indisponible) · créneau qui vient
d'être pris · préférence de table · coordonnées avec clavier numérique · récapitulatif
modifiable · confirmation · retrouver une réservation · signaler son arrivée ·
liste d'attente · restaurant complet.

**États** — chargement (skeletons) · erreur réseau · erreur d'envoi de commande ·
produit indisponible · panier vide · recherche sans résultat · restaurant fermé ·
timeout de confidentialité · besoin d'aide.

**Documentation** — page **Design system** complète (couleurs, typographie, grille,
espacement, rayons, ombres, icônes, boutons et leurs états, champs, sélecteurs,
badges, cards, composants panier et réservation, retours et états).

Un bouton **Scénarios** dans la topbar déclenche les états qu'on ne peut pas provoquer
naturellement (erreur réseau, restaurant complet, timeout, etc.).

---

## Direction artistique

- **Palette** : blanc cassé `#FCFAF6`, crème `#F4EEE4`, beige, bois clair, noir doux
  `#191A1C`, anthracite. Accent **rouge Osaka `#C0362D`** réservé à trois usages :
  la marque, l'action principale, la mise en valeur.
- **Japon sans cliché** : cercle solaire, lignes de noren, compositions minimalistes,
  vaisselle sombre à liseré rouge. Ni manga, ni samouraï, ni kanji décoratif.
- **Typographie** : serif éditorial (marque et titres d'écran) + sans-serif système
  pour toute l'interface. Prix en chiffres tabulaires.
- **Images** : les visuels sont des **compositions SVG** générées en code — même
  cadrage 4:3, même fond, même ombre, avec une variation de couleurs par plat.
  Elles remplacent les placeholders gris et tiennent le rôle d'aide au choix.
  Dans un vrai déploiement, elles seraient remplacées par de la photographie
  culinaire au même ratio ; le placeholder élégant reste pour les plats sans photo.

## Confidentialité et session de table

Deux périmètres strictement séparés :

- **Session de table** (conservée) : numéro de table, panier non validé,
  commandes en cours, historique de la session.
- **Informations personnelles** (effacées) : nom, téléphone, e-mail, réservation
  consultée. Effacement après confirmation, récupération, annulation ou signalement
  d'arrivée, et après 60 s d'inactivité sur un formulaire — avec l'écran
  « Êtes-vous toujours là ? » et un compte à rebours de 15 s.

## Structure du code

Fichier unique, trois blocs :

1. **CSS** — tokens (couleurs, rayons, espacements, ombres, typographie, cibles
   tactiles), primitives, composants, écrans, responsive.
2. **JS — données** — catégories, ~50 produits avec description, prix, allergènes,
   badges, groupes d'options ; bibliothèque d'illustrations SVG et d'icônes.
3. **JS — application** — état, rendu par écran, délégation d'événements,
   mises à jour ciblées du panier et du catalogue pour une réactivité perçue
   maximale (aucun rendu complet sur un `+` / `−`).
