// Extraction des règles de Chroniques Oubliées Fantasy 2 depuis le PDF local.
// Usage : npm run extract [-- chemin/vers/le.pdf]
// Produit des fichiers JSON dans src/data/ (peuples, profils, voies, etats).
// Les données restent locales : elles proviennent de votre exemplaire du livre.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PDF = process.argv[2] || path.join(ROOT, 'DOC-20250811-WA0000.pdf');
const OUT = path.join(ROOT, 'src', 'data');

// ---------------------------------------------------------------------------
// 1. Lecture du PDF, page par page, ligne par ligne
// ---------------------------------------------------------------------------
async function readPages(file) {
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await getDocument({ data, verbosity: 0 }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const lines = [];
    let cur = '';
    let lastY = null;
    for (const it of tc.items) {
      if (!('str' in it)) continue;
      const y = Math.round(it.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(cur);
        cur = '';
      }
      cur += it.str;
      if (it.hasEOL) {
        lines.push(cur);
        cur = '';
        lastY = null;
        continue;
      }
      lastY = y;
    }
    if (cur) lines.push(cur);
    pages[p] = lines.map((l) => l.replace(/\s+$/g, '')).filter((l) => l.trim());
  }
  return pages;
}

// ---------------------------------------------------------------------------
// 2. Nettoyage : en-têtes, pieds de page, onglets latéraux, points de conduite
// ---------------------------------------------------------------------------
const HEADER_RE = /^(PAGE \d+\s+.+|.+\s+PAGE \d+)$/;
const FOOTER_RE = /\S+@\S+\s+-\s+\d+\/\d+\/\d+\s*$/; // ligne d'identification d'exemplaire

function normalizeChars(s) {
  return s
    .replace(/�/g, '')
    .replace(/[\u0000-\u0008\u000B-\u001F]/g, '')
    .replace(/[‑‐]/g, '-')
    .replace(/[   ]/g, ' ')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/ﬀ/g, 'ff')
    .replace(/ﬃ/g, 'ffi')
    .replace(/\s{2,}/g, ' ')
    .trimEnd();
}

function cleanPage(lines) {
  let out = lines.filter((l) => !FOOTER_RE.test(l)).map(normalizeChars);
  const h = out.findIndex((l) => HEADER_RE.test(l.trim()));
  if (h >= 0) {
    // Onglet latéral (pages impaires) : lignes courtes juste avant l'en-tête
    let start = h;
    while (start > 0 && out[start - 1].trim().length <= 14 && !/[.:;,]$/.test(out[start - 1])) start--;
    const before = out.slice(0, start);
    // Marqueurs de chapitres juste après l'en-tête (INTRO, PERSO, chiffres)
    let after = h + 1;
    while (after < out.length && /^(INTRO|PERSO|\d{1,2})$/.test(out[after].trim())) after++;
    out = [...before, ...out.slice(after)];
  }
  return out.filter((l) => l.trim());
}

// ---------------------------------------------------------------------------
// 3. Réparation des ligatures cassées (pages où la police est mal encodée)
// ---------------------------------------------------------------------------
function buildVocab(allText) {
  const vocab = new Map();
  for (const w of allText.toLowerCase().match(/[a-zàâäçéèêëîïôöûùüÿœæ]+/g) || []) {
    vocab.set(w, (vocab.get(w) || 0) + 1);
  }
  return vocab;
}

function makeFixer(vocab) {
  const count = (w) => vocab.get(w.toLowerCase()) || 0;
  const LIGS = ['ff', 'fi', 'fl', 'ffi', 'ffl', 'tt', 'ft', 'f', 't'];
  const variants = (word) => {
    // remplace chaque occurrence suspecte ("tt" ou apostrophe interne) par une ligature
    const parts = word.split(/(tt|’)/);
    let results = [''];
    for (const part of parts) {
      if (part === 'tt' || part === '’') {
        const opts = part === 'tt' ? [...LIGS] : LIGS.filter((x) => x !== 't');
        const next = [];
        for (const r of results) for (const o of opts) next.push(r + o);
        results = next.slice(0, 400);
      } else results = results.map((r) => r + part);
    }
    return results;
  };
  const fixWord = (word) => {
    if (!/tt|’/.test(word)) return word;
    const lower = word.toLowerCase();
    if (/^(d|l|n|c|s|j|m|t|qu|jusqu|lorsqu|puisqu|quoiqu)’/.test(lower)) {
      const [head, ...rest] = word.split('’');
      return head + '’' + fixWord(rest.join('’'));
    }
    const own = count(word);
    let best = word;
    let bestN = own;
    for (const v of variants(word)) {
      const n = count(v);
      if (n > bestN * 3 && n >= 2) {
        best = v;
        bestN = n;
      }
    }
    return best;
  };
  return (text) => {
    let t = text;
    // « dttune » -> « d’une », « nttest » -> « n’est »
    const NL = '(?<![A-Za-zÀ-ÿ’])'; // début de mot (compatible lettres accentuées)
    t = t.replace(new RegExp(NL + '(d|l|n|c|s|j|m|qu|jusqu|lorsqu|puisqu)tt(?=[aeiouyhàâéèêîôû])', 'gi'), '$1’');
    // « 1ttDM » -> « 1 DM », « 10’km » -> « 10 km »
    t = t.replace(/(\d)tt(?=\S)/g, '$1 ').replace(/\s?tt([–-])tt/g, ' $1 ').replace(/(\d)’(?=[a-zA-Z])/g, '$1 ');
    // apostrophes manquantes : « d acier » -> « d’acier »
    t = t.replace(new RegExp('(?<![\\d,] ?)' + NL + '([dlnsmc]|qu|jusqu|lorsqu|puisqu) (?=[aeiouyhàâéèêîôû])', 'gi'), '$1’');
    // « j oueur » -> « joueur », « ê tre » -> « être », « ç a » -> « ça »
    t = t.replace(new RegExp(NL + '([jJêÊçÇ]) ([a-zàâéèêîôû]+)', 'g'), (m, a, b) => (count(a + b) > 0 ? a + b : a.toLowerCase() === 'j' ? a + '’' + b : m));
    t = t.replace(/[A-Za-zÀ-ÿ’]+/g, (w) => fixWord(w));
    t = t.replace(/(\w)’(\w)/g, (m, a, b) => m); // garde les apostrophes légitimes
    return t;
  };
}

// Recolle les lignes en paragraphes (césures « -/‑ » en fin de ligne)
function joinLines(lines) {
  let out = '';
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    if (!out) {
      out = l;
      continue;
    }
    const startsBlock = /^([•▪]|\d+ [A-ZÉ]|NC \d)/.test(l);
    if (/[a-zà-ÿ]-$/.test(out) && /^[a-zà-ÿ]/.test(l)) out = out.slice(0, -1) + l;
    else if (/[.:;!?»)]$/.test(out) && (startsBlock || /^[A-ZÀ-Ý«]/.test(l))) out += '\n' + l;
    else out += ' ' + l;
  }
  return out
    .replace(/\(\s*[SVI]\)\s*/g, '\n') // pictogrammes des profils de créature (Défense, Vigueur, Initiative)
    .replace(/\bWW\s*(?=[A-ZÀ-Ý])/g, '\n')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ([,.])/g, '$1')
    .trim();
}

// ---------------------------------------------------------------------------
// 4. Analyse des voies et capacités
// ---------------------------------------------------------------------------
const CAP_RE = /^([1-8]) ?\. ?(.+?)\s*:\s*(.*)$/;
const ACTION_RE = /\s*\(([ALMG])\)\s*(\*)?\s*$/;

function slug(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function prettyVoieName(upper) {
  // « VOIE DE L’ARTILLEUR » -> « Voie de l’artilleur »
  const s = upper.toLowerCase().replace(/\s+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CARAC_WORDS = {
  AGI: /\b(AGI|Agilité)(?![A-Za-zÀ-ÿ])/,
  CON: /\b(CON|Constitution)(?![A-Za-zÀ-ÿ])/,
  FOR: /\b(FOR|Force)(?![A-Za-zÀ-ÿ])/,
  PER: /\b(PER|Perception)(?![A-Za-zÀ-ÿ])/,
  CHA: /\b(CHA|Charisme)(?![A-Za-zÀ-ÿ])/,
  INT: /\b(INT|Intelligence)(?![A-Za-zÀ-ÿ])/,
  VOL: /\b(VOL|Volonté)(?![A-Za-zÀ-ÿ])/,
};

// Détection prudente des effets chiffrés (suggestions appliquées sur la fiche)
const CONDITION = /(lorsqu|quand|(?<![a-zà-ÿ])si |s’il |contre |pendant|durant|tant qu|une fois|round|jusqu|au choix|choisi|après|reste du combat|sauf|en milieu|(?<![a-zà-ÿ])tient |(?<![a-zà-ÿ])manie |milieu naturel|en vue)/i;

/** Un bonus est permanent si ni le début de la phrase ni sa proposition ne posent de condition. */
function estPermanent(s, idx, len, sort) {
  const avant = s.slice(0, idx);
  const apres = s.slice(idx + len).split(/[,;(.]/)[0];
  if (CONDITION.test(avant) || CONDITION.test(apres)) return false;
  // un sort ne donne un bonus permanent que s'il le dit explicitement
  if (sort && !/En plus de ce sort|De plus, le mage/.test(s)) return false;
  return true;
}

/** Paliers d'un bonus selon le rang : « (+2 au rang 4) », « passe à +2 au rang 5 », « +1 supplémentaire au rang 7 », « augmente de +1 au rang 3 puis au rang 5 ». */
function paliersDe(suite, base) {
  const out = [];
  let m;
  if ((m = suite.match(/^[^.]*?passe à \+(\d+) au rang (\d)/))) out.push({ rang: +m[2], value: +m[1] });
  else if ((m = suite.match(/^\s*\(\+(\d+) au rang (\d)\)/))) out.push({ rang: +m[2], value: +m[1] });
  else if ((m = suite.match(/^[^.]*?\+(\d+) supplémentaire au rang (\d)/))) out.push({ rang: +m[2], value: base + +m[1] });
  else if ((m = suite.match(/^\.?\s*Ce bonus augmente de \+(\d+) au rang (\d)(?: puis au rang (\d))?/))) {
    out.push({ rang: +m[2], value: base + +m[1] });
    if (m[3]) out.push({ rang: +m[3], value: base + 2 * +m[1] });
  }
  return out;
}

function detectEffects(desc, sort = false) {
  const effects = { carac: {}, mods: [], frequence: null, choixCarac: false };
  const sentences = desc.replace(/Init\./g, 'Init').split(/(?<=[.;])\s+/);
  for (const s of sentences) {
    if (/PROFIL HYBRIDE|profil hybride peut/.test(s)) continue; // encadrés de règles alternatives
    if (/augmente/.test(s) && /de \+1/.test(s) && !/^Plutôt/.test(s.trim())) {
      // tout ce qui précède le dernier « de +1 » (ex. « sa caractéristique la plus faible de +1 et sa Volonté de +1 »)
      const head = s.slice(0, s.lastIndexOf('de +1'));
      if (!/(DM|DEF|attaque|Init|PM|PV|portée)\s*$/.test(head.trim())) {
        if (/caractéristique la plus faible/.test(head)) effects.choixCarac = true;
        // « sa valeur d’INT ou de CHA » : choix laissé au joueur
        const choix = new Set();
        const ouRe = /(?:d’|de |l’)?(AGI|CON|FOR|PER|CHA|INT|VOL)\s+ou\s+(?:d’|de |l’)?(AGI|CON|FOR|PER|CHA|INT|VOL)/g;
        let mo;
        while ((mo = ouRe.exec(head))) {
          choix.add(mo[1]);
          choix.add(mo[2]);
          effects.choixCarac = true;
        }
        for (const [k, re] of Object.entries(CARAC_WORDS)) {
          if (!choix.has(k) && re.test(head) && /(valeur|valeurs|son|sa|ses)/.test(head)) effects.carac[k] = 1;
        }
      }
    }
    if (/^Plutôt qu’augmenter/.test(s.trim())) effects.choixCarac = true;
    const pmCarac = s.match(/ajoute (?:désormais )?sa (AGI|CON|FOR|PER|CHA|INT|VOL) (?:au nombre de PM|pour calculer ses PM)/);
    if (pmCarac) effects.pmCarac = pmCarac[1];
    let m;
    // Bonus de DEF / Init. permanents (« gagne +1 en DEF », « +1 en Init et en DEF », « +2 en Initiative, en DEF… »)
    const statRe = /\+(\d+) ((?:(?:en|à la) (?:DEF|Défense|Initiative|Init)\b(?:\s*(?:,|et)\s*)?)+)/g;
    while ((m = statRe.exec(s))) {
      const avant = s.slice(Math.max(0, m.index - 45), m.index);
      if (!/(gagne|obtient|bonus|bénéficie)/.test(avant)) continue;
      const stats = [];
      if (/DEF|Défense/.test(m[2])) stats.push('DEF');
      if (/Init/.test(m[2])) stats.push('INIT');
      const auto = estPermanent(s, m.index, m[0].length, sort);
      const paliers = paliersDe(s.slice(m.index + m[0].length), +m[1]);
      for (const stat of stats) effects.mods.push({ stat, value: +m[1], auto, paliers, source: s.trim() });
    }
    // « gagne son CHA en Initiative »
    const ic = s.match(/gagne son (AGI|CON|FOR|PER|CHA|INT|VOL) en Init/);
    if (ic) effects.initCarac = ic[1];
    // PV supplémentaires
    if ((m = s.match(/gagne (?:immédiatement )?(\d+) PV supplémentaires?( par rang atteint dans la voie)?(, auxquels il ajoute sa CON)?/)) && !/récup|soign|guérit|dort/.test(s)) {
      effects.mods.push({ stat: 'PV', value: +m[1], parRang: !!m[2], plusCarac: m[3] ? 'CON' : undefined, auto: true, source: s.trim() });
    }
    // PM supplémentaires (Tour de magie) — pas les surcoûts de sorts
    if ((m = s.match(/gagne [^.]{0,20}\+(\d+) PM/)) && !/coût|payant|dépens|augmente de/.test(s)) {
      effects.mods.push({ stat: 'PM', value: +m[1], auto: true, source: s.trim() });
    }
    if ((m = s.match(/gagne (\d+) PC supplémentaire/))) effects.mods.push({ stat: 'PC', value: +m[1], auto: true, source: s.trim() });
  }
  // « Le bonus de DEF passe à +2 au rang 5 » dans une phrase séparée
  const pal = desc.match(/bonus de (?:DEF|Défense) passe à \+(\d+) au rang (\d)/);
  if (pal) for (const md of effects.mods) if (md.stat === 'DEF' && !md.paliers.length) md.paliers = [{ rang: +pal[2], value: +pal[1] }];
  const pas = desc.match(/(Ce|Le) bonus(?: de (DEF|Défense))? passe à \+(\d+) ?au rang (\d)(?: et (?:à )?\+(\d+) ?au rang (\d))?/);
  if (pas)
    for (const md of effects.mods)
      if ((md.stat === 'DEF' || (pas[1] === 'Ce' && !pas[2] && md.stat === 'INIT')) && !md.paliers.length) {
        md.paliers = [{ rang: +pas[4], value: +pas[3] }];
        if (pas[5]) md.paliers.push({ rang: +pas[6], value: +pas[5] });
      }
  const aug = desc.match(/Ce bonus augmente de \+(\d+) au rang (\d)(?: puis au rang (\d))?/);
  if (aug)
    for (const md of effects.mods)
      if (md.stat === 'DEF' && !md.paliers.length) {
        md.paliers = [{ rang: +aug[2], value: md.value + +aug[1] }];
        if (aug[3]) md.paliers.push({ rang: +aug[3], value: md.value + 2 * +aug[1] });
      }
  if (/une fois par combat/i.test(desc)) effects.frequence = 'combat';
  else if (/une fois par jour|par jour/i.test(desc)) effects.frequence = 'jour';
  return effects;
}

function parseVoieBlock(name, rawLines, meta, fix) {
  // Fusionne les intitulés de capacité coupés sur deux lignes (« 5. Appel » / « du feu (A)* : »)
  const lines = [];
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i].trim();
    const n = (rawLines[i + 1] || '').trim();
    if (/^[1-8] ?\. ?[^:]{2,60}$/.test(l) && !/[.,;]$/.test(l) && n.indexOf(':') > 0 && n.indexOf(':') < 45) {
      lines.push(l + ' ' + n);
      i++;
    } else lines.push(l);
  }
  const caps = [];
  const intro = [];
  let cur = null;
  let expected = null;
  for (const raw of lines) {
    const l = raw.trim();
    const m = l.match(CAP_RE);
    const rank = m ? +m[1] : null;
    const okRank = m && (expected === null ? rank >= 1 && rank <= 4 : rank === expected) && m[2].length < 70;
    if (okRank) {
      if (cur) caps.push(cur);
      let label = m[2].trim();
      let action = null;
      let sort = false;
      const am = label.match(ACTION_RE);
      if (am) {
        action = am[1];
        sort = !!am[2];
        label = label.replace(ACTION_RE, '');
      }
      if (/\*$/.test(label)) {
        sort = true;
        label = label.replace(/\s*\*$/, '');
        const am2 = label.match(/\s*\(([ALMG])\)$/);
        if (am2) {
          action = am2[1];
          label = label.replace(/\s*\(([ALMG])\)$/, '');
        }
      }
      cur = { rang: rank, nom: fix(label.trim()), action, sort, lines: m[3] ? [m[3]] : [] };
      expected = rank + 1;
    } else if (cur) cur.lines.push(l);
    else intro.push(l);
  }
  if (cur) caps.push(cur);
  // Voie à capacité unique évolutive (« Rangs 4 à 8 : »)
  if (!caps.length) {
    const idx = intro.findIndex((l) => /^Rangs? (\d) à (\d) ?:/.test(l));
    if (idx >= 0) {
      const [, a, b] = intro[idx].match(/^Rangs? (\d) à (\d)/);
      const body = intro.splice(idx).slice(1);
      for (let r = +a; r <= +b; r++) caps.push({ rang: r, nom: `${prettyVoieName(name).replace(/^Voie (de la |de l’|du |des |de )/i, '').replace(/^./, (c) => c.toUpperCase())} (rang ${r})`, action: null, sort: false, lines: body });
    }
  }
  const voieId = meta.id || slug(name);
  const introText = fix(joinLines(intro));
  const prerequis = (introText.match(/(?:Prérequis|Requis)\s*:\s*([^\n]+)/) || [])[1] || null;
  const pvMatch = introText.match(/obtient (\d) PV par niveau/);
  const capacites = caps.map((c) => {
    const description = fix(joinLines(c.lines));
    return {
      id: `${voieId}--${c.rang}`,
      voieId,
      rang: c.rang,
      nom: c.nom,
      action: c.action,
      sort: c.sort,
      description,
      effets: detectEffects(description, c.sort),
    };
  });
  return {
    id: voieId,
    nom: prettyVoieName(name),
    ...meta,
    intro: introText || null,
    prerequis: prerequis ? fix(prerequis) : null,
    pvParNiveau: pvMatch ? +pvMatch[1] : null,
    capacites,
  };
}

// Découpe une suite de lignes en voies (« \\ VOIE ... »)
function splitVoies(lines) {
  const res = [];
  let cur = null;
  let pre = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    const m = l.match(/^\\\\\s*(VOIE.*)$/);
    if (m) {
      let name = m[1].trim();
      // nom sur deux lignes (« VOIE DE » / « L’INVOCATION MAJEURE »)
      while (lines[i + 1] && /^[A-ZÀ-Ý’' -]{3,30}$/.test(lines[i + 1].trim()) && !/^WW/.test(lines[i + 1].trim())) {
        name += ' ' + lines[++i].trim();
      }
      cur = { name, lines: [] };
      res.push(cur);
    } else if (cur) cur.lines.push(l);
    else pre.push(l);
  }
  return { pre, voies: res };
}

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
