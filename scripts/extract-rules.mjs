// Extraction des règles de Chroniques Oubliées Fantasy 2 depuis le PDF local.
// Usage : npm run extract [-- chemin/vers/le.pdf]
// Produit des fichiers JSON dans src/data/ (peuples, profils, voies, etats).
// Les données restent locales : elles proviennent de votre exemplaire du livre.
import fs from 'node:fs';
import path from 'node:path';
import { readPages, cleanPage, makeFixer, buildVocab, joinLines, parseVoieBlock, splitVoies, slug } from './pdf-commun.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PDF = process.argv[2] || path.join(ROOT, 'DOC-20250811-WA0000.pdf');
const OUT = path.join(ROOT, 'src', 'data');


// ---------------------------------------------------------------------------
// 5. Métadonnées structurelles (sommaire du livre)
// ---------------------------------------------------------------------------
const FAMILLES = {
  aventuriers: { nom: 'Aventuriers', pv: 4, dr: 8, bonus: '+1 point de chance', caracCommune: 'AGI' },
  combattants: { nom: 'Combattants', pv: 5, dr: 10, bonus: null, caracCommune: 'FOR' },
  mages: { nom: 'Mages', pv: 3, dr: 6, bonus: '+1 capacité de rang 2', caracCommune: 'INT' },
  mystiques: { nom: 'Mystiques', pv: 4, dr: 8, bonus: '+1 dé de récupération', caracCommune: 'VOL' },
};

// Armures max par profil (chapitre « Profils hybrides », p. 178) ; DEF de l'armure max.
const PROFILS = [
  { id: 'arquebusier', nom: 'Arquebusier', famille: 'aventuriers', debut: 62, fin: 65, caracs: ['AGI', 'INT', 'CON'], armureMax: 4, bouclier: false, magie: null },
  { id: 'barde', nom: 'Barde', famille: 'aventuriers', debut: 66, fin: 69, caracs: ['CHA', 'AGI', 'VOL'], armureMax: 3, bouclier: false, magie: 'CHA' },
  { id: 'rodeur', nom: 'Rôdeur', famille: 'aventuriers', debut: 70, fin: 73, caracs: ['AGI', 'PER', 'CON'], armureMax: 3, bouclier: false, magie: 'PER' },
  { id: 'voleur', nom: 'Voleur', famille: 'aventuriers', debut: 74, fin: 77, caracs: ['AGI', 'INT', 'CHA'], armureMax: 2, bouclier: false, magie: null },
  { id: 'barbare', nom: 'Barbare', famille: 'combattants', debut: 79, fin: 82, caracs: ['FOR', 'CON', 'AGI'], armureMax: 3, bouclier: true, magie: null },
  { id: 'chevalier', nom: 'Chevalier', famille: 'combattants', debut: 83, fin: 86, caracs: ['FOR', 'CHA', 'CON'], armureMax: 6, bouclier: true, magie: 'CHA' },
  { id: 'guerrier', nom: 'Guerrier', famille: 'combattants', debut: 87, fin: 90, caracs: ['FOR', 'CON', 'AGI'], armureMax: 5, bouclier: true, magie: null },
  { id: 'ensorceleur', nom: 'Ensorceleur', famille: 'mages', debut: 92, fin: 96, caracs: ['CHA', 'VOL', 'AGI'], armureMax: 0, bouclier: false, magie: 'CHA' },
  { id: 'forgesort', nom: 'Forgesort', famille: 'mages', debut: 97, fin: 101, caracs: ['INT', 'VOL', 'CON'], armureMax: 2, bouclier: false, magie: 'INT' },
  { id: 'magicien', nom: 'Magicien', famille: 'mages', debut: 102, fin: 106, caracs: ['INT', 'VOL', 'AGI'], armureMax: 0, bouclier: false, magie: 'INT' },
  { id: 'sorcier', nom: 'Sorcier', famille: 'mages', debut: 107, fin: 111, caracs: ['INT', 'VOL', 'CON'], armureMax: 0, bouclier: false, magie: 'INT' },
  { id: 'druide', nom: 'Druide', famille: 'mystiques', debut: 113, fin: 117, caracs: ['PER', 'VOL', 'CON|AGI'], armureMax: 2, bouclier: false, magie: 'PER' },
  { id: 'moine', nom: 'Moine', famille: 'mystiques', debut: 118, fin: 121, caracs: ['VOL', 'PER', 'AGI'], armureMax: 0, bouclier: false, magie: null },
  { id: 'pretre', nom: 'Prêtre', famille: 'mystiques', debut: 122, fin: 127, caracs: ['CHA', 'VOL', 'FOR'], armureMax: 4, bouclier: true, magie: 'CHA' },
];

const PEUPLES = [
  { id: 'demi-elfe', nom: 'Demi-elfe', titre: 'DEMI-ELFE', debut: 45, mods: { plus: ['PER', 'CHA'], moins: ['FOR', 'CON'] }, voies: ['voie-de-l-humain', 'voie-de-l-elfe-haut', 'voie-de-l-elfe-sylvain'] },
  { id: 'demi-orc', nom: 'Demi-orc', titre: 'DEMI-ORC', debut: 46, mods: { plus: ['FOR', 'CON'], moins: ['CHA', 'INT'] }, voies: ['voie-du-demi-orc'] },
  { id: 'elfe-haut', nom: 'Elfe haut', titre: 'ELFE HAUT', debut: 48, mods: { plus: ['INT', 'CHA'], moins: ['FOR'] }, voies: ['voie-de-l-elfe-haut'] },
  { id: 'elfe-sylvain', nom: 'Elfe sylvain', titre: 'ELFE SYLVAIN', debut: 50, mods: { plus: ['AGI', 'PER'], moins: ['FOR'] }, voies: ['voie-de-l-elfe-sylvain'] },
  { id: 'gnome', nom: 'Gnome', titre: 'GNOME', debut: 52, mods: { plus: ['INT', 'PER'], moins: ['FOR'] }, voies: ['voie-du-gnome'] },
  { id: 'halfelin', nom: 'Halfelin', titre: 'HALFELIN', debut: 54, mods: { plus: ['AGI', 'VOL'], moins: ['FOR'] }, voies: ['voie-du-halfelin'] },
  { id: 'humain', nom: 'Humain', titre: 'HUMAIN', debut: 56, mods: { plus: ['*faibles'], moins: [] }, voies: ['voie-de-l-humain'] },
  { id: 'nain', nom: 'Nain', titre: 'NAIN', debut: 58, mods: { plus: ['CON', 'VOL'], moins: ['AGI'] }, voies: ['voie-du-nain'] },
];

const PRESTIGE = [
  { categorie: 'generique', debut: 129, fin: 136 },
  { categorie: 'aventuriers', debut: 137, fin: 145 },
  { categorie: 'combattants', debut: 146, fin: 153 },
  { categorie: 'mages', debut: 154, fin: 165 },
  { categorie: 'mystiques', debut: 166, fin: 175 },
];

// ---------------------------------------------------------------------------
// 6. Programme principal
// ---------------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(PDF)) {
    console.error(`PDF introuvable : ${PDF}`);
    process.exit(1);
  }
  console.log(`Lecture de ${path.basename(PDF)}…`);
  const raw = await readPages(PDF);
  const pages = raw.map((l) => (l ? cleanPage(l) : []));
  const fix = makeFixer(buildVocab(pages.flat().join('\n')));
  const range = (a, b) => {
    const out = [];
    for (let p = a; p <= b; p++) for (const l of pages[p] || []) out.push(Object.assign(new String(l), { page: p }));
    return out;
  };
  const pageOfVoie = (from, to, name) => {
    for (let p = from; p <= to; p++) if ((pages[p] || []).some((l) => l.includes(name))) return p;
    return from;
  };

  const voies = [];
  const pushVoie = (v) => {
    const existing = voies.find((x) => x.id === v.id);
    if (existing) {
      // ex. la voie du mage, répétée dans chaque profil de mage
      if (!existing.profils) existing.profils = [];
      if (v.profil && !existing.profils.includes(v.profil)) existing.profils.push(v.profil);
      if (v.capacites.length > existing.capacites.length) existing.capacites = v.capacites;
      return;
    }
    voies.push(v);
  };

  // --- Peuples (p. 44-60) ---
  const peupleLines = range(45, 60).map(String);
  const peuples = [];
  PEUPLES.forEach((pp, idx) => {
    const start = peupleLines.findIndex((l) => l.trim() === pp.titre);
    const nextTitle = PEUPLES[idx + 1]?.titre || 'MAGE';
    const end = peupleLines.findIndex((l, i) => i > start && l.trim() === nextTitle);
    const block = peupleLines.slice(start + 1, end);
    const { pre, voies: vs } = splitVoies(block);
    const preText = fix(joinLines(pre));
    const reperes = {};
    for (const key of ['Âge de départ', 'Espérance de vie', 'Taille', 'Poids', 'Traits']) {
      const m = preText.match(new RegExp(key + '\\s*:\\s*([^\\n]+?)(?=\\s*(Âge de départ|Espérance de vie|Taille|Poids|Traits|Caractéristiques)\\s*:|\\n|$)'));
      if (m) reperes[key] = m[1].trim();
    }
    const caracLine = (preText.match(/Caractéristiques\s*\n?([^\n]+)/) || [])[1] || '';
    const description = preText.split(/\nNoms typiques|\nRepères/)[0];
    for (const v of vs) {
      pushVoie(parseVoieBlock(v.name, v.lines, { type: 'peuple', peuple: pp.id, page: pageOfVoie(pp.debut, 60, v.name) }, fix));
    }
    const sansVoie = vs.length === 0 || vs.every((v) => /DEMI-ELFE/.test(v.name));
    const noteVoie = vs.find((v) => /DEMI-ELFE/.test(v.name));
    peuples.push({
      id: pp.id,
      nom: pp.nom,
      page: pp.debut,
      description,
      reperes,
      modificateurs: caracLine.trim(),
      mods: pp.mods,
      voies: pp.voies,
      noteVoie: noteVoie ? fix(joinLines(noteVoie.lines)) : null,
    });
    if (sansVoie) voies.splice(voies.findIndex((v) => v.id === 'voie-du-demi-elfe'), voies.some((v) => v.id === 'voie-du-demi-elfe') ? 1 : 0);
  });
  // Voie du mage (p. 60)
  {
    const lines = range(60, 60).map(String);
    const i = lines.findIndex((l) => l.trim() === 'MAGE');
    const { pre, voies: vs } = splitVoies(lines.slice(i + 1));
    for (const v of vs) {
      const voie = parseVoieBlock(v.name, v.lines, { type: 'mage', page: 60 }, fix);
      voie.presentation = fix(joinLines(pre));
      pushVoie(voie);
    }
  }

  // --- Profils (p. 61-127) ---
  const profils = [];
  for (const pr of PROFILS) {
    const lines = range(pr.debut, pr.fin).map(String);
    const hpIdx = lines.findIndex((l) => /^Points de vigueur : \d par niveau/.test(l.trim()));
    const { pre, voies: vs } = splitVoies(lines.slice(hpIdx + 1));
    const preText = fix(joinLines(pre));
    const equipM = preText.match(/Équipement de départ\s*\n?([\s\S]+)$/);
    const armesM = preText.match(/Armes & armures\s*\n?maîtrisées\s*\n?([\s\S]+?)(?=\nÉquipement de départ|$)/) || preText.match(/maîtrisées\s*\n?([\s\S]+?)(?=\nÉquipement de départ|$)/);
    const descM = preText.split(/\nArmes & armures/)[0];
    const profVoies = [];
    for (const v of vs) {
      const voie = parseVoieBlock(v.name, v.lines, { type: 'profil', profil: pr.id, famille: pr.famille, page: pageOfVoie(pr.debut, pr.fin, v.name) }, fix);
      if (voie.id === 'voie-du-mage') {
        pushVoie({ ...voie, profil: pr.id });
        continue;
      }
      pushVoie(voie);
      profVoies.push(voie.id);
    }
    profils.push({
      id: pr.id,
      nom: pr.nom,
      famille: pr.famille,
      page: pr.debut,
      caracteristiques: pr.caracs,
      armureMax: pr.armureMax,
      bouclier: pr.bouclier,
      caracMagie: pr.magie,
      pvParNiveau: FAMILLES[pr.famille].pv,
      de: FAMILLES[pr.famille].dr,
      description: descM,
      armesArmures: armesM ? armesM[1].trim() : null,
      equipementDepart: equipM ? equipM[1].trim() : null,
      voies: profVoies,
      voieDuMage: pr.famille === 'mages',
    });
  }

  // --- Voies de prestige (p. 128-175) ---
  for (const cat of PRESTIGE) {
    const lines = range(cat.debut, cat.fin).map(String);
    const { voies: vs } = splitVoies(lines);
    for (const v of vs) {
      pushVoie(parseVoieBlock(v.name, v.lines, { type: 'prestige', categorie: cat.categorie, page: pageOfVoie(cat.debut, cat.fin, v.name) }, fix));
    }
  }

  // --- Règles (sections choisies du livre) ---
  const regles = [];
  const RULE_SECTIONS = [
    { chap: 'Progression & niveaux', debut: 38, fin: 43, heads: ['POINTS DE VIGUEUR', 'VALEURS D’ATTAQUE', 'CAPACITÉS ET VOIES', 'Point de capacité orphelin', 'Appel à une autre capacité', 'Nouvelles voies', 'Voies de prestige', 'POINTS DE MANA', 'D4°, LES DÉS ÉVOLUTIFS', 'CHANGEMENT'] },
    { chap: 'Profils hybrides', debut: 176, fin: 179, heads: ['Qu’est-ce qu’un profil', 'Points de vigueur', 'Armes et armures', 'Magie et sorts', 'Capacités en doublon', 'Cumul des caractéristiques'] },
    { chap: 'Les règles de base', debut: 199, fin: 207, heads: ['MÉCANIQUE DE BASE : LE TEST', 'Dé bonus et dé malus', 'Réussite critique', 'Échec critique', 'POINTS DE CHANCE', 'Points de chance', 'Points de chance', 'Tests de chance'] },
    { chap: 'Le combat', debut: 208, fin: 223, heads: ['PRÉAMBULE : LA SURPRISE', 'UNITÉ DE TEMPS : LE ROUND', 'INITIATIVE', 'LES ACTIONS', 'Actions supplémentaires', 'Actions et tests', 'L’ACTION DE MOUVEMENT', 'Sprinter', 'TEST D’ATTAQUE', 'Tests opposés', 'Réussite critique', 'Échec critique', 'Malus aux attaques', 'États préjudiciables', 'Autres conditions', 'OPTIONS TACTIQUES', 'Riposte', 'Retarder son tour', 'Attaque groupée', 'Les manœuvres (L)', 'LES DOMMAGES', 'Réduction', 'Résistance aux dommages', 'Dommages minimaux', 'Dommages temporaires', 'LES POINTS DE VIGUEUR', 'Règle du dernier PV', 'Inconscience et mort', 'Premiers soins', 'Récupération rapide', 'Récupération complète', 'Fatigue et DR', 'FUITE', 'POURSUITE'] },
    { chap: 'Magie et sorts', debut: 227, fin: 229, heads: ['LANCER UN SORT', 'Incantation', 'Dépenses de points de mana', 'Brûlure de mana', 'Concentration accrue', 'Effets', 'Sorts de zone', 'Rendement décroissant', 'Durée du sort', 'Magicien inconscient', 'Mettre fin à un sort', 'RÉCUPÉRER'] },
  ];
  const titleCase = (s) => (s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);
  for (const sec of RULE_SECTIONS) {
    const lines = range(sec.debut, sec.fin);
    const idx = [];
    let from = 0;
    for (const h of sec.heads) {
      const i = lines.findIndex((l, k) => k >= from && String(l).trim().startsWith(h) && String(l).trim().length < h.length + 25);
      if (i >= 0) {
        idx.push({ h, i, page: lines[i].page });
        from = i + 1;
      }
    }
    idx.forEach((cur, k) => {
      const end = k + 1 < idx.length ? idx[k + 1].i : lines.length;
      let body = lines.slice(cur.i, end).map(String);
      let titre = body.shift().trim();
      // titres sur deux lignes (« RÉCUPÉRER » / « LES POINTS DE MANA »)
      if (titre === titre.toUpperCase() && body[0] && body[0] === body[0].toUpperCase() && body[0].length < 30) titre += ' ' + body.shift().trim();
      if (titre !== titre.toUpperCase() && titre.includes(' : ')) {
        const [a, ...b] = titre.split(' : ');
        titre = a;
        body.unshift(b.join(' : '));
      } else if (body[0] && /^[a-zé]/.test(body[0].trim()) && body[0].trim().length < 40 && !/:/.test(titre) && !/[.:]$/.test(body[0].trim())) titre += ' ' + body.shift().trim();
      if (/^Réduction$/.test(titre) && /^des dommages/.test(body[0] || '')) titre += ' ' + body.shift().trim();
      if (/^Malus aux attaques$/.test(titre)) titre += ' ' + body.shift().trim();
      if (/^Autres conditions$/.test(titre)) titre += ' ' + body.shift().trim();
      if (/^Qu’est-ce qu’un profil$/.test(titre)) titre += ' ' + body.shift().trim();
      const texte = fix(joinLines(body));
      if (texte.length < 40) return;
      regles.push({ id: slug(sec.chap + '-' + titre), chapitre: sec.chap, titre: titleCase(titre.replace(/\s*:\s*$/, '')), page: cur.page, texte });
    });
  }

  // --- États préjudiciables (p. 214-215) ---
  const etatLines = range(214, 215).map(String);
  const etats = [];
  const ETATS = ['Aveuglé', 'Affaibli', 'Essoufflé', 'Étourdi', 'Immobilisé', 'Invalide', 'Paralysé', 'Ralenti', 'Renversé', 'Surpris'];
  const etatText = fix(joinLines(etatLines));
  ETATS.forEach((nom, i) => {
    const next = ETATS[i + 1];
    const re = new RegExp(`${nom}\\s*:\\s*([\\s\\S]+?)(?=${next ? `\\s*[•▪]?\\s*${next}\\s*:` : '\\s*Rendement décroissant'})`);
    const m = etatText.match(re);
    etats.push({ id: slug(nom), nom, description: m ? m[1].replace(/\s+/g, ' ').replace(/^[•▪]\s*/, '').trim() : '' });
  });

  // --- Contrôles de cohérence ---
  const warnings = [];
  for (const v of voies) {
    const got = v.capacites.map((c) => c.rang);
    const ok = got.length === 5 && got.every((r, i) => r === got[0] + i);
    if (!ok) warnings.push(`${v.nom} (p. ${v.page}) : rangs trouvés ${got.join(',') || 'aucun'}`);
  }

  fs.mkdirSync(OUT, { recursive: true });
  const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 1));
  write('peuples.json', peuples);
  write('profils.json', profils);
  write('voies.json', voies);
  write('etats.json', etats);
  write('regles.json', regles);
  write('familles.json', FAMILLES);
  write('meta.json', { source: path.basename(PDF), extraitLe: new Date().toISOString(), avertissements: warnings });

  const nCaps = voies.reduce((n, v) => n + v.capacites.length, 0);
  console.log(`Peuples : ${peuples.length} · Profils : ${profils.length} · Voies : ${voies.length} · Capacités : ${nCaps} · États : ${etats.length} · Règles : ${regles.length}`);
  if (warnings.length) {
    console.log(`\n${warnings.length} voie(s) à vérifier :`);
    for (const w of warnings) console.log('  - ' + w);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
