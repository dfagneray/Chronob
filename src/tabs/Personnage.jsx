import { useState } from 'react';
import { Heart, Shield, Zap, Clover, Droplet, Swords, Crosshair, Wand2, Plus, Moon, Coffee, AlertTriangle, Trash2, Pencil, Skull, Sparkles, SlidersHorizontal } from 'lucide-react';
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
  const [nouvelleRes, setNouvelleRes] = useState(false);
  const [ressourceEdit, setRessourceEdit] = useState(null); // 'PV' | 'PC' | 'PM' | 'DR'
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

      {/* Points de vigueur */}
      <Card className="mt-3 p-4">
        <div className="flex items-center gap-2">
          <Heart size={20} className="text-blood" />
          <span className="flex-1 font-display text-sm font-bold uppercase tracking-wider">Points de vigueur</span>
          {pv === 0 && (
            <Badge tone="blood">
              <Skull size={12} /> Inconscient
            </Badge>
          )}
          {pv === 1 && <Badge tone="blood">Affaibli (dernier PV)</Badge>}
          <button type="button" aria-label="Modifier les PV" onClick={() => setRessourceEdit('PV')} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted active:bg-surface2">
            <SlidersHorizontal size={18} />
          </button>
        </div>
        <button type="button" aria-label="PV actuels" onClick={() => setPad({ title: 'Points de vigueur actuels', initial: pv, onSubmit: (v) => setPV(v) })} className="mt-1 flex w-full items-baseline justify-center gap-2 rounded-xl py-1 active:bg-surface2">
          <span className={cx('font-display text-6xl font-bold tabular-nums', pct <= 0.25 ? 'text-blood' : '')}>{pv}</span>
          <span className="font-display text-2xl text-muted">/ {d.pvMax}</span>
          {temp > 0 && <span className="font-display text-2xl font-bold text-mana">+{temp}</span>}
        </button>
        {d.manuel.PV && <div className="text-center font-ui text-[11px] text-muted">maximum saisi à la main (calcul : {d.auto.PV})</div>}
        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface2">
          <div className="h-full rounded-full bg-blood transition-all" style={{ width: `${pct * 100}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[-5, -1, 1, 5].map((n) => (
            <Btn key={n} className={cx('h-12 font-display text-lg font-bold', n < 0 ? 'text-blood' : 'text-leaf')} onClick={() => (n < 0 ? degats(-n) : soins(n))}>
              {n > 0 ? `+${n}` : n}
            </Btn>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Btn small onClick={() => setPad({ title: 'Subir des DM', initial: 0, onSubmit: (v) => degats(Math.abs(v)) })}>
            <Swords size={16} className="text-blood" /> Subir des DM
          </Btn>
          <Btn small onClick={() => setPad({ title: 'Soigner des PV', initial: 0, onSubmit: (v) => soins(Math.abs(v)) })}>
            <Heart size={16} className="text-leaf" /> Soigner
          </Btn>
        </div>
        <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
          <span className="flex-1 font-ui text-sm text-muted">PV temporaires</span>
          <Stepper label="PV temporaires" value={temp} min={0} max={LIMITE} onChange={(v) => maj((c) => ({ ...c, pv: { ...c.pv, temp: v } }))} onValueTap={() => setPad({ title: 'PV temporaires', initial: temp, onSubmit: (v) => maj((c) => ({ ...c, pv: { ...c.pv, temp: Math.max(0, v) } })) })} className="w-44" />
        </div>
      </Card>

      {/* Ressources */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Tracker icon={Clover} tone="text-luck" label="Chance (PC)" res={ressources.PC} manuel={d.manuel.PC} onEdit={() => setRessourceEdit('PC')} hint="+10 à un test, 1 PC max par test" />
        <Tracker icon={Droplet} tone="text-gold" label={`Récup. (DR d${d.drDe})`} res={ressources.DR} manuel={d.manuel.DR} onEdit={() => setRessourceEdit('DR')} hint={`Récup. rapide : 1d${d.drDe} + ${Math.floor(d.niveau / 2)}`} />
        {(d.pmMax > 0 || (char.pm?.actuel ?? 0) > 0 || d.manuel.PM) && (
          <Tracker icon={Zap} tone="text-mana" label="Mana (PM)" res={ressources.PM} manuel={d.manuel.PM} onEdit={() => setRessourceEdit('PM')} hint={`${d.sorts} sort${d.sorts > 1 ? 's' : ''} + VOL`} />
        )}
        {(char.ressources || []).map((r) => (
          <Tracker
            key={r.id}
            icon={Sparkles}
            tone="text-goldsoft"
            label={r.nom}
            res={{ label: r.nom, actuel: r.actuel, max: r.max, set: (v) => maj((c) => ({ ...c, ressources: c.ressources.map((x) => (x.id === r.id ? { ...x, actuel: v } : x)) })) }}
            onEdit={() => setRessourceEdit(r.id)}
          />
        ))}
        <button type="button" onClick={() => setNouvelleRes(true)} className="flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line font-ui text-sm text-muted active:bg-surface2">
          <Plus size={20} /> Ressource de profil
        </button>
      </div>

      {(d.pmMax === 0 && !(char.pm?.actuel > 0) && !d.manuel.PM) && (
        <button type="button" className="mt-2 min-h-[44px] px-1 font-ui text-xs text-muted underline" onClick={() => setRessourceEdit('PM')}>
          Ajouter des points de mana manuellement
        </button>
      )}

      <Btn variant="outline" className="mt-3 w-full" onClick={() => setRecup(true)}>
        <Moon size={18} /> Récupération (rapide / complète)
      </Btn>

      {/* Combat */}
      <SectionTitle right={<span className="font-ui text-xs text-muted">Toucher pour ajuster</span>}>Combat</SectionTitle>
      <div className="mb-3">
        <div className="mb-1.5 px-1 font-ui text-xs text-muted">Posture (1 round · options tactiques p. 216, sprint p. 211)</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(POSTURES).map(([id, p]) => {
            const on = char.posture === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => choisirPosture(id)}
                className={cx('flex min-h-[56px] flex-col items-center justify-center rounded-xl px-1 font-ui leading-tight rune-border', on ? (p.def > 0 ? 'border-gold bg-gold text-bg' : 'border-blood bg-blood text-white') : 'bg-surface')}
              >
                <span className="text-[13px] font-semibold">{p.nom}</span>
                <span className={cx('text-[11px]', on ? 'opacity-90' : 'text-muted')}>
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
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatTile icon={Shield} label="Défense" value={d.def} base={d.defBase} raw bonus={char.bonus?.DEF} onClick={() => setStatEdit('DEF')} />
        <StatTile icon={Zap} label="Initiative" value={d.init} base={d.initBase} raw bonus={char.bonus?.INIT} onClick={() => setStatEdit('INIT')} />
        <StatTile icon={Swords} label="Attaque au contact" value={d.attaques.contact} base={d.attaquesBase.contact} malus={d.deMalus.attaque} bonus={char.bonus?.CONTACT} onClick={() => setStatEdit('CONTACT')} />
        <StatTile icon={Crosshair} label="Attaque à distance" value={d.attaques.distance} base={d.attaquesBase.distance} malus={d.deMalus.attaque} bonus={char.bonus?.DISTANCE} onClick={() => setStatEdit('DISTANCE')} />
        <StatTile icon={Wand2} label="Attaque magique" value={d.attaques.magique} base={d.attaquesBase.magique} malus={d.deMalus.attaque} bonus={char.bonus?.MAGIQUE} onClick={() => setStatEdit('MAGIQUE')} />
        <Card className="flex flex-col justify-center gap-1 p-3 font-ui">
          {[
            ['Dé évolutif', `d4° = d${d.d4}`],
            ['Malus d’armure', d.malusArmure ? `-${d.malusArmure} aux tests d’AGI` : 'aucun'],
            ['Mains nues', `1d3${fmt(d.carac.FOR)} (temp.)`],
          ].map(([l, v]) => (
            <div key={l} className="leading-tight">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{l}</div>
              <div className="text-sm font-bold">{v}</div>
            </div>
          ))}
        </Card>
      </div>
      {d.deMalus.tous && (
        <p className="mt-2 px-1 font-ui text-xs text-blood">
          {[d.etats.includes('affaibli') && 'Affaibli', d.posture?.deMalus && 'Sprint'].filter(Boolean).join(' + ')} : dé malus à tous les tests (lancer 2d20, garder le pire).
        </p>
      )}

      {/* Caractéristiques */}
      <SectionTitle right={<span className="font-ui text-xs text-muted">Toucher pour modifier</span>}>Caractéristiques</SectionTitle>
      <div className="grid grid-cols-4 gap-2">
        {CARACS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setCaracEdit(k)}
            className="flex min-h-[72px] flex-col items-center justify-center rounded-2xl bg-surface rune-border active:bg-surface2"
            aria-label={`${CARAC_NOMS[k]} ${fmt(d.carac[k])}`}
          >
            <span className="font-display text-xs font-bold tracking-widest text-gold">{k}</span>
            <span className="font-display text-2xl font-bold tabular-nums">{fmt(d.carac[k])}</span>
            {d.carac[k] !== d.caracBase[k] && <span className="font-ui text-[10px] text-blood">({fmt(d.caracBase[k])})</span>}
          </button>
        ))}
        <button type="button" onClick={onEdit} className="flex min-h-[72px] flex-col items-center justify-center rounded-2xl border border-dashed border-line font-ui text-xs text-muted active:bg-surface2">
          <Pencil size={18} /> Fiche
        </button>
      </div>

      {/* États préjudiciables */}
      <SectionTitle>États préjudiciables</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {ETATS.map((e) => (
          <Chip key={e.id} tone="blood" active={d.etats.includes(e.id)} onClick={() => (e.id === 'affaibli' && pv === 1 ? setEtatInfo(e) : toggleEtat(e.id))}>
            {e.nom}
          </Chip>
        ))}
      </div>
      {etatsActifs.length > 0 && (
        <Card className="mt-3 divide-y divide-line border-blood/40">
          {etatsActifs.map((e) => (
            <button key={e.id} type="button" onClick={() => setEtatInfo(e)} className="block w-full px-3 py-2.5 text-left">
              <span className="font-display text-sm font-bold text-blood">{e.nom}</span>
              {e.id === 'affaibli' && pv === 1 && <span className="font-ui text-xs text-muted"> (automatique à 1 PV)</span>}
              <span className="block text-[15px] leading-snug">{e.description}</span>
            </button>
          ))}
        </Card>
      )}

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

function Tracker({ icon: Icon, tone, label, res, hint, onEdit, manuel }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5">
        <Icon size={16} className={tone} />
        <span className="min-w-0 flex-1 truncate font-ui text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      </div>
      <button type="button" onClick={onEdit} aria-label={`Modifier ${label}`} className="my-1 min-h-[44px] w-full rounded-lg text-center font-display tabular-nums active:bg-surface2">
        <span className="text-3xl font-bold">{res.actuel}</span>
        <span className="text-lg text-muted"> / {res.max}</span>
        {manuel && <span className="block font-ui text-[10px] text-muted">max. manuel</span>}
      </button>
      <div className="grid grid-cols-2 gap-1.5">
        <Btn small className="font-display text-lg font-bold" onClick={() => res.set(Math.max(0, res.actuel - 1))} aria-label={`Retirer 1 — ${label}`}>
          −
        </Btn>
        <Btn small className="font-display text-lg font-bold" onClick={() => res.set(res.actuel >= res.max ? res.actuel : res.actuel + 1)} aria-label={`Ajouter 1 — ${label}`}>
          +
        </Btn>
      </div>
      {hint && <div className="mt-1 text-center font-ui text-[11px] leading-tight text-muted">{hint}</div>}
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

function StatTile({ icon: Icon, label, value, base, onClick, malus, raw, bonus }) {
  const diff = value - base;
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-2xl bg-surface p-3 text-left rune-border active:bg-surface2">
      <Icon size={22} className="shrink-0 text-gold" />
      <div className="min-w-0 flex-1">
        <div className="font-ui text-[11px] font-semibold uppercase leading-tight tracking-wide text-muted">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className={cx('font-display text-2xl font-bold tabular-nums', diff < 0 && 'text-blood')}>{raw ? value : fmt(value)}</span>
          {diff !== 0 && <span className="font-ui text-xs text-muted">({raw ? base : fmt(base)})</span>}
        </div>
        {bonus ? <div className="font-ui text-[11px] text-gold">bonus manuel {fmt(bonus)}</div> : null}
        {malus && <div className="font-ui text-[11px] text-blood">dé malus</div>}
      </div>
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
