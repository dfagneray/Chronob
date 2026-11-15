// Règles du Compagnon du joueur : psionique, primaliste, voies de domaine, artisanat.
import { describe, it, expect } from 'vitest';
import { deriver, optionsProgression, verifierNiveau, validerNiveau, pvGainNiveau, rangsRecettes, coutCapacite, familleDuPerso } from '../src/lib/rules.js';
import { voieById } from '../src/data/index.js';
import { personnageVide } from '../src/lib/store.jsx';
import { item, planifier, lhagva } from './helpers.js';

const opt = (opts, voieId, rang) => opts.find((o) => o.voie.id === voieId && o.rang === rang);

/** Psionique gnome de niveau 1 (exemple du Compagnon p. 59 : VOL +3, deux pouvoirs → 5 PE). */
function psionique(extra = {}) {
  return personnageVide({
    peupleId: 'gnome',
    profilId: 'psionique',
    famille: 'combattants',
    voiePeuple: 'voie-du-gnome',
    carac: { AGI: 0, CON: 1, FOR: 0, PER: 2, CHA: 0, INT: 0, VOL: 3 },
    voies: { 'voie-du-gnome': 1, 'voie-de-l-attaque-mentale': 1, 'voie-de-la-telekinesie': 1 },
    ...extra,
  });
}

describe('Psionique (Compagnon p. 58-59)', () => {
  it('famille au choix : dé de récupération et bonus de famille', () => {
    const d = deriver(psionique());
    expect(familleDuPerso(psionique())).toBe('combattants');
    expect(d.drDe).toBe(10);
    expect(deriver(psionique({ famille: 'mystiques' })).drDe).toBe(8);
  });

  it('VOL +3 et deux pouvoirs (*) → 5 PE, aucun PM', () => {
    const d = deriver(psionique());
    expect(d.pouvoirs).toBe(2);
    expect(d.peMax).toBe(5);
    expect(d.pmMax).toBe(0);
  });

  it('4 PV par niveau quelle que soit la famille', () => {
    expect(deriver(psionique()).pvMax).toBe(2 * 4 + 1);
    expect(deriver(psionique({ famille: 'mages' })).pvMax).toBe(2 * 4 + 1);
  });

  it('capacités utilisables en armure lourde (avertissement d’armure non maîtrisée seulement)', () => {
    const d = deriver(psionique({ inventaire: [item('cotte-de-mailles')] }));
    expect(d.avertissements.join()).toMatch(/n’est pas maîtrisée/);
    expect(d.avertissements.join()).not.toMatch(/capacités de profil interdites/);
  });

  it('VOL minimale de +1', () => {
    const d = deriver(psionique({ carac: { AGI: 0, CON: 1, FOR: 0, PER: 2, CHA: 0, INT: 0, VOL: 0 } }));
    expect(d.avertissements.join()).toMatch(/VOL d’au moins \+1/);
  });
});

describe('Primaliste (Compagnon p. 53)', () => {
  const c = personnageVide({ profilId: 'primaliste', carac: { AGI: 0, CON: 2, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 3 }, voies: { 'voie-de-l-humain': 1, 'voie-du-bois': 1, 'voie-du-sol': 1 } });
  it('mage à 4 PV par niveau, sans voie du mage', () => {
    expect(deriver(c).pvMax).toBe(2 * 4 + 2);
    expect(deriver(c).drDe).toBe(6);
    expect(optionsProgression(c, 2, c.voies).some((o) => o.voie.id === 'voie-du-mage')).toBe(false);
  });
  it('les sorts donnent des PM', () => expect(deriver(c).pmMax).toBe(3 + 2));
});

describe('Caravanier : petit bouclier seulement', () => {
  const c = personnageVide({ profilId: 'caravanier', voies: { 'voie-de-l-humain': 1, 'voie-du-baroudeur': 1, 'voie-du-marchand': 1 } });
  it('grand bouclier refusé, petit bouclier accepté', () => {
    expect(deriver({ ...c, inventaire: [item('grand-bouclier')] }).avertissements.join()).toMatch(/petit bouclier/);
    expect(deriver({ ...c, inventaire: [item('petit-bouclier')] }).avertissements).toEqual([]);
  });
});

describe('Voies de domaine de prêtre (Compagnon p. 142)', () => {
  const pretre = personnageVide({
    peupleId: 'nain',
    profilId: 'pretre',
    voiePeuple: 'voie-du-nain',
    voieDomaine: 'voie-de-domaine-arshran',
    carac: { AGI: 0, CON: 2, FOR: 1, PER: 0, CHA: 3, INT: 0, VOL: 2 },
    voies: { 'voie-du-nain': 1, 'voie-de-domaine-arshran': 1, 'voie-de-la-priere': 1, 'voie-des-soins': 1 },
  });
  const opts = optionsProgression(pretre, 2, pretre.voies);
  it('remplace la voie de peuple, comme la voie du mage', () => {
    expect(opt(opts, 'voie-de-domaine-arshran', 2)?.possible).toBe(true);
    expect(opt(opts, 'voie-du-nain', 2)).toBeUndefined();
    expect(opts.some((o) => o.voie.type === 'domaine' && o.voie.id !== 'voie-de-domaine-arshran')).toBe(false);
  });
  it('hors de la limite de six voies, PV de mystique', () => {
    expect(voieById['voie-de-domaine-arshran'].type).toBe('domaine');
    expect(pvGainNiveau(pretre, [{ voieId: 'voie-de-domaine-arshran', rang: 2 }]).pv).toBe(4);
  });
});

describe('Artisanat (Compagnon p. 73-74)', () => {
  it('voies d’artisan : 1 point par rang, quel que soit le rang', () => {
    expect(coutCapacite(voieById['voie-du-forgeron'], 1)).toBe(1);
    expect(coutCapacite(voieById['voie-du-forgeron'], 4)).toBe(1);
    expect(coutCapacite(voieById['recettes-voie-des-lames'], 3)).toBe(0);
  });

  it('chaque rang d’artisan donne 3 rangs de recettes (exemple de Lhagva : forgeron 1 → lames 1-2 et mailles 1)', () => {
    const v = { 'voie-du-forgeron': 1, 'recettes-voie-des-lames': 2, 'recettes-voie-des-armures-de-mailles': 1 };
    expect(rangsRecettes(v)).toEqual({ gagnes: 3, depenses: 3, restants: 0 });
  });

  it('progression : recettes gratuites dans la limite des rangs gagnés, hors limite de voies', () => {
    const c0 = lhagva({ niveau: 2 });
    let c = planifier(c0, 3, [
      { voieId: 'voie-du-forgeron', rang: 1 },
      { voieId: 'recettes-voie-des-lames', rang: 1 },
      { voieId: 'recettes-voie-des-lames', rang: 2 },
      { voieId: 'recettes-voie-des-armures-de-mailles', rang: 1 },
    ]);
    // 1 point restant : il doit encore être dépensé dans une voie normale
    expect(verifierNiveau(c, 3).erreurs.join()).toMatch(/1 point de capacité à dépenser/);
    c = planifier(c0, 3, [
      { voieId: 'voie-du-forgeron', rang: 1 },
      { voieId: 'recettes-voie-des-lames', rang: 1 },
      { voieId: 'recettes-voie-des-lames', rang: 2 },
      { voieId: 'recettes-voie-des-armures-de-mailles', rang: 1 },
      { voieId: 'voie-de-la-rage', rang: 2 },
    ]);
    expect(verifierNiveau(c, 3).ok).toBe(true);
    const after = validerNiveau(c);
    const opts = optionsProgression(after, 4, after.voies);
    expect(opt(opts, 'recettes-voie-des-lames', 3).raisons.join()).toMatch(/aucun rang de recette/);
  });
});
