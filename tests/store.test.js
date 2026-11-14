import { describe, it, expect } from 'vitest';
import { normaliser, personnageVide } from '../src/lib/store.jsx';
import { lhagva } from './helpers.js';

describe('Sauvegarde et import', () => {
  it('normaliser remplit les compteurs vides avec les maximums', () => {
    const c = normaliser(lhagva());
    expect(c.pv.actuel).toBe(12);
    expect(c.dr.actuel).toBe(4);
    expect(c.pc.actuel).toBe(2);
    expect(c.pm.actuel).toBe(0);
  });

  it('normaliser conserve les valeurs existantes, même au-delà du maximum', () => {
    const c = normaliser({ ...lhagva(), pv: { actuel: 40, temp: 3 } });
    expect(c.pv).toEqual({ actuel: 40, temp: 3 });
  });

  it('un import minimal (fiche partielle) est complété', () => {
    const c = normaliser({ nom: 'Wilibert', niveau: 3, profilId: 'voleur', peupleId: 'halfelin', carac: { AGI: 3 } });
    expect(c.carac).toMatchObject({ AGI: 3, CON: 0, VOL: 0 });
    expect(c.bourse).toEqual({ pp: 0, po: 0, pa: 0, pc: 0 });
    expect(c.pv.actuel).toBe(8 + 4 + 4);
    expect(Array.isArray(c.inventaire)).toBe(true);
  });

  it('un export JSON relu redonne le même personnage', () => {
    const c = normaliser(lhagva());
    expect(normaliser(JSON.parse(JSON.stringify(c)))).toEqual(c);
  });

  it('personnageVide fournit un identifiant unique', () => {
    expect(personnageVide().id).not.toBe(personnageVide().id);
  });
});
