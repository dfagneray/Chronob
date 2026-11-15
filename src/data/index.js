// Point d'entrée des données de règles (générées par `npm run extract` et `npm run extract:compagnon`).
import peuplesLdR from './peuples.json';
import profilsLdR from './profils.json';
import voiesLdR from './voies.json';
import etats from './etats.json';
import familles from './familles.json';
import reglesLdR from './regles.json';
import peuplesCompagnon from './compagnon/peuples.json';
import profilsCompagnon from './compagnon/profils.json';
import voiesCompagnon from './compagnon/voies.json';
import reglesCompagnon from './compagnon/regles.json';
import complementsCompagnon from './compagnon/complements.json';
import { EQUIPEMENT } from './equipement.js';

/** Ouvrages sources. Les données sans champ `source` viennent du Livre des règles. */
export const SOURCES = { ldr: 'Livre des règles', compagnon: 'Compagnon du joueur' };
export const sourceDe = (x) => x?.source || 'ldr';
/** Référence de page lisible : « p. 45 » (Livre des règles) ou « Compagnon p. 12 ». */
export const refPage = (x) => (x?.page == null ? '' : sourceDe(x) === 'compagnon' ? `Compagnon p. ${x.page}` : `p. ${x.page}`);

// Compléments du Compagnon aux peuples du Livre des règles (ex. voie optionnelle du demi-elfe)
const peuples = [
  ...peuplesLdR.map((p) => {
    const c = complementsCompagnon.peuples?.[p.id];
    return c ? { ...p, voies: [...p.voies, ...c.voies.filter((v) => !p.voies.includes(v))], noteCompagnon: c.noteCompagnon } : p;
  }),
  ...peuplesCompagnon,
];
const profils = [...profilsLdR, ...profilsCompagnon];
const voies = [...voiesLdR, ...voiesCompagnon];
const regles = [...reglesLdR, ...reglesCompagnon];

export { peuples, profils, voies, etats, familles, regles, EQUIPEMENT };

export const peupleById = Object.fromEntries(peuples.map((p) => [p.id, p]));
export const profilById = Object.fromEntries(profils.map((p) => [p.id, p]));
export const voieById = Object.fromEntries(voies.map((v) => [v.id, v]));
export const etatById = Object.fromEntries(etats.map((e) => [e.id, e]));
export const equipById = Object.fromEntries(EQUIPEMENT.map((e) => [e.id, e]));
export const capaciteById = Object.fromEntries(voies.flatMap((v) => v.capacites.map((c) => [c.id, c])));

/** Voies de domaine de prêtre (Compagnon), triées par divinité. */
export const voiesDomaine = voies.filter((v) => v.type === 'domaine');

export const CARACS = ['AGI', 'CON', 'FOR', 'PER', 'CHA', 'INT', 'VOL'];
export const CARAC_NOMS = {
  AGI: 'Agilité',
  CON: 'Constitution',
  FOR: 'Force',
  PER: 'Perception',
  CHA: 'Charisme',
  INT: 'Intelligence',
  VOL: 'Volonté',
};

export const ACTIONS = {
  L: { court: 'L', nom: 'Action limitée' },
  A: { court: 'A', nom: 'Action d’attaque' },
  M: { court: 'M', nom: 'Action de mouvement' },
  G: { court: 'G', nom: 'Action gratuite' },
};

export const CATEGORIES_RECETTES = {
  armes: 'Recettes d’armes',
  armures: 'Recettes d’armures',
  diverses: 'Recettes diverses',
  potions: 'Recettes de potions',
};

export const CATEGORIES_PRESTIGE = {
  generique: 'Voies génériques',
  aventuriers: 'Voies d’aventurier',
  combattants: 'Voies de combattant',
  mages: 'Voies de mage',
  mystiques: 'Voies de mystique',
};

/** Profil auquel appartient une voie (null pour peuple/prestige). */
export function profilDeVoie(voie) {
  if (!voie) return null;
  if (voie.type === 'profil') return profilById[voie.profil];
  return null;
}

/** Famille de PV d'une voie, pour le calcul des PV des profils hybrides. */
export function familleDeVoie(voie, familleProfilPrincipal) {
  if (!voie) return familleProfilPrincipal;
  // voies de psionique : famille au choix, celle du personnage
  if (voie.type === 'profil') return voie.famille || familleProfilPrincipal;
  if (voie.type === 'mage') return 'mages';
  if (voie.type === 'domaine') return 'mystiques';
  if (voie.type === 'prestige' && voie.categorie !== 'generique') return voie.categorie;
  return familleProfilPrincipal;
}
