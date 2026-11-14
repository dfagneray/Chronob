import { personnageVide } from '../src/lib/store.jsx';
import { equipById } from '../src/data/index.js';

export const item = (id, extra = {}) => ({ uid: `u-${id}-${Math.random()}`, refId: id, ...equipById[id], id: undefined, qte: 1, equipe: true, magie: 0, ...extra });

/** Lhagva, barbare humaine des exemples du livre (p. 26-32). */
export function lhagva(extra = {}) {
  return personnageVide({
    nom: 'Lhagva',
    peupleId: 'humain',
    profilId: 'barbare',
    voiePeuple: 'voie-de-l-humain',
    carac: { AGI: 1, CON: 2, FOR: 3, PER: 1, CHA: -1, INT: 0, VOL: 1 },
    voies: { 'voie-de-l-humain': 1, 'voie-du-pourfendeur': 1, 'voie-de-la-rage': 1 },
    inventaire: [item('cuir-simple'), item('grand-bouclier')],
    ...extra,
  });
}

/** Ionas, ensorceleur elfe haut des exemples du livre (p. 28-32). */
export function ionas(extra = {}) {
  return personnageVide({
    nom: 'Ionas',
    peupleId: 'elfe-haut',
    profilId: 'ensorceleur',
    voiePeuple: 'voie-de-l-elfe-haut',
    voieDuMage: true,
    carac: { AGI: 1, CON: 1, FOR: -2, PER: 0, CHA: 4, INT: 0, VOL: 2 },
    voies: { 'voie-de-l-elfe-haut': 1, 'voie-du-mage': 1, 'voie-de-l-air': 1, 'voie-de-l-invocation': 2 },
    ...extra,
  });
}

/** Planifie un niveau (sans passer par l'interface). */
export function planifier(char, niveau, picks, extra = {}) {
  return { ...char, plan: { ...(char.plan || {}), [niveau]: { picks, orphelin: null, ...extra } } };
}
