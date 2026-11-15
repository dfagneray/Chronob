// Intégrité des données extraites du PDF (src/data/*.json, générées par `npm run extract`).
import { describe, it, expect } from 'vitest';
import { peuples as tousPeuples, profils as tousProfils, voies as toutesVoies, etats, familles, regles, EQUIPEMENT, voieById, equipById, sourceDe, peupleById, profilById, voiesDomaine, refPage } from '../src/data/index.js';
import { SAC_AVENTURIER } from '../src/data/equipement.js';

// Livre des règles seul (le Compagnon du joueur est vérifié plus bas)
const ldr = (x) => sourceDe(x) === 'ldr';
const peuples = tousPeuples.filter(ldr);
const profils = tousProfils.filter(ldr);
const voies = toutesVoies.filter(ldr);

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

  it('les voies de peuple référencées existent (le demi-elfe choisit parmi trois, plus la voie optionnelle du Compagnon)', () => {
    for (const p of tousPeuples) p.voies.forEach((id) => expect(voieById[id], `${p.nom} → ${id}`).toBeDefined());
    expect(peuples.find((p) => p.id === 'demi-elfe').voies).toEqual(['voie-de-l-humain', 'voie-de-l-elfe-haut', 'voie-de-l-elfe-sylvain', 'voie-du-demi-elfe']);
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

describe('Compagnon du joueur', () => {
  const comp = (x) => sourceDe(x) === 'compagnon';
  const cv = toutesVoies.filter(comp);
  const n = (type) => cv.filter((v) => v.type === type).length;

  it('17 peuples optionnels (les lutins en deux variantes) et 5 profils (sommaire p. 3)', () => {
    expect(tousPeuples.filter(comp).map((p) => p.nom)).toEqual([
      'Âme forgée', 'Cambion', 'Demi-ogre', 'Drakonide', 'Elfe pâle', 'Elfe des profondeurs', 'Félis', 'Frouïn', 'Gobelin', 'Kobold',
      'Lutin (fée)', 'Lutin (farfadet)', 'Minotaure', 'Nephilim', 'Ophidien', 'Satyre', 'Wolfer',
    ]);
    expect(tousProfils.filter(comp).map((p) => p.id)).toEqual(['caravanier', 'chamane', 'parangon', 'primaliste', 'psionique']);
  });

  it('voies : 18 de peuple, 25 de profil, 2 de prestige, 4 d’artisan, 35 de recettes, 32 de domaine', () => {
    expect([n('peuple'), n('profil'), n('prestige'), n('artisan'), n('recette'), n('domaine')]).toEqual([18, 25, 2, 4, 35, 32]);
    expect(voiesDomaine).toHaveLength(32);
  });

  it('aucun identifiant de voie en double avec le Livre des règles', () => {
    const ids = toutesVoies.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('texte réparé : pas de lettres éclatées ni de caractères de contrôle', () => {
    for (const v of cv)
      for (const c of v.capacites) {
        expect(c.description, c.id).not.toMatch(/[\u0000-\u0008\u0080-\u009F\uE000-\uF8FF\uFFFD]/);
        expect(c.description, c.id).not.toMatch(/(?:^|\s)(?:\S\s){5,}\S(?=\s|$)/);
      }
  });

  it('textes de référence', () => {
    expect(voieById['voie-de-l-ame-forgee'].capacites[4].description).toMatch(/augmente ses valeurs de CON et de FOR de \+1/);
    expect(voieById['voie-de-la-telekinesie'].capacites[1].nom).toBe('Champ de protection');
    expect(voieById['voie-de-domaine-oumaros'].capacites.map((c) => c.nom)).toEqual(['Capacité de peuple + météo', 'Lévitation', 'Foudre mineure', 'Monture volante', 'Château dans le ciel']);
    expect(voieById['voie-de-domaine-arcanna']).toMatchObject({ divinite: 'Arcanna', symbole: 'une étoile', armePrivilegiee: 'bâton', page: 142 });
  });

  it('modificateurs de peuple : fixes ou au choix', () => {
    expect(peupleById['demi-ogre'].mods.fixes).toEqual({ FOR: 2, CON: 1, AGI: -1, INT: -1, CHA: -1, VOL: -1 });
    expect(peupleById['felis'].mods).toMatchObject({ plus: ['AGI', 'PER'], moins: ['FOR', 'INT'] });
    expect(peupleById['ame-forgee'].modificateurs).toBe('+1 en CON, -1 en CHA ou INT');
  });

  it('profils : armure, bouclier, famille et énergie', () => {
    expect(profilById.caravanier).toMatchObject({ famille: 'aventuriers', armureMax: 4, bouclier: 'petit', pvParNiveau: 4 });
    expect(profilById.primaliste).toMatchObject({ famille: 'mages', voieDuMage: false, pvParNiveau: 4 });
    expect(profilById.psionique).toMatchObject({ famille: null, energie: 'PE', armureLibre: true });
    expect(profilById.psionique.particularites).toMatch(/points d’ego \(PE\)/);
  });

  it('pages référencées dans le Compagnon', () => {
    expect(refPage(peupleById['wolfer'])).toBe('Compagnon p. 36');
    expect(refPage(voieById['voie-du-mage'])).toBe('p. 60');
    expect(equipById['sabre-droit']).toMatchObject({ dm: '1d6', dm2: '1d8', critique: 19, source: 'compagnon' });
  });
});
