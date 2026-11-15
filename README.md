# Compagnon Chroniques Oubliées 2

Fiche de personnage, compendium de règles et planificateur de progression pour
*Chroniques Oubliées Fantasy* (2e édition), pensé pour le téléphone (PWA).

## Démarrage

```bash
npm install
npm run extract   # lit DOC-20250811-WA0000.pdf et génère src/data/*.json
npm run extract:compagnon  # lit le PDF du Compagnon du joueur et génère src/data/compagnon/*.json
npm run dev       # http://localhost:5173 (et sur le réseau local, pour le téléphone)
npm run build     # version de production dans dist/
npm test          # tests unitaires (Vitest) : règles du livre, données, sauvegarde, journal, interface
npm run test:e2e  # tests d'intégration : Chromium headless, formats iPhone 13, Pixel 7 et Android 360 px
npm run test:all  # les deux
```

Lancez `npm test` après toute modification (et après `npm run extract`) : les tests de règles reprennent
les exemples chiffrés du livre (Lhagva, Ionas, profils hybrides p. 177…), les tests d'interface simulent
la création d'un héros, le passage de niveau et les saisies manuelles.

`npm run extract -- chemin/vers/autre.pdf` permet d'indiquer un autre fichier.

### Compagnon du joueur

`npm run extract:compagnon` (à lancer après `npm run extract`) cherche à la racine un PDF dont le nom contient
« compagnon » (ou prend le chemin passé après `--`). Il ajoute 17 peuples, 5 profils (caravanier, chamane,
parangon, primaliste, psionique), 2 voies de prestige, 4 voies d’artisan, 35 voies de recettes, 32 voies de
domaine de prêtre, 8 armes et les règles optionnelles. La couche texte de ce PDF est en partie abîmée (lettres
éclatées, ligatures mal encodées) : `scripts/lecture-compagnon.mjs` la répare à l’aide du vocabulaire du Livre
des règles. Les colonnes imprimées dans le désordre et les mots irrécupérables se corrigent dans les tables
`DEPLACEMENTS` et `CORRECTIONS` de `scripts/extract-compagnon.mjs`.

Règles prises en charge par l’application : modificateurs de peuple fixes, famille au choix et points d’ego
(PE) du psionique, primaliste sans voie du mage, petit bouclier du caravanier, voie de domaine du prêtre
(remplace la voie de peuple comme la voie du mage), voies d’artisan (1 point par rang, hors limite de six voies)
donnant 3 rangs de recettes par rang. Le rang 5 des voies d’artisan (4 rangs de recettes par point dépensé en plus)
se gère avec le mode libre du planificateur.

## Structure

- `scripts/extract-rules.mjs` : extraction PDF → JSON (peuples, profils, voies, capacités, états, règles)
- `scripts/extract-compagnon.mjs`, `scripts/lecture-compagnon.mjs` : extraction du Compagnon du joueur (`src/data/compagnon/`)
- `scripts/pdf-commun.mjs` : outils d’analyse partagés (voies, capacités, effets chiffrés)
- `src/data/equipement.js` : catalogue d'équipement (tableaux p. 183-191)
- `src/lib/rules.js` : calculs (DEF, Init., attaques, PV, PM, PC, DR, d4°) et règles de progression
- `src/tabs/` : les 4 onglets (Personnage — avec armes en main, consommables et « Sac & bourse » —, Voies, Progression, Grimoire) ; `Equipement.jsx` fournit les sections d’équipement de la fiche
- `tests/` : tests Vitest (`rules`, `compagnon`, `data`, `store`, `journal`, `app`)
- `tests/e2e/` : tests d'intégration Playwright (rapport HTML dans `playwright-report/`)

Première utilisation des tests d'intégration : `npx playwright install chromium`.

## Publication (GitHub Pages)

Le workflow `.github/workflows/deploy.yml` lance les tests unitaires et d'intégration, puis publie `dist/`
sur GitHub Pages à chaque push sur `main`. Les règles extraites (`src/data/*.json`) sont versionnées ;
après une nouvelle extraction (`npm run extract`), commitez-les.

Une seule fois, dans le dépôt GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.

## Droits

*Chroniques Oubliées Fantasy* et ses textes de règles sont © Black Book Éditions.
