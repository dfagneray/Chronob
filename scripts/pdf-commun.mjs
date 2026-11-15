// Outils communs d’extraction PDF (Livre des règles, Compagnon du joueur).
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';

// ---------------------------------------------------------------------------
// 1. Lecture du PDF, page par page, ligne par ligne
// ---------------------------------------------------------------------------
export async function readPages(file) {
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
export const HEADER_RE = /^(PAGE \d+\s+.+|.+\s+PAGE \d+)$/;
export const FOOTER_RE = /\S+@\S+\s+-\s+\d+\/\d+\/\d+\s*$/; // ligne d'identification d'exemplaire

export function normalizeChars(s) {
  return s
    .replace(/�/g, '')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\uE000-\uF8FF]/g, '')
    .replace(/[‑‐]/g, '-')
    .replace(/[   ]/g, ' ')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/ﬀ/g, 'ff')
    .replace(/ﬃ/g, 'ffi')
    .replace(/\s{2,}/g, ' ')
    .trimEnd();
}

export function cleanPage(lines) {
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
export function buildVocab(allText) {
  const vocab = new Map();
  for (const w of allText.toLowerCase().match(/[a-zàâäçéèêëîïôöûùüÿœæ]+/g) || []) {
    vocab.set(w, (vocab.get(w) || 0) + 1);
  }
  return vocab;
}

export function makeFixer(vocab) {
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
export function joinLines(lines) {
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
export const CAP_RE = /^([1-8]) ?\. ?(.+?)\s*:\s*(.*)$/;
export const ACTION_RE = /\s*\(([ALMG])\)\s*(\*)?\s*$/;

export function slug(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function prettyVoieName(upper) {
  // « VOIE DE L’ARTILLEUR » -> « Voie de l’artilleur »
  const s = upper.toLowerCase().replace(/\s+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const CARAC_WORDS = {
  AGI: /\b(AGI|Agilité)(?![A-Za-zÀ-ÿ])/,
  CON: /\b(CON|Constitution)(?![A-Za-zÀ-ÿ])/,
  FOR: /\b(FOR|Force)(?![A-Za-zÀ-ÿ])/,
  PER: /\b(PER|Perception)(?![A-Za-zÀ-ÿ])/,
  CHA: /\b(CHA|Charisme)(?![A-Za-zÀ-ÿ])/,
  INT: /\b(INT|Intelligence)(?![A-Za-zÀ-ÿ])/,
  VOL: /\b(VOL|Volonté)(?![A-Za-zÀ-ÿ])/,
};

// Détection prudente des effets chiffrés (suggestions appliquées sur la fiche)
export const CONDITION = /(lorsqu|quand|(?<![a-zà-ÿ])si |s’il |contre |pendant|durant|tant qu|une fois|round|jusqu|au choix|choisi|après|reste du combat|sauf|en milieu|(?<![a-zà-ÿ])tient |(?<![a-zà-ÿ])manie |milieu naturel|en vue)/i;

/** Un bonus est permanent si ni le début de la phrase ni sa proposition ne posent de condition. */
export function estPermanent(s, idx, len, sort) {
  const avant = s.slice(0, idx);
  const apres = s.slice(idx + len).split(/[,;(.]/)[0];
  if (CONDITION.test(avant) || CONDITION.test(apres)) return false;
  // un sort ne donne un bonus permanent que s'il le dit explicitement
  if (sort && !/En plus de ce sort|De plus, le mage/.test(s)) return false;
  return true;
}

/** Paliers d'un bonus selon le rang : « (+2 au rang 4) », « passe à +2 au rang 5 », « +1 supplémentaire au rang 7 », « augmente de +1 au rang 3 puis au rang 5 ». */
export function paliersDe(suite, base) {
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

export function detectEffects(desc, sort = false) {
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

export function parseVoieBlock(name, rawLines, meta, fix) {
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
export function splitVoies(lines) {
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
