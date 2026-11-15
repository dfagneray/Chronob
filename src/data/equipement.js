// Catalogue d'équipement — tableaux du chapitre « Équipement » (p. 181-195).
// Prix exprimés en pièces de cuivre (pc) : 1 pa = 10 pc, 1 po = 10 pa, 1 pp = 10 po.
const pa = (n) => n * 10;

export const CATEGORIES_EQUIPEMENT = {
  contact: 'Armes de contact',
  distance: 'Armes à distance',
  armure: 'Armures',
  bouclier: 'Boucliers',
  materiel: 'Matériel',
  consommable: 'Consommables',
  monture: 'Montures & véhicules',
  divers: 'Divers',
};

export const EQUIPEMENT = [
  // --- Armes d'attaque au contact (p. 183) ---
  { id: 'mains-nues', nom: 'Mains nues', categorie: 'contact', dm: '1d3', prix: 0, typeDm: 'Contondants', notes: 'Les DM sont temporaires', page: 183 },
  { id: 'baton', nom: 'Bâton', categorie: 'contact', dm: '1d4', prix: 0, typeDm: 'Contondants', deuxMains: true, notes: 'Arme à deux mains, DM temporaires possibles', page: 183 },
  { id: 'baton-ferre', nom: 'Bâton ferré', categorie: 'contact', dm: '1d6', prix: pa(2), typeDm: 'Contondants', deuxMains: true, notes: 'Arme à deux mains', page: 183 },
  { id: 'dague', nom: 'Dague', categorie: 'contact', dm: '1d4', prix: pa(3), typeDm: 'Perforants', legere: true, portee: 5, notes: 'Arme légère ; peut être lancée (5 m)', page: 183 },
  { id: 'epee-a-deux-mains', nom: 'Épée à deux mains', categorie: 'contact', dm: '2d6', prix: pa(10), typeDm: 'Tranchants', deuxMains: true, notes: 'Arme à deux mains', page: 183 },
  { id: 'epee-batarde', nom: 'Épée bâtarde', categorie: 'contact', dm: '1d8', dm2: '1d12', prix: pa(9), typeDm: 'Tranchants', notes: 'Arme à une ou deux mains (1d8/1d12)', page: 183 },
  { id: 'epee-courte', nom: 'Épée courte', categorie: 'contact', dm: '1d6', prix: pa(5), typeDm: 'Perforants', legere: true, notes: 'Arme légère', page: 183 },
  { id: 'epee-longue', nom: 'Épée longue', categorie: 'contact', dm: '1d8', prix: pa(6), typeDm: 'Tranchants', notes: '', page: 183 },
  { id: 'epieu', nom: 'Épieu', categorie: 'contact', dm: '1d6', dm2: '1d10', prix: pa(4), typeDm: 'Perforants', portee: 10, notes: 'Arme à une ou deux mains (1d6/1d10) ; lancée : 1d6 DM à 10 m', page: 184 },
  { id: 'fleau', nom: 'Fléau', categorie: 'contact', dm: '1d6', prix: pa(5), typeDm: 'Contondants', notes: '1 fois par combat, relance une attaque ratée contre un adversaire qui utilise un bouclier ou une arme', page: 184 },
  { id: 'fleau-a-deux-mains', nom: 'Fléau à deux mains', categorie: 'contact', dm: '1d10', prix: pa(8), typeDm: 'Contondants', deuxMains: true, notes: 'Arme à deux mains, relance 1 attaque ratée/combat', page: 183 },
  { id: 'gourdin', nom: 'Gourdin', categorie: 'contact', dm: '1d4', prix: pa(1), typeDm: 'Contondants', notes: 'DM temporaires possibles', page: 183 },
  { id: 'hache', nom: 'Hache', categorie: 'contact', dm: '1d8', prix: pa(6), typeDm: 'Tranchants', notes: '', page: 183 },
  { id: 'hache-a-deux-mains', nom: 'Hache à deux mains', categorie: 'contact', dm: '2d6', prix: pa(10), typeDm: 'Tranchants', deuxMains: true, notes: 'Arme à deux mains', page: 183 },
  { id: 'lance', nom: 'Lance', categorie: 'contact', dm: '1d6', dm2: '1d10', prix: pa(4), typeDm: 'Perforants', portee: 10, notes: 'Arme à une ou deux mains (1d6/1d10) ; lancée : 1d6 DM à 10 m', page: 184 },
  { id: 'lance-de-cavalerie', nom: 'Lance de cavalerie', categorie: 'contact', dm: '2d6', prix: pa(8), typeDm: 'Perforants', notes: 'Après un déplacement, à cheval ; sinon dé malus au contact', page: 184 },
  { id: 'marteau', nom: 'Marteau', categorie: 'contact', dm: '1d6', prix: pa(4), typeDm: 'Contondants', notes: '', page: 183 },
  { id: 'masse', nom: 'Masse', categorie: 'contact', dm: '1d6', prix: pa(4), typeDm: 'Contondants', notes: '', page: 183 },
  { id: 'pique', nom: 'Pique', categorie: 'contact', dm: '1d10', prix: pa(5), typeDm: 'Perforants', deuxMains: true, notes: 'Arme à deux mains ; DM doublés contre une grande créature qui charge ; attaque derrière un allié à -5 ; dé malus dans les autres conditions', page: 184 },
  { id: 'rapiere', nom: 'Rapière', categorie: 'contact', dm: '1d6', prix: pa(6), typeDm: 'Perforants', legere: true, critique: 19, notes: 'Arme légère, critique sur 19-20', page: 183 },
  { id: 'stylet', nom: 'Stylet', categorie: 'contact', dm: '1d3', prix: pa(1), typeDm: 'Perforants', legere: true, sansFor: true, notes: 'Arme légère ; pas de FOR aux DM, mais 1d6+AGI DM si la cible est surprise', page: 185 },
  { id: 'vivelame', nom: 'Vivelame', categorie: 'contact', dm: '1d10', prix: pa(15), typeDm: 'Tranchants', deuxMains: true, critique: 19, notes: 'Arme à deux mains, critique sur 19-20', page: 185 },
  // --- Nouvelles armes du Compagnon du joueur (p. 66-67) ---
  { id: 'fouet', nom: 'Fouet', categorie: 'contact', dm: '1', prix: pa(2), typeDm: 'Contondants', sansFor: true, notes: 'Attaque basée sur l’AGI, portée 3 m ; +3 aux tests pour désarmer et renverser', page: 66, source: 'compagnon' },
  { id: 'fouet-de-guerre', nom: 'Fouet de guerre', categorie: 'contact', dm: '1d4', prix: pa(4), typeDm: 'Tranchants', sansFor: true, notes: 'Portée 3 m, sans FOR aux DM ; [1d4 + AGI] DM en action limitée ; +3 aux tests pour désarmer et renverser', page: 66, source: 'compagnon' },
  { id: 'pioche-de-guerre', nom: 'Pioche de guerre', categorie: 'contact', dm: '1d10', prix: pa(7), typeDm: 'Perforants et Tranchants', deuxMains: true, forMin: 1, notes: 'Arme à deux mains, FOR +1 minimum (sinon dé malus) ; critique 18-20 contre plaques et cuirasses ; DM × 2 contre les structures', page: 67, source: 'compagnon' },
  { id: 'sabre-court', nom: 'Sabre court', categorie: 'contact', dm: '1d4', prix: pa(10), typeDm: 'Tranchants', legere: true, critique: 19, explosif: true, notes: 'Arme légère, dé de DM explosif, critique sur 19-20', page: 67, source: 'compagnon' },
  { id: 'sabre-droit', nom: 'Sabre droit', categorie: 'contact', dm: '1d6', dm2: '1d8', prix: pa(15), typeDm: 'Tranchants', critique: 19, explosif: true, notes: 'Arme à une ou deux mains (1d6/1d8), dé de DM explosif, critique sur 19-20', page: 67, source: 'compagnon' },
  { id: 'tribaton', nom: 'Tribâton', categorie: 'contact', dm: '1d6', prix: pa(4), typeDm: 'Contondants', deuxMains: true, sansFor: true, notes: 'Arme à deux mains, [1d6 + AGI] DM ; échec critique sur 1-2 (1 DM à soi-même)', page: 67, source: 'compagnon' },

  // --- Armes d'attaque à distance (p. 185) ---
  { id: 'arbalete-de-poing', nom: 'Arbalète de poing', categorie: 'distance', dm: '1d6', portee: 10, prix: pa(8), typeDm: 'Perforants', notes: 'Action de mouvement pour être rechargée', page: 185 },
  { id: 'arbalete-legere', nom: 'Arbalète légère', categorie: 'distance', dm: '2d4', portee: 30, prix: pa(10), typeDm: 'Perforants', deuxMains: true, notes: 'Action de mouvement pour être rechargée, arme tenue à deux mains', page: 185 },
  { id: 'arbalete-lourde', nom: 'Arbalète lourde', categorie: 'distance', dm: '2d6', portee: 60, prix: pa(15), typeDm: 'Perforants', deuxMains: true, notes: 'Action limitée pour être rechargée, arme tenue à deux mains', page: 185 },
  { id: 'arc-court', nom: 'Arc court', categorie: 'distance', dm: '1d6', portee: 30, prix: pa(4), typeDm: 'Perforants', deuxMains: true, notes: 'Arme tenue à deux mains', page: 185 },
  { id: 'arc-long', nom: 'Arc long', categorie: 'distance', dm: '1d8', portee: 50, prix: pa(8), typeDm: 'Perforants', deuxMains: true, forMin: 1, notes: 'Arme tenue à deux mains, nécessite FOR +1 minimum', page: 185 },
  { id: 'couteaux-de-lancer', nom: 'Couteaux de lancer', categorie: 'distance', dm: '1d4', portee: 10, prix: pa(3), typeDm: 'Perforants', notes: '1d3 au contact ; 3 couteaux en une action limitée (+AGI aux DM)', page: 187 },
  { id: 'dague-lancer', nom: 'Dague (lancer)', categorie: 'distance', dm: '1d4', portee: 5, prix: pa(3), typeDm: 'Perforants', notes: '', page: 185 },
  { id: 'fronde', nom: 'Fronde', categorie: 'distance', dm: '1d4', portee: 20, prix: 0, typeDm: 'Contondants', notes: '', page: 185 },
  { id: 'hachette', nom: 'Hachette', categorie: 'distance', dm: '1d6', portee: 5, prix: pa(2), typeDm: 'Tranchants', notes: '', page: 185 },
  { id: 'javelot', nom: 'Javelot', categorie: 'distance', dm: '1d6', portee: 20, prix: pa(1), typeDm: 'Perforants', notes: 'Avec propulseur : portée doublée, action limitée', page: 187 },
  { id: 'lance-lancer', nom: 'Lance (lancer)', categorie: 'distance', dm: '1d6', portee: 10, prix: pa(3), typeDm: 'Perforants', notes: '', page: 185 },
  { id: 'lance-pierre', nom: 'Lance-pierre', categorie: 'distance', dm: '1d3', portee: 10, prix: 1, typeDm: 'Contondants', notes: '', page: 185 },
  { id: 'petoire', nom: 'Pétoire', categorie: 'distance', dm: '1d10', portee: 20, prix: pa(50), typeDm: 'Perforants', poudre: true, notes: 'Arme à poudre (autorisation du MJ), action limitée pour être rechargée', page: 185 },
  { id: 'bola', nom: 'Bola', categorie: 'distance', dm: '', portee: 10, prix: pa(2), typeDm: '—', notes: 'Pas de DM ; cible de taille petite à grande : test d’AGI difficulté 10 ou immobilisée (action limitée pour se libérer)', page: 66, source: 'compagnon' },
  { id: 'sarbacane', nom: 'Sarbacane', categorie: 'distance', dm: '1', portee: 10, prix: pa(3), typeDm: 'Perforants', notes: '[1d4 + PER] DM si le tireur vise (action limitée)', page: 67, source: 'compagnon' },
  { id: 'mousquet', nom: 'Mousquet', categorie: 'distance', dm: '2d6', portee: 50, prix: pa(100), typeDm: 'Perforants', poudre: true, deuxMains: true, notes: 'Arme à poudre (autorisation du MJ), action limitée pour être rechargée, arme tenue à deux mains', page: 185 },

  // --- Armures (p. 188) ---
  { id: 'tissus-matelasses', nom: 'Tissus matelassés, fourrures', categorie: 'armure', def: 1, agiMax: 7, prix: pa(2), page: 188 },
  { id: 'cuir-simple', nom: 'Cuir simple', categorie: 'armure', def: 2, agiMax: 6, prix: pa(4), page: 188 },
  { id: 'cuir-renforce', nom: 'Cuir renforcé, broigne', categorie: 'armure', def: 3, agiMax: 5, prix: pa(8), page: 188 },
  { id: 'chemise-de-mailles', nom: 'Chemise de mailles', categorie: 'armure', def: 4, agiMax: 4, prix: pa(15), page: 188 },
  { id: 'cotte-de-mailles', nom: 'Cotte de mailles', categorie: 'armure', def: 5, agiMax: 3, prix: pa(25), page: 188 },
  { id: 'armure-de-plaques', nom: 'Armure de plaques', categorie: 'armure', def: 6, agiMax: 2, prix: pa(60), page: 188 },
  { id: 'plaque-complete', nom: 'Plaque complète', categorie: 'armure', def: 7, agiMax: 1, prix: pa(200), notes: 'Sur mesure : seul le chevalier peut la porter (voie de la noblesse, rang 3)', page: 188 },
  { id: 'petit-bouclier', nom: 'Petit bouclier', categorie: 'bouclier', def: 1, prix: pa(2), page: 188 },
  { id: 'grand-bouclier', nom: 'Grand bouclier', categorie: 'bouclier', def: 2, prix: pa(4), page: 188 },

  // --- Matériel (p. 190) ---
  { id: 'briquet', nom: 'Briquet à silex', categorie: 'materiel', prix: pa(1), page: 190 },
  { id: 'carquois', nom: 'Carquois de 20 flèches', categorie: 'materiel', prix: pa(3), page: 190 },
  { id: 'corde', nom: 'Corde 15 m', categorie: 'materiel', prix: pa(2), page: 190 },
  { id: 'couverture', nom: 'Couverture', categorie: 'materiel', prix: pa(1), page: 190 },
  { id: 'grappin', nom: 'Grappin', categorie: 'materiel', prix: pa(2), page: 190 },
  { id: 'lanterne', nom: 'Lanterne à huile', categorie: 'materiel', prix: pa(3), notes: 'Éclaire dans un rayon de 10 m pendant 6 h (1 dose d’huile)', page: 190 },
  { id: 'materiel-ecriture', nom: 'Matériel d’écriture', categorie: 'materiel', prix: pa(5), page: 190 },
  { id: 'outils-crochetage', nom: 'Outils de crochetage', categorie: 'materiel', prix: pa(5), notes: 'Sans ces outils, -10 aux tests d’AGI (Crocheter)', page: 190 },
  { id: 'sac-a-dos', nom: 'Sac à dos', categorie: 'materiel', prix: pa(1), page: 190 },
  { id: 'outre', nom: 'Outre', categorie: 'materiel', prix: 0, notes: 'Sac d’aventurier de départ', page: 31 },
  { id: 'gamelle', nom: 'Gamelle', categorie: 'materiel', prix: 0, notes: 'Sac d’aventurier de départ', page: 31 },
  { id: 'huile', nom: 'Huile pour lanterne', categorie: 'consommable', prix: pa(1), page: 190 },
  { id: 'torche', nom: 'Torche', categorie: 'consommable', prix: 3, notes: '3 torches pour 1 pa. Éclaire dans un rayon de 10 m pendant 1 h', page: 190 },
  { id: 'potion-de-soins', nom: 'Potion de soins', categorie: 'consommable', prix: pa(10), soin: '1d4°', notes: 'Rend 1d4° PV. Une seule potion de soins par récupération rapide (30 min)', page: 190 },
  { id: 'ration', nom: 'Ration (1 semaine)', categorie: 'consommable', prix: pa(4), page: 190 },

  // --- Montures (p. 191) ---
  { id: 'mule', nom: 'Mule ou âne', categorie: 'monture', prix: pa(25), page: 191 },
  { id: 'poney', nom: 'Poney', categorie: 'monture', prix: pa(50), page: 191 },
  { id: 'cheval-de-selle', nom: 'Cheval de selle', categorie: 'monture', prix: pa(100), notes: 'Dé malus au cavalier en combat', page: 191 },
  { id: 'cheval-de-guerre', nom: 'Cheval de guerre', categorie: 'monture', prix: pa(300), notes: 'Pas de pénalité en combat, attaque +4', page: 191 },
  { id: 'caparacon-mailles', nom: 'Caparaçon de mailles', categorie: 'monture', prix: pa(100), notes: '+2 DEF au cheval, malus d’Init. égal au bonus', page: 191 },
  { id: 'barde-plaque', nom: 'Barde de plaque', categorie: 'monture', prix: pa(300), notes: '+4 DEF au cheval, malus d’Init. égal au bonus', page: 191 },
  { id: 'carriole', nom: 'Carriole', categorie: 'monture', prix: pa(50), page: 191 },
  { id: 'chariot', nom: 'Chariot', categorie: 'monture', prix: pa(90), page: 191 },
];

export const SAC_AVENTURIER = ['couverture', 'torche', 'briquet', 'outre', 'gamelle'];

export function formatPrix(pc) {
  if (!pc) return '—';
  if (pc % 10 === 0) return `${pc / 10} pa`;
  return `${pc} pc`;
}
