// Tests du moteur de règles, appuyés sur les exemples chiffrés du livre de règles.
import { describe, it, expect } from 'vitest';
import {
  deriver,
  deEvolutif,
  coutRang,
  NIVEAU_REQUIS,
  pvGainNiveau,
  optionsProgression,
  verifierNiveau,
  validerNiveau,
  simulerPlan,
  voiesApresPlan,
  valeurMod,
  annulerNiveau,
  revenirAuNiveau,
} from '../src/lib/rules.js';
import { personnageVide } from '../src/lib/store.jsx';
import { lhagva, ionas, item, planifier } from './helpers.js';

const opt = (opts, voieId, rang) => opts.find((o) => o.voie.id === voieId && o.rang === rang);

describe('Création — exemples de Lhagva (barbare humaine, p. 26-32)', () => {
  const d = deriver(lhagva());
  it('PV = 2 × 5 + CON = 12 (p. 30)', () => expect(d.pvMax).toBe(12));
  it('DR = 2 + CON = 4 d10 (p. 30)', () => {
    expect(d.drMax).toBe(4);
    expect(d.drDe).toBe(10);
  });
  it('PC = 2 + CHA (-1) + 1 (Diversité, voie de l’humain) = 2 (p. 30)', () => expect(d.pcMax).toBe(2));
  it('Initiative = 10 + PER + 3 (Réflexes éclair) = 14 (p. 31)', () => expect(d.init).toBe(14));
  it('DEF = 10 + cuir 2 + bouclier 2 + AGI 1 + Réflexes éclair 1 = 16 (p. 31)', () => expect(d.def).toBe(16));
  it('Attaques : contact +4, distance +2, magique +2 (p. 32)', () => {
    expect(d.attaques).toEqual({ contact: 4, distance: 2, magique: 2 });
  });
  it('aucun sort : 0 PM (p. 31)', () => expect(d.pmMax).toBe(0));
  it('aucun avertissement d’armure pour un barbare en cuir avec bouclier', () => expect(d.avertissements).toEqual([]));
});

describe('Création — exemples de Ionas (ensorceleur elfe haut, p. 28-32)', () => {
  const d = deriver(ionas());
  it('PV = 2 × 3 + CON = 7 (p. 30)', () => expect(d.pvMax).toBe(7));
  it('DR = 3 d6 (p. 30)', () => {
    expect(d.drMax).toBe(3);
    expect(d.drDe).toBe(6);
  });
  it('PC = 2 + CHA 4 = 6 (p. 30)', () => expect(d.pcMax).toBe(6));
  it('PM = VOL 2 + 3 sorts = 5 (p. 31)', () => {
    expect(d.sorts).toBe(3);
    expect(d.pmMax).toBe(5);
  });
  it('Initiative 11 et DEF 12 grâce à Murmures dans le vent (p. 31)', () => {
    expect(d.init).toBe(11);
    expect(d.def).toBe(12);
  });
  it('Attaques : contact -1, distance +2, magique +3 (p. 32)', () => {
    expect(d.attaques).toEqual({ contact: -1, distance: 2, magique: 3 });
  });
});

describe('Progression (p. 38-43)', () => {
  it('Lhagva passe au niveau 2 : +5 +2 CON = 19 PV (p. 39)', () => {
    const c = planifier(lhagva(), 2, [
      { voieId: 'voie-du-pourfendeur', rang: 2 },
      { voieId: 'voie-de-la-rage', rang: 2 },
    ]);
    expect(verifierNiveau(c, 2).ok).toBe(true);
    const n = validerNiveau(c);
    expect(n.niveau).toBe(2);
    expect(deriver(n).pvMax).toBe(19);
    expect(n.voies['voie-du-pourfendeur']).toBe(2);
    expect(n.plan[2]).toBeUndefined();
    expect(n.historique.at(-1)).toMatchObject({ niveau: 2, pvBase: 5 });
  });

  it('Ionas au niveau 2 (Sous tension + Maîtrise de la magie) : +2 PM = 7, PV 11 (p. 40)', () => {
    const c = planifier(ionas(), 2, [
      { voieId: 'voie-de-l-air', rang: 2 },
      { voieId: 'voie-du-mage', rang: 2 },
    ]);
    expect(verifierNiveau(c, 2).ok).toBe(true);
    const n = validerNiveau(c);
    const d = deriver(n);
    expect(d.pmMax).toBe(7);
    expect(d.pvMax).toBe(11);
    expect(n.pm.actuel).toBe(7);
  });

  it('Lhagva au niveau 7 : attaque au contact +10 (p. 39)', () => {
    expect(deriver({ ...lhagva(), niveau: 7 }).attaques.contact).toBe(10);
  });

  it('les valeurs d’attaque cessent d’augmenter au niveau 10 (p. 39)', () => {
    expect(deriver({ ...lhagva(), niveau: 10 }).attaques.contact).toBe(13);
    expect(deriver({ ...lhagva(), niveau: 14 }).attaques.contact).toBe(13);
  });

  it('Constitution héroïque au niveau 8 : +1 PV par niveau déjà acquis, rétroactivement (p. 39)', () => {
    const base = { ...lhagva(), niveau: 8 };
    const r3 = deriver({ ...base, voies: { ...base.voies, 'voie-du-pagne': 3 } });
    const r4 = deriver({ ...base, voies: { ...base.voies, 'voie-du-pagne': 4 } });
    // +8 (CON rétroactive) +1 (Vigueur : 1 PV par rang atteint dans la voie)
    expect(r4.pvMax - r3.pvMax).toBe(9);
    expect(r4.caracBase.CON).toBe(3);
    expect(r4.drMax - r3.drMax).toBe(1);
  });

  it('coûts : rangs 1-2 = 1 point, rangs 3+ = 2 points (p. 39)', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(coutRang)).toEqual([1, 1, 2, 2, 2, 2, 2, 2]);
  });

  it('niveau requis par rang (p. 39 et 42)', () => {
    expect(NIVEAU_REQUIS).toEqual({ 1: 1, 2: 2, 3: 3, 4: 5, 5: 7, 6: 9, 7: 11, 8: 13 });
  });

  it('dé évolutif d4° : d4, d6 (6), d8 (9), d10 (12), d12 (15) (p. 43)', () => {
    expect([1, 5, 6, 8, 9, 11, 12, 14, 15, 20].map(deEvolutif)).toEqual([4, 4, 6, 6, 8, 8, 10, 10, 12, 12]);
  });

  it('au niveau 2, le rang 3 est inaccessible (niveau 3 requis)', () => {
    const c = { ...lhagva(), voies: { ...lhagva().voies, 'voie-du-pourfendeur': 2 } };
    const o = opt(optionsProgression(c, 2, c.voies, []), 'voie-du-pourfendeur', 3);
    expect(o.possible).toBe(false);
    expect(o.raisons.join()).toMatch(/niveau 3 requis/);
  });

  it('on ne peut pas prendre deux rangs 3 avec 2 points', () => {
    const c = { ...lhagva(), niveau: 2, voies: { 'voie-de-l-humain': 2, 'voie-du-pourfendeur': 2, 'voie-de-la-rage': 2 } };
    const picks = [{ voieId: 'voie-du-pourfendeur', rang: 3 }];
    const o = opt(optionsProgression(c, 3, c.voies, picks), 'voie-de-la-rage', 3);
    expect(o.possible).toBe(false);
  });

  it('voie de prestige : pas avant le niveau 5, une seule, de la famille ou générique (p. 42)', () => {
    const c = { ...lhagva(), niveau: 4 };
    const o4 = opt(optionsProgression(c, 4, c.voies, []), 'voie-de-l-ours', 4);
    expect(o4.possible).toBe(false);
    const o5 = opt(optionsProgression(c, 5, c.voies, []), 'voie-de-l-ours', 4);
    expect(o5.possible).toBe(true);
    // pas de voie de prestige d'une autre famille
    expect(opt(optionsProgression(c, 5, c.voies, []), 'voie-de-l-archimage', 4)).toBeUndefined();
    // génériques accessibles
    expect(opt(optionsProgression(c, 5, c.voies, []), 'voie-du-lycanthrope', 4)).toBeDefined();
    // une seule voie de prestige
    const avec = { ...c, niveau: 5, voies: { ...c.voies, 'voie-de-l-ours': 4 } };
    expect(opt(optionsProgression(avec, 6, avec.voies, []), 'voie-du-colosse', 4)).toBeUndefined();
  });

  it('six voies au maximum, hors voie de peuple (p. 42)', () => {
    const c = {
      ...lhagva(),
      niveau: 6,
      voies: { 'voie-de-l-humain': 1, 'voie-du-pourfendeur': 1, 'voie-de-la-rage': 1, 'voie-de-la-brute': 1, 'voie-du-pagne': 1, 'voie-du-primitif': 1, 'voie-du-combat': 1 },
    };
    const o = opt(optionsProgression(c, 7, c.voies, []), 'voie-du-soldat', 1);
    expect(o.possible).toBe(false);
    expect(o.raisons.join()).toMatch(/maximum 6 voies/);
  });

  it('profil hybride impossible si les cinq voies du profil sont entamées (p. 176)', () => {
    const cinq = { 'voie-de-la-brute': 1, 'voie-du-pagne': 1, 'voie-du-pourfendeur': 1, 'voie-du-primitif': 1, 'voie-de-la-rage': 1 };
    const c = { ...lhagva(), niveau: 3, voies: { 'voie-de-l-humain': 1, ...cinq } };
    const o = opt(optionsProgression(c, 4, c.voies, []), 'voie-de-l-air', 1);
    expect(o.possible).toBe(false);
    expect(o.hybride).toBe(true);
    // il reste une voie libre : possible
    const c2 = { ...c, voies: { 'voie-de-l-humain': 1, 'voie-de-la-brute': 1, 'voie-du-pagne': 1, 'voie-du-pourfendeur': 1, 'voie-de-la-rage': 1 } };
    expect(opt(optionsProgression(c2, 4, c2.voies, []), 'voie-de-l-air', 1).possible).toBe(true);
  });

  it('la voie du mage remplace la voie de peuple : celle-ci reste bloquée au rang 1 (p. 60)', () => {
    const c = { ...ionas(), niveau: 1 };
    expect(opt(optionsProgression(c, 2, c.voies, []), 'voie-de-l-elfe-haut', 2)).toBeUndefined();
    expect(opt(optionsProgression(c, 2, c.voies, []), 'voie-du-mage', 2).possible).toBe(true);
  });

  it('les points de capacité ne peuvent pas être mis de côté (p. 39)', () => {
    const c = planifier(lhagva(), 2, [{ voieId: 'voie-du-pourfendeur', rang: 2 }]);
    const v = verifierNiveau(c, 2);
    expect(v.ok).toBe(false);
    expect(v.erreurs.join()).toMatch(/1 point de capacité à dépenser/);
  });

  it('point de capacité orphelin échangé contre 1 PC (p. 40)', () => {
    const c0 = {
      ...lhagva(),
      niveau: 3,
      voies: { 'voie-de-l-humain': 2, 'voie-de-la-brute': 2, 'voie-du-pagne': 2, 'voie-du-pourfendeur': 2, 'voie-du-primitif': 2, 'voie-de-la-rage': 1 },
    };
    // dernier rang 2 disponible : il reste un point qu'aucune capacité à 1 point ne peut absorber
    let c = planifier(c0, 4, [{ voieId: 'voie-de-la-rage', rang: 2 }]);
    let v = verifierNiveau(c, 4);
    expect(v.erreurs.join()).toMatch(/orphelin/);
    c = planifier(c0, 4, [{ voieId: 'voie-de-la-rage', rang: 2 }], { orphelin: 'PC' });
    v = verifierNiveau(c, 4);
    expect(v.ok).toBe(true);
    const n = validerNiveau(c);
    expect(deriver(n).pcMax).toBe(deriver(c0).pcMax + 1);
  });

  it('les PC sont restaurés à chaque passage de niveau (p. 205)', () => {
    const c = planifier({ ...lhagva(), pc: { actuel: 0 } }, 2, [
      { voieId: 'voie-du-pourfendeur', rang: 2 },
      { voieId: 'voie-de-la-rage', rang: 2 },
    ]);
    expect(validerNiveau(c).pc.actuel).toBe(2);
  });

  it('l’aperçu du plan n’altère pas la fiche (bac à sable)', () => {
    const c = planifier(lhagva(), 2, [
      { voieId: 'voie-du-pourfendeur', rang: 2 },
      { voieId: 'voie-de-la-rage', rang: 2 },
    ]);
    const sim = simulerPlan(c, 2);
    expect(sim.d.pvMax).toBe(19);
    expect(deriver(c).pvMax).toBe(12);
    expect(voiesApresPlan(c, 2)['voie-de-la-rage']).toBe(2);
    expect(c.voies['voie-de-la-rage']).toBe(1);
  });
});

describe('PV des profils hybrides (p. 177)', () => {
  const guerrier = personnageVide({ profilId: 'guerrier', peupleId: 'humain', voiePeuple: 'voie-de-l-humain' });
  it('combattant rang 2 + mage rang 1 = (5 + 3) / 2 = 4 PV', () => {
    expect(pvGainNiveau(guerrier, [{ voieId: 'voie-du-bouclier', rang: 2 }, { voieId: 'voie-de-l-air', rang: 1 }], false).pv).toBe(4);
  });
  it('mage + aventurier = 3,5 : arrondi à 3, puis à 4 la fois suivante', () => {
    const picks = [
      { voieId: 'voie-de-l-air', rang: 1 },
      { voieId: 'voie-de-l-archer', rang: 1 },
    ];
    const g1 = pvGainNiveau(guerrier, picks, false);
    expect(g1).toEqual({ pv: 3, demiPV: true });
    const g2 = pvGainNiveau(guerrier, picks, g1.demiPV);
    expect(g2).toEqual({ pv: 4, demiPV: false });
  });
  it('voie de peuple + capacité de mage pour un guerrier : 2,5 + 1,5 = 4 PV', () => {
    expect(pvGainNiveau(guerrier, [{ voieId: 'voie-de-l-humain', rang: 2 }, { voieId: 'voie-de-l-air', rang: 1 }], false).pv).toBe(4);
  });
  it('voie de prestige avec son propre bonus de vigueur (lycanthrope : 5 PV)', () => {
    const voleur = personnageVide({ profilId: 'voleur' });
    expect(pvGainNiveau(voleur, [{ voieId: 'voie-du-lycanthrope', rang: 4 }], false).pv).toBe(5);
  });
  it('la demi-PV est mémorisée d’un passage de niveau à l’autre', () => {
    const c0 = { ...guerrier, niveau: 1, voies: { 'voie-de-l-humain': 1, 'voie-du-bouclier': 1, 'voie-du-combat': 1, 'voie-du-soldat': 1 } };
    const c1 = validerNiveau(planifier(c0, 2, [{ voieId: 'voie-de-l-air', rang: 1 }, { voieId: 'voie-de-l-archer', rang: 1 }]));
    expect(c1.historique.at(-1).pvBase).toBe(3);
    expect(c1.demiPV).toBe(true);
  });
});

describe('Équipement et armures (p. 31 et 188)', () => {
  it('une armure de plaques limite l’AGI +3 à +2 (p. 188)', () => {
    const c = personnageVide({ profilId: 'chevalier', carac: { AGI: 3, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 }, inventaire: [item('armure-de-plaques')] });
    const d = deriver(c);
    expect(d.carac.AGI).toBe(2);
    expect(d.def).toBe(10 + 2 + 6);
    expect(d.attaques.distance).toBe(1 + 2);
  });
  it('malus d’armure = DEF de l’armure ; une chemise de mailles +3 n’impose que -1 (p. 188)', () => {
    expect(deriver(personnageVide({ inventaire: [item('chemise-de-mailles')] })).malusArmure).toBe(4);
    expect(deriver(personnageVide({ inventaire: [item('chemise-de-mailles', { magie: 3 })] })).malusArmure).toBe(1);
  });
  it('avertit si l’armure dépasse celle autorisée par le profil (p. 178)', () => {
    const d = deriver(personnageVide({ profilId: 'magicien', inventaire: [item('cuir-simple')] }));
    expect(d.avertissements.join()).toMatch(/dépasse l’armure autorisée/);
  });
  it('avertit si le profil n’autorise pas le bouclier (arquebusier, p. 62)', () => {
    const d = deriver(personnageVide({ profilId: 'arquebusier', inventaire: [item('petit-bouclier')] }));
    expect(d.avertissements.join()).toMatch(/bouclier/);
  });
  it('une armure non équipée ne compte pas', () => {
    expect(deriver(personnageVide({ inventaire: [item('cotte-de-mailles', { equipe: false })] })).def).toBe(10);
  });
});

describe('États préjudiciables (p. 214-215, 220)', () => {
  it('aveuglé : -5 Init., attaque, DEF et -10 à distance', () => {
    const base = deriver(lhagva());
    const d = deriver({ ...lhagva(), etats: ['aveugle'] });
    expect(d.init).toBe(base.init - 5);
    expect(d.def).toBe(base.def - 5);
    expect(d.attaques.contact).toBe(base.attaques.contact - 5);
    expect(d.attaques.distance).toBe(base.attaques.distance - 10);
  });
  it('renversé : -5 en attaque et en DEF', () => {
    const base = deriver(lhagva());
    const d = deriver({ ...lhagva(), etats: ['renverse'] });
    expect(d.def).toBe(base.def - 5);
    expect(d.attaques.magique).toBe(base.attaques.magique - 5);
  });
  it('à 1 PV, le personnage est automatiquement affaibli (règle du dernier PV)', () => {
    const d = deriver({ ...lhagva(), pv: { actuel: 1, temp: 0 } });
    expect(d.etats).toContain('affaibli');
    expect(d.deMalus.tous).toBe(true);
  });
  it('immobilisé : dé malus aux tests d’attaque seulement', () => {
    const d = deriver({ ...lhagva(), etats: ['immobilise'] });
    expect(d.deMalus).toEqual({ tous: false, attaque: true });
  });
});

describe('Effets de capacités', () => {
  it('Réflexes éclair : le bonus de DEF passe à +2 au rang 5', () => {
    const c = { ...lhagva(), niveau: 7, voies: { ...lhagva().voies, 'voie-du-pourfendeur': 5 } };
    expect(deriver(c).def).toBe(17);
  });
  it('Vigueur : 1 PV supplémentaire par rang atteint dans la voie', () => {
    expect(valeurMod({ value: 1, parRang: true }, 3)).toBe(3);
  });
  it('Perception héroïque (druide) ajoute la PER aux PM', () => {
    const c = personnageVide({ profilId: 'druide', carac: { AGI: 0, CON: 0, FOR: 0, PER: 2, CHA: 0, INT: 0, VOL: 1 }, voies: { 'voie-du-protecteur': 4 } });
    const d = deriver(c);
    // PER 2 + 1 (héroïque) = 3 ; PM = VOL 1 + PER 3 + sorts
    expect(d.caracBase.PER).toBe(3);
    expect(d.pmMax).toBe(1 + 3 + d.sorts);
  });
  it('Grâce féline (barde, rang 2) ajoute le CHA à l’Initiative', () => {
    const c = personnageVide({ profilId: 'barde', carac: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 3, INT: 0, VOL: 0 }, voies: { 'voie-du-saltimbanque': 2 } });
    const d = deriver(c);
    expect(d.init).toBe(13);
    expect(d.def).toBe(11);
    // +2 en DEF au rang 4
    expect(deriver({ ...c, voies: { 'voie-du-saltimbanque': 4 } }).def).toBe(12);
  });
  it('un effet peut être désactivé à la main', () => {
    const c = { ...lhagva(), modsAppliques: { 'voie-du-pourfendeur--1#1': false } };
    // mods de Réflexes éclair : [INIT, DEF] → on retire la DEF
    expect(deriver(c).def).toBe(15);
  });
});

describe('Saisies manuelles', () => {
  it('un maximum manuel remplace le calcul (PV, PC, PM, DR)', () => {
    const d = deriver({ ...lhagva(), maxManuel: { PV: 30, PC: 5, PM: 4, DR: 1 } });
    expect([d.pvMax, d.pcMax, d.pmMax, d.drMax]).toEqual([30, 5, 4, 1]);
    expect(d.auto.PV).toBe(12);
    expect(d.manuel.PV).toBe(true);
  });
  it('les PV de base d’un niveau peuvent être saisis dans l’historique', () => {
    const c = { ...lhagva(), niveau: 2, historique: [{ niveau: 2, pvBase: 9, picks: [] }] };
    expect(deriver(c).pvMax).toBe(10 + 9 + 2 * 2);
  });
  it('les PV de base d’un niveau planifié peuvent être imposés', () => {
    const c = planifier(lhagva(), 2, [{ voieId: 'voie-du-pourfendeur', rang: 2 }, { voieId: 'voie-de-la-rage', rang: 2 }], { pvBase: 8 });
    expect(simulerPlan(c, 2).d.pvMax).toBe(10 + 8 + 2 * 2);
    expect(validerNiveau(c).historique.at(-1).pvBase).toBe(8);
  });
  it('un passage de niveau peut être forcé malgré des choix incomplets', () => {
    const c = planifier(lhagva(), 2, []);
    expect(verifierNiveau(c, 2).ok).toBe(false);
    const n = validerNiveau(c);
    expect(n.niveau).toBe(2);
  });
  it('bonus manuels sur DEF, Init., attaques', () => {
    const d = deriver({ ...lhagva(), bonus: { DEF: 2, INIT: -1, CONTACT: 1, DISTANCE: 2, MAGIQUE: 3 } });
    expect(d.def).toBe(18);
    expect(d.init).toBe(13);
    expect(d.attaques).toEqual({ contact: 5, distance: 4, magique: 5 });
  });
});

describe('Postures de combat (options tactiques p. 216, sprint p. 211)', () => {
  it('défense partielle : +3 en DEF ; défense totale : +5', () => {
    expect(deriver({ ...lhagva(), posture: 'defense-partielle' }).def).toBe(19);
    expect(deriver({ ...lhagva(), posture: 'defense-totale' }).def).toBe(21);
  });
  it('sprint : -5 en DEF et dé malus à tous les tests', () => {
    const d = deriver({ ...lhagva(), posture: 'sprint' });
    expect(d.def).toBe(11);
    expect(d.deMalus).toEqual({ tous: true, attaque: true });
  });
  it('se cumule avec les états (renversé + défense totale)', () => {
    expect(deriver({ ...lhagva(), etats: ['renverse'], posture: 'defense-totale' }).def).toBe(16);
  });
  it('la DEF de base (hors états et posture) reste affichée à part', () => {
    expect(deriver({ ...lhagva(), posture: 'defense-totale' }).defBase).toBe(16);
  });
});

describe('Annuler un passage de niveau (correction d’une erreur)', () => {
  const c1 = lhagva();
  const c2 = validerNiveau(planifier(c1, 2, [{ voieId: 'voie-de-la-rage', rang: 2 }, { voieId: 'voie-du-pourfendeur', rang: 2 }]));
  const c3 = validerNiveau(planifier(c2, 3, [{ voieId: 'voie-de-la-rage', rang: 3 }]));

  it('le niveau annulé rend ses rangs, ses PV et repasse dans le plan', () => {
    const r = annulerNiveau(c3);
    expect(r.niveau).toBe(2);
    expect(r.voies).toEqual(c2.voies);
    expect(r.plan[3].picks).toEqual([{ voieId: 'voie-de-la-rage', rang: 3 }]);
    expect(deriver(r).pvMax).toBe(deriver(c2).pvMax);
    expect(r.historique.map((h) => h.niveau)).toEqual([2]);
  });

  it('corriger puis revalider', () => {
    let r = annulerNiveau(c3);
    r = planifier(r, 3, [{ voieId: 'voie-de-l-humain', rang: 2 }, { voieId: 'voie-du-pourfendeur', rang: 3 }].slice(1));
    expect(verifierNiveau(r, 3).ok).toBe(true);
    r = validerNiveau(r);
    expect(r.voies['voie-du-pourfendeur']).toBe(3);
    expect(r.voies['voie-de-la-rage']).toBe(2);
  });

  it('revenir plusieurs niveaux en arrière ; les voies ouvertes à un niveau disparaissent', () => {
    const r = revenirAuNiveau(c3, 1);
    expect(r.niveau).toBe(1);
    expect(r.voies).toEqual(c1.voies);
    expect(Object.keys(r.plan).map(Number)).toEqual([2, 3]);
    expect(r.pv.actuel).toBeLessThanOrEqual(deriver(r).pvMax);
    const ouvert = validerNiveau(planifier(c1, 2, [{ voieId: 'voie-du-colosse', rang: 1 }, { voieId: 'voie-de-la-rage', rang: 2 }]));
    expect(annulerNiveau(ouvert).voies['voie-du-colosse']).toBeUndefined();
  });

  it('point orphelin rendu ; niveau réglé à la main : seul le niveau baisse', () => {
    const o = validerNiveau(planifier(c1, 2, [{ voieId: 'voie-de-la-rage', rang: 2 }], { orphelin: 'PC' }));
    expect(annulerNiveau(o).orphelins).toEqual({});
    const manuel = { ...c1, niveau: 4 };
    expect(annulerNiveau(manuel)).toMatchObject({ niveau: 3, voies: c1.voies });
  });
});
