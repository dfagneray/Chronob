# Compagnon Chroniques Oubliées 2

Fiche de personnage, compendium de règles et planificateur de progression pour
*Chroniques Oubliées Fantasy* (2e édition), pensé pour le téléphone (PWA).

## Démarrage

```bash
npm install
npm run extract   # lit DOC-20250811-WA0000.pdf et génère src/data/*.json
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

## Structure

- `scripts/extract-rules.mjs` : extraction PDF → JSON (peuples, profils, voies, capacités, états, règles)
- `src/data/equipement.js` : catalogue d'équipement (tableaux p. 183-191)
- `src/lib/rules.js` : calculs (DEF, Init., attaques, PV, PM, PC, DR, d4°) et règles de progression
- `src/tabs/` : les 5 onglets (Personnage, Voies, Progression, Équipement, Grimoire)
- `tests/` : tests Vitest (`rules`, `data`, `store`, `journal`, `app`)
- `tests/e2e/` : tests d'intégration Playwright (rapport HTML dans `playwright-report/`)

Première utilisation des tests d'intégration : `npx playwright install chromium`.

## Publication (GitHub Pages)

Le workflow `.github/workflows/deploy.yml` lance les tests unitaires et d'intégration, puis publie `dist/`
sur GitHub Pages à chaque push sur `main`. Les règles extraites (`src/data/*.json`) sont versionnées ;
après une nouvelle extraction (`npm run extract`), commitez-les.

Une seule fois, dans le dépôt GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.

## Droits

*Chroniques Oubliées Fantasy* et ses textes de règles sont © Black Book Éditions.
