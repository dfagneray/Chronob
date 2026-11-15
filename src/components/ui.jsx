import { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, X, Delete, Check, Sparkles } from 'lucide-react';
import { ICONES_ACTION } from './visuels.jsx';

export const cx = (...a) => a.filter(Boolean).join(' ');

// ---------------------------------------------------------------------------
// Boutons
// ---------------------------------------------------------------------------
const VARIANTS = {
  primary: 'bg-gold text-bg font-semibold active:brightness-90',
  ghost: 'bg-transparent text-ink active:bg-surface2',
  subtle: 'bg-surface2 text-ink active:brightness-95 rune-border',
  danger: 'bg-blood text-white active:brightness-90',
  outline: 'bg-transparent text-gold border border-gold/60 active:bg-gold/10',
};

export function Btn({ variant = 'subtle', className, children, small, ...p }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-ui transition-[filter,background] disabled:opacity-40 disabled:pointer-events-none',
        small ? 'min-h-[44px] px-3 text-sm' : 'min-h-[44px] px-4 text-[15px]',
        VARIANTS[variant],
        className
      )}
      {...p}
    >
      {children}
    </button>
  );
}

export function IconBtn({ icon: Icon, label, className, size = 20, ...p }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink active:bg-surface2', className)} {...p}>
      <Icon size={size} />
    </button>
  );
}

/** Bouton à double confirmation (pas de boîte de dialogue native). */
export function ConfirmBtn({ onConfirm, children, confirmLabel = 'Confirmer ?', variant = 'subtle', ...p }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Btn
      variant={armed ? 'danger' : variant}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
      {...p}
    >
      {armed ? confirmLabel : children}
    </Btn>
  );
}

// ---------------------------------------------------------------------------
// Cartes et badges
// ---------------------------------------------------------------------------
export function Card({ className, children, ...p }) {
  return (
    <div className={cx('rounded-2xl bg-surface rune-border', className)} {...p}>
      {children}
    </div>
  );
}

/** Titre de section : bandeau doré en capitales (papier) ou titre et filet qui s'efface (Veillée). */
export function SectionTitle({ children, right, className, icon: Icon }) {
  return (
    <div className={cx('titre-section mb-2.5 mt-6 flex items-center gap-2.5 px-1', className)}>
      {Icon && <Icon size={17} className="ts-icone shrink-0 text-gold" aria-hidden="true" />}
      <h2 className="ts-texte shrink-0 font-display text-[18px] leading-tight text-goldsoft">{children}</h2>
      <span className="orn-ligne" aria-hidden="true" />
      {right && <span className="ts-droite min-w-0 truncate">{right}</span>}
    </div>
  );
}

export function Badge({ children, className, tone = 'muted', title }) {
  const tones = {
    muted: 'bg-surface2 text-muted',
    gold: 'bg-gold/15 text-gold',
    blood: 'bg-blood/15 text-blood',
    mana: 'bg-mana/15 text-mana',
    luck: 'bg-luck/15 text-luck',
    leaf: 'bg-leaf/15 text-leaf',
  };
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-[3px] font-ui text-[11px] font-semibold leading-none', tones[tone], className)}>
      {children}
    </span>
  );
}

const NOMS_ACTION = { L: 'action limitée', A: 'action d’attaque', M: 'action de mouvement', G: 'action gratuite' };
/** Type d'action (L/A/M/G) et marque de sort, avec icônes. */
export function ActionBadge({ action, sort }) {
  if (!action && !sort) return null;
  const tone = action === 'L' ? 'blood' : action === 'A' ? 'gold' : action === 'M' ? 'leaf' : 'muted';
  const Icone = action ? ICONES_ACTION[action] : null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      {action && (
        <Badge tone={tone} className="shrink-0" title={NOMS_ACTION[action]}>
          <Icone size={11} aria-hidden="true" />({action})
        </Badge>
      )}
      {sort && (
        <Badge tone="mana" className="shrink-0" title="sort">
          <Sparkles size={11} aria-hidden="true" />
          sort
        </Badge>
      )}
    </span>
  );
}

export function Chip({ active, onClick, children, className, tone = 'gold' }) {
  const on = {
    gold: 'bg-gold text-bg border-gold',
    blood: 'bg-blood text-white border-blood',
    mana: 'bg-mana text-white border-mana',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={cx('min-h-[44px] shrink-0 rounded-full border px-3.5 font-ui text-sm transition-colors', active ? on[tone] : 'border-line bg-surface text-ink active:bg-surface2', className)}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Stepper (+/-) — aucun clavier
// ---------------------------------------------------------------------------
export function Stepper({ value, onChange, min = -Infinity, max = Infinity, step = 1, size = 'md', format = (v) => v, className, onValueTap, label }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, v)));
  const big = size === 'lg';
  const repeat = useRepeat();
  return (
    <div className={cx('flex items-center gap-1.5', className)} aria-label={label}>
      <button
        type="button"
        aria-label={label ? `Diminuer ${label}` : 'Diminuer'}
        {...repeat(() => set(value - step))}
        disabled={value <= min}
        className={cx('flex shrink-0 items-center justify-center rounded-xl bg-surface2 text-ink rune-border active:brightness-90 disabled:opacity-30', big ? 'h-12 w-12' : 'h-11 w-11')}
      >
        <Minus size={big ? 22 : 18} />
      </button>
      <button
        type="button"
        onClick={onValueTap}
        className={cx('min-h-[44px] min-w-[3ch] flex-1 text-center font-num font-semibold', big ? 'text-3xl' : 'text-xl', onValueTap ? 'rounded-lg active:bg-surface2' : 'cursor-default')}
      >
        {format(value)}
      </button>
      <button
        type="button"
        aria-label={label ? `Augmenter ${label}` : 'Augmenter'}
        {...repeat(() => set(value + step))}
        disabled={value >= max}
        className={cx('flex shrink-0 items-center justify-center rounded-xl bg-surface2 text-ink rune-border active:brightness-90 disabled:opacity-30', big ? 'h-12 w-12' : 'h-11 w-11')}
      >
        <Plus size={big ? 22 : 18} />
      </button>
    </div>
  );
}

/** Appui long = répétition (pratique pour les PV). */
function useRepeat() {
  const timer = useRef(null);
  const fired = useRef(false);
  const stop = () => {
    clearTimeout(timer.current);
    clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return (fn) => ({
    onPointerDown: (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      fired.current = false;
      stop();
      timer.current = setTimeout(() => {
        fired.current = true;
        fn();
        timer.current = setInterval(fn, 110);
      }, 420);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e) => e.preventDefault(),
    onClick: () => {
      if (!fired.current) fn();
      fired.current = false;
    },
  });
}

// ---------------------------------------------------------------------------
// Tiroir (bottom sheet) avec glisser-pour-fermer
// ---------------------------------------------------------------------------
/**
 * Verrou du défilement de la page, partagé par tous les tiroirs ouverts : la page ne défile plus
 * tant qu'au moins un tiroir est ouvert. (Mémoriser puis restaurer la valeur « précédente » de
 * `overflow` laissait la page bloquée quand des tiroirs s'empilaient et se re-rendaient.)
 */
let tiroirsOuverts = 0;
function verrouillerDefilement() {
  if (tiroirsOuverts++ === 0) document.body.style.overflow = 'hidden';
  return () => {
    tiroirsOuverts = Math.max(0, tiroirsOuverts - 1);
    if (tiroirsOuverts === 0) document.body.style.overflow = '';
  };
}

export function Sheet({ open, onClose, title, children, footer, tall, label }) {
  const [dy, setDy] = useState(0);
  const start = useRef(null);
  const panel = useRef(null);
  // onClose est souvent une fonction recréée à chaque rendu : on la lit via une ref pour ne pas
  // relancer l'effet (et le verrou) à chaque rendu du parent.
  const fermer = useRef(onClose);
  fermer.current = onClose;
  useEffect(() => {
    if (!open) return;
    setDy(0);
    // Échap ne ferme que le tiroir du dessus (les fiches de détail s'empilent sur l'assistant de création)
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const dialogues = document.querySelectorAll('[role="dialog"]');
      if (!panel.current || dialogues[dialogues.length - 1]?.contains(panel.current)) fermer.current?.();
    };
    window.addEventListener('keydown', onKey);
    const deverrouiller = verrouillerDefilement();
    return () => {
      window.removeEventListener('keydown', onKey);
      deverrouiller();
    };
  }, [open]);
  if (!open) return null;
  const onStart = (e) => {
    start.current = e.touches[0].clientY;
  };
  const onMove = (e) => {
    if (start.current === null) return;
    const delta = e.touches[0].clientY - start.current;
    setDy(Math.max(0, delta));
  };
  const onEnd = () => {
    if (dy > 90) onClose();
    setDy(0);
    start.current = null;
  };
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={label || (typeof title === 'string' ? title : undefined)}>
      <div className="anim-fade absolute inset-0 bg-black/55" onClick={onClose} />
      <div
        ref={panel}
        className={cx('anim-sheet relative mx-auto flex w-full max-w-xl flex-col rounded-t-3xl bg-surface shadow-2xl rune-border', tall ? 'h-[92dvh]' : 'max-h-[88dvh]')}
        style={{ transform: dy ? `translateY(${dy}px)` : undefined, transition: dy ? 'none' : 'transform .2s' }}
      >
        <div className="shrink-0 touch-none px-4 pb-2 pt-2" onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}>
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-line" />
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 font-display text-xl leading-tight text-goldsoft">{title}</div>
            <IconBtn icon={X} label="Fermer" onClick={onClose} />
          </div>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
        {footer && <div className="safe-bottom shrink-0 border-t border-line bg-surface px-4 py-3">{footer}</div>}
        {!footer && <div className="safe-bottom" />}
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Pavé numérique (évite le clavier mobile)
// ---------------------------------------------------------------------------
export function NumPad({ open, onClose, title, initial = 0, onSubmit, allowNegative = true }) {
  const [txt, setTxt] = useState(String(initial));
  useEffect(() => {
    if (open) setTxt(String(initial));
  }, [open, initial]);
  const press = (k) => {
    if (k === '±') setTxt((t) => (t.startsWith('-') ? t.slice(1) : t === '0' ? '-' : '-' + t));
    else if (k === '⌫') setTxt((t) => (t.length <= 1 || t === '-' ? '0' : t.slice(0, -1)));
    else setTxt((t) => (t === '0' ? k : t === '-0' ? '-' + k : (t + k).slice(0, 6)));
  };
  const val = parseInt(txt, 10) || 0;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Btn
          variant="primary"
          className="w-full"
          onClick={() => {
            onSubmit(val);
            onClose();
          }}
        >
          <Check size={18} /> Valider {val}
        </Btn>
      }
    >
      <div className="mb-3 rounded-xl bg-surface2 py-3 text-center font-num text-4xl font-semibold">{txt}</div>
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', allowNegative ? '±' : '', '0', '⌫'].map((k, i) =>
          k ? (
            <button key={i} type="button" aria-label={k === '⌫' ? 'Effacer' : k === '±' ? 'Changer le signe' : undefined} onClick={() => press(k)} className="h-14 rounded-xl bg-surface2 font-num text-2xl font-semibold rune-border active:brightness-90">
              {k === '⌫' ? <Delete className="mx-auto" /> : k}
            </button>
          ) : (
            <span key={i} />
          )
        )}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { id, msg, ...opts }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.duree || 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 safe-top" style={{ marginTop: 8 }}>
          {toasts.map((t) => (
            <div key={t.id} className="anim-pop pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-surface2 px-4 py-2.5 font-ui text-sm shadow-xl rune-border">
              <span className="flex-1">{t.msg}</span>
              {t.action && (
                <button
                  type="button"
                  className="min-h-[44px] rounded-lg px-2 font-semibold text-gold"
                  onClick={() => {
                    t.action.fn();
                    setToasts((x) => x.filter((y) => y.id !== t.id));
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ---------------------------------------------------------------------------
// Texte de règles (paragraphes)
// ---------------------------------------------------------------------------
export function RuleText({ text, className }) {
  if (!text) return null;
  return (
    <div className={cx('prose-co text-[16.5px] leading-relaxed', className)}>
      {text.split('\n').map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center text-muted">
      {Icon && <Icon size={36} className="mb-3 text-gold/70" />}
      <div className="font-display text-base font-bold text-ink">{title}</div>
      <div className="mt-1 text-[15px]">{children}</div>
    </div>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="flex rounded-xl bg-surface2 p-1 rune-border">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx('min-h-[44px] flex-1 rounded-lg px-2 font-ui text-sm font-semibold transition-colors', value === o.value ? 'bg-gold text-bg shadow' : 'text-muted')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
