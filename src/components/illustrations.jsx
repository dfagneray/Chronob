// Illustrations : portraits des peuples, profils et objets extraits des PDF (npm run extract:illustrations),
// complétés par des dessins au trait pour les objets non illustrés dans le livre.
import ILLUSTRATIONS from '../data/illustrations.json';
import { DessinObjet, DESSINS } from './dessins.jsx';
import { cx } from './ui.jsx';

const url = (src) => `${import.meta.env.BASE_URL || './'}${src}`;

export const aPortrait = (peupleId) => !!ILLUSTRATIONS.peuples[peupleId]?.portrait;
export const aIllustrationProfil = (profilId) => !!ILLUSTRATIONS.profils[profilId];
export const aIllustrationObjet = (refId) => !!(ILLUSTRATIONS.equipement[refId] || DESSINS[refId]);

/** Image d'illustration ; `cadrage` = classe object-fit / object-position. */
function Img({ ill, alt, className, cadrage = 'object-contain', eager, style }) {
  return <img src={url(ill.src)} width={ill.largeur} height={ill.hauteur} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" className={cx(cadrage, className)} style={style} />;
}

/** Objet long et fin (bâton, lance, rapière) : en vignette, posé en diagonale comme dans le livre. */
const enDiagonale = (ill) => ill.hauteur / ill.largeur > 2.2;

/** Portrait (ou silhouette) d'un peuple. */
export function PortraitPeuple({ id, nom = '', variante = 'portrait', className, cadrage, eager }) {
  const ill = ILLUSTRATIONS.peuples[id]?.[variante];
  if (!ill) return null;
  return <Img ill={ill} alt={variante === 'portrait' ? `Portraits : ${nom}` : `Silhouette : ${nom}`} className={cx('illus-crayon', className)} cadrage={cadrage} eager={eager} />;
}

/** Illustration d'un profil. */
export function IllustrationProfil({ id, nom = '', className, cadrage, eager }) {
  const ill = ILLUSTRATIONS.profils[id];
  if (!ill) return null;
  return <Img ill={ill} alt={`Illustration : ${nom}`} className={className} cadrage={cadrage} eager={eager} />;
}

/** Illustration d'un objet : dessin du livre, sinon dessin au trait, sinon `repli`. */
export function IllustrationObjet({ refId, nom = '', className, repli = null, vignette = false }) {
  const ill = ILLUSTRATIONS.equipement[refId];
  if (ill) {
    const style = vignette && enDiagonale(ill) ? { transform: 'rotate(-45deg) scale(1.3)' } : undefined;
    return <Img ill={ill} alt={`Illustration : ${nom}`} className={cx('illus-crayon', className)} style={style} />;
  }
  if (DESSINS[refId]) return <DessinObjet id={refId} className={className} />;
  return repli;
}

/** Médaillon hexagonal avec le portrait d'un peuple (en-tête de la fiche). */
export function MedaillonPeuple({ id, nom, taille = 46 }) {
  if (!aPortrait(id)) return null;
  return (
    <span className="medaillon shrink-0" style={{ width: taille, height: taille }} aria-hidden="true">
      {/* fond propre au médaillon : le portrait s'y fond (papier) ou s'y inverse en trait clair (Veillée) */}
      <span className="medaillon-fond">
        <PortraitPeuple id={id} nom={nom} cadrage="object-cover object-top" className="h-full w-full" eager />
      </span>
    </span>
  );
}
