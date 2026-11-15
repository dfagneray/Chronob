// Lecture du PDF du Compagnon du joueur.
// Sa couche texte est en partie abîmée : paragraphes justifiés éclatés lettre par lettre
// (« U n e f o i s », « s o u m i s e s a u x » sans espaces entre les mots). On reconstruit
// les lignes, puis on resegmente les mots collés à l'aide d'un vocabulaire français
// tiré du Livre des règles déjà extrait et des passages sains du Compagnon.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';
import path from 'node:path';

const LETTRE = 'A-Za-zÀ-ÖØ-öø-ÿœŒæÆ';
const MOT_RE = new RegExp(`[${LETTRE}]+`, 'g');

/** Lit les pages en lignes, en ignorant le texte pivoté (onglets latéraux). */
export async function lirePagesBrutes(file) {
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await getDocument({ data, verbosity: 0 }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    const items = tc.items.filter((it) => 'str' in it && it.transform[1] === 0 && it.transform[2] === 0);
    const lines = [];
    let cur = '';
    let lastY = null;
    let isolees = 0; // lettres isolées recollées sur la ligne courante
    const pousser = () => {
      lines.push(isolees >= 4 ? ECLATEE + cur : cur);
      cur = '';
      isolees = 0;
    };
    items.forEach((it, i) => {
      const y = Math.round(it.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 2) pousser();
      // « f o i s » : lettres espacées à l'intérieur d'un même fragment
      cur += /^(\S )+\S$/.test(it.str) ? it.str.replace(/ /g, '') : it.str;
      const next = items[i + 1];
      const memeLigne = next && Math.abs(Math.round(next.transform[5]) - y) <= 2;
      // fin de ligne signalée sur une lettre isolée suivie d'une lettre sur la même ligne : on ignore
      if (it.hasEOL && it.str.length === 1 && memeLigne) isolees++;
      else if (it.hasEOL) {
        pousser();
        lastY = null;
        return;
      }
      lastY = y;
    });
    if (cur) pousser();
    pages[p] = lines.map((l) => l.replace(/\s+$/g, '')).filter((l) => l.trim());
  }
  return pages;
}

/** Une ligne est « éclatée » si elle contient une suite de caractères isolés séparés par des espaces. */
const ECLATEE = '\u0002'; // marque une ligne dont les lettres ont été recollées sans espaces
export const estEclatee = (l) => l.startsWith(ECLATEE) || /(?:^|\s)(?:\S\s){4,}\S(?=\s|$)/.test(l);

const compter = (textes) => {
  const m = new Map();
  for (const t of textes) for (const w of t.toLowerCase().match(MOT_RE) || []) m.set(w, (m.get(w) || 0) + 1);
  return m;
};

/**
 * Vocabulaire : tous les mots du Livre des règles, plus les mots des lignes saines du Compagnon
 * vus au moins deux fois (un mot collé n'apparaît qu'une fois et ne doit pas passer pour un mot).
 */
export function construireVocabulaire(textesLdR, lignesCompagnon) {
  const vocab = compter(textesLdR);
  const sains = lignesCompagnon.filter((l) => !estEclatee(l)).map(nettoyerCaracteres);
  for (const [w, n] of compter(sains)) if (n >= 2 || vocab.has(w)) vocab.set(w, (vocab.get(w) || 0) + n);
  return vocab;
}

/** Segmenteur (Viterbi sur fréquences d'unigrammes). */
export function creerSegmenteur(vocab) {
  let total = 0;
  for (const n of vocab.values()) total += n;
  const logTotal = Math.log(total);
  const MAXL = 26;
  const ELIDABLES = new Set(['d', 'l', 'n', 's', 'j', 'c', 'm', 'qu', 'jusqu', 'lorsqu', 'puisqu']);
  const VOYELLE = /[aeiouyhàâéèêîôû]/;
  const cout = (w, suivant = '') => {
    if (ELIDABLES.has(w)) return VOYELLE.test(suivant) ? 9 + (vocab.has(w) ? logTotal - Math.log(vocab.get(w)) : 4) : Infinity;
    if (w.length === 1 && !/[aày]/.test(w)) return 18 + 2.5; // lettre isolée : traitée comme inconnue
    const n = vocab.get(w);
    if (n) return logTotal - Math.log(n);
    return 18 + 2.5 * w.length; // mot inconnu
  };
  const segmenter = (lettres) => {
    const s = lettres.toLowerCase();
    const n = s.length;
    const best = new Array(n + 1).fill(Infinity);
    const prev = new Array(n + 1).fill(0);
    best[0] = 0;
    for (let i = 1; i <= n; i++) {
      for (let j = Math.max(0, i - MAXL); j < i; j++) {
        const c = best[j] + cout(s.slice(j, i), s[i] || '');
        if (c < best[i]) {
          best[i] = c;
          prev[i] = j;
        }
      }
    }
    const cuts = [];
    for (let i = n; i > 0; i = prev[i]) cuts.unshift([prev[i], i]);
    return { mots: cuts.map(([a, b]) => lettres.slice(a, b)), cout: best[n] };
  };
  const connu = (w) => w.length > 1 && vocab.has(w.toLowerCase());
  return { segmenter, cout, connu };
}

const MARQUE = '\u0001'; // glyphe de ligature mal encodé (fi, fl, tt, apostrophe, espace…)
const CANDIDATS = ['fi', 'fl', 'ff', 'ffi', 'tt', 'ft', 'f', 't', '’', ' ', ''];
const ELISION_RE = new RegExp(`(?<![${LETTRE}’])([dlnsjcm]|qu|jusqu|lorsqu|puisqu) (?=[aeiouyhàâéèêîôûAEIOUYHÀÂÉÈÊÎÔÛ])`, 'g');

/** Nettoie les caractères de contrôle propres à ce PDF. */
export function nettoyerCaracteres(l) {
  return l
    .replace(/[\u0091\u008D]+/g, '• ')
    .replace(/[\u001B-\u001E]/g, MARQUE)
    .replace(/[\u0000\u0002-\u0008\u000B-\u001A\u001F\u007F-\u009F\uE000-\uF8FF\uFFFD]/g, '');
}

/** Coût de segmentation d'un texte (somme sur ses suites de lettres). */
function coutTexte(t, seg) {
  let c = 0;
  for (const run of t.match(MOT_RE) || []) c += seg.connu(run) ? seg.cout(run.toLowerCase()) : seg.segmenter(run).cout;
  return c;
}

/** Remplace chaque glyphe mal encodé par la ligature qui donne le texte le plus plausible. */
function resoudreMarques(bloc, seg) {
  let b = bloc;
  while (b.includes(MARQUE)) {
    let best = null;
    for (const cand of CANDIDATS) {
      const essai = b.replace(MARQUE, cand);
      const c = coutTexte(essai.replaceAll(MARQUE, ''), seg);
      if (!best || c < best.c) best = { essai, c };
    }
    b = best.essai;
  }
  return b;
}

/** Réécrit une ligne : ligatures, mots collés, lignes éclatées lettre par lettre. */
export function reparerLigne(ligne, seg) {
  const eclatee = estEclatee(ligne);
  let l = nettoyerCaracteres(ligne);
  if (eclatee) l = l.replace(/\s+/g, '');
  l = l.replace(new RegExp(`[${LETTRE}${MARQUE}]+`, 'g'), (bloc) => {
    let b = bloc.includes(MARQUE) ? resoudreMarques(bloc, seg) : bloc;
    return b.replace(MOT_RE, (run) => {
      if (seg.connu(run)) return run;
      if (!eclatee && (run.length < 10 || run === run.toUpperCase())) return run;
      const { mots, cout } = seg.segmenter(run);
      if (mots.length < 2 || cout >= seg.cout(run.toLowerCase())) return run;
      // ligne saine : on ne découpe un mot inconnu que si tous les morceaux sont des mots connus
      // (sauf très long mot inconnu : forcément des mots collés)
      if (!eclatee && run.length < 14 && !mots.every((m) => seg.connu(m) || /^(a|à|y|[dlnsjcm]|qu)$/i.test(m))) return run;
      return mots.join(' ').replace(ELISION_RE, '$1’');
    });
  });
  if (eclatee) {
    // espaces typographiques autour de la ponctuation
    l = l
      .replace(/([,.;:!?)»])(?=[A-Za-zÀ-ÿ«(\[0-9])/g, '$1 ')
      .replace(/(?<! )([;:!?»])/g, ' $1')
      .replace(/«(?=\S)/g, '« ')
      .replace(/([^\s(\[])\(/g, '$1 (')
      .replace(/([^\s(\[])\[/g, '$1 [')
      .replace(/(\d)([A-Za-zÀ-ÿ])/g, (m, a, b) => (/[d°]/.test(b) ? m : `${a} ${b}`))
      .replace(/ {2,}/g, ' ');
  }
  // élisions collées au mot précédent : « prêtred’Orbis » -> « prêtre d’Orbis »
  l = l.replace(new RegExp(`([${LETTRE}]{2,})(d|l|n|s|j|c|m|qu|jusqu|lorsqu)’(?=[${LETTRE}])`, 'g'), (m, avant, el) =>
    seg.connu(avant + el) || !seg.connu(avant) ? m : `${avant} ${el}’`,
  );
  return l.replace(new RegExp(`(?<=[${LETTRE}])’ (?=[${LETTRE}])`, 'g'), '’').replace(/(?<=[0-9m])à(?= )/g, ' à');
}

/** Charge les textes du Livre des règles déjà extraits (src/data) pour le vocabulaire. */
export function textesLivreDesRegles(dataDir) {
  const out = [];
  for (const f of ['voies.json', 'regles.json', 'peuples.json', 'profils.json']) {
    const p = path.join(dataDir, f);
    if (fs.existsSync(p)) out.push(fs.readFileSync(p, 'utf8'));
  }
  return out;
}
