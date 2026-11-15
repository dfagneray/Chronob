// Moteur de règles : valeurs dérivées, progression, validations.
import { CARACS, voieById, profilById, peupleById, familles, capaciteById, familleDeVoie, etatById } from '../data/index.js';

// Niveau requis par rang (p. 39 et p. 42 pour les voies de prestige)
export const NIVEAU_REQUIS = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 7, 6: 9, 7: 11, 8: 13 };
export const coutRang = (rang) => (rang <= 2 ? 1 : 2);
/**
 * Coût d'une capacité selon sa voie : voies d'artisan = 1 point par rang quel que soit le rang ;
 * voies de recettes = 0 point (les rangs viennent des voies d'artisan) — Compagnon p. 73.
 */
export function coutCapacite(voie, rang) {
  if (voie?.type === 'artisan') return 1;
  if (voie?.type === 'recette') return 0;
  return coutRang(rang);
}
/** Types de voies qui ne comptent pas dans la limite de six voies. */
export const HORS_LIMITE = ['peuple', 'mage', 'domaine', 'artisan', 'recette'];
/** Rangs de recettes offerts par chaque rang de voie d'artisan (rangs 1 à 4, Compagnon p. 74). */
export const RANGS_RECETTE_PAR_RANG = 3;
export const NIVEAU_MAX = 20;
export const MAX_VOIES = 6; // hors voie de peuple
export const NIVEAU_PRESTIGE = 5;

export const SERIES = {
  polyvalent: { nom: 'Polyvalent', valeurs: [2, 2, 2, 1, 1, 0, -1] },
  expert: { nom: 'Expert', valeurs: [3, 2, 1, 1, 0, 0, -1] },
  specialiste: { nom: 'Spécialiste', valeurs: [4, 2, 1, 0, 0, -1, -1] },
};

/** Dé évolutif d4° selon le niveau (p. 43). */
export function deEvolutif(niveau) {
  if (niveau >= 15) return 12;
  if (niveau >= 12) return 10;
  if (niveau >= 9) return 8;
  if (niveau >= 6) return 6;
  return 4;
}

export const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`);

/** Famille du personnage : celle du profil, ou celle choisie (psionique, Compagnon p. 58). */
export function familleDuPerso(char) {
  return profilById[char.profilId]?.famille || (familles[char.famille] ? char.famille : null) || 'aventuriers';
}

/** Rangs de recettes : gagnés (voies d'artisan) et dépensés (voies de recettes). */
export function rangsRecettes(voiesMap) {
  let gagnes = 0;
  let depenses = 0;
  for (const [id, r] of Object.entries(voiesMap || {})) {
    const v = voieById[id];
    if (v?.type === 'artisan') gagnes += RANGS_RECETTE_PAR_RANG * Math.min(r, 4);
    if (v?.type === 'recette') depenses += r;
  }
  return { gagnes, depenses, restants: gagnes - depenses };
}

/** Liste des voies possédées avec leur rang. */
export function voiesPossedees(char, voiesMap = char.voies) {
  return Object.entries(voiesMap || {})
    .filter(([id, rang]) => voieById[id] && rang > 0)
    .map(([id, rang]) => ({ voie: voieById[id], rang }));
}

export function premierRang(voie) {
  return voie?.capacites[0]?.rang ?? 1;
}

/** Capacités acquises (objets capacité) pour une table de voies donnée. */
export function capacitesAcquises(char, voiesMap = char.voies) {
  const out = [];
  for (const { voie, rang } of voiesPossedees(char, voiesMap)) {
    for (const c of voie.capacites) if (c.rang <= rang) out.push(c);
  }
  return out;
}

export function estVoieDePeuple(char, voie) {
  return voie?.type === 'peuple' || voie?.type === 'mage' || voie?.type === 'domaine';
}

const modKey = (capId, i) => `${capId}#${i}`;

export function modApplique(char, cap, i) {
  const k = modKey(cap.id, i);
  const v = char.modsAppliques?.[k];
  if (v !== undefined) return v;
  if (i === 'carac' || i === 'initCarac' || i === 'pmCarac') return true;
  return !!cap.effets?.mods?.[i]?.auto;
}

/**
 * Valeur d'un bonus de capacité selon le rang atteint dans sa voie :
 * paliers (« +2 au rang 5 »), « par rang atteint », « + CON ».
 */
export function valeurMod(m, rangVoie, carac = {}) {
  let v = m.value;
  for (const p of m.paliers || []) if (rangVoie >= p.rang) v = p.value;
  if (m.parRang) v *= rangVoie;
  if (m.plusCarac) v += carac[m.plusCarac] || 0;
  return v;
}

/**
 * Somme des effets de capacités appliqués. Les caractéristiques sont calculées d'abord ;
 * `caracFinale` (optionnel) sert aux bonus du type « + CON » ou « son CHA en Initiative ».
 */
export function bonusCapacites(char, voiesMap = char.voies, caracFinale = null) {
  const tot = { DEF: 0, INIT: 0, PV: 0, PM: 0, PC: 0, carac: Object.fromEntries(CARACS.map((k) => [k, 0])), initCarac: [], pmCarac: [] };
  for (const cap of capacitesAcquises(char, voiesMap)) {
    const e = cap.effets;
    if (!e) continue;
    const rangVoie = voiesMap[cap.voieId] || cap.rang;
    if (Object.keys(e.carac || {}).length && modApplique(char, cap, 'carac')) {
      for (const [k, v] of Object.entries(e.carac)) tot.carac[k] += v;
    }
    if (e.initCarac && modApplique(char, cap, 'initCarac')) tot.initCarac.push(e.initCarac);
    if (e.pmCarac && modApplique(char, cap, 'pmCarac')) tot.pmCarac.push(e.pmCarac);
    (e.mods || []).forEach((m, i) => {
      if (modApplique(char, cap, i)) tot[m.stat] = (tot[m.stat] || 0) + valeurMod(m, rangVoie, caracFinale || {});
    });
  }
  return tot;
}

export function equipementPorte(char) {
  const inv = char.inventaire || [];
  const armure = inv.find((i) => i.categorie === 'armure' && i.equipe);
  const bouclier = inv.find((i) => i.categorie === 'bouclier' && i.equipe);
  return { armure, bouclier };
}

/** Sorts psioniques : ils donnent des points d'ego (PE) au lieu de PM (Compagnon p. 59). */
export const estPsionique = (cap) => voieById[cap.voieId]?.profil === 'psionique';

export function nbSorts(char, voiesMap = char.voies) {
  return capacitesAcquises(char, voiesMap).filter((c) => c.sort && !estPsionique(c)).length;
}

export function nbPouvoirsPsioniques(char, voiesMap = char.voies) {
  return capacitesAcquises(char, voiesMap).filter((c) => c.sort && estPsionique(c)).length;
}

/**
 * PV maximum : niveau 1 = 2 × PV de famille + CON ; ensuite PV de famille (ou moyenne hybride) + CON
 * par niveau (CON rétroactive, p. 39).
 */
/** PV par niveau du profil principal (primaliste : 4 alors que les mages ont 3, Compagnon p. 53). */
export function pvProfil(char) {
  return profilById[char.profilId]?.pvParNiveau || familles[familleDuPerso(char)].pv;
}

export function pvBaseParNiveau(char) {
  const pv = pvProfil(char);
  const parNiveau = [];
  for (let n = 1; n <= char.niveau; n++) {
    const h = (char.historique || []).find((x) => x.niveau === n);
    if (h && typeof h.pvBase === 'number') parNiveau.push(h.pvBase);
    else parNiveau.push(n === 1 ? pv * 2 : pv);
  }
  return parNiveau;
}

/** États actifs, y compris « affaibli » automatique à 1 PV (règle du dernier PV, p. 220). */
export function etatsActifs(char) {
  const set = new Set(char.etats || []);
  if (char.pv?.actuel === 1) set.add('affaibli');
  return [...set].filter((id) => etatById[id]);
}

/**
 * Postures de combat (une seule à la fois, durée 1 round) :
 * options tactiques (p. 216) et sprint (p. 211-212).
 */
export const POSTURES = {
  'defense-partielle': { nom: 'Défense partielle', action: 'A', def: 3, oppose: 3, page: 216, texte: '+3 en DEF et aux tests opposés pour résister à une attaque ou un effet pendant 1 round.' },
  'defense-totale': { nom: 'Défense totale', action: 'L', def: 5, oppose: 5, page: 216, texte: '+5 en DEF et aux tests opposés pour résister à une attaque ou un effet pendant 1 round.' },
  sprint: { nom: 'Sprint', action: 'L', def: -5, deMalus: true, page: 211, texte: 'Déplacement en ligne droite de 3 actions de mouvement (30 m) ; -5 en DEF et dé malus à tous les tests jusqu’au prochain round.' },
};

// Pénalités chiffrées des états préjudiciables (p. 214-215)
const PENALITES = {
  aveugle: { INIT: -5, CONTACT: -5, MAGIQUE: -5, DISTANCE: -10, DEF: -5 },
  etourdi: { DEF: -5 },
  renverse: { CONTACT: -5, DISTANCE: -5, MAGIQUE: -5, DEF: -5 },
  surpris: { DEF: -5 },
};

/** Calcule toutes les valeurs dérivées d'un personnage. */
export function deriver(char, opts = {}) {
  const voiesMap = opts.voies || char.voies || {};
  const niveau = opts.niveau || char.niveau || 1;
  const profil = profilById[char.profilId];
  const familleId = familleDuPerso(char);
  const fam = familles[familleId];
  const b = char.bonus || {};
  const capCarac = bonusCapacites(char, voiesMap).carac;

  const caracBase = {};
  const carac = {};
  for (const k of CARACS) {
    caracBase[k] = (char.carac?.[k] ?? 0) + capCarac[k] + (b[k] || 0) + (opts.caracDelta?.[k] || 0);
    carac[k] = caracBase[k];
  }
  const capB = bonusCapacites(char, voiesMap, caracBase);
  const { armure, bouclier } = equipementPorte(char);
  const agiMax = armure?.agiMax ?? null;
  const agiBridee = agiMax !== null && carac.AGI > agiMax;
  if (agiBridee) carac.AGI = agiMax;

  const etats = etatsActifs(char);
  const pen = { INIT: 0, CONTACT: 0, DISTANCE: 0, MAGIQUE: 0, DEF: 0 };
  for (const e of etats) for (const [k, v] of Object.entries(PENALITES[e] || {})) pen[k] += v;

  const niveauAttaque = Math.min(niveau, 10);
  const defArmure = (armure ? (armure.def || 0) + (armure.magie || 0) : 0) + (bouclier ? (bouclier.def || 0) + (bouclier.magie || 0) : 0);
  const defSansEtat = 10 + carac.AGI + defArmure + capB.DEF + (b.DEF || 0);
  // « gagne son CHA en Initiative » : une même caractéristique ne s'ajoute qu'une fois (p. 179)
  const initCarac = [...new Set(capB.initCarac)].filter((k) => k !== 'PER').reduce((a, k) => a + carac[k], 0);
  const initSansEtat = 10 + carac.PER + initCarac + capB.INIT + (b.INIT || 0);
  const attaques = {
    contact: niveauAttaque + carac.FOR + (b.CONTACT || 0),
    distance: niveauAttaque + carac.AGI + (b.DISTANCE || 0),
    magique: niveauAttaque + carac.VOL + (b.MAGIQUE || 0),
  };

  // PV
  const pvParNiveau = opts.pvParNiveau || pvBaseParNiveau({ ...char, niveau });
  const orph = char.orphelins || {};
  const man = char.maxManuel || {};
  const pvAuto = Math.max(1, pvParNiveau.reduce((a, x) => a + x, 0) + carac.CON * niveau + capB.PV + (b.PV || 0) + (orph.PV || 0) * 2);
  const pvMax = typeof man.PV === 'number' ? man.PV : pvAuto;
  // DR
  const drAuto = Math.max(0, 2 + carac.CON + (familleId === 'mystiques' ? 1 : 0) + (b.DR || 0) + (orph.DR || 0));
  const drMax = typeof man.DR === 'number' ? man.DR : drAuto;
  // PC
  const pcAuto = Math.max(0, 2 + carac.CHA + (familleId === 'aventuriers' ? 1 : 0) + capB.PC + (b.PC || 0) + (orph.PC || 0));
  const pcMax = typeof man.PC === 'number' ? man.PC : pcAuto;
  // PM
  const sorts = nbSorts(char, voiesMap);
  // « ajoute sa PER au nombre de PM » (ensorceleur, druide)
  const pmCarac = [...new Set(capB.pmCarac)].filter((k) => k !== 'VOL').reduce((a, k) => a + carac[k], 0);
  const pmAuto = sorts > 0 || b.PM || orph.PM ? Math.max(0, carac.VOL + pmCarac + sorts + capB.PM + (b.PM || 0) + (orph.PM || 0) * 2) : 0;
  const pmMax = typeof man.PM === 'number' ? man.PM : pmAuto;
  // PE (points d'ego) : VOL + 1 par pouvoir psionique, comme les PM (Compagnon p. 59)
  const pouvoirs = nbPouvoirsPsioniques(char, voiesMap);
  const peAuto = pouvoirs > 0 || b.PE ? Math.max(0, carac.VOL + pouvoirs + (b.PE || 0)) : 0;
  const peMax = typeof man.PE === 'number' ? man.PE : peAuto;

  const avertissements = [];
  if (armure && profil && armure.def > profil.armureMax) {
    if (profil.armureLibre) avertissements.push(`${armure.nom} (DEF +${armure.def}) n’est pas maîtrisée par le ${profil.nom.toLowerCase()} (DEF +${profil.armureMax} max) ; ses capacités restent utilisables.`);
    else avertissements.push(`${armure.nom} (DEF +${armure.def}) dépasse l’armure autorisée pour les voies de ${profil.nom.toLowerCase()} (DEF +${profil.armureMax} max) : capacités de profil interdites.`);
  }
  if (bouclier && profil && !profil.bouclier) avertissements.push(`Les voies de ${profil.nom.toLowerCase()} ne permettent pas l’usage du bouclier.`);
  else if (bouclier && profil?.bouclier === 'petit' && (bouclier.def || 0) > 1) avertissements.push(`Les voies de ${profil.nom.toLowerCase()} n’autorisent que le petit bouclier.`);
  if (profil?.energie === 'PE' && (carac.VOL ?? 0) < 1) avertissements.push('Il faut une VOL d’au moins +1 pour apprendre des capacités de psionique (Compagnon p. 59).');
  if (agiBridee) avertissements.push(`AGI limitée à ${fmt(agiMax)} par l’armure (${armure.nom}).`);

  const posture = POSTURES[char.posture] ? { id: char.posture, ...POSTURES[char.posture] } : null;
  const deMalus = { tous: etats.includes('affaibli') || !!posture?.deMalus, attaque: etats.includes('affaibli') || etats.includes('immobilise') || !!posture?.deMalus };

  return {
    niveau,
    famille: fam,
    familleId,
    profil,
    peuple: peupleById[char.peupleId],
    caracBase,
    carac,
    agiBridee,
    def: defSansEtat + pen.DEF + (posture?.def || 0),
    posture,
    defBase: defSansEtat,
    init: initSansEtat + pen.INIT,
    initBase: initSansEtat,
    attaques: {
      contact: attaques.contact + pen.CONTACT,
      distance: attaques.distance + pen.DISTANCE,
      magique: attaques.magique + pen.MAGIQUE,
    },
    attaquesBase: attaques,
    penalites: pen,
    etats,
    deMalus,
    auto: { PV: pvAuto, PC: pcAuto, PM: pmAuto, DR: drAuto, PE: peAuto },
    manuel: { PV: typeof man.PV === 'number', PC: typeof man.PC === 'number', PM: typeof man.PM === 'number', DR: typeof man.DR === 'number', PE: typeof man.PE === 'number' },
    pvMax,
    pvParNiveau,
    drMax,
    drDe: fam.dr,
    pcMax,
    pmMax,
    sorts,
    peMax,
    pouvoirs,
    d4: deEvolutif(niveau),
    malusArmure: armure ? Math.max(0, (armure.def || 0) - (armure.magie || 0) - (armure.qualite ? 1 : 0)) : 0,
    armure,
    bouclier,
    capB,
    avertissements,
  };
}

/** Texte de DM d'une arme pour le personnage. */
export function dmArme(item, d, deuxMains = false) {
  const de = deuxMains && item.dm2 ? item.dm2 : item.dm || '';
  const bonus = (item.categorie === 'contact' && !item.sansFor ? d.carac.FOR : 0) + (item.magie || 0) + (item.qualiteDm ? 1 : 0);
  return de ? (bonus ? `${de}${fmt(bonus)}` : de) : '—';
}

export function attaqueArme(item, d) {
  const base = item.categorie === 'distance' ? d.attaques.distance : d.attaques.contact;
  return base + (item.magie || 0) + (item.qualiteAtt ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Progression
// ---------------------------------------------------------------------------

/** Voies du profil principal (pour la règle des profils hybrides). */
export function voiesProfilPrincipal(char) {
  return profilById[char.profilId]?.voies || [];
}

/** Applique les choix planifiés jusqu'au niveau `jusqua` inclus et renvoie la table des voies. */
export function voiesApresPlan(char, jusqua) {
  const v = { ...(char.voies || {}) };
  for (let n = char.niveau + 1; n <= jusqua; n++) {
    for (const p of char.plan?.[n]?.picks || []) v[p.voieId] = Math.max(v[p.voieId] || 0, p.rang);
  }
  return v;
}

export function pointsDepenses(picks) {
  return picks.reduce((a, p) => a + coutCapacite(voieById[p.voieId], p.rang), 0);
}

/**
 * Capacités qu'il est possible d'acquérir au niveau `n`, compte tenu de la table de voies `etat`
 * (avant les choix de ce niveau) et des choix déjà faits `picks` pour ce niveau.
 */
export function optionsProgression(char, n, etat, picks = []) {
  const courant = { ...etat };
  for (const p of picks) courant[p.voieId] = Math.max(courant[p.voieId] || 0, p.rang);
  const restant = 2 - pointsDepenses(picks);
  const profil = profilById[char.profilId];
  const famille = profil?.famille;
  const principal = new Set(profil?.voies || []);
  const ouvertes = Object.entries(courant).filter(([id, r]) => r > 0 && voieById[id] && !HORS_LIMITE.includes(voieById[id].type));
  const prestigeActuel = ouvertes.find(([id]) => voieById[id].type === 'prestige');
  const voiesPeuple = new Set([char.voiePeuple].filter(Boolean));
  const recettes = rangsRecettes(courant);
  const options = [];

  const candidats = Object.values(voieById);
  for (const voie of candidats) {
    const rangActuel = courant[voie.id] || 0;
    const prochain = rangActuel ? rangActuel + 1 : premierRang(voie);
    const cap = voie.capacites.find((c) => c.rang === prochain);
    if (!cap) continue;
    const raisons = [];
    // Type de voie
    if (voie.type === 'peuple') {
      if (!voiesPeuple.has(voie.id)) continue;
      if (char.voieDuMage || char.voieDomaine) continue; // la voie du mage / de domaine remplace la voie de peuple
    }
    if (voie.type === 'mage') {
      if (famille !== 'mages' || !char.voieDuMage) continue;
    }
    // voie de domaine : seulement celle de la divinité choisie (Compagnon p. 142)
    if (voie.type === 'domaine' && char.voieDomaine !== voie.id) continue;
    if (voie.type === 'recette' && recettes.restants < 1) raisons.push('aucun rang de recette disponible (voies d’artisan)');
    if (voie.type === 'prestige') {
      if (prestigeActuel && prestigeActuel[0] !== voie.id) continue;
      if (voie.categorie !== 'generique' && voie.categorie !== famille) continue;
      if (n < NIVEAU_PRESTIGE) raisons.push(`voie de prestige dès le niveau ${NIVEAU_PRESTIGE}`);
    }
    const nouvelle = !rangActuel;
    if (nouvelle && !HORS_LIMITE.includes(voie.type) && ouvertes.length >= MAX_VOIES) raisons.push(`maximum ${MAX_VOIES} voies (hors peuple)`);
    if (voie.type === 'profil' && !principal.has(voie.id) && nouvelle) {
      // Profil hybride : il doit rester au moins une voie du profil principal sans aucun point
      const libres = [...principal].filter((id) => !courant[id]);
      if (libres.length === 0) raisons.push('profil hybride impossible : les cinq voies du profil principal sont entamées');
    }
    if ((NIVEAU_REQUIS[cap.rang] || 99) > n) raisons.push(`niveau ${NIVEAU_REQUIS[cap.rang]} requis`);
    const cout = coutCapacite(voie, cap.rang);
    if (cout > restant) raisons.push(`coût ${cout} pt${cout > 1 ? 's' : ''}`);
    options.push({
      voie,
      cap,
      rang: cap.rang,
      cout,
      nouvelle,
      hybride: voie.type === 'profil' && !principal.has(voie.id),
      raisons,
      possible: raisons.length === 0,
    });
  }
  return options;
}

/** PV de base gagnés à un niveau selon les familles des capacités choisies (p. 177). */
export function pvGainNiveau(char, picks, demiPV = char.demiPV) {
  const famPrincipale = familleDuPerso(char);
  const pvPrincipal = pvProfil(char);
  const pts = [];
  for (const p of picks) {
    const v = voieById[p.voieId];
    let pv;
    if (v?.type === 'prestige' && v.pvParNiveau) pv = v.pvParNiveau;
    else if (v?.type === 'profil' && profilById[v.profil]?.pvParNiveau) pv = profilById[v.profil].pvParNiveau;
    else {
      const f = familleDeVoie(v, famPrincipale);
      pv = f === famPrincipale ? pvPrincipal : familles[f].pv;
    }
    for (let i = 0; i < coutCapacite(v, p.rang); i++) pts.push(pv);
  }
  if (!pts.length) return { pv: pvPrincipal, demiPV };
  const moy = pts.reduce((a, x) => a + x, 0) / pts.length;
  if (Number.isInteger(moy)) return { pv: moy, demiPV };
  // demi-PV : arrondi inférieur une fois sur deux
  return demiPV ? { pv: Math.ceil(moy), demiPV: false } : { pv: Math.floor(moy), demiPV: true };
}

/** Gain de PV d'un niveau planifié : calcul automatique, ou valeur saisie par le joueur (`lvl.pvBase`). */
export function gainPVPlanifie(char, lvl, demiPV = char.demiPV) {
  const g = pvGainNiveau(char, lvl?.picks || [], demiPV);
  if (typeof lvl?.pvBase === 'number') return { pv: lvl.pvBase, demiPV: !!demiPV, auto: g.pv, manuel: true };
  return { ...g, auto: g.pv, manuel: false };
}

/** Simulation complète du plan jusqu'à un niveau, pour l'aperçu. */
export function simulerPlan(char, jusqua) {
  let demi = !!char.demiPV;
  const pvParNiveau = pvBaseParNiveau(char);
  const niveaux = [];
  for (let n = char.niveau + 1; n <= jusqua; n++) {
    const lvl = char.plan?.[n] || { picks: [] };
    const g = gainPVPlanifie(char, lvl, demi);
    demi = g.demiPV;
    pvParNiveau.push(g.pv);
    niveaux.push({ niveau: n, pv: g.pv, auto: g.auto, manuel: g.manuel });
  }
  const voies = voiesApresPlan(char, jusqua);
  const orph = { ...(char.orphelins || {}) };
  for (let n = char.niveau + 1; n <= jusqua; n++) {
    const o = char.plan?.[n]?.orphelin;
    if (o) orph[o] = (orph[o] || 0) + 1;
  }
  const d = deriver({ ...char, orphelins: orph }, { voies, niveau: jusqua, pvParNiveau });
  return { d, niveaux, voies };
}

/** Vérifie si un niveau planifié peut être validé. */
export function verifierNiveau(char, n) {
  const etat = voiesApresPlan(char, n - 1);
  const lvl = char.plan?.[n] || { picks: [] };
  const erreurs = [];
  const tmp = [];
  for (const p of lvl.picks) {
    const opts = optionsProgression(char, n, etat, tmp);
    const o = opts.find((x) => x.voie.id === p.voieId && x.rang === p.rang);
    if (!o) erreurs.push(`${voieById[p.voieId]?.nom || p.voieId} rang ${p.rang} : choix invalide`);
    else if (!o.possible) erreurs.push(`${o.cap.nom} : ${o.raisons.join(', ')}`);
    tmp.push(p);
  }
  const depenses = pointsDepenses(lvl.picks);
  const restants = 2 - depenses;
  if (restants > 0) {
    // les rangs de recettes (gratuits) ne permettent pas d'écouler les points de capacité
    // les voies d'artisan et de recettes sont optionnelles : elles n'empêchent pas le point orphelin
    const encore = optionsProgression(char, n, etat, lvl.picks).filter((o) => o.possible && !['artisan', 'recette'].includes(o.voie.type));
    if (encore.length) erreurs.push(`${restants} point${restants > 1 ? 's' : ''} de capacité à dépenser (ils ne peuvent pas être mis de côté)`);
    else if (restants === 1 && !lvl.orphelin) erreurs.push('Point de capacité orphelin : choisissez un échange (PC, DR, PV ou PM).');
  }
  return { erreurs, depenses, restants, ok: erreurs.length === 0 };
}

/** Applique le niveau suivant planifié au personnage (renvoie un nouveau personnage). */
export function validerNiveau(char) {
  const n = char.niveau + 1;
  const lvl = char.plan?.[n] || { picks: [] };
  const avant = deriver(char);
  const g = gainPVPlanifie(char, lvl, char.demiPV);
  const voies = { ...char.voies };
  for (const p of lvl.picks) voies[p.voieId] = Math.max(voies[p.voieId] || 0, p.rang);
  const orphelins = { ...(char.orphelins || {}) };
  if (lvl.orphelin) orphelins[lvl.orphelin] = (orphelins[lvl.orphelin] || 0) + 1;
  const plan = { ...(char.plan || {}) };
  delete plan[n];
  const next = {
    ...char,
    niveau: n,
    voies,
    orphelins,
    plan,
    demiPV: g.demiPV,
    historique: [...(char.historique || []).filter((h) => h.niveau !== n), { niveau: n, pvBase: g.pv, pvCalcule: g.auto, manuel: g.manuel, picks: lvl.picks, orphelin: lvl.orphelin || null, date: new Date().toISOString() }],
  };
  const apres = deriver(next);
  next.pv = { ...next.pv, actuel: Math.min(apres.pvMax, (char.pv?.actuel ?? avant.pvMax) + (apres.pvMax - avant.pvMax)) };
  next.pm = { actuel: Math.min(apres.pmMax, (char.pm?.actuel ?? avant.pmMax) + Math.max(0, apres.pmMax - avant.pmMax)) };
  next.pe = { actuel: Math.min(apres.peMax, (char.pe?.actuel ?? avant.peMax) + Math.max(0, apres.peMax - avant.peMax)) };
  next.pc = { actuel: apres.pcMax }; // les PC sont récupérés intégralement à chaque passage de niveau (p. 205)
  next.dr = { actuel: Math.min(apres.drMax, (char.dr?.actuel ?? apres.drMax) + Math.max(0, apres.drMax - avant.drMax)) };
  return next;
}

/** Fréquence d'utilisation détectée (une fois par combat / jour). */
export function frequence(cap) {
  return cap?.effets?.frequence || null;
}

export function capaciteSuivie(cap) {
  return !!cap && (!!frequence(cap) || cap.action === 'L');
}

export { capaciteById };
