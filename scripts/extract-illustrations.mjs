// Extraction des illustrations des PDF : portraits des peuples, profils, équipement.
// Usage : npm run extract:illustrations
// Écrit public/illustrations/**.webp et src/data/illustrations.json (table id → fichier).
// Les correspondances (page, rang de l'image sur la page) ont été relevées à la main sur des
// planches-contact ; les indices suivent l'ordre renvoyé par illustrationsDePage().
import fs from 'node:fs';
import path from 'node:path';
import { ouvrirPdf, illustrationsDePage, ecrireWebp } from './illustrations-pdf.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PUBLIC = path.join(ROOT, 'public', 'illustrations');
const LDR = path.join(ROOT, 'DOC-20250811-WA0000.pdf');
const COMPAGNON = path.join(ROOT, fs.readdirSync(ROOT).find((f) => /compagnon.*\.pdf$/i.test(f)) || 'compagnon.pdf');

// [page PDF, indice] par élément ; pour l'équipement, une image peut illustrer plusieurs objets
const SOURCES = [
  {
    pdf: LDR,
    peuples: {
      'demi-elfe': { portrait: [45, 1], silhouette: [45, 0] },
      'demi-orc': { portrait: [47, 1], silhouette: [47, 0] },
      'elfe-haut': { portrait: [49, 0], silhouette: [49, 1] },
      'elfe-sylvain': { portrait: [51, 1], silhouette: [51, 0] },
      gnome: { portrait: [53, 0], silhouette: [53, 1] },
      halfelin: { portrait: [55, 0], silhouette: [55, 1] },
      humain: { portrait: [57, 1], silhouette: [57, 0] },
      nain: { portrait: [59, 0], silhouette: [59, 1] },
    },
    profils: {
      arquebusier: [63, 0],
      barde: [66, 0],
      rodeur: [73, 0],
      voleur: [74, 0],
      barbare: [79, 0],
      chevalier: [83, 0],
      guerrier: [87, 0],
      ensorceleur: [92, 0],
      forgesort: [97, 0],
      magicien: [102, 0],
      sorcier: [107, 0],
      druide: [113, 0],
      moine: [118, 0],
      pretre: [123, 0],
    },
    equipement: [
      [[182, 1], ['marteau', 'masse']],
      [[182, 3], ['hache', 'hache-a-deux-mains']],
      [[182, 5], ['epee-longue', 'epee-batarde', 'epee-a-deux-mains', 'epee-courte']],
      [[182, 7], ['rapiere']],
      [[182, 11], ['vivelame']],
      [[184, 1], ['baton', 'baton-ferre', 'tribaton']],
      [[184, 3], ['lance', 'epieu', 'pique', 'lance-lancer', 'lance-de-cavalerie']],
      [[186, 1], ['arc-court', 'arc-long']],
      [[186, 3], ['arbalete-legere', 'arbalete-lourde', 'arbalete-de-poing']],
      [[186, 5], ['fronde', 'lance-pierre', 'javelot', 'hachette']],
      [[187, 3], ['petoire', 'mousquet']],
      [[189, 1], ['petit-bouclier', 'grand-bouclier']],
      [[189, 3], ['armure-de-plaques', 'plaque-complete']],
      [[189, 5], ['tissus-matelasses', 'cuir-simple', 'cuir-renforce', 'chemise-de-mailles', 'cotte-de-mailles']],
      [[190, 1], ['materiel-ecriture']],
      [[190, 3], ['potion-de-soins', 'sac-a-dos']],
      [[190, 5], ['carquois']],
      [[190, 7], ['couverture']],
      [[190, 9], ['lanterne', 'huile']],
      [[190, 11], ['grappin', 'corde']],
      [[191, 1], ['mule', 'poney']],
      [[191, 3], ['cheval-de-selle']],
      [[191, 5], ['cheval-de-guerre', 'caparacon-mailles', 'barde-plaque']],
      [[192, 9], ['ration', 'gamelle']],
    ],
  },
  {
    pdf: COMPAGNON,
    peuples: {
      'ame-forgee': { portrait: [9, 1] },
      cambion: { portrait: [11, 3] },
      'demi-ogre': { portrait: [14, 1] },
      drakonide: { portrait: [15, 1] },
      'elfe-pale': { portrait: [17, 0] },
      'elfe-des-profondeurs': { portrait: [19, 0] },
      felis: { portrait: [21, 1] },
      frouin: { portrait: [23, 0] },
      gobelin: { portrait: [25, 1] },
      kobold: { portrait: [27, 1] },
      'lutin-fee': { portrait: [29, 0] },
      'lutin-farfadet': { portrait: [29, 1] },
      minotaure: { portrait: [31, 0] },
      nephilim: { portrait: [33, 0] },
      ophidien: { portrait: [35, 0] },
      satyre: { portrait: [37, 0] },
      wolfer: { portrait: [39, 0] },
    },
    profils: { caravanier: [43, 0], chamane: [48, 0], parangon: [53, 0], primaliste: [58, 0], psionique: [63, 0] },
    equipement: [],
  },
];

async function main() {
  const table = { peuples: {}, profils: {}, equipement: {} };
  const avertissements = [];
  fs.rmSync(PUBLIC, { recursive: true, force: true });
  for (const src of SOURCES) {
    if (!fs.existsSync(src.pdf)) {
      avertissements.push(`PDF introuvable : ${path.basename(src.pdf)}`);
      continue;
    }
    console.log(`Lecture de ${path.basename(src.pdf)}…`);
    const { navigateur, page } = await ouvrirPdf(src.pdf);
    const cache = new Map();
    const image = async ([p, i], max) => {
      const cle = `${p}:${max}`;
      if (!cache.has(cle)) cache.set(cle, await illustrationsDePage(page, p, { max, qualite: 0.8 }));
      const im = cache.get(cle)[i];
      if (!im) avertissements.push(`Image absente : page ${p}, n° ${i}`);
      return im;
    };
    const ecrire = (rel, im) => {
      ecrireWebp(path.join(PUBLIC, rel), im.webp);
      return { src: `illustrations/${rel}`, largeur: im.largeur, hauteur: im.hauteur };
    };
    for (const [id, refs] of Object.entries(src.peuples)) {
      const entree = {};
      const portrait = await image(refs.portrait, 720);
      if (portrait) entree.portrait = ecrire(`peuples/${id}.webp`, portrait);
      if (refs.silhouette) {
        const s = await image(refs.silhouette, 480);
        if (s) entree.silhouette = ecrire(`peuples/${id}-silhouette.webp`, s);
      }
      table.peuples[id] = entree;
    }
    for (const [id, ref] of Object.entries(src.profils)) {
      const im = await image(ref, 720);
      if (im) table.profils[id] = ecrire(`profils/${id}.webp`, im);
    }
    for (const [ref, ids] of src.equipement) {
      const im = await image(ref, 600);
      if (!im) continue;
      const fichier = ecrire(`equipement/${ids[0]}.webp`, im);
      for (const id of ids) table.equipement[id] = fichier;
    }
    await navigateur.close();
  }
  fs.writeFileSync(path.join(ROOT, 'src', 'data', 'illustrations.json'), JSON.stringify(table, null, 1));
  const n = Object.keys(table.peuples).length + Object.keys(table.profils).length + new Set(Object.values(table.equipement).map((e) => e.src)).size;
  console.log(`Illustrations : ${Object.keys(table.peuples).length} peuples, ${Object.keys(table.profils).length} profils, ${Object.keys(table.equipement).length} objets — ${n} fichiers`);
  for (const a of avertissements) console.log('  - ' + a);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
