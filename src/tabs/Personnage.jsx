import { useState } from 'react';
import { useEquipement, EquipementCombat, SacEtBourse } from './Equipement.jsx';
import { Heart, Shield, Zap, Clover, Droplet, Swords, Plus, Moon, Coffee, AlertTriangle, Trash2, Pencil, Skull, Sparkles, SlidersHorizontal, HeartCrack, HeartPulse, ShieldPlus, ShieldCheck, Rabbit, Brain, Backpack, ChevronDown } from 'lucide-react';
import { AnneauPV, ICONES_ETAT } from '../components/visuels.jsx';

const ICONES_POSTURE = { 'defense-partielle': ShieldPlus, 'defense-totale': ShieldCheck, sprint: Rabbit };
import { Card, SectionTitle, Btn, Stepper, NumPad, Sheet, Chip, cx, useToast, ConfirmBtn, Badge } from '../components/ui.jsx';
import { EtatSheet } from '../components/Details.jsx';
import { CARACS, CARAC_NOMS, etats as ETATS, etatById, capaciteById } from '../data/index.js';
import { fmt, frequence, POSTURES } from '../lib/rules.js';
import { uid } from '../lib/store.jsx';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const LIMITE = 999; // saisie manuelle : aucune contrainte de maximum

/** Soins : on ne dépasse pas le maximum, sauf si la valeur était déjà au-dessus (saisie manuelle). */
const soigner = (actuel, n, max) => (actuel >= max ? actuel : Math.min(max, actuel + n));

export default function Personnage({ char, d, maj, onEdit }) {
  const toast = useToast();
  const [pad, setPad] = useState(null); // { title, initial, onSubmit, allowNegative }
  const [recup, setRecup] = useState(false);
  const [etatInfo, setEtatInfo] = useState(null);
  const eq = useEquipement(char, d, maj);
  // section « Sac & bourse » repliée par défaut ; l'état est retenu sur cet appareil
  const [sacOuvert, setSacOuvert] = useState(() => {
    try {
      return localStorage.getItem('co2-sac-ouvert') === '1';
    } catch {
      return false;
    }
  });
  const basculerSac = () =>
    setSacOuvert((o) => {
      try {
        localStorage.setItem('co2-sac-ouvert', o ? '0' : '1');
      } catch {
        /* stockage indisponible */
      }
      return !o;
    });
  const [nouvelleRes, setNouvelleRes] = useState(false);
  const [ressourceEdit, setRessourceEdit] = useState(null); // 'PV' | 'PC' | 'PM' | 'PE' | 'DR'
  const [statEdit, setStatEdit] = useState(null); // clé de bonus
  const [caracEdit, setCaracEdit] = useState(null);

  const pv = char.pv?.actuel ?? d.pvMax;
  const temp = char.pv?.temp || 0;

  const alerteZero = () =>
    toast('À 0 PV : inconscient, perd 1 dé de récupération (p. 220).', {
      duree: 6000,
      action: { label: 'Retirer 1 DR', fn: () => maj((c) => ({ ...c, dr: { actuel: Math.max(0, (c.dr?.actuel ?? 0) - 1) } })) },
    });

  const setPV = (v) => {
    const nv = clamp(v, 0, LIMITE);
    if (nv === 0 && pv > 0) alerteZero();
    maj((c) => ({ ...c, pv: { ...c.pv, actuel: nv } }));
  };
  const degats = (n) => {
    // les PV temporaires absorbent d'abord les DM
    const absorbe = Math.min(temp, n);
    const actuel = Math.max(0, pv - (n - absorbe));
    if (actuel === 0 && pv > 0) alerteZero();
    maj((c) => ({ ...c, pv: { actuel, temp: temp - absorbe } }));
  };
  const soins = (n) => maj((c) => ({ ...c, pv: { ...c.pv, actuel: soigner(c.pv?.actuel ?? 0, n, d.pvMax) } }));

  const choisirPosture = (id) => maj((c) => ({ ...c, posture: c.posture === id ? null : id }));
  const toggleEtat = (id) => maj((c) => ({ ...c, etats: c.etats?.includes(id) ? c.etats.filter((x) => x !== id) : [...(c.etats || []), id] }));

  const recupRapide = (resultatDe) => {
    const dr = char.dr?.actuel ?? d.drMax;
    const gain = resultatDe + Math.floor(d.niveau / 2);
    maj((c) => ({
      ...c,
      dr: { actuel: Math.max(0, dr - 1) },
      pv: { ...c.pv, actuel: soigner(c.pv?.actuel ?? 0, gain, d.pvMax) },
      // les capacités « une fois par combat » se rechargent ; les « une fois par jour » restent utilisées
      utilise: Object.fromEntries(Object.entries(c.utilise || {}).filter(([id]) => frequence(capaciteById[id]) === 'jour')),
    }), { titre: 'Récupération rapide' });
    setRecup(false);
    toast(`Récupération rapide : ${resultatDe} + ½ niveau (${Math.floor(d.niveau / 2)}) → +${gain} PV. Capacités « 1 fois par combat » rechargées.`, { duree: 5000 });
  };
  const recupComplete = (pvRendus) => {
    maj((c) => {
      let dr = Math.min(d.drMax, (c.dr?.actuel ?? 0) + 1);
      let pvA = c.pv?.actuel ?? 0;
      if (pvRendus) {
        pvA = soigner(pvA, pvRendus, d.pvMax);
        if (d.drMax > 0) dr = Math.max(0, dr - 1);
      }
      return { ...c, dr: { actuel: dr }, pm: { actuel: Math.max(c.pm?.actuel ?? 0, d.pmMax) }, pv: { ...c.pv, actuel: pvA }, utilise: {} };
    }, { titre: 'Récupération complète' });
    setRecup(false);
    toast(pvRendus ? `Récupération complète : DR utilisé aussitôt (+${pvRendus} PV), PM et capacités restaurés.` : 'Récupération complète : +1 DR, PM et capacités restaurés.', { duree: 5000 });
  };

  const pct = d.pvMax ? clamp(pv / d.pvMax, 0, 1) : 0;
  const etatsActifs = d.etats.map((id) => etatById[id]);
  const ressources = {
    PV: { label: 'Points de vigueur', actuel: pv, max: d.pvMax, set: (v) => setPV(v) },
    PC: { label: 'Points de chance', actuel: char.pc?.actuel ?? d.pcMax, max: d.pcMax, set: (v) => maj((c) => ({ ...c, pc: { actuel: v } })) },
    PM: { label: 'Points de mana', actuel: char.pm?.actuel ?? d.pmMax, max: d.pmMax, set: (v) => maj((c) => ({ ...c, pm: { actuel: v } })) },
    DR: { label: `Dés de récupération (d${d.drDe})`, actuel: char.dr?.actuel ?? d.drMax, max: d.drMax, set: (v) => maj((c) => ({ ...c, dr: { actuel: v } })) },
    PE: { label: 'Points d’ego (psionique)', actuel: char.pe?.actuel ?? d.peMax, max: d.peMax, set: (v) => maj((c) => ({ ...c, pe: { actuel: v } })) },
  };

  return (
    <div className="pb-6">
      {d.avertissements.length > 0 && (
        <Card className="mt-3 border-blood/50 bg-blood/10 p-3">
          {d.avertissements.map((w, i) => (
            <p key={i} className="flex gap-2 font-ui text-sm text-blood">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {w}
            </p>
          ))}
        </Card>
      )}

      {/* Points de vigueur : anneau */}
      <Card className="mt-3 overflow-hidden p-4">
        <div className="etiquette-or -mx-4 -mt-4 mb-2 flex min-h-[44px] items-center gap-2 pl-4 pr-2 text-[15px]">
          <Heart size={17} aria-hidden="true" />
          <span className="flex-1">Points de vigueur</span>
          {pv === 0 && (
            <Badge tone="blood">
              <Skull size={12} /> Inconscient
            </Badge>
          )}
          {pv === 1 && <Badge tone="blood">Affaibli (dernier PV)</Badge>}
          <button type="button" aria-label="Modifier les PV" onClick={() => setRessourceEdit('PV')} className="flex h-11 w-11 items-center justify-center rounded-xl active:bg-black/10">
            <SlidersHorizontal size={18} />
          </button>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <AnneauPV pv={pv} max={d.pvMax} temp={temp} taille={156}>
            <button type="button" aria-label="PV actuels" onClick={() => setPad({ title: 'Points de vigueur actuels', initial: pv, onSubmit: (v) => setPV(v) })} className="flex h-24 w-24 flex-col items-center justify-center rounded-full active:bg-surface2">
              <span className={cx('font-num text-5xl font-semibold leading-none', pct <= 0.25 && 'text-blood')}>{pv}</span>
              <span className="mt-1 font-num text-sm text-muted">/ {d.pvMax}</span>
              {temp > 0 && <span className="font-num text-xs font-semibold text-mana">+{temp} temp.</span>}
            </button>
          </AnneauPV>
          <div className="grid min-w-0 flex-1 gap-2">
            <Btn small className="justify-start" onClick={() => setPad({ title: 'Subir des DM', initial: 0, onSubmit: (v) => degats(Math.abs(v)) })}>
              <HeartCrack size={16} className="text-blood" /> Subir des DM
            </Btn>
            <Btn small className="justify-start" onClick={() => setPad({ title: 'Soigner des PV', initial: 0, onSubmit: (v) => soins(Math.abs(v)) })}>
              <HeartPulse size={16} className="text-leaf" /> Soigner
            </Btn>
            <Btn small className="justify-start" onClick={() => setRecup(true)}>
              <Moon size={16} className="text-gold" /> Récupération
            </Btn>
          </div>
        </div>
        {d.manuel.PV && <div className="mt-1 font-ui text-[11px] text-muted">Maximum saisi à la main (calcul : {d.auto.PV})</div>}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[-5, -1, 1, 5].map((n) => (
            <Btn key={n} className={cx('h-12 font-num text-lg font-semibold', n < 0 ? 'text-blood' : 'text-leaf')} onClick={() => (n < 0 ? degats(-n) : soins(n))}>
              {n > 0 ? `+${n}` : n}
            </Btn>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
          <span className="flex flex-1 items-center gap-1.5 font-ui text-sm text-muted">
            <span className="h-2.5 w-2.5 rounded-full bg-mana" aria-hidden="true" /> PV temporaires
          </span>
          <Stepper label="PV temporaires" value={temp} min={0} max={LIMITE} onChange={(v) => maj((c) => ({ ...c, pv: { ...c.pv, temp: v } }))} onValueTap={() => setPad({ title: 'PV temporaires', initial: temp, onSubmit: (v) => maj((c) => ({ ...c, pv: { ...c.pv, temp: Math.max(0, v) } })) })} className="w-44" />
        </div>
      </Card>

      {/* Réserves */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Tracker icon={Clover} tone="text-luck" pastille="bg-luck" label="Chance (PC)" res={ressources.PC} manuel={d.manuel.PC} onEdit={() => setRessourceEdit('PC')} hint="+10 à un test · 1 par test" />
        <Tracker icon={Droplet} tone="text-gold" pastille="bg-gold" label={`Récup. (DR d${d.drDe})`} res={ressources.DR} manuel={d.manuel.DR} onEdit={() => setRessourceEdit('DR')} hint={`Rapide : 1d${d.drDe} + ${Math.floor(d.niveau / 2)}`} />
        {(d.pmMax > 0 || (char.pm?.actuel ?? 0) > 0 || d.manuel.PM) && (
          <Tracker icon={Zap} tone="text-mana" pastille="bg-mana" label="Mana (PM)" res={ressources.PM} manuel={d.manuel.PM} onEdit={() => setRessourceEdit('PM')} hint={`${d.sorts} sort${d.sorts > 1 ? 's' : ''} + VOL`} />
        )}
        {(d.peMax > 0 || (char.pe?.actuel ?? 0) > 0 || d.manuel.PE) && (
          <Tracker icon={Brain} tone="text-mana" pastille="bg-mana" label="Ego (PE)" res={ressources.PE} manuel={d.manuel.PE} onEdit={() => setRessourceEdit('PE')} hint={`${d.pouvoirs} pouvoir${d.pouvoirs > 1 ? 's' : ''} + VOL · 1 DR → 1d4° PE`} />
        )}
        {(char.ressources || []).map((r) => (
          <Tracker
            key={r.id}
            icon={Sparkles}
            tone="text-goldsoft"
            pastille="bg-goldsoft"
            label={r.nom}
            res={{ label: r.nom, actuel: r.actuel, max: r.max, set: (v) => maj((c) => ({ ...c, ressources: c.ressources.map((x) => (x.id === r.id ? { ...x, actuel: v } : x)) })) }}
            onEdit={() => setRessourceEdit(r.id)}
          />
        ))}
        <button type="button" onClick={() => setNouvelleRes(true)} className="flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line font-ui text-sm text-muted active:bg-surface2">
          <Plus size={20} /> Ressource de profil
        </button>
      </div>

      {d.pmMax === 0 && !(char.pm?.actuel > 0) && !d.manuel.PM && (
        <button type="button" className="mt-2 min-h-[44px] px-1 font-ui text-xs text-muted underline" onClick={() => setRessourceEdit('PM')}>
          Ajouter des points de mana manuellement
        </button>
      )}

      {/* Caractéristiques, INIT./DEF. et attaques disposées comme sur la fiche de personnage officielle */}
      <BlocFiche d={d} char={char} onCarac={setCaracEdit} onStat={setStatEdit} onEdit={onEdit} />

      {/* Combat */}
      <SectionTitle icon={Swords} right={<span className="font-ui text-xs text-muted">toucher pour ajuster</span>}>
        Combat
      </SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(POSTURES).map(([id, p]) => {
          const on = char.posture === id;
          const Icone = ICONES_POSTURE[id];
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => choisirPosture(id)}
              className={cx('flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 font-ui leading-tight rune-border', on ? (p.def > 0 ? 'border-gold bg-gold text-bg' : 'border-blood bg-blood text-white') : 'bg-surface')}
            >
              <Icone size={17} aria-hidden="true" className={on ? '' : p.def > 0 ? 'text-gold' : 'text-blood'} />
              <span className="text-[13px] font-semibold">{p.nom}</span>
              <span className={cx('font-num text-[11px]', on ? 'opacity-90' : 'text-muted')}>
                ({p.action}) {fmt(p.def)} DEF
              </span>
            </button>
          );
        })}
      </div>
      {d.posture && (
        <p className="mt-1.5 px-1 font-ui text-xs text-muted">
          <b className={d.posture.def > 0 ? 'text-gold' : 'text-blood'}>{d.posture.nom} :</b> {d.posture.texte} Touchez à nouveau pour la retirer.
        </p>
      )}
      {d.deMalus.tous && (
        <p className="mt-2 px-1 font-ui text-xs text-blood">
          {[d.etats.includes('affaibli') && 'Affaibli', d.posture?.deMalus && 'Sprint'].filter(Boolean).join(' + ')} : dé malus à tous les tests (lancer 2d20, garder le pire).
        </p>
      )}
      <EquipementCombat eq={eq} />

      {/* États préjudiciables */}
      <SectionTitle icon={AlertTriangle}>États préjudiciables</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {ETATS.map((e) => {
          const I = ICONES_ETAT[e.id];
          const on = d.etats.includes(e.id);
          return (
            <Chip key={e.id} tone="blood" active={on} onClick={() => (e.id === 'affaibli' && pv === 1 ? setEtatInfo(e) : toggleEtat(e.id))} className="inline-flex items-center gap-1.5">
              {I && <I size={14} aria-hidden="true" className={on ? '' : 'text-muted'} />}
              {e.nom}
            </Chip>
          );
        })}
      </div>
      {etatsActifs.length > 0 && (
        <Card className="mt-3 divide-y divide-line border-blood/50">
          {etatsActifs.map((e) => {
            const I = ICONES_ETAT[e.id] || AlertTriangle;
            return (
              <button key={e.id} type="button" onClick={() => setEtatInfo(e)} className="flex w-full gap-3 px-3 py-2.5 text-left">
                <I size={18} className="mt-0.5 shrink-0 text-blood" aria-hidden="true" />
                <span>
                  <span className="font-display text-[15px] text-blood">{e.nom}</span>
                  {e.id === 'affaibli' && pv === 1 && <span className="font-ui text-xs text-muted"> (automatique à 1 PV)</span>}
                  <span className="block text-[15px] leading-snug">{e.description}</span>
                </span>
              </button>
            );
          })}
        </Card>
      )}

      {/* Sac & bourse (ancien onglet Équipement), replié par défaut */}
      <button
        type="button"
        onClick={basculerSac}
        aria-expanded={sacOuvert}
        className="mt-6 flex min-h-[56px] w-full items-center gap-3 rounded-2xl bg-surface px-3 text-left rune-border active:bg-surface2"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <Backpack size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[17px] text-goldsoft">Sac & bourse</span>
          <span className="block truncate font-ui text-xs text-muted">
            {eq.inv.length} objet{eq.inv.length > 1 ? 's' : ''} · {eq.resumeBourse}
          </span>
        </span>
        <ChevronDown size={20} className={cx('shrink-0 text-muted transition-transform', sacOuvert && 'rotate-180')} aria-hidden="true" />
      </button>
      {sacOuvert && <SacEtBourse eq={eq} />}
      {eq.feuilles}

      <NumPad open={!!pad} onClose={() => setPad(null)} title={pad?.title} initial={pad?.initial ?? 0} allowNegative={pad?.allowNegative ?? false} onSubmit={(v) => pad?.onSubmit(v)} />

      <Recuperation open={recup} onClose={() => setRecup(false)} d={d} dr={char.dr?.actuel ?? d.drMax} onRapide={recupRapide} onComplete={recupComplete} />

      <RessourceEditor
        open={!!ressourceEdit}
        onClose={() => setRessourceEdit(null)}
        cle={ressourceEdit}
        char={char}
        d={d}
        ressources={ressources}
        maj={maj}
      />

      <BonusEditor open={!!statEdit} onClose={() => setStatEdit(null)} cle={statEdit} char={char} d={d} maj={maj} />
      <CaracEditor open={!!caracEdit} onClose={() => setCaracEdit(null)} k={caracEdit} char={char} d={d} maj={maj} />

      <EtatSheet
        etat={etatInfo}
        open={!!etatInfo}
        onClose={() => setEtatInfo(null)}
        footer={
          etatInfo && !(etatInfo.id === 'affaibli' && pv === 1) ? (
            <Btn
              variant={d.etats.includes(etatInfo.id) ? 'subtle' : 'danger'}
              className="w-full"
              onClick={() => {
                toggleEtat(etatInfo.id);
                setEtatInfo(null);
              }}
            >
              {d.etats.includes(etatInfo.id) ? 'Retirer cet état' : 'Appliquer cet état'}
            </Btn>
          ) : (
            <p className="text-center font-ui text-sm text-muted">Disparaît dès que les PV repassent au-dessus de 1.</p>
          )
        }
      />

      <NouvelleRessource open={nouvelleRes} onClose={() => setNouvelleRes(false)} onAdd={(r) => maj((c) => ({ ...c, ressources: [...(c.ressources || []), { id: uid(), ...r }] }))} />
    </div>
  );
}

/** Réserve (PC, DR, PM…) : valeur, pastilles quand la réserve est petite, boutons − / +. */
function Tracker({ icon: Icon, tone, pastille = 'bg-gold', label, res, hint, onEdit, manuel }) {
  const losanges = res.max > 0 && res.max <= 12 && res.actuel <= 12;
  const n = Math.max(res.max, res.actuel);
  return (
    <Card className="flex flex-col overflow-hidden">
      <button type="button" onClick={onEdit} aria-label={`Modifier ${label}`} className="min-h-[52px] w-full px-3 pt-2 text-center active:bg-surface2">
        <span className="font-num text-3xl font-semibold">{res.actuel}</span>
        <span className="font-num text-base text-muted"> / {res.max}</span>
        {manuel && <span className="block font-ui text-[10px] text-muted">max. manuel</span>}
      </button>
      {losanges && (
        // rangée de losanges à cocher, comme sur la fiche de personnage
        <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-2 px-3 py-2" aria-hidden="true">
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className={cx('losange-compteur', i < res.actuel && 'plein')} />
          ))}
        </div>
      )}
      <div className="mt-auto grid grid-cols-2 gap-1.5 px-3 pb-2">
        <Btn small className="font-num text-lg" onClick={() => res.set(Math.max(0, res.actuel - 1))} aria-label={`Retirer 1 — ${label}`}>
          −
        </Btn>
        <Btn small className="font-num text-lg" onClick={() => res.set(res.actuel >= res.max ? res.actuel : res.actuel + 1)} aria-label={`Ajouter 1 — ${label}`}>
          +
        </Btn>
      </div>
      <div className="etiquette-or flex items-center justify-center gap-1.5 px-2 py-1.5 text-center text-[12px] leading-tight">
        <Icon size={13} aria-hidden="true" />
        <span className="min-w-0 truncate">{label}</span>
      </div>
      {hint && <div className="px-2 py-1 text-center font-ui text-[11px] leading-tight text-muted">{hint}</div>}
    </Card>
  );
}

/** Édition complète d'une réserve : valeur actuelle libre et maximum calculé ou manuel. */
function RessourceEditor({ open, onClose, cle, char, d, ressources, maj }) {
  const [pad, setPad] = useState(null);
  if (!cle) return null;
  const perso = (char.ressources || []).find((r) => r.id === cle);
  const res = perso ? { label: perso.nom, actuel: perso.actuel, max: perso.max, set: (v) => maj((c) => ({ ...c, ressources: c.ressources.map((x) => (x.id === cle ? { ...x, actuel: v } : x)) })) } : ressources[cle];
  if (!res) return null;
  const manuel = !perso && d.manuel[cle];
  const setMaxManuel = (v) => maj((c) => ({ ...c, maxManuel: { ...(c.maxManuel || {}), [cle]: v } }));
  return (
    <Sheet open={open} onClose={onClose} title={res.label}>
      <div className="font-ui text-sm text-muted">Valeur actuelle</div>
      <Stepper size="lg" value={res.actuel} min={0} max={LIMITE} onChange={res.set} onValueTap={() => setPad({ title: `${res.label} — valeur actuelle`, initial: res.actuel, onSubmit: (v) => res.set(Math.max(0, v)) })} />
      <div className="mt-1 flex gap-2">
        <Btn small className="flex-1" onClick={() => res.set(res.max)}>
          Remettre au maximum ({res.max})
        </Btn>
        <Btn small className="flex-1" onClick={() => res.set(0)}>
          Mettre à 0
        </Btn>
      </div>

      <SectionTitle>Maximum</SectionTitle>
      {perso ? (
        <>
          <Stepper value={perso.max} min={0} max={LIMITE} onChange={(v) => maj((c) => ({ ...c, ressources: c.ressources.map((x) => (x.id === cle ? { ...x, max: v } : x)) }))} />
          <label className="mt-3 block font-ui text-sm text-muted">
            Nom
            <input value={perso.nom} onChange={(e) => maj((c) => ({ ...c, ressources: c.ressources.map((x) => (x.id === cle ? { ...x, nom: e.target.value } : x)) }))} className="mt-1 w-full rounded-xl bg-surface2 px-3 py-3 text-ink outline-none rune-border" />
          </label>
          <ConfirmBtn
            className="mt-4 w-full"
            confirmLabel="Confirmer la suppression"
            onConfirm={() => {
              maj((c) => ({ ...c, ressources: c.ressources.filter((x) => x.id !== cle) }));
              onClose();
            }}
          >
            <Trash2 size={16} /> Supprimer cette ressource
          </ConfirmBtn>
        </>
      ) : (
        <>
          <Card className="p-3 font-ui text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Calcul selon les règles</span>
              <b>{d.auto[cle]}</b>
            </div>
            <p className="mt-1 text-xs text-muted">{FORMULES[cle]}</p>
          </Card>
          <div className="mt-2 flex gap-2">
            <Chip active={!manuel} onClick={() => setMaxManuel(null)}>
              Automatique
            </Chip>
            <Chip active={manuel} onClick={() => setMaxManuel(d.auto[cle])}>
              Maximum manuel
            </Chip>
          </div>
          {manuel && <Stepper className="mt-2" value={char.maxManuel[cle]} min={0} max={LIMITE} onChange={setMaxManuel} onValueTap={() => setPad({ title: `${res.label} — maximum`, initial: char.maxManuel[cle], onSubmit: (v) => setMaxManuel(Math.max(0, v)) })} />}
          <p className="mt-2 px-1 font-ui text-xs text-muted">Pour un simple bonus (objet magique, bénédiction…), préférez « Bonus manuels » dans la fiche : le calcul automatique reste actif.</p>
        </>
      )}
      <NumPad open={!!pad} onClose={() => setPad(null)} title={pad?.title} initial={pad?.initial ?? 0} allowNegative={false} onSubmit={(v) => pad?.onSubmit(v)} />
    </Sheet>
  );
}

const FORMULES = {
  PV: 'Niveau 1 : 2 × PV de famille + CON ; puis PV de famille (ou moyenne hybride) + CON par niveau, + capacités et bonus.',
  PC: '2 + CHA (+1 pour les aventuriers), + capacités et bonus.',
  PM: 'VOL + nombre de sorts connus, + capacités et bonus (0 sans sort).',
  DR: '2 + CON (+1 pour les mystiques), + bonus.',
  PE: 'VOL + nombre de pouvoirs psioniques (*) connus, + bonus. Récupérés en dépensant des DR : 1d4° PE par DR (maximum du dé après une récupération complète) — Compagnon p. 59.',
};

const STATS = {
  DEF: { label: 'Défense', base: (d) => `10 + AGI ${fmt(d.carac.AGI)}${d.armure ? ` + ${d.armure.nom} ${d.armure.def + (d.armure.magie || 0)}` : ''}${d.bouclier ? ` + ${d.bouclier.nom} ${d.bouclier.def + (d.bouclier.magie || 0)}` : ''}${d.capB.DEF ? ` + capacités ${d.capB.DEF}` : ''}` },
  INIT: { label: 'Initiative', base: (d) => `10 + PER ${fmt(d.carac.PER)}${d.capB.INIT ? ` + capacités ${d.capB.INIT}` : ''}` },
  CONTACT: { label: 'Attaque au contact', base: (d) => `niveau ${Math.min(d.niveau, 10)} + FOR ${fmt(d.carac.FOR)}` },
  DISTANCE: { label: 'Attaque à distance', base: (d) => `niveau ${Math.min(d.niveau, 10)} + AGI ${fmt(d.carac.AGI)}` },
  MAGIQUE: { label: 'Attaque magique', base: (d) => `niveau ${Math.min(d.niveau, 10)} + VOL ${fmt(d.carac.VOL)}` },
};

function BonusEditor({ open, onClose, cle, char, d, maj }) {
  if (!cle) return null;
  const s = STATS[cle];
  const pen = { DEF: d.penalites.DEF, INIT: d.penalites.INIT, CONTACT: d.penalites.CONTACT, DISTANCE: d.penalites.DISTANCE, MAGIQUE: d.penalites.MAGIQUE }[cle];
  return (
    <Sheet open={open} onClose={onClose} title={s.label}>
      <Card className="p-3 font-ui text-sm">
        <div className="text-muted">Calcul</div>
        <div>{s.base(d)}</div>
        {pen ? <div className="mt-1 text-blood">États préjudiciables : {fmt(pen)}</div> : null}
        {cle === 'DEF' && d.posture ? <div className={cx('mt-1', d.posture.def > 0 ? 'text-gold' : 'text-blood')}>{d.posture.nom} : {fmt(d.posture.def)}</div> : null}
      </Card>
      <SectionTitle>Bonus manuel</SectionTitle>
      <Stepper value={char.bonus?.[cle] || 0} min={-50} max={50} format={fmt} onChange={(v) => maj((c) => ({ ...c, bonus: { ...(c.bonus || {}), [cle]: v } }))} />
      <p className="mt-2 px-1 font-ui text-xs text-muted">Objet magique, capacité conditionnelle, sort actif, décision du MJ… Le bonus s’ajoute au calcul.</p>
    </Sheet>
  );
}

function CaracEditor({ open, onClose, k, char, d, maj }) {
  if (!k) return null;
  const capa = d.caracBase[k] - (char.carac?.[k] ?? 0) - (char.bonus?.[k] || 0);
  return (
    <Sheet open={open} onClose={onClose} title={`${CARAC_NOMS[k]} (${k})`}>
      <div className="font-ui text-sm text-muted">Valeur de base (après modificateurs de peuple)</div>
      <Stepper value={char.carac?.[k] ?? 0} min={-5} max={12} format={fmt} onChange={(v) => maj((c) => ({ ...c, carac: { ...c.carac, [k]: v } }))} />
      <div className="mt-3 font-ui text-sm text-muted">Bonus manuel (temporaire, objet…)</div>
      <Stepper value={char.bonus?.[k] || 0} min={-10} max={10} format={fmt} onChange={(v) => maj((c) => ({ ...c, bonus: { ...(c.bonus || {}), [k]: v } }))} />
      <Card className="mt-3 p-3 font-ui text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Capacités (automatique)</span>
          <b>{fmt(capa)}</b>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Valeur finale</span>
          <b>{fmt(d.caracBase[k])}</b>
        </div>
        {d.carac[k] !== d.caracBase[k] && (
          <div className="flex justify-between text-blood">
            <span>Limitée par l’armure</span>
            <b>{fmt(d.carac[k])}</b>
          </div>
        )}
      </Card>
    </Sheet>
  );
}

function Recuperation({ open, onClose, d, dr, onRapide, onComplete }) {
  const moyenne = Math.ceil((d.drDe + 1) / 2);
  const [jet, setJet] = useState(moyenne);
  const [jetSansDR, setJetSansDR] = useState(moyenne);
  return (
    <Sheet open={open} onClose={onClose} title="Récupération">
      <div className="space-y-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 font-display font-bold">
            <Coffee size={18} className="text-gold" /> Récupération rapide (30 min)
          </div>
          <p className="mt-1 text-[15px]">
            Dépense 1 DR : récupère [1d{d.drDe} + ½ niveau] PV et recharge les capacités « une fois par combat » (p. 221). DR restants : {dr}.
          </p>
          <div className="mt-2 font-ui text-sm text-muted">Résultat de votre d{d.drDe}</div>
          <Stepper value={jet} min={1} max={d.drDe} onChange={setJet} />
          <Btn variant="primary" className="mt-2 w-full" onClick={() => onRapide(jet)} disabled={dr <= 0}>
            {dr > 0 ? `+${jet + Math.floor(d.niveau / 2)} PV (−1 DR)` : 'Plus de DR'}
          </Btn>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 font-display font-bold">
            <Moon size={18} className="text-gold" /> Récupération complète (8 h)
          </div>
          <p className="mt-1 text-[15px]">Gagne 1 DR (max {d.drMax}), restaure tous les PM et recharge toutes les capacités. Le DR gagné peut être utilisé aussitôt : il rend alors le maximum du dé (p. 222).</p>
          {d.drMax > 0 ? (
            <div className="mt-2 grid grid-cols-1 gap-2">
              <Btn variant="primary" onClick={() => onComplete(d.drDe)}>
                +1 DR et l’utiliser (+{d.drDe} PV)
              </Btn>
              <Btn onClick={() => onComplete(0)}>+1 DR (le garder)</Btn>
            </div>
          ) : (
            <>
              <p className="mt-1 font-ui text-xs text-muted">Sans dé de récupération, lancez le d{d.drDe} (pas de résultat maximal).</p>
              <Stepper value={jetSansDR} min={1} max={d.drDe} onChange={setJetSansDR} />
              <Btn variant="primary" className="mt-2 w-full" onClick={() => onComplete(jetSansDR)}>
                +{jetSansDR} PV
              </Btn>
            </>
          )}
        </Card>
      </div>
    </Sheet>
  );
}

/**
 * Haut de la fiche officielle, adapté au téléphone : colonne des caractéristiques (étiquette dorée +
 * case valeur) à gauche ; cases INIT. / DEF. puis attaques (« 1d20 + ») à droite. Tout se touche.
 */
function BlocFiche({ d, char, onCarac, onStat, onEdit }) {
  const ecart = (v, base) => (v === base ? null : v < base ? 'baisse' : 'hausse');
  const attaques = [
    ['CONTACT', 'Contact', 'Attaque au contact', 'contact'],
    ['DISTANCE', 'Distance', 'Attaque à distance', 'distance'],
    ['MAGIQUE', 'Magique', 'Attaque magique', 'magique'],
  ];
  return (
    <section className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-3" aria-label="Caractéristiques et valeurs de combat">
      <div className="min-w-0">
        <h2 className="etiquette-or px-2 py-1.5 text-center text-[13.5px] leading-tight">Caractéristiques</h2>
        <div className="mt-2 grid gap-1.5">
          {CARACS.map((k) => {
            const e = ecart(d.carac[k], d.caracBase[k]);
            return (
              <button
                key={k}
                type="button"
                onClick={() => onCarac(k)}
                aria-label={`${CARAC_NOMS[k]} ${fmt(d.carac[k])}`}
                className="flex min-h-[46px] items-stretch overflow-hidden rounded-xl bg-surface rune-border active:bg-surface2"
              >
                <span className="etiquette-or flex w-[54px] shrink-0 items-center justify-center text-[15px]">{k}</span>
                <span className="flex min-w-0 flex-1 flex-col items-center justify-center leading-none">
                  <span className={cx('font-num text-[22px] font-semibold', e === 'baisse' && 'text-blood')}>{fmt(d.carac[k])}</span>
                  {e && <span className="font-num text-[10px] text-muted">({fmt(d.caracBase[k])})</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <CaseValeur label="Init." nom="Initiative" value={d.init} base={d.initBase} bonus={char.bonus?.INIT} onClick={() => onStat('INIT')} />
          <CaseValeur label="Déf." nom="Défense" value={d.def} base={d.defBase} bonus={char.bonus?.DEF} onClick={() => onStat('DEF')} />
        </div>
        <h2 className="mt-1 flex items-baseline justify-between px-0.5 font-display text-[15px] font-bold uppercase leading-tight text-goldsoft">
          Attaques <span className="font-ui text-[11px] font-semibold normal-case text-muted">1d20 +</span>
        </h2>
        {attaques.map(([cle, label, nom, k]) => {
          const v = d.attaques[k];
          const e = ecart(v, d.attaquesBase[k]);
          return (
            <button
              key={cle}
              type="button"
              onClick={() => onStat(cle)}
              aria-label={`${nom} ${fmt(v)}`}
              className="flex min-h-[46px] items-stretch overflow-hidden rounded-xl bg-surface rune-border active:bg-surface2"
            >
              <span className="etiquette-or flex min-w-0 flex-1 items-center px-2 text-[13.5px]">{label}</span>
              <span className="flex w-[62px] shrink-0 flex-col items-center justify-center leading-none">
                <span className={cx('font-num text-[22px] font-semibold', (e === 'baisse' || d.deMalus.attaque) && 'text-blood')}>{fmt(v)}</span>
                {d.deMalus.attaque ? <span className="font-ui text-[9.5px] text-blood">dé malus</span> : char.bonus?.[cle] ? <span className="font-ui text-[9.5px] text-goldsoft">bonus {fmt(char.bonus[cle])}</span> : null}
              </span>
            </button>
          );
        })}
        <dl className="grid gap-1 rounded-xl bg-surface px-2.5 py-2 font-ui rune-border">
          {[
            ['Dé évolutif', `d4° = d${d.d4}`],
            ['Malus d’armure', d.malusArmure ? `-${d.malusArmure} aux tests d’AGI` : 'aucun'],
            ['Mains nues', `1d3${fmt(d.carac.FOR)} (temp.)`],
          ].map(([l, v]) => (
            <div key={l} className="leading-tight">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">{l}</dt>
              <dd className="text-[13.5px] font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <button type="button" onClick={onEdit} className="mt-auto flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl border border-dashed border-line font-ui text-sm text-muted active:bg-surface2">
          <Pencil size={15} /> Modifier la fiche
        </button>
      </div>
    </section>
  );
}

/** Case INIT. / DEF. de la fiche : grande valeur, étiquette dorée en dessous. */
function CaseValeur({ label, nom, value, base, onClick, bonus }) {
  const diff = value - base;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${nom} ${value}`}
      className={cx('flex flex-col items-stretch overflow-hidden rounded-xl bg-surface text-center rune-border active:bg-surface2', diff < 0 && '!border-blood/60')}
    >
      <span className="flex min-h-[54px] w-full flex-col items-center justify-center py-1 leading-none">
        <span className={cx('font-num text-[28px] font-semibold', diff < 0 && 'text-blood', diff > 0 && 'text-goldsoft')}>{value}</span>
        {diff !== 0 && <span className="font-num text-[10px] text-muted">({base})</span>}
        {bonus ? <span className="font-ui text-[9.5px] text-goldsoft">bonus {fmt(bonus)}</span> : null}
      </span>
      <span className={cx('etiquette-or w-full py-1 text-[13px] leading-tight', diff < 0 && '!bg-blood')}>{label}</span>
    </button>
  );
}

function NouvelleRessource({ open, onClose, onAdd }) {
  const [nom, setNom] = useState('');
  const [max, setMax] = useState(3);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nouvelle ressource"
      footer={
        <Btn
          variant="primary"
          className="w-full"
          disabled={!nom.trim()}
          onClick={() => {
            onAdd({ nom: nom.trim(), max, actuel: max });
            setNom('');
            onClose();
          }}
        >
          Ajouter
        </Btn>
      }
    >
      <p className="mb-3 text-[15px] text-muted">Pour suivre une réserve propre à une capacité (ex. charges explosives, munitions du chargeur, rages…).</p>
      <label className="block font-ui text-sm text-muted">
        Nom
        <input value={nom} onChange={(e) => setNom(e.target.value)} className="mt-1 w-full rounded-xl bg-surface2 px-3 py-3 text-ink outline-none rune-border" placeholder="ex. Charges explosives" />
      </label>
      <div className="mt-3 font-ui text-sm text-muted">Maximum</div>
      <Stepper value={max} min={1} max={99} onChange={setMax} />
    </Sheet>
  );
}
