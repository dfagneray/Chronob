// Intégrité des données extraites du PDF (src/data/*.json, générées par `npm run extract`).
import { describe, it, expect } from 'vitest';
import { peuples, profils, voies, etats, familles, regles, EQUIPEMENT, voieById, equipById } from '../src/data/index.js';
import { SAC_AVENTURIER } from '../src/data/equipement.js';

describe('Données de règles', () => {
  it('8 peuples, 14 profils, 4 familles, 10 états (sommaire du livre)', () => {
    expect(peuples).toHaveLength(8);
    expect(profils).toHaveLength(14);
    expect(Object.keys(familles)).toEqual(['aventuriers', 'combattants', 'mages', 'mystiques']);
    expect(etats.map((e) => e.nom)).toEqual(['Aveuglé', 'Affaibli', 'Essoufflé', 'Étourdi', 'Immobilisé', 'Invalide', 'Paralysé', 'Ralenti', 'Renversé', 'Surpris']);
  });

  it('PV et dés de récupération des familles (p. 30 et 39)', () => {
    expect(Object.values(familles).map((f) => [f.pv, f.dr])).toEqual([
      [4, 8],
      [5, 10],
      [3, 6],
      [4, 8],
    ]);
  });

  it('132 voies et 660 capacités', () => {
    expect(voies).toHaveLength(132);
    expect(voies.reduce((n, v) => n + v.capacites.length, 0)).toBe(660);
  });

  it('chaque voie a 5 capacités de rangs consécutifs, avec nom et description', () => {
    for (const v of voies) {
      const r = v.capacites.map((c) => c.rang);
      expect(r, v.nom).toHaveLength(5);
      r.forEach((x, i) => expect(x, v.nom).toBe(r[0] + i));
      for (const c of v.capacites) {
        expect(c.nom.length, `${v.nom} rang ${c.rang}`).toBeGreaterThan(2);
        expect(c.description.length, `${v.nom} — ${c.nom}`).toBeGreaterThan(20);
        expect(c.description, c.nom).not.toMatch(/[\u0000-\u0008\u0080-\u009F\uE000-\uF8FF\uFFFD]/);
        expect(c.description, c.nom).not.toMatch(/@\S+\.\w+/); // pas de pied de page
      }
    }
  });

  it('les voies de profil commencent au rang 1, celles de prestige au rang 4 (sauf le familier fantastique, imprimé du rang 3 au rang 7)', () => {
    for (const v of voies) {
      const premier = v.capacites[0].rang;
      if (v.type === 'prestige') expect(premier, v.nom).toBe(v.id === 'voie-du-familier-fantastique' ? 3 : 4);
      else expect(premier, v.nom).toBe(1);
    }
  });

  it('chaque profil a 5 voies existantes ; les mages ont accès à la voie du mage', () => {
    for (const p of profils) {
      expect(p.voies, p.nom).toHaveLength(5);
      p.voies.forEach((id) => expect(voieById[id], id).toBeDefined());
      expect(p.equipementDepart, p.nom).toBeTruthy();
    }
    expect(voieById['voie-du-mage'].profils.sort()).toEqual(['ensorceleur', 'forgesort', 'magicien', 'sorcier']);
  });

  it('les voies de peuple référencées existent (le demi-elfe choisit parmi trois)', () => {
    for (const p of peuples) p.voies.forEach((id) => expect(voieById[id], `${p.nom} → ${id}`).toBeDefined());
    expect(peuples.find((p) => p.id === 'demi-elfe').voies).toHaveLength(3);
  });

  // Le tableau p. 128 nomme « voie des couleurs » la voie du chaos (p. 155) et omet la voie de l’enchanteur (p. 157).
  it('voies de prestige : 5 génériques, 12 d’aventurier, 12 de combattant, 13 de mage, 12 de mystique (p. 128-175)', () => {
    const n = (c) => voies.filter((v) => v.type === 'prestige' && v.categorie === c).length;
    expect([n('generique'), n('aventuriers'), n('combattants'), n('mages'), n('mystiques')]).toEqual([5, 12, 12, 13, 12]);
  });

  it('marqueurs d’action et de sort cohérents', () => {
    const caps = voies.flatMap((v) => v.capacites);
    for (const c of caps) expect([null, 'L', 'A', 'M', 'G']).toContain(c.action);
    expect(caps.find((c) => c.nom === 'Choc').sort).toBe(true);
    expect(caps.find((c) => c.nom === 'Tir de barrage').action).toBe('L');
    expect(caps.find((c) => c.nom === 'Cri de guerre').action).toBe('G');
  });

  it('textes des états conformes au livre', () => {
    const e = Object.fromEntries(etats.map((x) => [x.id, x.description]));
    expect(e.aveugle).toMatch(/-5 en Init., attaque et DEF, -10 en attaque à distance/);
    expect(e.renverse).toMatch(/-5 en attaque et DEF/);
    expect(e.surpris).toMatch(/Pas d’action et -5 en DEF/);
  });

  it('sections de règles extraites (combat, magie, récupération)', () => {
    const titres = regles.map((r) => r.titre);
    for (const t of ['Récupération rapide', 'Récupération complète', 'Options tactiques', 'Brûlure de mana', 'Concentration accrue', 'Points de chance']) expect(titres).toContain(t);
  });
});

describe('Catalogue d’équipement (p. 183-191)', () => {
  it('armures : DEF et AGI max du tableau p. 188', () => {
    const a = EQUIPEMENT.filter((e) => e.categorie === 'armure').map((e) => [e.def, e.agiMax]);
    expect(a).toEqual([
      [1, 7],
      [2, 6],
      [3, 5],
      [4, 4],
      [5, 3],
      [6, 2],
      [7, 1],
    ]);
  });
  it('quelques armes de référence', () => {
    expect(equipById['epee-longue']).toMatchObject({ dm: '1d8', prix: 60 });
    expect(equipById['epee-batarde']).toMatchObject({ dm: '1d8', dm2: '1d12' });
    expect(equipById['arc-long']).toMatchObject({ dm: '1d8', portee: 50 });
    expect(equipById['rapiere'].critique).toBe(19);
  });
  it('identifiants uniques et sac d’aventurier complet (p. 31)', () => {
    expect(new Set(EQUIPEMENT.map((e) => e.id)).size).toBe(EQUIPEMENT.length);
    SAC_AVENTURIER.forEach((id) => expect(equipById[id]).toBeDefined());
  });
});
