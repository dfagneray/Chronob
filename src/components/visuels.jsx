// Éléments visuels partagés : médaillon hexagonal, anneau de PV, tracé des voies, jeux d'icônes.
import {
  Feather,
  HeartPulse,
  Dumbbell,
  Eye,
  Crown,
  Brain,
  Flame,
  EyeOff,
  BatteryLow,
  Wind,
  Sparkles,
  Lock,
  Footprints,
  Snowflake,
  Turtle,
  ArrowDownToLine,
  BadgeAlert,
  Swords,
  Target,
  Shield,
  ShieldHalf,
  Backpack,
  FlaskConical,
  PawPrint,
  Compass,
  Wand2,
  Sun,
  Hourglass,
  Zap,
  Package,
  Crosshair,
  Music,
  Trees,
  Drama,
  Axe,
  Castle,
  Hammer,
  Cog,
  BookOpen,
  Skull,
  Leaf,
  HandHeart,
  Mountain,
  User,
} from 'lucide-react';
import { cx } from './ui.jsx';

// ---------------------------------------------------------------------------
// Icônes
// ---------------------------------------------------------------------------
export const ICONES_CARAC = { AGI: Feather, CON: HeartPulse, FOR: Dumbbell, PER: Eye, CHA: Crown, INT: Brain, VOL: Flame };

export const ICONES_ETAT = {
  aveugle: EyeOff,
  affaibli: BatteryLow,
  essouffle: Wind,
  etourdi: Sparkles,
  immobilise: Lock,
  invalide: Footprints,
  paralyse: Snowflake,
  ralenti: Turtle,
  renverse: ArrowDownToLine,
  surpris: BadgeAlert,
};

/** Types d'action (p. 210) : limitée, attaque, mouvement, gratuite. */
export const ICONES_ACTION = { L: Hourglass, A: Swords, M: Footprints, G: Zap };

export const ICONES_CATEGORIE = {
  contact: Swords,
  distance: Target,
  armure: Shield,
  bouclier: ShieldHalf,
  materiel: Backpack,
  consommable: FlaskConical,
  monture: PawPrint,
  divers: Package,
};

export const ICONES_FAMILLE = { aventuriers: Compass, combattants: Swords, mages: Wand2, mystiques: Sun };

export const ICONES_PROFIL = {
  arquebusier: Crosshair,
  barde: Music,
  rodeur: Trees,
  voleur: Drama,
  barbare: Axe,
  chevalier: Castle,
  guerrier: Swords,
  ensorceleur: Sparkles,
  forgesort: Hammer,
  magicien: BookOpen,
  sorcier: Skull,
  druide: Leaf,
  moine: Mountain,
  pretre: HandHeart,
};
export const IconeProfil = ({ id, ...p }) => {
  const I = ICONES_PROFIL[id] || User;
  return <I {...p} />;
};
export { Cog };

// ---------------------------------------------------------------------------
// Hexagone (motif du livre) — médaillon de niveau, rangs
// ---------------------------------------------------------------------------
const HEX = 'M50 3 L92 27 L92 73 L50 97 L8 73 L8 27 Z';

/** Médaillon hexagonal contenant une valeur. `plein` : fond doré ; sinon contour. */
export function Hexa({ children, taille = 44, plein = true, className, label, petit }) {
  return (
    <span className={cx('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: taille, height: taille }} aria-label={label}>
      <svg viewBox="0 0 100 100" className={cx('absolute inset-0 h-full w-full', plein && 'halo')} aria-hidden="true">
        <path d={HEX} fill={plein ? 'rgb(var(--gold))' : 'rgb(var(--surface2))'} stroke={plein ? 'rgb(var(--goldsoft))' : 'rgb(var(--line))'} strokeWidth="4" />
        {plein && <path d="M50 14 L82 32 L82 68 L50 86 L18 68 L18 32 Z" fill="none" stroke="rgb(var(--bg) / 0.35)" strokeWidth="2.5" />}
      </svg>
      <span className={cx('relative font-num font-semibold leading-none', plein ? 'text-bg' : 'text-muted', petit ? 'text-[12px]' : 'text-[15px]')}>{children}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Anneau des PV
// ---------------------------------------------------------------------------
/**
 * Jauge circulaire des PV. L'arc passe du laiton à la braise sous 25 %,
 * un arc extérieur bleu montre les PV temporaires.
 */
export function AnneauPV({ pv, max, temp = 0, taille = 168, children }) {
  const r = 62;
  const c = 2 * Math.PI * r;
  const ratio = max > 0 ? Math.max(0, Math.min(1, pv / max)) : 0;
  const danger = ratio <= 0.25;
  const couleur = danger ? 'rgb(var(--blood))' : 'rgb(var(--gold))';
  const rt = 74;
  const ct = 2 * Math.PI * rt;
  const ratioT = max > 0 ? Math.min(1, temp / max) : 0;
  return (
    <div className="relative shrink-0" style={{ width: taille, height: taille }}>
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgb(var(--line))" strokeWidth="10" />
        {ratio > 0 && <circle className="anim-respire" cx="80" cy="80" r={r} fill="none" stroke={couleur} strokeOpacity="0.22" strokeWidth="20" strokeDasharray={`${ratio * c} ${c}`} />}
        {ratio > 0 && <circle cx="80" cy="80" r={r} fill="none" stroke={couleur} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${ratio * c} ${c}`} style={{ transition: 'stroke-dasharray .4s ease' }} />}
        {ratioT > 0 && <circle cx="80" cy="80" r={rt} fill="none" stroke="rgb(var(--mana))" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${ratioT * ct} ${ct}`} />}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tracé d'une voie : les rangs reliés comme une constellation
// ---------------------------------------------------------------------------
const HAUTEURS = [26, 12, 28, 10, 22, 14, 26, 12];

/** Rangs d'une voie reliés en constellation ; les rangs acquis s'allument. */
export function VoieTrace({ voie, rang, className }) {
  const caps = voie.capacites;
  const n = caps.length;
  const pts = caps.map((c, i) => ({ x: 16 + (i * 268) / Math.max(1, n - 1), y: HAUTEURS[(i + voie.id.length) % HAUTEURS.length] + 1, rang: c.rang, on: c.rang <= rang }));
  return (
    <svg viewBox="0 0 300 40" className={cx('block h-auto w-full', className)} aria-label={`Rang ${rang} sur ${caps[n - 1].rang}`} role="img">
      {pts.slice(1).map((p, i) => {
        const a = pts[i];
        const allume = p.on;
        return <line key={i} x1={a.x} y1={a.y} x2={p.x} y2={p.y} stroke={allume ? 'rgb(var(--gold))' : 'rgb(var(--line))'} strokeWidth={allume ? 2 : 1.4} strokeDasharray={allume ? undefined : '3 4'} vectorEffect="non-scaling-stroke" />;
      })}
      {pts.map((p) => (
        <g key={p.rang} className={p.on ? 'halo' : undefined}>
          {p.on && <circle cx={p.x} cy={p.y} r="8" fill="rgb(var(--gold) / 0.2)" />}
          <path
            d={`M${p.x} ${p.y - 5} L${p.x + 4.4} ${p.y - 2.5} L${p.x + 4.4} ${p.y + 2.5} L${p.x} ${p.y + 5} L${p.x - 4.4} ${p.y + 2.5} L${p.x - 4.4} ${p.y - 2.5} Z`}
            fill={p.on ? 'rgb(var(--gold))' : 'rgb(var(--surface))'}
            stroke={p.on ? 'rgb(var(--goldsoft))' : 'rgb(var(--muted))'}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </svg>
  );
}
