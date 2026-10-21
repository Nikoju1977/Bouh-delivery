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
- P ou Échap : pause ; R après l’arrivée : rejouer.
- Téléphone : glisser le doigt sur la route, ou utiliser les boutons tactiles. Le turbo fonctionne avec un second doigt.

## Campagne

| Niveau | Mission | Durée | Bonbons |
| --- | --- | --- | --- |
| 1 | Le cimetière | 35 s | 12 |
| 2 | La forêt qui râle | 40 s | 16 |
| 3 | La fête foraine fantôme | 45 s | 20 |
| 4 | Le potager du Dr Brocoli | 50 s | 24 |
| 5 | Le bal de Dracula | 60 s | 30 |

Une victoire débloque le niveau suivant. Les étoiles, records, réglages et niveaux débloqués sont enregistrés dans le stockage local du navigateur, sur cet appareil. Les records sont séparés entre le mode Balade (5 vies) et le mode Arcade (3 vies).

## Version 2

Direction progressive avec sensibilité réglable, frein, collisions adaptées aux dimensions affichées, position de la voiture limitée à l’écran, turbo sans à-coups à vide, bouclier absorbant un choc, aimant à bonbons de 8 secondes, bonus de frôlement et combos. Cinq ambiances originales et bruitages synthétisés via Web Audio, sans ressource distante.

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
