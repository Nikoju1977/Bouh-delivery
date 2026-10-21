# BOUH! Delivery

Un jeu de voiture d’Halloween en français, en Canvas et JavaScript natif. Dracula attend ses bonbons ; son dentiste préfère les brocolis.

## Jouer

[Ouvrir le jeu](https://bouh-delivery-niko-1020.nikoju.chatgpt.site)

Pour jouer localement, servir le dossier `dist` avec un serveur HTTP, par exemple :

```sh
python3 -m http.server 8080 --directory dist
```

Puis ouvrir `http://localhost:8080`. Aucune installation de dépendances n’est nécessaire.

## Commandes

- Flèches gauche/droite ou Q/D (A/D également) : diriger.
- Espace ou flèche haut : turbo.
- Flèche bas ou S : freiner.
- H : klaxon pour faire fuir les fantômes proches.
- **F (maintenir) : tirer des bonbons** sur les fantômes, citrouilles et brocolis devant le corbillard. Cadence limitée à un tir toutes les 0,5 secondes ; un obstacle détruit rapporte 150 points.
- P ou Échap : pause ; R après l’arrivée : rejouer.
- Téléphone : glisser le doigt sur la route, ou utiliser les boutons tactiles. **Maintenir TIR ✦** pour tirer en continu ; le turbo et le tir fonctionnent aussi avec un second doigt.

## Campagne

| Niveau | Mission | Durée | Bonbons |
| --- | --- | --- | --- |
| 1 | Le cimetière | 35 s | 12 |
| 2 | La forêt qui râle | 40 s | 16 |
| 3 | La fête foraine fantôme | 45 s | 20 |
| 4 | Le potager du Dr Brocoli | 50 s | 24 |
| 5 | Le bal de Dracula | 60 s | 30 |
| 6 | Le marais des citrouilles — Roi Citrouille | 65 s | 32 |
| 7 | La tour des treize coups | 70 s | 34 |
| 8 | Le carnaval des spectres — Reine des Spectres | 75 s | 36 |
| 9 | Les mines de sucre | 80 s | 38 |
| 10 | Le laboratoire interdit — Dr Brocoli mutant | 85 s | 40 |

Les boss des niveaux 6, 8 et 10 arrivent dans la dernière partie du parcours : esquivez leurs projectiles rouges et récupérez trois runes violettes pour vider leur jauge de vie. Les tirs de bonbons détruisent les obstacles ordinaires, pas les boss, leurs projectiles ou les runes. Vous devez aussi avoir le nombre de bonbons demandé pour gagner. Une victoire débloque le niveau suivant. Les étoiles, records, réglages et niveaux débloqués sont enregistrés dans le stockage local du navigateur, sur cet appareil. Les records sont séparés entre le mode Balade (5 vies) et le mode Arcade (3 vies).

## Lance-bonbons

Le corbillard d’Aylina et son koala disposent d’un lance-bonbons magique. Les tirs suivent la trajectoire de la voiture au moment du tir, éclatent les citrouilles, chassent les fantômes et pulvérisent les brocolis. Leurs effets sont dessinés en Canvas et accompagnés de sons Web Audio. Les bonbons à collecter, les boucliers, les runes et les attaques des boss ne peuvent pas être touchés par ces tirs.

## Version 2

Direction progressive avec sensibilité réglable, frein, collisions adaptées aux dimensions affichées, position de la voiture limitée à l’écran, turbo sans à-coups à vide, bouclier absorbant un choc, aimant à bonbons de 8 secondes, bonus de frôlement et combos. Dix ambiances colorées et bruitages synthétisés via Web Audio, sans ressource distante.

## Vérifier

Avec Node.js 20 ou ultérieur :

```sh
npm test
```

Les tests couvrent la conduite, les collisions, les bonus, les fins de niveau, la progression, la géométrie mobile et les simulations de parcours. Ils ne remplacent pas une vérification visuelle dans un navigateur.

## Fichiers

- `dist/engine.js` : simulation et règles du jeu.
- `dist/levels.js` : campagne et progression.
- `dist/geometry.js` : projection et correspondance des contrôles tactiles.
- `dist/scene.js` : dessins Canvas.
- `dist/app.js` : interface, entrées et sauvegarde locale.
- `dist/audio.js` : synthèse sonore.
- `test/` : tests Node.js, sans dépendances.


## Jouer sur Vercel avec un seul fichier

Le fichier [`index.html`](./index.html) à la racine est **autonome** : styles CSS, logique JavaScript, graphismes Canvas, favicon SVG et sons Web Audio sont intégrés, sans dépendance ni chargement externe. Il inclut la plaque **Aylina** et le petit koala d'Halloween sur le corbillard.

Pour mettre le jeu sur Vercel, importez ce dépôt GitHub comme projet avec le préréglage **Other** et le répertoire racine `.`, sans commande de build ni dossier de sortie spécial. Vous pouvez aussi déposer ce seul `index.html` dans un nouveau projet statique. Les données de progression restent sauvegardées dans le navigateur du joueur.

Les sources modulaires restent dans `dist/` pour GitHub Pages et pour les tests. Quand vous les modifiez, régénérez également le fichier autonome si vous voulez conserver la parité.
