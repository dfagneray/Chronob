import { BookOpen, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { Sheet, Badge, ActionBadge, RuleText, Btn, cx } from './ui.jsx';
import { voieById, profilById, peupleById, ACTIONS, CATEGORIES_PRESTIGE, familles, CARAC_NOMS } from '../data/index.js';
import { NIVEAU_REQUIS, coutRang, frequence, modApplique, fmt } from '../lib/rules.js';
import { CATEGORIES_EQUIPEMENT, formatPrix } from '../data/equipement.js';

export function origineVoie(voie) {
  if (!voie) return '';
  if (voie.type === 'peuple') return `Voie de peuple · ${peupleById[voie.peuple]?.nom || ''}`;
  if (voie.type === 'mage') return 'Voie du mage (remplace la voie de peuple)';
  if (voie.type === 'profil') return `${profilById[voie.profil]?.nom || ''} · ${familles[voie.famille]?.nom || ''}`;
  if (voie.type === 'prestige') return `Voie de prestige · ${CATEGORIES_PRESTIGE[voie.categorie]}`;
  return '';
}

const FREQ = { combat: '1 fois / combat', jour: '1 fois / jour' };

/** Fiche détaillée d'une capacité. */
export function CapaciteSheet({ cap, open, onClose, char, onToggleUse, onToggleMod, onOpenVoie, onChoix, footer }) {
  if (!cap) return null;
  const voie = voieById[cap.voieId];
  const acquise = char && (char.voies?.[cap.voieId] || 0) >= cap.rang;
  const used = char?.utilise?.[cap.id];
  const freq = frequence(cap);
  const mods = cap.effets?.mods || [];
  const caracs = Object.entries(cap.effets?.carac || {});
  return (
    <Sheet open={open} onClose={onClose} title={cap.nom} footer={footer}>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Badge tone="gold">Rang {cap.rang}</Badge>
        <ActionBadge action={cap.action} sort={cap.sort} />
        {cap.action && <Badge>{ACTIONS[cap.action].nom}</Badge>}
        {freq && <Badge tone="blood">{FREQ[freq]}</Badge>}
        <Badge>
          Coût {coutRang(cap.rang)} pt{coutRang(cap.rang) > 1 ? 's' : ''}
        </Badge>
        <Badge>Niveau {NIVEAU_REQUIS[cap.rang]}+</Badge>
        {cap.sort && <Badge tone="mana">{cap.rang} PM</Badge>}
      </div>
      <button type="button" onClick={() => onOpenVoie?.(voie)} className="mb-3 flex w-full items-center gap-2 rounded-xl bg-surface2 px-3 py-2 text-left font-ui text-sm active:brightness-95">
        <BookOpen size={16} className="text-gold" />
        <span className="flex-1">
          <span className="font-semibold">{voie?.nom}</span>
          <span className="block text-xs text-muted">
            {origineVoie(voie)} · p. {voie?.page}
          </span>
        </span>
      </button>
      <RuleText text={cap.description} />
      {acquise && onChoix && (
        <label className="mt-4 block font-ui text-sm text-muted">
          Choix / notes (capacité choisie, domaines, familier…)
          <textarea
            value={char.choix?.[cap.id] || ''}
            onChange={(e) => onChoix(cap, e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl bg-surface2 px-3 py-2 text-[16px] text-ink outline-none rune-border"
          />
        </label>
      )}
      {acquise && (onToggleUse || mods.length > 0 || caracs.length > 0) && (
        <div className="mt-4 space-y-2 border-t border-line pt-3">
          {onToggleUse && (
            <Btn variant={used ? 'subtle' : 'outline'} className="w-full" onClick={() => onToggleUse(cap)}>
              {used ? <Circle size={18} /> : <CheckCircle2 size={18} />}
              {used ? 'Utilisée — marquer prête' : 'Prête — marquer utilisée'}
            </Btn>
          )}
          {(caracs.length > 0 || mods.length > 0) && <div className="px-1 font-ui text-xs uppercase tracking-wider text-muted">Effets appliqués à la fiche</div>}
          {caracs.length > 0 && (
            <ModToggle
              on={modApplique(char, cap, 'carac')}
              onClick={() => onToggleMod?.(cap, 'carac')}
              label={caracs.map(([k, v]) => `${CARAC_NOMS[k]} ${fmt(v)}`).join(', ')}
              hint={cap.effets.choixCarac ? 'La capacité laisse aussi un choix de caractéristique : ajoutez-le dans « Bonus manuels ».' : null}
            />
          )}
          {mods.map((m, i) => (
            <ModToggle key={i} on={modApplique(char, cap, i)} onClick={() => onToggleMod?.(cap, i)} label={`${m.stat === 'INIT' ? 'Init.' : m.stat} ${fmt(m.value)}`} hint={m.auto ? null : 'Effet conditionnel : activez-le seulement s’il s’applique en permanence.'} />
          ))}
        </div>
      )}
    </Sheet>
  );
}

function ModToggle({ on, onClick, label, hint }) {
  return (
    <button type="button" onClick={onClick} className={cx('flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left font-ui text-sm rune-border', on ? 'bg-gold/15' : 'bg-surface2')}>
      <Sparkles size={16} className={on ? 'text-gold' : 'text-muted'} />
      <span className="flex-1">
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className={cx('rounded-full px-2 py-0.5 text-xs font-bold', on ? 'bg-gold text-bg' : 'bg-line text-muted')}>{on ? 'ON' : 'OFF'}</span>
    </button>
  );
}

/** Fiche détaillée d'une voie (toutes ses capacités). */
export function VoieSheet({ voie, open, onClose, char, onOpenCap }) {
  if (!voie) return null;
  const rang = char?.voies?.[voie.id] || 0;
  return (
    <Sheet open={open} onClose={onClose} title={voie.nom} tall>
      <div className="mb-3 font-ui text-sm text-muted">
        {origineVoie(voie)} · p. {voie.page}
        {voie.pvParNiveau ? ` · ${voie.pvParNiveau} PV par niveau` : ''}
      </div>
      {voie.presentation && <RuleText text={voie.presentation} className="mb-3 text-muted" />}
      {voie.intro && <RuleText text={voie.intro} className="mb-3 text-muted" />}
      <div className="space-y-2">
        {voie.capacites.map((c) => (
          <button key={c.id} type="button" onClick={() => onOpenCap?.(c)} className={cx('w-full rounded-xl p-3 text-left rune-border active:brightness-95', rang >= c.rang ? 'bg-gold/10' : 'bg-surface2')}>
            <div className="flex items-center gap-2">
              <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold', rang >= c.rang ? 'bg-gold text-bg' : 'bg-line text-muted')}>{c.rang}</span>
              <span className="flex-1 font-semibold">{c.nom}</span>
              <ActionBadge action={c.action} sort={c.sort} />
            </div>
            <p className="mt-1.5 line-clamp-3 text-[15px] text-muted">{c.description}</p>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export function ProfilSheet({ profil, open, onClose, onOpenVoie }) {
  if (!profil) return null;
  const fam = familles[profil.famille];
  return (
    <Sheet open={open} onClose={onClose} title={profil.nom} tall>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge tone="gold">{fam.nom}</Badge>
        <Badge>{profil.pvParNiveau} PV / niveau</Badge>
        <Badge>DR d{profil.de}</Badge>
        <Badge>[{profil.caracteristiques.join(', ').replace('|', ' ou ')}]</Badge>
        <Badge>p. {profil.page}</Badge>
      </div>
      <RuleText text={profil.description} />
      {profil.armesArmures && (
        <>
          <h3 className="mt-4 font-display text-sm font-bold uppercase tracking-wider text-gold">Armes & armures maîtrisées</h3>
          <RuleText text={profil.armesArmures} />
        </>
      )}
      {profil.equipementDepart && (
        <>
          <h3 className="mt-4 font-display text-sm font-bold uppercase tracking-wider text-gold">Équipement de départ</h3>
          <RuleText text={profil.equipementDepart} />
        </>
      )}
      <h3 className="mt-4 font-display text-sm font-bold uppercase tracking-wider text-gold">Voies</h3>
      <div className="mt-2 space-y-2">
        {[...profil.voies, ...(profil.voieDuMage ? ['voie-du-mage'] : [])].map((id) => {
          const v = voieById[id];
          return (
            <Btn key={id} className="w-full justify-start" onClick={() => onOpenVoie?.(v)}>
              <BookOpen size={16} className="text-gold" /> {v?.nom}
            </Btn>
          );
        })}
      </div>
    </Sheet>
  );
}

export function PeupleSheet({ peuple, open, onClose, onOpenVoie }) {
  if (!peuple) return null;
  return (
    <Sheet open={open} onClose={onClose} title={peuple.nom} tall>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge tone="gold">{peuple.modificateurs}</Badge>
        <Badge>p. {peuple.page}</Badge>
      </div>
      <RuleText text={peuple.description} />
      {Object.keys(peuple.reperes || {}).length > 0 && (
        <dl className="mt-4 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 rounded-xl bg-surface2 p-3 font-ui text-sm">
          {Object.entries(peuple.reperes).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {peuple.noteVoie && <RuleText text={peuple.noteVoie} className="mt-3 text-muted" />}
      <div className="mt-3 space-y-2">
        {peuple.voies.map((id) => (
          <Btn key={id} className="w-full justify-start" onClick={() => onOpenVoie?.(voieById[id])}>
            <BookOpen size={16} className="text-gold" /> {voieById[id]?.nom}
          </Btn>
        ))}
      </div>
    </Sheet>
  );
}

export function EquipSheet({ item, open, onClose, footer }) {
  if (!item) return null;
  return (
    <Sheet open={open} onClose={onClose} title={item.nom} footer={footer}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge tone="gold">{CATEGORIES_EQUIPEMENT[item.categorie]}</Badge>
        {item.page && <Badge>p. {item.page}</Badge>}
      </div>
      <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 font-ui text-[15px]">
        {item.dm && (
          <>
            <dt className="text-muted">DM</dt>
            <dd>
              {item.dm}
              {item.dm2 ? ` / ${item.dm2} (deux mains)` : ''} {item.typeDm ? `· ${item.typeDm}` : ''}
            </dd>
          </>
        )}
        {item.portee ? (
          <>
            <dt className="text-muted">Portée</dt>
            <dd>{item.portee} m (max. {item.portee * 2} m avec dé malus)</dd>
          </>
        ) : null}
        {item.def ? (
          <>
            <dt className="text-muted">DEF</dt>
            <dd>+{item.def}</dd>
          </>
        ) : null}
        {item.agiMax !== undefined && (
          <>
            <dt className="text-muted">AGI max</dt>
            <dd>{fmt(item.agiMax)}</dd>
            <dt className="text-muted">Malus d’armure</dt>
            <dd>-{item.def} aux tests d’AGI</dd>
          </>
        )}
        {item.critique && (
          <>
            <dt className="text-muted">Critique</dt>
            <dd>{item.critique}-20</dd>
          </>
        )}
        <dt className="text-muted">Prix</dt>
        <dd>{formatPrix(item.prix)}</dd>
      </dl>
      {item.notes && <p className="mt-3 text-[16px]">{item.notes}</p>}
    </Sheet>
  );
}

export function EtatSheet({ etat, open, onClose, footer }) {
  if (!etat) return null;
  return (
    <Sheet open={open} onClose={onClose} title={etat.nom} footer={footer}>
      <RuleText text={etat.description} />
      <p className="mt-3 font-ui text-sm text-muted">États préjudiciables, p. 214-215.</p>
    </Sheet>
  );
}

export function RegleSheet({ regle, open, onClose }) {
  if (!regle) return null;
  return (
    <Sheet open={open} onClose={onClose} title={regle.titre} tall>
      <div className="mb-3 font-ui text-sm text-muted">
        {regle.chapitre} · p. {regle.page}
      </div>
      <RuleText text={regle.texte} />
    </Sheet>
  );
}
