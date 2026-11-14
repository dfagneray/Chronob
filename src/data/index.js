// Point d'entrée des données de règles (générées par `npm run extract`).
import peuples from './peuples.json';
import profils from './profils.json';
import voies from './voies.json';
import etats from './etats.json';
import familles from './familles.json';
import regles from './regles.json';
import { EQUIPEMENT } from './equipement.js';

export { peuples, profils, voies, etats, familles, regles, EQUIPEMENT };

export const peupleById = Object.fromEntries(peuples.map((p) => [p.id, p]));
export const profilById = Object.fromEntries(profils.map((p) => [p.id, p]));
export const voieById = Object.fromEntries(voies.map((v) => [v.id, v]));
export const etatById = Object.fromEntries(etats.map((e) => [e.id, e]));
export const equipById = Object.fromEntries(EQUIPEMENT.map((e) => [e.id, e]));
export const capaciteById = Object.fromEntries(voies.flatMap((v) => v.capacites.map((c) => [c.id, c])));

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
  if (voie.type === 'profil') return voie.famille;
  if (voie.type === 'mage') return 'mages';
  if (voie.type === 'prestige' && voie.categorie !== 'generique') return voie.categorie;
  return familleProfilPrincipal;
}
