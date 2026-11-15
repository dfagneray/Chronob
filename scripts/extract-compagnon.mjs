// Extraction du Compagnon du joueur (Chroniques Oubliées Fantasy 2).
// Usage : npm run extract:compagnon [-- chemin/vers/le.pdf]
// À lancer après `npm run extract` : le vocabulaire du Livre des règles sert à réparer le texte.
// Produit src/data/compagnon/*.json (peuples, profils, voies, regles, complements).
import fs from 'node:fs';
import path from 'node:path';
import { HEADER_RE, FOOTER_RE, normalizeChars, joinLines, parseVoieBlock, splitVoies, slug } from './pdf-commun.mjs';
import { lirePagesBrutes, construireVocabulaire, creerSegmenteur, reparerLigne, textesLivreDesRegles } from './lecture-compagnon.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA = path.join(ROOT, 'src', 'data');
const OUT = path.join(DATA, 'compagnon');
const DEFAUT = fs.readdirSync(ROOT).find((f) => /compagnon.*\.pdf$/i.test(f));
const PDF = process.argv[2] || (DEFAUT && path.join(ROOT, DEFAUT));

// Le livre est numéroté avec un décalage de 2 par rapport au PDF (couverture + page de garde).
const PAGE = (pdfPage) => pdfPage - 2;

// ---------------------------------------------------------------------------
// Nettoyage propre à la mise en page du Compagnon
// ---------------------------------------------------------------------------
const ONGLET_RE = /^(\d|INTRO|PEUPLES|PROFILS|RÈGLES|RECETTES)$/;

function nettoyerPage(lines) {
  let out = lines.filter((l) => !FOOTER_RE.test(l)).map(normalizeChars);
  const h = out.findIndex((l) => HEADER_RE.test(l.trim()));
  if (h >= 0 && h < 3) {
    out.splice(h, 1);
    // onglets latéraux (« 2 », « INTRO », « 0 », « PEUPLES »…) juste après l'en-tête
    let k = h;
    while (k < out.length && k < h + 14 && ONGLET_RE.test(out[k].trim())) k++;
    out.splice(h, k - h);
  }
  // lettrines : « C » / « e chapitre présente… »
  const res = [];
  for (let i = 0; i < out.length; i++) {
    const l = out[i].trim();
    if (/^[A-ZÀ-Ý]$/.test(l) && /^[a-zà-ÿ]/.test((out[i + 1] || '').trim())) {
      res.push(l + out[++i].trim());
    } else res.push(out[i]);
  }
  return res.filter((l) => l.trim());
}

/** Corrections typographiques du texte final (après recollage des lignes). */
function retouches(t) {
  if (!t) return t;
  for (const [a, b] of CORRECTIONS) t = t.replaceAll(a, b);
  return t
    .replace(/(?<=\d)’|’(?=\d)/g, ' ')
    .replace(/(?<=[a-zàâéèêîôûç]{2})(\d)/g, ' $1')
    .replace(/(?<=[\s’]à)(\d)/g, ' $1')
    .replace(/\bPm\b/g, 'PM')
    .replace(/\bDm\b/g, 'DM')
    .replace(/\bmJ\b/g, 'MJ')
    .replace(/\bfOR\b/g, 'FOR')
    .replace(/(^|[.!?]\s+|\n)([a-zàâéèêîôû])/g, (m, a, b) => a + b.toUpperCase())
    .replace(/\+ ?(\d)/g, '+$1')
    .replace(/ {2,}/g, ' ')
    .trim();
}
const fix = retouches;

/** Recolle des lignes en texte et applique les retouches. */
const texte = (lines) => retouches(joinLines(lines.map(String)));

/**
 * Intitulés de capacité imprimés sans « : » (« 2. Feu de camp (L)* », « 5. Château miniature »).
 * Si la ligne suivante n'apporte pas les deux-points (intitulé sur deux lignes), on les ajoute.
 */
function ajouterDeuxPoints(lines) {
  return lines.map((l, i) => {
    const n = (lines[i + 1] || '').trim();
    if (!/^[1-8] ?\. ?[^:]{2,60}$/.test(l.trim()) || /[.,;]$/.test(l.trim())) return l;
    if (n.indexOf(':') > 0 && n.indexOf(':') < 45) return l; // recollé par parseVoieBlock
    return /^[A-ZÀ-Ý•(]/.test(n) ? l.trim() + ' :' : l;
  });
}

/**
 * Colonnes imprimées dans le désordre : [début, fin] (textes exacts de lignes) à déplacer avant `avant`.
 */
const DEPLACEMENTS = [
  // p. 61 : la fin du rang 1 et le rang 2 de la voie de la télékinésie sont imprimés au milieu de la voie de l'empathie
  { debut: 'a’a que supplémentaire ne peut pas bénéficier', fin: 'de 10 m de lui.', avant: '3. Onde de choc (L)* :' },
];

/** Corrections de texte ponctuelles (mots que la couche texte du PDF a rendus illisibles). */
const CORRECTIONS = [
  ['Cette a’a que supplémentaire', 'Cette attaque supplémentaire'],
  ['l’arme sa ppliquent', 'l’arme s’appliquent'],
  ['au tests il’événement date de moins de 24 th', 'aux tests si l’événement date de moins de 24 h'],
  ['tort ure', 'torture'],
];

function appliquerDeplacements(L, avertissements) {
  for (const d of DEPLACEMENTS) {
    const a = L.findIndex((l) => String(l) === d.debut);
    const b = L.findIndex((l, i) => i >= a && String(l) === d.fin);
    if (a < 0 || b < 0) {
      avertissements.push(`Déplacement impossible : « ${d.debut} »`);
      continue;
    }
    const bloc = L.splice(a, b - a + 1);
    const c = L.findIndex((l) => String(l) === d.avant);
    if (c < 0) {
      avertissements.push(`Point d’insertion introuvable : « ${d.avant} »`);
      L.splice(a, 0, ...bloc);
      continue;
    }
    L.splice(c, 0, ...bloc);
  }
}

// ---------------------------------------------------------------------------
// Métadonnées (sommaire du Compagnon)
// ---------------------------------------------------------------------------
const C = (s) => s.split(/,\s*/).filter(Boolean);
/**
 * Modificateurs de peuple : `fixes` s'applique toujours ; `plus` / `moins` = un +1 / -1 au choix
 * parmi les options (une seule option = imposée).
 */
const PEUPLES = [
  { id: 'ame-forgee', nom: 'Âme forgée', titre: 'ÂME FORGÉE', mods: { plus: ['CON'], moins: C('CHA, INT') }, voies: ['voie-de-l-ame-forgee'] },
  { id: 'cambion', nom: 'Cambion', titre: 'CAMBION', mods: { plus: C('VOL, CON'), moins: ['CHA'] }, voies: ['voie-du-cambion'] },
  { id: 'demi-ogre', nom: 'Demi-ogre', titre: 'DEMI-OGRE', mods: { plus: [], moins: [], fixes: { FOR: 2, CON: 1, AGI: -1, INT: -1, CHA: -1, VOL: -1 } }, voies: ['voie-du-demi-ogre'] },
  { id: 'drakonide', nom: 'Drakonide', titre: 'DRAKONIDE', mods: { plus: [], moins: [], fixes: { FOR: 1, VOL: 1, AGI: -1, PER: -1 } }, voies: ['voie-du-drakonide'] },
  { id: 'elfe-pale', nom: 'Elfe pâle', titre: 'ELFE PÂLE', mods: { plus: C('PER, VOL'), moins: ['FOR'] }, voies: ['voie-de-l-elfe-pale'] },
  { id: 'elfe-des-profondeurs', nom: 'Elfe des profondeurs', titre: 'ELFE DES PROFONDEURS', mods: { plus: C('AGI, VOL'), moins: ['FOR'] }, voies: ['voie-de-l-elfe-des-profondeurs'] },
  { id: 'felis', nom: 'Félis', titre: 'FÉLIS', mods: { plus: C('AGI, PER'), moins: C('FOR, INT') }, voies: ['voie-du-felis'] },
  { id: 'frouin', nom: 'Frouïn', titre: 'FROUÏN', mods: { plus: C('AGI, PER'), moins: [], fixes: { CON: 1, FOR: -1, CHA: -1 } }, voies: ['voie-du-frouin'] },
  { id: 'gobelin', nom: 'Gobelin', titre: 'GOBELIN', mods: { plus: [], moins: [], fixes: { AGI: 1, PER: 1, FOR: -1, VOL: -1 } }, voies: ['voie-du-gobelin'] },
  { id: 'kobold', nom: 'Kobold', titre: 'KOBOLD', mods: { plus: [], moins: [], fixes: { AGI: 1, PER: 1, FOR: -1, CON: -1 } }, voies: ['voie-du-kobold'] },
  { id: 'lutins', titre: 'LUTINS' }, // décliné plus bas en fée et farfadet
  { id: 'minotaure', nom: 'Minotaure', titre: 'MINOTAURE', mods: { plus: [], moins: [], fixes: { FOR: 2, VOL: 1, INT: -2, CHA: -2 } }, voies: ['voie-du-minotaure'] },
  { id: 'nephilim', nom: 'Nephilim', titre: 'NEPHILIM', mods: { plus: C('CHA, CON'), moins: ['PER'] }, voies: ['voie-du-nephilim'] },
  { id: 'ophidien', nom: 'Ophidien', titre: 'OPHIDIEN', mods: { plus: C('INT, VOL'), moins: ['CON'] }, voies: ['voie-de-l-ophidien'] },
  { id: 'satyre', nom: 'Satyre', titre: 'SATYRE', mods: { plus: C('PER, CHA'), moins: C('VOL, INT') }, voies: ['voie-du-satyre'] },
  { id: 'wolfer', nom: 'Wolfer', titre: 'WOLFER', mods: { plus: C('PER, VOL'), moins: ['INT'] }, voies: ['voie-du-wolfer'] },
];
const LUTINS = [
  { id: 'lutin-fee', nom: 'Lutin (fée)', mods: { plus: [], moins: [], fixes: { AGI: 1, CHA: 1, CON: -1, FOR: -2 } }, voies: ['voie-de-la-fee'], modificateurs: '+1 AGI, +1 CHA, -1 CON, -2 FOR' },
  { id: 'lutin-farfadet', nom: 'Lutin (farfadet)', mods: { plus: [], moins: [], fixes: { AGI: 1, PER: 1, CON: -1, FOR: -2 } }, voies: ['voie-du-farfadet'], modificateurs: '+1 AGI, +1 PER, -1 CON, -2 FOR' },
];

// Armure max (DEF) : chemise de mailles = 4, cuir simple = 2. `bouclier: 'petit'` = petit bouclier seul.
const PROFILS = [
  { id: 'caravanier', nom: 'Caravanier', titre: 'CARAVANIER', famille: 'aventuriers', caracs: ['CHA', 'PER', 'INT'], armureMax: 4, bouclier: 'petit', magie: null },
  { id: 'chamane', nom: 'Chamane', titre: 'CHAMANE', famille: 'mystiques', caracs: ['PER', 'VOL', 'CON'], armureMax: 2, bouclier: false, magie: 'PER' },
  { id: 'parangon', nom: 'Parangon', titre: 'PARANGON', famille: 'combattants', caracs: ['AGI', 'VOL', 'PER'], armureMax: 4, bouclier: false, magie: null },
  { id: 'primaliste', nom: 'Primaliste', titre: 'PRIMALISTE', famille: 'mages', caracs: ['VOL', 'CON'], armureMax: 2, bouclier: false, magie: 'VOL', sansVoieDuMage: true },
  // Famille au choix du joueur ; capacités non limitées par l'armure ; les sorts donnent des PE (points d'ego).
  { id: 'psionique', nom: 'Psionique', titre: 'PSIONIQUE', famille: null, caracs: ['VOL', 'PER', 'CON'], armureMax: 4, bouclier: false, magie: 'VOL', sansVoieDuMage: true, armureLibre: true, energie: 'PE' },
];

const RECETTES = [
  { titre: 'VOIES DE RECETTES D’ARMES', categorie: 'armes' },
  { titre: 'VOIES DE RECETTES', suite: 'D’ARMURES', categorie: 'armures' },
  { titre: 'VOIES DE RECETTES', suite: 'DIVERSES', categorie: 'diverses' },
  { titre: 'VOIES DE RECETTES', suite: 'DE POTIONS', categorie: 'potions' },
];

// Chapitres de règles repris dans le Grimoire (titres en capitales du Compagnon)
const REGLES = [
  { chap: 'Peuples optionnels (Compagnon)', debut: 'SORTS DE VOIE DE PEUPLE ET', fin: 'ÂME FORGÉE' },
  { chap: 'Règles supplémentaires (Compagnon)', debut: 'PROPRIÉTÉS DES ARMES', fin: 'CHAPITRE 4' },
  { chap: 'Règles d’artisanat (Compagnon)', debut: 'CHAPITRE 4', fin: 'VOIES D’ARTISAN' },
  { chap: 'Règles d’artisanat (Compagnon)', debut: 'COMPÉTENCES D’ARTISAN', fin: 'CHAPITRE 5' },
  { chap: 'Voies de recettes (Compagnon)', debut: 'CHAPITRE 5', fin: 'VOIES DE RECETTES D’ARMES' },
  { chap: 'Voies de domaine de prêtre (Compagnon)', debut: 'CHAPITRE 6', fin: '\\\\ ARCANNA' },
];

// ---------------------------------------------------------------------------
// Programme principal
// ---------------------------------------------------------------------------
async function main() {
  if (!PDF || !fs.existsSync(PDF)) {
    console.error(`PDF du Compagnon introuvable : ${PDF || '(aucun fichier *compagnon*.pdf à la racine)'}`);
    process.exit(1);
  }
  console.log(`Lecture de ${path.basename(PDF)}…`);
  const brutes = await lirePagesBrutes(PDF);
  const vocab = construireVocabulaire(textesLivreDesRegles(DATA), brutes.flatMap((l) => l || []));
  const seg = creerSegmenteur(vocab);
  const pages = brutes.map((lines) => (lines ? nettoyerPage(lines.map((l) => reparerLigne(l, seg))) : []));

  // Toutes les lignes, chacune marquée de sa page (numérotation du livre)
  const L = [];
  pages.forEach((lines, p) => lines.forEach((l) => L.push(Object.assign(new String(l.trim()), { page: PAGE(p) }))));
  const idx = (pred, from = 0) => {
    for (let i = from; i < L.length; i++) if (pred(String(L[i]), i)) return i;
    return -1;
  };
  const titre = (t, from = 0) => idx((l) => l === t, from);
  const avertissements = [];
  appliquerDeplacements(L, avertissements);

  const voies = [];
  const pushVoie = (v) => {
    if (voies.some((x) => x.id === v.id)) {
      avertissements.push(`Voie en double : ${v.id}`);
      return;
    }
    // retouches typographiques des textes
    v.intro = fix(v.intro);
    for (const c of v.capacites) {
      c.description = fix(c.description);
      c.nom = c.nom.replace(/\s*:$/, '');
    }
    voies.push({ ...v, source: 'compagnon' });
  };
  const pageDe = (lines) => lines[0]?.page ?? null;
  const parseVoies = (lines, meta) => {
    const { pre, voies: vs } = splitVoies(ajouterDeuxPoints(lines.map(String)));
    // page de chaque voie : la k-ième ligne d'en-tête « \\ VOIE… » du bloc
    const entetes = lines.filter((l) => /^\\\\\s*VOIE/.test(String(l)));
    for (const [k, v] of vs.entries()) {
      const i = lines.indexOf(entetes[k]);
      const nom = v.name.replace(/^VOIES /, 'VOIE ').replace(/\s*:$/, '');
      const { prefixe = '', ...m } = meta;
      const voie = parseVoieBlock(nom, v.lines, { ...m, id: prefixe ? prefixe + slug(nom) : undefined, page: i >= 0 ? lines[i].page : pageDe(lines) }, fix);
      if (!voie.id) voie.id = slug(nom);
      for (const c of voie.capacites) {
        c.voieId = voie.id;
        c.id = `${voie.id}--${c.rang}`;
      }
      voie.nom = voie.nom.replace(/\s*:$/, '');
      pushVoie(voie);
    }
    return pre;
  };

  // --- Peuples (p. 5-38) ---
  const peuples = [];
  const finPeuples = titre('NOUVEAUX');
  const debuts = PEUPLES.map((pp) => ({ ...pp, i: titre(pp.titre) }));
  const iDemiElfe = titre('DEMI-ELFE');
  const complements = { peuples: {} };
  {
    // Voie optionnelle du demi-elfe (p. 10)
    const fin = titre('DEMI-OGRE');
    const block = L.slice(iDemiElfe + 1, fin);
    const pre = parseVoies(block, { type: 'peuple', peuple: 'demi-elfe' });
    complements.peuples['demi-elfe'] = { voies: ['voie-du-demi-elfe'], noteCompagnon: texte(pre), pageCompagnon: L[iDemiElfe].page };
  }
  debuts.forEach((pp, k) => {
    if (pp.i < 0) {
      avertissements.push(`Peuple introuvable : ${pp.titre}`);
      return;
    }
    let fin = k + 1 < debuts.length ? debuts[k + 1].i : finPeuples;
    if (pp.id === 'cambion') fin = iDemiElfe;
    const block = L.slice(pp.i + 1, fin);
    const pre = parseVoies(block, { type: 'peuple', peuple: pp.id });
    const preText = texte(pre);
    const reperes = {};
    for (const key of ['Âge de départ', 'Espérance de vie', 'Taille', 'Poids', 'Traits']) {
      const m = preText.match(new RegExp(key + '\\s*:\\s*([^\\n]+?)(?=\\s*(Âge de départ|Espérance de vie|Taille|Poids|Traits|Caractéristiques)\\s*:|\\n|$)'));
      if (m) reperes[key] = m[1].trim();
    }
    const caracLine = ((preText.match(/Caractéristiques\s*\n?([^\n]+)/) || [])[1] || '').trim();
    const [description, ...apres] = preText.split(/\nNoms typiques|\nRepères/);
    // Particularités qui suivent la ligne de caractéristiques (taille, créature non vivante…)
    const apresCaracs = preText.split(/Caractéristiques\s*\n?(?=[+•-])/)[1] || '';
    const pm = apresCaracs.match(/^[^\n]*?\s([A-ZÉ][a-zéèêîôû][\s\S]*)$/) || apresCaracs.match(/\n([\s\S]+)$/);
    const particularites = pm ? pm[1].trim() : null;
    const base = { page: L[pp.i].page, description, reperes, particularites, source: 'compagnon' };
    if (pp.id === 'lutins') {
      for (const lu of LUTINS) {
        // les deux voies de lutin sont rattachées à leur variante
        for (const id of lu.voies) {
          const v = voies.find((x) => x.id === id);
          if (v) v.peuple = lu.id;
        }
        const particularites = base.particularites?.replace(/^•?\s*Fée :[^•\n]*•?\s*Farfadet :[^\n]*\n?/, '').trim() || null;
        peuples.push({ id: lu.id, nom: lu.nom, ...base, particularites, modificateurs: lu.modificateurs, mods: lu.mods, voies: lu.voies, noteVoie: null });
      }
      return;
    }
    const modificateurs = caracLine.replace(/^[•\s]+/, '').split(/\s(?=[A-ZÉ][a-zéèêîôû])/)[0];
    peuples.push({ id: pp.id, nom: pp.nom, ...base, modificateurs, mods: pp.mods, voies: pp.voies, noteVoie: null });
  });

  // --- Profils (p. 39-63) ---
  const profils = [];
  const iPrestige = titre('VOIES DE PRESTIGE');
  PROFILS.forEach((pr, k) => {
    const i = titre(pr.titre, finPeuples);
    const fin = k + 1 < PROFILS.length ? titre(PROFILS[k + 1].titre, i) : iPrestige;
    const block = L.slice(i + 1, fin);
    const pre = parseVoies(block, { type: 'profil', profil: pr.id, famille: pr.famille });
    const preText = texte(pre.filter((l) => !/^(Famille|Points de vigueur|Caractéristiques préférées) :/.test(l)));
    const [description, reste = ''] = preText.split(/(?:^|\n|\s)Armes (?:et|&)\s*armures?\s*(?:maîtrisées)?\s*/);
    const [armes, equipEtc = ''] = reste.split(/(?:^|\n|\s)Équipement de départ\s*/);
    // l'équipement tient en un paragraphe ; la suite (règles particulières) est conservée à part
    const [equipement, ...regles] = equipEtc.split('\n');
    const [desc, ...partDesc] = description.split(/\n(?=Particularités)/);
    regles.unshift(...partDesc);
    const pvM = pre.join(' ').match(/Points de vigueur : (\d)/);
    profils.push({
      id: pr.id,
      nom: pr.nom,
      famille: pr.famille,
      page: L[i].page,
      caracteristiques: pr.caracs,
      armureMax: pr.armureMax,
      bouclier: pr.bouclier,
      armureLibre: !!pr.armureLibre,
      energie: pr.energie || null,
      caracMagie: pr.magie,
      pvParNiveau: pvM ? +pvM[1] : null,
      de: null,
      description: desc.trim(),
      particularites: regles.join('\n').trim() || null,
      armesArmures: armes.trim() || null,
      equipementDepart: equipement.trim() || null,
      voies: voies.filter((v) => v.profil === pr.id).map((v) => v.id),
      voieDuMage: pr.famille === 'mages' && !pr.sansVoieDuMage,
      source: 'compagnon',
    });
  });

  // --- Voies de prestige (p. 63-65) ---
  {
    const fin = titre('CHAPITRE 3', iPrestige);
    const block = L.slice(iPrestige + 1, fin);
    const pre = parseVoies(block, { type: 'prestige', categorie: 'mages' });
    const presentation = texte(pre);
    for (const v of voies.filter((x) => x.type === 'prestige')) v.presentation = presentation;
  }

  // --- Voies d'artisan (p. 74-76) ---
  {
    const i = titre('VOIES D’ARTISAN');
    const fin = titre('COMPÉTENCES D’ARTISAN', i);
    parseVoies(L.slice(i + 1, fin), { type: 'artisan' });
  }

  // --- Voies de recettes (p. 85-141) ---
  {
    let from = titre('CHAPITRE 5');
    const bornes = RECETTES.map((r) => {
      const i = idx((l, k) => l === r.titre && (!r.suite || String(L[k + 1]) === r.suite), from);
      from = i + 1;
      return { ...r, i: r.suite ? i + 1 : i };
    });
    const finRecettes = titre('CHAPITRE 6');
    bornes.forEach((b, k) => {
      const fin = k + 1 < bornes.length ? bornes[k + 1].i - 1 : finRecettes;
      parseVoies(L.slice(b.i + 1, fin), { type: 'recette', categorie: b.categorie, prefixe: 'recettes-' });
    });
  }

  // --- Voies de domaine de prêtre (p. 142-168) ---
  {
    const debut = titre('CHAPITRE 6');
    const lines = L.slice(debut);
    const starts = [];
    lines.forEach((l, i) => {
      const m = String(l).match(/^\\\\\s*([A-ZÀ-ÝÄËÏÖÜ’' ]+)$/);
      if (m && !/^VOIE/.test(m[1])) starts.push({ i, nom: m[1].trim() });
    });
    starts.forEach((s, k) => {
      const block = lines.slice(s.i + 1, k + 1 < starts.length ? starts[k + 1].i : lines.length);
      const divinite = s.nom
        .toLowerCase()
        .replace(/(^|[\s-])(\S)/g, (m, a, b) => a + b.toUpperCase())
        .replace(/ Le /g, ' le ');
      const symI = block.findIndex((l) => /^Symbole :/.test(l));
      const epithete = block.slice(0, Math.max(1, symI)).map(String).join(' ').trim();
      const symbole = symI >= 0 ? String(block[symI]).replace(/^Symbole :\s*/, '').trim() : null;
      const armeI = block.findIndex((l) => /^Arme privilégi[ée]e? :/.test(l));
      let arme = armeI >= 0 ? String(block[armeI]).replace(/^Arme privilégi[ée]e? :\s*/, '').trim() : null;
      let finEntete = armeI >= 0 ? armeI + 1 : symI + 1;
      while (arme && /-$/.test(arme) && block[finEntete]) arme = arme.slice(0, -1) + String(block[finEntete++]).trim();
      const corps = block.slice(finEntete).map(String);
      const elision = /^[AEIOUYÂÉÈÊ]/i.test(divinite.normalize('NFD').replace(/[̀-ͯ]/g, '')) ? 'd’' : 'de ';
      const id = `voie-de-domaine-${slug(divinite)}`;
      const v = parseVoieBlock('X', ajouterDeuxPoints(corps), { id, type: 'domaine', page: block[0]?.page ?? s.page }, fix);
      pushVoie({ ...v, nom: `Voie ${elision}${divinite}`, divinite, epithete, symbole, armePrivilegiee: arme, page: lines[s.i].page });
    });
  }

  // --- Règles (encadrés et chapitres de règles du Compagnon) ---
  const regles = [];
  for (const sec of REGLES) {
    const a = titre(sec.debut);
    const b = titre(sec.fin, a + 1);
    if (a < 0 || b < 0) {
      avertissements.push(`Section de règles introuvable : ${sec.debut}`);
      continue;
    }
    const block = L.slice(a, b);
    // découpe sur les intertitres en capitales
    const parts = [];
    let cur = null;
    for (const l of block) {
      const s = String(l);
      const head = /^[A-ZÀ-ÝŒ’' -]{4,}$/.test(s) && !/^(CHAPITRE|WW)/.test(s);
      if (head && cur && cur.lines.length === 0) cur.titre += ' ' + s;
      else if (head) {
        cur = { titre: s, page: l.page, lines: [] };
        parts.push(cur);
      } else if (cur) cur.lines.push(s);
    }
    for (const p of parts) {
      const t = texte(p.lines);
      if (t.length < 60) continue;
      const nomT = p.titre.charAt(0) + p.titre.slice(1).toLowerCase();
      regles.push({ id: slug('compagnon-' + sec.chap + '-' + nomT), chapitre: sec.chap, titre: nomT, page: p.page, texte: t, source: 'compagnon' });
    }
  }
  // Règles propres aux profils (psionique, primaliste…)
  for (const pr of profils) {
    if (pr.particularites) regles.push({ id: `compagnon-profil-${pr.id}`, chapitre: 'Nouveaux profils (Compagnon)', titre: `Règles du ${pr.nom.toLowerCase()}`, page: pr.page, texte: pr.particularites, source: 'compagnon' });
  }

  // --- Contrôles de cohérence ---
  const ldr = JSON.parse(fs.readFileSync(path.join(DATA, 'voies.json'), 'utf8'));
  for (const v of voies) {
    const got = v.capacites.map((c) => c.rang);
    const ok = got.length === 5 && got.every((r, i) => r === got[0] + i);
    if (!ok) avertissements.push(`${v.nom} (p. ${v.page}) : rangs trouvés ${got.join(',') || 'aucun'}`);
    if (ldr.some((x) => x.id === v.id)) avertissements.push(`${v.id} existe déjà dans le Livre des règles`);
  }
  for (const pp of PEUPLES) for (const id of pp.voies || []) if (!voies.some((v) => v.id === id)) avertissements.push(`Voie de peuple manquante : ${id}`);

  fs.mkdirSync(OUT, { recursive: true });
  const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 1));
  write('peuples.json', peuples);
  write('profils.json', profils);
  write('voies.json', voies);
  write('regles.json', regles);
  write('complements.json', complements);
  write('meta.json', { source: path.basename(PDF), extraitLe: new Date().toISOString(), avertissements });

  const nCaps = voies.reduce((n, v) => n + v.capacites.length, 0);
  const parType = voies.reduce((o, v) => ({ ...o, [v.type]: (o[v.type] || 0) + 1 }), {});
  console.log(`Peuples : ${peuples.length} · Profils : ${profils.length} · Voies : ${voies.length} ${JSON.stringify(parType)} · Capacités : ${nCaps} · Règles : ${regles.length}`);
  if (avertissements.length) {
    console.log(`\n${avertissements.length} avertissement(s) :`);
    for (const w of avertissements) console.log('  - ' + w);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
