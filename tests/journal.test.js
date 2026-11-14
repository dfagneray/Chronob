import { describe, it, expect } from 'vitest';
import { diffPerso, journaliser, categoriesEntree, FUSION_MS, JOURNAL_MAX } from '../src/lib/journal.js';
import { lhagva, item } from './helpers.js';

const base = () => ({ ...lhagva(), pv: { actuel: 12, temp: 0 }, pc: { actuel: 2 }, pm: { actuel: 0 }, dr: { actuel: 4 } });

describe('Détection des changements', () => {
  it('aucun changement : rien à consigner', () => {
    const c = base();
    expect(diffPerso(c, { ...c })).toEqual([]);
  });

  it('PV, PC, DR : valeur avant → après', () => {
    const c = base();
    const ch = diffPerso(c, { ...c, pv: { actuel: 7, temp: 0 }, dr: { actuel: 3 } });
    expect(ch).toEqual([
      expect.objectContaining({ cle: 'pv', cat: 'combat', de: 12, a: 7 }),
      expect.objectContaining({ cle: 'dr', de: 4, a: 3 }),
    ]);
  });

  it('états appliqués et retirés', () => {
    const c = base();
    expect(diffPerso(c, { ...c, etats: ['renverse'] })[0].texte).toBe('État Renversé appliqué');
    expect(diffPerso({ ...c, etats: ['renverse'] }, c)[0].texte).toBe('État Renversé retiré');
  });

  it('nouvelle capacité : nom de la voie, rang et capacité acquise', () => {
    const c = base();
    const [x] = diffPerso(c, { ...c, voies: { ...c.voies, 'voie-de-la-rage': 2 } });
    expect(x).toMatchObject({ label: 'Voie de la rage', de: 'rang 1', a: 'rang 2', detail: 'Défier la mort', cat: 'progression' });
  });

  it('capacité utilisée puis rechargée', () => {
    const c = base();
    const id = 'voie-de-la-rage--1';
    expect(diffPerso(c, { ...c, utilise: { [id]: true } })[0].texte).toBe('Capacité utilisée : Cri de guerre');
    expect(diffPerso({ ...c, utilise: { [id]: true } }, { ...c, utilise: {} })[0].texte).toBe('Capacité rechargée : Cri de guerre');
  });

  it('inventaire : ajout, équipement, retrait ; bourse', () => {
    const c = { ...base(), inventaire: [] };
    const epee = item('epee-longue', { equipe: false });
    expect(diffPerso(c, { ...c, inventaire: [epee] })[0].texte).toBe('Ajout : Épée longue');
    expect(diffPerso({ ...c, inventaire: [epee] }, { ...c, inventaire: [{ ...epee, equipe: true }] })[0].texte).toBe('Équipé : Épée longue');
    expect(diffPerso({ ...c, inventaire: [epee] }, c)[0].texte).toBe('Retiré : Épée longue');
    expect(diffPerso(c, { ...c, bourse: { ...c.bourse, pa: 7 } })[0]).toMatchObject({ label: 'Bourse (pa)', de: 0, a: 7 });
  });

  it('fiche : caractéristique, bonus manuel, maximum manuel', () => {
    const c = base();
    expect(diffPerso(c, { ...c, carac: { ...c.carac, FOR: 4 } })[0]).toMatchObject({ label: 'Force (base)', de: 3, a: 4, cat: 'fiche' });
    expect(diffPerso(c, { ...c, bonus: { DEF: 2 } })[0]).toMatchObject({ label: 'Bonus manuel Défense', de: '+0', a: '+2' });
    expect(diffPerso(c, { ...c, maxManuel: { PV: 20 } })[0]).toMatchObject({ de: 'auto', a: 20 });
  });

  it('posture de combat prise puis retirée', () => {
    const c = base();
    expect(diffPerso(c, { ...c, posture: 'defense-totale' })[0].texte).toBe('Posture : Défense totale');
    expect(diffPerso({ ...c, posture: 'defense-totale' }, { ...c, posture: null })[0].texte).toBe('Fin de la posture : Défense totale');
  });

  it('les modifications du plan (bac à sable) ne sont pas consignées', () => {
    const c = base();
    expect(diffPerso(c, { ...c, plan: { 2: { picks: [{ voieId: 'voie-de-la-rage', rang: 2 }] } } })).toEqual([]);
  });
});

describe('Journal', () => {
  const t0 = Date.parse('2026-11-14T20:00:00Z');
  const pv = (de, a) => [{ cle: 'pv', cat: 'combat', label: 'PV', de, a }];

  it('regroupe les clics rapides sur une même valeur', () => {
    let j = journaliser([], pv(12, 11), {}, t0);
    j = journaliser(j, pv(11, 10), {}, t0 + 2000);
    j = journaliser(j, pv(10, 7), {}, t0 + 4000);
    expect(j).toHaveLength(1);
    expect(j[0].changes[0]).toMatchObject({ de: 12, a: 7 });
  });

  it('un retour à la valeur de départ efface la ligne', () => {
    let j = journaliser([], pv(12, 11), {}, t0);
    j = journaliser(j, pv(11, 12), {}, t0 + 1000);
    expect(j).toEqual([]);
  });

  it('pas de regroupement après le délai, ni pour des valeurs différentes, ni sous un intitulé d’action', () => {
    let j = journaliser([], pv(12, 11), {}, t0);
    j = journaliser(j, pv(11, 10), {}, t0 + FUSION_MS + 1);
    expect(j).toHaveLength(2);
    j = journaliser(j, [{ cle: 'pc', label: 'PC', de: 2, a: 1 }], {}, t0 + FUSION_MS + 2);
    expect(j).toHaveLength(3);
    j = journaliser(j, pv(10, 14), { titre: 'Récupération rapide' }, t0 + FUSION_MS + 3);
    expect(j).toHaveLength(4);
    expect(j[3].titre).toBe('Récupération rapide');
  });

  it('notes libres', () => {
    const j = journaliser([], [], { texte: 'Le troll a fui vers le nord.' }, t0);
    expect(j[0]).toMatchObject({ type: 'note', texte: 'Le troll a fui vers le nord.' });
    expect(categoriesEntree(j[0])).toEqual(['note']);
  });

  it(`conserve au plus ${JOURNAL_MAX} entrées`, () => {
    let j = [];
    for (let i = 0; i < JOURNAL_MAX + 20; i++) j = journaliser(j, [{ cle: `k${i}`, label: 'x', de: 0, a: 1 }], {}, t0 + i);
    expect(j).toHaveLength(JOURNAL_MAX);
    expect(j.at(-1).changes[0].cle).toBe(`k${JOURNAL_MAX + 19}`);
  });
});
