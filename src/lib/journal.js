// Journal des actions d'un personnage (à la manière d'un « chatter ») :
// chaque modification de la fiche est comparée à l'état précédent et consignée.
import { voieById, capaciteById, peupleById, profilById, etatById, familles, CARAC_NOMS } from '../data/index.js';
import { POSTURES } from './rules.js';

export const JOURNAL_MAX = 500; // nombre maximal d'entrées conservées
export const FUSION_MS = 45_000; // clics rapides sur une même valeur regroupés en une seule ligne

export const CATEGORIES_JOURNAL = {
  combat: 'Combat',
  progression: 'Progression',
  equipement: 'Équipement & bourse',
  fiche: 'Fiche',
  note: 'Notes',
};

const BONUS_LABELS = { DEF: 'Défense', INIT: 'Initiative', CONTACT: 'Attaque au contact', DISTANCE: 'Attaque à distance', MAGIQUE: 'Attaque magique', PV: 'PV max', PM: 'PM max', PE: 'PE max', PC: 'PC max', DR: 'DR max', ...CARAC_NOMS };
const MAX_LABELS = { PV: 'PV max (manuel)', PC: 'PC max (manuel)', PM: 'PM max (manuel)', PE: 'PE max (manuel)', DR: 'DR max (manuel)' };

const court = (t, n = 60) => {
  const s = String(t ?? '').replace(/\s+/g, ' ').trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};
const nomCap = (voieId, rang) => voieById[voieId]?.capacites.find((c) => c.rang === rang)?.nom;
const signe = (n) => (n >= 0 ? `+${n}` : `${n}`);

/**
 * Liste des changements entre deux versions d'un personnage.
 * Chaque changement : { cle, cat, label, de, a, texte? } — `texte` remplace l'affichage « de → a ».
 */
export function diffPerso(av, ap) {
  if (!av || !ap) return [];
  const ch = [];
  const val = (cle, cat, label, de, a) => {
    if (de !== a && !(de == null && a == null)) ch.push({ cle, cat, label, de: de ?? '—', a: a ?? '—' });
  };
  const evt = (cle, cat, texte) => ch.push({ cle, cat, texte });

  // Identité
  val('nom', 'fiche', 'Nom', av.nom, ap.nom);
  val('joueur', 'fiche', 'Joueur', av.joueur || '', ap.joueur || '');
  if (av.peupleId !== ap.peupleId) val('peuple', 'fiche', 'Peuple', peupleById[av.peupleId]?.nom, peupleById[ap.peupleId]?.nom);
  if (av.profilId !== ap.profilId) val('profil', 'fiche', 'Profil', profilById[av.profilId]?.nom, profilById[ap.profilId]?.nom);
  if (av.voiePeuple !== ap.voiePeuple) val('voiePeuple', 'fiche', 'Voie de peuple', voieById[av.voiePeuple]?.nom, voieById[ap.voiePeuple]?.nom);
  val('niveau', 'progression', 'Niveau', av.niveau, ap.niveau);
  if (!!av.voieDuMage !== !!ap.voieDuMage) evt('voieDuMage', 'progression', ap.voieDuMage ? 'Voie du mage adoptée' : 'Retour à la voie de peuple');
  if ((av.voieDomaine || null) !== (ap.voieDomaine || null)) evt('voieDomaine', 'progression', ap.voieDomaine ? `Voie de domaine adoptée : ${voieById[ap.voieDomaine]?.nom || ap.voieDomaine}` : 'Retour à la voie de peuple');
  if ((av.famille || null) !== (ap.famille || null)) val('famille', 'fiche', 'Famille', familles[av.famille]?.nom, familles[ap.famille]?.nom);

  // Réserves
  val('pv', 'combat', 'PV', av.pv?.actuel, ap.pv?.actuel);
  val('pvTemp', 'combat', 'PV temporaires', av.pv?.temp || 0, ap.pv?.temp || 0);
  val('pc', 'combat', 'PC', av.pc?.actuel, ap.pc?.actuel);
  val('pm', 'combat', 'PM', av.pm?.actuel, ap.pm?.actuel);
  val('pe', 'combat', 'PE', av.pe?.actuel, ap.pe?.actuel);
  val('dr', 'combat', 'DR', av.dr?.actuel, ap.dr?.actuel);

  // Posture de combat (défense partielle / totale, sprint)
  if ((av.posture || null) !== (ap.posture || null)) {
    evt('posture', 'combat', ap.posture ? `Posture : ${POSTURES[ap.posture]?.nom || ap.posture}` : `Fin de la posture : ${POSTURES[av.posture]?.nom || av.posture}`);
  }

  // États préjudiciables
  const eAv = new Set(av.etats || []);
  const eAp = new Set(ap.etats || []);
  for (const e of eAp) if (!eAv.has(e)) evt(`etat:${e}`, 'combat', `État ${etatById[e]?.nom || e} appliqué`);
  for (const e of eAv) if (!eAp.has(e)) evt(`etat:${e}`, 'combat', `État ${etatById[e]?.nom || e} retiré`);

  // Capacités utilisées / rechargées
  const uAv = av.utilise || {};
  const uAp = ap.utilise || {};
  const ids = new Set([...Object.keys(uAv), ...Object.keys(uAp)]);
  const recharges = [];
  for (const id of ids) {
    if (!!uAv[id] === !!uAp[id]) continue;
    const nom = capaciteById[id]?.nom || id;
    if (uAp[id]) evt(`use:${id}`, 'combat', `Capacité utilisée : ${nom}`);
    else recharges.push(nom);
  }
  if (recharges.length === 1) evt(`use:${recharges[0]}`, 'combat', `Capacité rechargée : ${recharges[0]}`);
  else if (recharges.length > 1) evt('recharge', 'combat', `${recharges.length} capacités rechargées`);

  // Ressources de profil
  const rAv = Object.fromEntries((av.ressources || []).map((r) => [r.id, r]));
  const rAp = Object.fromEntries((ap.ressources || []).map((r) => [r.id, r]));
  for (const [id, r] of Object.entries(rAp)) {
    if (!rAv[id]) evt(`res:${id}`, 'combat', `Ressource ajoutée : ${r.nom} (${r.max})`);
    else {
      val(`res:${id}`, 'combat', r.nom, rAv[id].actuel, r.actuel);
      val(`resmax:${id}`, 'fiche', `${r.nom} (max)`, rAv[id].max, r.max);
    }
  }
  for (const [id, r] of Object.entries(rAv)) if (!rAp[id]) evt(`res:${id}`, 'combat', `Ressource supprimée : ${r.nom}`);

  // Voies et capacités
  const vAv = av.voies || {};
  const vAp = ap.voies || {};
  for (const id of new Set([...Object.keys(vAv), ...Object.keys(vAp)])) {
    const de = vAv[id] || 0;
    const a = vAp[id] || 0;
    if (de === a) continue;
    const nom = voieById[id]?.nom || id;
    if (!a) evt(`voie:${id}`, 'progression', `${nom} retirée`);
    else if (a > de) {
      const caps = [];
      for (let r = (de || (voieById[id]?.capacites[0]?.rang ?? 1) - 1) + 1; r <= a; r++) caps.push(nomCap(id, r));
      ch.push({ cle: `voie:${id}`, cat: 'progression', label: nom, de: de ? `rang ${de}` : '—', a: `rang ${a}`, detail: caps.filter(Boolean).join(', ') });
    } else ch.push({ cle: `voie:${id}`, cat: 'progression', label: nom, de: `rang ${de}`, a: `rang ${a}` });
  }

  // PV de base par niveau, points orphelins
  const hAv = Object.fromEntries((av.historique || []).map((h) => [h.niveau, h.pvBase]));
  for (const h of ap.historique || []) {
    if (h.niveau in hAv && hAv[h.niveau] !== h.pvBase) val(`pvniv:${h.niveau}`, 'progression', `PV de base du niveau ${h.niveau}`, hAv[h.niveau], h.pvBase);
  }
  for (const k of ['PC', 'DR', 'PV', 'PM']) {
    const d = (ap.orphelins?.[k] || 0) - (av.orphelins?.[k] || 0);
    if (d) evt(`orph:${k}`, 'progression', `Point de capacité orphelin échangé : ${k}`);
  }

  // Caractéristiques, bonus et maximums manuels
  for (const k of Object.keys(CARAC_NOMS)) val(`carac:${k}`, 'fiche', `${CARAC_NOMS[k]} (base)`, av.carac?.[k], ap.carac?.[k]);
  for (const k of new Set([...Object.keys(av.bonus || {}), ...Object.keys(ap.bonus || {})])) {
    const de = av.bonus?.[k] || 0;
    const a = ap.bonus?.[k] || 0;
    if (de !== a) ch.push({ cle: `bonus:${k}`, cat: 'fiche', label: `Bonus manuel ${BONUS_LABELS[k] || k}`, de: signe(de), a: signe(a) });
  }
  for (const k of Object.keys(MAX_LABELS)) {
    const de = av.maxManuel?.[k];
    const a = ap.maxManuel?.[k];
    if ((de ?? null) !== (a ?? null)) val(`max:${k}`, 'fiche', MAX_LABELS[k], typeof de === 'number' ? de : 'auto', typeof a === 'number' ? a : 'auto');
  }
  for (const k of new Set([...Object.keys(av.modsAppliques || {}), ...Object.keys(ap.modsAppliques || {})])) {
    if (av.modsAppliques?.[k] === ap.modsAppliques?.[k]) continue;
    const cap = capaciteById[k.split('#')[0]];
    evt(`mod:${k}`, 'fiche', `Effet de ${cap?.nom || 'capacité'} ${ap.modsAppliques?.[k] ? 'activé' : 'désactivé'}`);
  }

  // Textes (affichés en abrégé)
  for (const [k, l] of [
    ['ideal', 'Idéal héroïque'],
    ['travers', 'Travers'],
  ])
    val(k, 'fiche', l, av[k] || '—', ap[k] || '—');
  if ((av.notes || '') !== (ap.notes || '')) ch.push({ cle: 'notes', cat: 'fiche', texte: 'Notes de la fiche modifiées', apercu: court(ap.notes) });
  for (const id of new Set([...Object.keys(av.choix || {}), ...Object.keys(ap.choix || {})])) {
    if ((av.choix?.[id] || '') !== (ap.choix?.[id] || '')) ch.push({ cle: `choix:${id}`, cat: 'fiche', texte: `Choix noté pour ${capaciteById[id]?.nom || 'une capacité'}`, apercu: court(ap.choix?.[id]) });
  }

  // Inventaire
  const iAv = Object.fromEntries((av.inventaire || []).map((i) => [i.uid, i]));
  const iAp = Object.fromEntries((ap.inventaire || []).map((i) => [i.uid, i]));
  for (const [id, it] of Object.entries(iAp)) {
    const prev = iAv[id];
    if (!prev) {
      evt(`inv:${id}`, 'equipement', `Ajout : ${it.nom}${it.qte > 1 ? ` ×${it.qte}` : ''}`);
      continue;
    }
    if (!!prev.equipe !== !!it.equipe) evt(`equipe:${id}`, 'equipement', `${it.equipe ? 'Équipé' : 'Rangé'} : ${it.nom}`);
    val(`qte:${id}`, 'equipement', `${it.nom} (quantité)`, prev.qte || 1, it.qte || 1);
    val(`magie:${id}`, 'equipement', `${it.nom} (bonus magique)`, signe(prev.magie || 0), signe(it.magie || 0));
    for (const [k, l] of [
      ['qualiteAtt', 'qualité +1 attaque'],
      ['qualiteDm', 'qualité +1 DM'],
      ['qualite', 'qualité'],
      ['nonMaitrisee', 'non maîtrisée'],
      ['deuxMainsUse', 'à deux mains'],
    ]) {
      if (!!prev[k] !== !!it[k]) evt(`${k}:${id}`, 'equipement', `${it.nom} : ${l} ${it[k] ? 'oui' : 'non'}`);
    }
  }
  for (const [id, it] of Object.entries(iAv)) if (!iAp[id]) evt(`inv:${id}`, 'equipement', `Retiré : ${it.nom}${it.qte > 1 ? ` ×${it.qte}` : ''}`);

  // Bourse
  for (const k of ['pp', 'po', 'pa', 'pc']) val(`bourse:${k}`, 'equipement', `Bourse (${k})`, av.bourse?.[k] || 0, ap.bourse?.[k] || 0);

  return ch;
}

const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

/**
 * Ajoute une entrée au journal. Les modifications rapides et successives d'une même valeur
 * (sans titre d'action) sont fusionnées : « PV 12 → 11 », « 11 → 10 »… deviennent « PV 12 → 10 ».
 */
export function journaliser(journal = [], changes, meta = {}, maintenant = Date.now()) {
  if (!changes.length && !meta.texte) return journal;
  const date = new Date(maintenant).toISOString();
  const dernier = journal[journal.length - 1];
  if (
    !meta.titre &&
    !meta.texte &&
    changes.length === 1 &&
    dernier &&
    !dernier.titre &&
    dernier.type !== 'note' &&
    dernier.changes?.length === 1 &&
    dernier.changes[0].cle === changes[0].cle &&
    maintenant - Date.parse(dernier.date) < FUSION_MS
  ) {
    const c = changes[0];
    const fusion = { ...dernier.changes[0], ...c, de: dernier.changes[0].de };
    const reste = journal.slice(0, -1);
    // retour à la valeur de départ : la ligne disparaît
    if (fusion.texte === undefined && String(fusion.de) === String(fusion.a)) return reste;
    return [...reste, { ...dernier, date, changes: [fusion] }];
  }
  const entree = { id: uid(), date, type: meta.texte ? (meta.titre ? 'evenement' : 'note') : 'suivi', titre: meta.titre || null, texte: meta.texte || null, changes };
  return [...journal, entree].slice(-JOURNAL_MAX);
}

/** Catégories d'une entrée (pour les filtres). */
export function categoriesEntree(e) {
  if (e.type === 'note') return ['note'];
  if (e.type === 'evenement') return ['fiche'];
  return [...new Set((e.changes || []).map((c) => c.cat))];
}
