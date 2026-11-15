// Dessins au trait des objets que le livre n'illustre pas, dans l'esprit des croquis au crayon
// du chapitre « Équipement » : trait gris, quelques hachures, armes posées en diagonale.
// Tous les dessins tiennent dans une boîte 100 × 100, axe vertical au centre (x = 50).

/** Armes dessinées verticalement puis inclinées comme dans le livre. */
const Incline = ({ children, angle = -38 }) => <g transform={`rotate(${angle} 50 50)`}>{children}</g>;

const Lame = ({ haut = 10, bas = 54, l = 5 }) => (
  <>
    <path d={`M50 ${haut} L${50 + l} ${haut + 10} L${50 + l} ${bas} L${50 - l} ${bas} L${50 - l} ${haut + 10} Z`} />
    <path d={`M50 ${haut + 6} L50 ${bas - 2}`} className="fin" />
  </>
);
const Poignee = ({ haut, bas, l = 3.5 }) => (
  <>
    <path d={`M${50 - l} ${haut} L${50 + l} ${haut} L${50 + l - 0.6} ${bas} L${50 - l + 0.6} ${bas} Z`} />
    {Array.from({ length: Math.floor((bas - haut) / 4) }, (_, i) => (
      <path key={i} d={`M${50 - l} ${haut + 2 + i * 4} L${50 + l} ${haut + 4 + i * 4}`} className="fin" />
    ))}
  </>
);
const Dague = () => (
  <>
    <Lame haut={12} bas={56} l={5} />
    <path d="M36 56 Q50 60 64 56 L64 60 Q50 64 36 60 Z" />
    <Poignee haut={61} bas={78} />
    <circle cx="50" cy="82" r="4" />
  </>
);

export const DESSINS = {
  'mains-nues': (
    <>
      {/* poing serré, vu de face */}
      <path d="M30 44 Q30 34 38 34 Q42 30 48 34 Q53 30 58 34 Q64 31 68 37 Q74 38 72 48 L72 62 Q72 76 58 80 L44 80 Q32 78 31 66 Z" />
      <path d="M38 34 L38 48 M48 34 L48 48 M58 34 L58 48 M30 50 Q44 54 60 48" className="fin" />
      <path d="M58 48 Q66 50 64 60 Q60 64 52 60" />
      <path d="M40 66 L56 70 M42 72 L54 74" className="fin" />
    </>
  ),
  dague: (
    <Incline>
      <Dague />
    </Incline>
  ),
  'dague-lancer': (
    <Incline angle={-55}>
      <Dague />
      <path d="M50 2 L50 6 M44 4 L46 8 M56 4 L54 8" className="fin" />
    </Incline>
  ),
  'couteaux-de-lancer': (
    <>
      {[-30, 0, 30].map((a) => (
        <g key={a} transform={`rotate(${a} 50 82)`}>
          <path d="M50 16 L54 26 L54 58 L46 58 L46 26 Z" />
          <path d="M50 22 L50 56" className="fin" />
          <path d="M47 58 L53 58 L53 78 L47 78 Z" />
          <circle cx="50" cy="73" r="2" className="fin" />
        </g>
      ))}
    </>
  ),
  stylet: (
    <Incline>
      <path d="M50 8 L52.5 58 L47.5 58 Z" />
      <path d="M42 58 L58 58 L58 61 L42 61 Z" />
      <Poignee haut={61} bas={80} l={3} />
      <circle cx="50" cy="84" r="3.5" />
    </Incline>
  ),
  'sabre-court': (
    <Incline>
      <path d="M47 18 Q55 34 54 60 L46 60 Q48 36 47 18 Z" />
      <path d="M49 26 Q52 40 51 58" className="fin" />
      <ellipse cx="50" cy="62" rx="9" ry="3" />
      <Poignee haut={65} bas={84} l={3.5} />
    </Incline>
  ),
  'sabre-droit': (
    <Incline>
      <path d="M47.5 4 Q53 6 53 12 L53 60 L47 60 Z" />
      <path d="M50 10 L50 58" className="fin" />
      <ellipse cx="50" cy="62" rx="9" ry="3" />
      <path d="M46.5 65 L53.5 65 L53.5 92 L46.5 92 Z" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M46.5 ${67 + i * 4} L50 ${69 + i * 4} L53.5 ${67 + i * 4}`} className="fin" />
      ))}
    </Incline>
  ),
  gourdin: (
    <Incline angle={-30}>
      <path d="M46 92 L54 92 Q60 44 60 22 Q56 8 50 8 Q42 9 40 22 Q41 44 46 92 Z" />
      <path d="M45 22 Q47 26 45 30 M54 32 Q56 36 54 40 M47 46 Q49 50 47 54 M52 62 Q53 66 52 70" className="fin" />
      <path d="M46 80 L54 82 M46 84 L54 86" className="fin" />
    </Incline>
  ),
  fleau: (
    <>
      <g transform="rotate(-30 50 50)">
        <path d="M47 50 L53 50 L53 94 L47 94 Z" />
        <path d="M45 48 L55 48 L55 52 L45 52 Z" />
      </g>
      {/* chaîne et boule cloutée */}
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={38 - i * 4} cy={33 - i * 5} rx="2.6" ry="1.8" transform={`rotate(${50} ${38 - i * 4} ${33 - i * 5})`} />
      ))}
      <circle cx="20" cy="12" r="9" />
      <path d="M20 1 L20 4 M31 12 L28 12 M9 12 L12 12 M20 23 L20 20 M27.5 4.5 L25.5 6.5 M12.5 4.5 L14.5 6.5 M27.5 19.5 L25.5 17.5" />
      <path d="M15 9 Q20 6 25 10" className="fin" />
    </>
  ),
  fouet: (
    <>
      <path d="M62 92 L68 90 L76 66 L70 64 Z" />
      <path d="M64 86 L70 84 M66 80 L72 78 M68 74 L74 72" className="fin" />
      {/* lanière enroulée */}
      <path d="M72 64 Q66 46 50 46 Q28 46 26 60 Q24 76 42 76 Q58 76 56 62 Q54 52 42 54 Q34 56 36 64 Q38 70 46 68" />
      <path d="M46 68 Q60 64 62 40 Q64 22 48 14 Q36 10 30 18" />
    </>
  ),
  pioche: null,
  bola: (
    <>
      <path d="M50 46 L24 22 M50 46 L80 28 M50 46 L48 82" />
      <path d="M50 46 L26 24 M50 46 L78 30" className="fin" />
      {[
        [22, 20],
        [82, 26],
        [48, 84],
      ].map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="8" />
          <path d={`M${x - 5} ${y - 2} Q${x} ${y - 6} ${x + 5} ${y - 2}`} className="fin" />
        </g>
      ))}
      <circle cx="50" cy="46" r="2.5" />
    </>
  ),
  sarbacane: (
    <>
      <g transform="rotate(-35 50 50)">
        <path d="M47 2 L53 2 L53 98 L47 98 Z" />
        <path d="M46 10 L54 10 M46 40 L54 40 M46 70 L54 70 M46 90 L54 90" className="fin" />
      </g>
      {/* fléchettes */}
      {[0, 7].map((d) => (
        <g key={d} transform={`translate(${d} ${d * 1.4}) rotate(-35 70 74)`}>
          <path d="M70 60 L70 86" />
          <path d="M70 60 L68 64 L72 64 Z" />
          <path d="M70 82 Q66 86 67 90 M70 82 Q74 86 73 90" className="fin" />
        </g>
      ))}
    </>
  ),
  briquet: (
    <>
      {/* briquet d'acier en C et silex */}
      <path d="M18 56 Q18 40 34 40 L66 40 Q82 40 82 56 L74 56 Q74 48 66 48 L34 48 Q26 48 26 56 Z" />
      <path d="M30 44 L70 44" className="fin" />
      <path d="M40 60 L58 56 L66 70 L52 80 L38 74 Z" />
      <path d="M44 66 L56 62 M46 72 L58 68" className="fin" />
      <path d="M62 30 L66 22 M70 32 L78 26 M54 30 L52 22" />
    </>
  ),
  'outils-crochetage': (
    <>
      {/* trousse de cuir déroulée et crochets */}
      <path d="M10 34 L90 34 L90 74 L10 74 Z" />
      <path d="M10 42 L90 42 M10 66 L90 66" className="fin" />
      {[22, 36, 50, 64, 78].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 30 L${x} 70`} />
          <path d={i % 2 ? `M${x} 30 Q${x + 5} 26 ${x + 3} 22` : `M${x} 30 L${x + 4} 24 L${x + 1} 22`} />
          <path d={`M${x - 2} 70 L${x + 2} 70 L${x + 2} 78 L${x - 2} 78 Z`} />
        </g>
      ))}
    </>
  ),
  outre: (
    <>
      <path d="M44 20 L56 20 L58 30 Q78 36 80 62 Q80 86 50 88 Q22 86 22 62 Q24 36 42 30 Z" />
      <path d="M43 14 L57 14 L57 20 L43 20 Z" />
      <path d="M42 30 Q50 34 58 30" className="fin" />
      <path d="M30 50 Q34 70 46 80 M68 48 Q70 66 62 78" className="fin" />
      <path d="M44 24 Q10 30 18 70" />
    </>
  ),
  torche: (
    <Incline angle={-20}>
      <path d="M46.5 40 L53.5 40 L52 94 L48 94 Z" />
      <path d="M43 30 L57 30 L56 44 L44 44 Z" />
      <path d="M43 34 L57 38 M44 40 L56 44 M43 30 L57 34" className="fin" />
      {/* flammes */}
      <path d="M44 30 Q36 18 44 8 Q46 16 50 14 Q48 6 54 2 Q56 12 60 14 Q66 20 56 30" />
      <path d="M48 28 Q46 22 50 18 Q52 24 54 22 Q56 26 52 30" className="fin" />
    </Incline>
  ),
  carriole: (
    <>
      <path d="M18 42 L74 42 L70 62 L22 62 Z" />
      <path d="M22 48 L72 48 M24 55 L71 55" className="fin" />
      <path d="M74 50 L96 58" />
      <circle cx="46" cy="70" r="16" />
      <circle cx="46" cy="70" r="3" />
      <path d="M46 54 L46 86 M30 70 L62 70 M35 59 L57 81 M57 59 L35 81" className="fin" />
    </>
  ),
  chariot: (
    <>
      <path d="M8 40 L80 40 L78 62 L10 62 Z" />
      <path d="M8 48 L80 48 M9 55 L79 55" className="fin" />
      <path d="M14 40 Q44 8 76 40" />
      <path d="M24 36 Q44 14 66 36 M34 32 L34 20 M54 32 L54 20" className="fin" />
      <path d="M80 54 L98 62" />
      {[22, 66].map((x) => (
        <g key={x}>
          <circle cx={x} cy="72" r="12" />
          <circle cx={x} cy="72" r="2.5" />
          <path d={`M${x} 60 L${x} 84 M${x - 12} 72 L${x + 12} 72 M${x - 8.5} 63.5 L${x + 8.5} 80.5 M${x + 8.5} 63.5 L${x - 8.5} 80.5`} className="fin" />
        </g>
      ))}
    </>
  ),
};

// Pioche de guerre : manche et tête à pointe et lame
DESSINS['pioche-de-guerre'] = (
  <Incline angle={-30}>
    <path d="M47.5 22 L52.5 22 L52.5 96 L47.5 96 Z" />
    <path d="M14 26 Q30 16 46 18 L54 18 Q70 18 84 30 L80 32 Q68 26 54 27 L46 27 Q30 26 18 30 Z" />
    <path d="M44 16 L56 16 L56 30 L44 30 Z" />
    <path d="M48 80 L52 82 M48 86 L52 88 M48 92 L52 94" className="fin" />
  </Incline>
);
DESSINS['fleau-a-deux-mains'] = DESSINS.fleau;
DESSINS['fouet-de-guerre'] = DESSINS.fouet;
delete DESSINS.pioche;

/** Dessin SVG d'un objet (null si aucun). */
export function DessinObjet({ id, className }) {
  const d = DESSINS[id];
  if (!d) return null;
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-hidden="true">
      <g className="dessin-trait">{d}</g>
    </svg>
  );
}
