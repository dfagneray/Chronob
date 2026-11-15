import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X, TrendingUp, AlertTriangle, CheckCircle2, Search, Info, ArrowRight, Eraser, Crown, Check, Undo2, History } from 'lucide-react';
import { Card, SectionTitle, Btn, Sheet, Badge, ActionBadge, cx, ConfirmBtn, useToast, Empty, Chip, Stepper } from '../components/ui.jsx';
import { voieById, CARACS, profilById } from '../data/index.js';
import { NIVEAU_MAX, optionsProgression, voiesApresPlan, simulerPlan, verifierNiveau, validerNiveau, pointsDepenses, coutCapacite, fmt, deriver, NIVEAU_REQUIS, gainPVPlanifie, rangsRecettes, revenirAuNiveau } from '../lib/rules.js';
import { origineVoie } from '../components/Details.jsx';
import { RangCarre } from '../components/visuels.jsx';

const ORPHELINS = [
  { id: 'PC', label: '+1 point de chance' },
  { id: 'DR', label: '+1 dé de récupération' },
  { id: 'PV', label: '+2 points de vigueur' },
  { id: 'PM', label: '+2 points de mana' },
];

export default function Planificateur({ char, maj, details }) {
  const toast = useToast();
  const [cible, setCible] = useState(Math.min(NIVEAU_MAX, char.niveau + 1));
  const [picker, setPicker] = useState(false);
  const [libre, setLibre] = useState(false);
  const [vu, setVu] = useState(null); // niveau déjà acquis consulté (null = planification)
  const rangee = useRef(null);
  useEffect(() => {
    if (vu !== null && vu > char.niveau) setVu(null);
  }, [char.niveau, vu]);
  // la rangée des niveaux démarre sur le prochain niveau, les niveaux acquis restent accessibles à gauche
  useEffect(() => {
    rangee.current?.querySelector('[data-prochain]')?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  }, [char.niveau]);
  const revenir = (n) => {
    const nb = char.niveau - n;
    maj((c) => revenirAuNiveau(c, n), { titre: `Retour au niveau ${n} (${nb} niveau${nb > 1 ? 'x' : ''} annulé${nb > 1 ? 's' : ''})` });
    setVu(null);
    setCible(n + 1);
    toast(`Retour au niveau ${n} : les choix annulés sont de nouveau dans le plan, corrigez-les puis revalidez.`, { duree: 5000 });
  };
  const chipsAcquis = Array.from({ length: char.niveau - 1 }, (_, i) => i + 2).map((n) => (
    <button
      key={`a${n}`}
      type="button"
      onClick={() => setVu(vu === n ? null : n)}
      aria-pressed={vu === n}
      aria-label={`Niveau ${n} acquis`}
      className={cx('relative flex h-12 min-w-[48px] shrink-0 flex-col items-center justify-center rounded-xl font-num font-semibold rune-border', vu === n ? 'bg-leaf text-bg' : 'bg-surface2 text-muted')}
    >
      <Check size={12} aria-hidden="true" />
      <span className="text-lg leading-none">{n}</span>
    </button>
  ));
  const ficheAcquis = vu !== null && <NiveauAcquis char={char} n={vu} details={details} onRevenir={revenir} />;
  useEffect(() => {
    if (cible <= char.niveau || cible > NIVEAU_MAX) setCible(Math.min(NIVEAU_MAX, char.niveau + 1));
  }, [char.niveau, cible]);

  const actuel = useMemo(() => deriver(char), [char]);
  const sim = useMemo(() => (cible > char.niveau ? simulerPlan(char, cible) : null), [char, cible]);
  const verifs = useMemo(() => {
    const out = {};
    for (let n = char.niveau + 1; n <= NIVEAU_MAX; n++) if (char.plan?.[n]) out[n] = verifierNiveau(char, n);
    return out;
  }, [char]);

  if (char.niveau >= NIVEAU_MAX) {
    return (
      <div className="pb-6">
        <Empty icon={Crown} title="Niveau 20 atteint">
          Votre héros a atteint le sommet de sa progression.
        </Empty>
        <SectionTitle icon={History}>Niveaux acquis</SectionTitle>
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">{chipsAcquis}</div>
        {ficheAcquis}
      </div>
    );
  }

  const lvl = char.plan?.[cible] || { picks: [], orphelin: null };
  const etatAvant = voiesApresPlan(char, cible - 1);
  const verif = verifierNiveau(char, cible);
  const restant = 2 - pointsDepenses(lvl.picks);
  const opts = optionsProgression(char, cible, etatAvant, lvl.picks);
  // rangs de recettes encore disponibles (voies d'artisan), choix de ce niveau compris
  const recettes = rangsRecettes(lvl.picks.reduce((v, p) => ({ ...v, [p.voieId]: Math.max(v[p.voieId] || 0, p.rang) }), etatAvant));
  const orphelinPossible = restant === 1 && !opts.some((o) => o.possible && !['artisan', 'recette'].includes(o.voie.type));

  const setLvl = (fn) =>
    maj((c) => {
      const cur = c.plan?.[cible] || { picks: [], orphelin: null };
      const next = fn(cur);
      const plan = { ...(c.plan || {}) };
      if (!next.picks.length && !next.orphelin && typeof next.pvBase !== 'number') delete plan[cible];
      else plan[cible] = next;
      return { ...c, plan };
    });

  const ajouter = (o) => {
    setLvl((l) => ({ ...l, picks: [...l.picks, { voieId: o.voie.id, rang: o.rang }], orphelin: null }));
    setPicker(false);
  };
  const retirer = (i) => setLvl((l) => ({ ...l, picks: l.picks.filter((_, k) => k !== i), orphelin: null }));

  // force = passage de niveau validé malgré des choix incomplets ou hors règles (scénario spécial, décision du MJ)
  const valider = (force = false) => {
    const v = verifierNiveau(char, char.niveau + 1);
    if (!v.ok && !force) return;
    const next = validerNiveau(char);
    maj(() => next, { titre: force && !v.ok ? `Passage forcé au niveau ${next.niveau}` : `Passage au niveau ${next.niveau}` });
    toast(`Niveau ${next.niveau} atteint ! PV, PM et PC mis à jour.`, { duree: 4000 });
  };

  const d = sim?.d;
  const gainsPV = sim?.niveaux || [];
  const lignes = d
    ? [
        ['PV max', actuel.pvMax, d.pvMax],
        ['Défense', actuel.def, d.def],
        ['Initiative', actuel.init, d.init],
        ['Att. contact', actuel.attaques.contact, d.attaques.contact, true],
        ['Att. distance', actuel.attaques.distance, d.attaques.distance, true],
        ['Att. magique', actuel.attaques.magique, d.attaques.magique, true],
        ['PM', actuel.pmMax, d.pmMax],
        ['PC', actuel.pcMax, d.pcMax],
        ['DR', actuel.drMax, d.drMax],
        ['Dé évolutif', `d${actuel.d4}`, `d${d.d4}`],
        ...CARACS.filter((k) => actuel.caracBase[k] !== d.caracBase[k]).map((k) => [k, actuel.caracBase[k], d.caracBase[k], true]),
      ]
    : [];

  return (
    <div className="pb-6">
      <Card className="mt-3 p-3">
        <div className="flex items-center gap-2 font-ui text-sm text-muted">
          <Info size={16} className="shrink-0 text-gold" />
          Bac à sable : rien n’est appliqué à la fiche tant que vous ne validez pas le passage de niveau.
        </div>
      </Card>

      <button
        type="button"
        onClick={() => setLibre((x) => !x)}
        aria-pressed={libre}
        className={cx('mt-2 flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left font-ui text-sm rune-border', libre ? 'border-gold bg-gold/15' : 'bg-surface')}
      >
        <span className={cx('rounded-full px-2 py-0.5 text-xs font-bold', libre ? 'bg-gold text-bg' : 'bg-line text-muted')}>{libre ? 'ON' : 'OFF'}</span>
        <span className="flex-1">
          <b>Mode libre</b>
          <span className="block text-xs text-muted">Autorise les choix hors règles (niveau requis, coût, nombre de voies…) pour les scénarios spéciaux.</span>
        </span>
      </button>

      <SectionTitle>Niveau planifié</SectionTitle>
      <div ref={rangee} className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {chipsAcquis}
        {chipsAcquis.length > 0 && <span className="mx-1 w-px shrink-0 self-stretch bg-line" aria-hidden="true" />}
        {Array.from({ length: NIVEAU_MAX - char.niveau }, (_, i) => char.niveau + 1 + i).map((n) => {
          const v = verifs[n];
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                setCible(n);
                setVu(null);
              }}
              data-prochain={n === char.niveau + 1 ? '' : undefined}
              className={cx('relative flex h-12 min-w-[48px] shrink-0 flex-col items-center justify-center rounded-xl font-num font-semibold rune-border', n === cible && vu === null ? 'bg-gold text-bg' : 'bg-surface')}
              aria-label={`Niveau ${n}`}
            >
              <span className="text-[10px] font-normal leading-none opacity-70">niv.</span>
              <span className="text-lg leading-none">{n}</span>
              {v && <span className={cx('absolute right-1 top-1 h-2 w-2 rounded-full', v.ok ? 'bg-leaf' : 'bg-blood')} />}
            </button>
          );
        })}
      </div>

      {chipsAcquis.length > 0 && vu === null && (
        <p className="mt-1 px-1 font-ui text-xs text-muted">
          <Check size={12} className="inline" aria-hidden="true" /> Touchez un niveau acquis pour revoir ses choix ou revenir en arrière et les corriger.
        </p>
      )}
      {ficheAcquis}
      {vu === null && (
      <>
      <Card className="mt-3 overflow-hidden p-3">
        <div className="etiquette-or -mx-3 -mt-3 flex min-h-[44px] items-center justify-between gap-2 px-3 py-1.5">
          <span className="text-[17px]">Niveau {cible}</span>
          <span className="whitespace-nowrap font-ui text-[13px] normal-case tracking-normal">{restant} / 2 pts</span>
        </div>
        <div className="mt-2 font-ui text-xs text-muted">
          +2 points de capacité · attaques {cible <= 10 ? '+1' : 'plafonnées (niveau 10)'} · PV +{gainsPV.find((g) => g.niveau === cible)?.pv ?? '?'} {fmt(d?.carac.CON ?? 0)} CON
        </div>

        <ul className="mt-3 space-y-2">
          {lvl.picks.map((p, i) => {
            const v = voieById[p.voieId];
            const cap = v?.capacites.find((c) => c.rang === p.rang);
            return (
              <li key={i} className="flex items-center gap-2 rounded-xl bg-surface2 rune-border">
                <button type="button" className="flex min-h-[52px] min-w-0 flex-1 items-center gap-2 px-3 text-left" onClick={() => cap && details.cap(cap)}>
                  <RangCarre rang={p.rang} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{cap?.nom}</span>
                    <span className="block truncate font-ui text-xs text-muted">
                      {v?.nom} · {v?.type === 'recette' ? '1 rang de recette' : `${coutCapacite(v, p.rang)} pt${coutCapacite(v, p.rang) > 1 ? 's' : ''}`}
                    </span>
                  </span>
                  <ActionBadge action={cap?.action} sort={cap?.sort} />
                </button>
                <button type="button" aria-label="Retirer" className="flex h-11 w-11 shrink-0 items-center justify-center text-muted" onClick={() => retirer(i)}>
                  <X size={18} />
                </button>
              </li>
            );
          })}
        </ul>
        {(restant > 0 || libre) && (
          <Btn variant="outline" className="mt-2 w-full" onClick={() => setPicker(true)}>
            <Plus size={18} /> {restant > 0 ? `Choisir une capacité (${restant} pt${restant > 1 ? 's' : ''} restant${restant > 1 ? 's' : ''})` : 'Ajouter une capacité (mode libre)'}
          </Btn>
        )}
        <PVNiveau char={char} lvl={lvl} cible={cible} setLvl={setLvl} gainsPV={gainsPV} />
        {orphelinPossible && (
          <div className="mt-3">
            <div className="mb-1 font-ui text-sm font-semibold text-gold">Point de capacité orphelin — échange (p. 40)</div>
            <div className="flex flex-wrap gap-2">
              {ORPHELINS.map((o) => (
                <Chip key={o.id} active={lvl.orphelin === o.id} onClick={() => setLvl((l) => ({ ...l, orphelin: l.orphelin === o.id ? null : o.id }))}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </div>
        )}
        {verif.erreurs.length > 0 && (lvl.picks.length > 0 || cible === char.niveau + 1) && (
          <div className="mt-3 space-y-1">
            {verif.erreurs.map((e, i) => (
              <p key={i} className="flex gap-2 font-ui text-sm text-blood">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {e}
              </p>
            ))}
          </div>
        )}
        {(lvl.picks.length > 0 || lvl.orphelin) && (
          <button type="button" className="mt-2 flex min-h-[44px] items-center gap-1.5 font-ui text-sm text-muted" onClick={() => setLvl(() => ({ picks: [], orphelin: null }))}>
            <Eraser size={15} /> Effacer ce niveau
          </button>
        )}
      </Card>

      {d && (
        <>
          <SectionTitle right={<span className="font-ui text-xs text-muted">niv. {char.niveau} → {cible}</span>}>Aperçu</SectionTitle>
          <Card className="divide-y divide-line">
            {lignes.map(([label, a, b, signe]) => {
              const changed = a !== b;
              return (
                <div key={label} className="flex min-h-[40px] items-center px-3 font-ui text-[15px]">
                  <span className="flex-1 text-muted">{label}</span>
                  <span className="w-12 text-right tabular-nums">{typeof a === 'number' && signe ? fmt(a) : a}</span>
                  <ArrowRight size={14} className="mx-2 text-muted" />
                  <span className={cx('w-12 text-right font-bold tabular-nums', changed && 'text-gold')}>{typeof b === 'number' && signe ? fmt(b) : b}</span>
                </div>
              );
            })}
          </Card>
          {gainsPV.length > 1 && (
            <p className="mt-2 px-1 font-ui text-xs text-muted">
              PV de base par niveau : {gainsPV.map((g) => `niv. ${g.niveau} +${g.pv}`).join(' · ')} (+ CON à chaque niveau).
            </p>
          )}
        </>
      )}

      <SectionTitle>Passage de niveau</SectionTitle>
      <Card className="p-3">
        {verifs[char.niveau + 1]?.ok ? (
          <>
            <p className="mb-2 flex gap-2 font-ui text-sm text-leaf">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> Le niveau {char.niveau + 1} est prêt. Les PC sont restaurés au passage de niveau.
            </p>
            <ConfirmBtn variant="primary" className="w-full" confirmLabel={`Confirmer : passer au niveau ${char.niveau + 1}`} onConfirm={() => valider()}>
              <TrendingUp size={18} /> Valider le passage de niveau
            </ConfirmBtn>
          </>
        ) : (
          <>
            <p className="font-ui text-sm text-muted">Planifiez et complétez le niveau {char.niveau + 1} (2 points de capacité) pour pouvoir le valider une fois gagné en jeu.</p>
            <ConfirmBtn className="mt-2 w-full" confirmLabel={`Forcer le niveau ${char.niveau + 1} malgré les règles ?`} onConfirm={() => valider(true)}>
              <TrendingUp size={18} /> Forcer le passage au niveau {char.niveau + 1}
            </ConfirmBtn>
            <p className="mt-1 px-1 font-ui text-xs text-muted">Applique les choix du niveau {char.niveau + 1} tels quels (même incomplets). Tout reste modifiable ensuite dans la fiche et « Gérer les voies ».</p>
          </>
        )}
      </Card>
      </>
      )}

      <ProgressionPicker open={picker} onClose={() => setPicker(false)} options={opts} onPick={ajouter} char={char} details={details} niveau={cible} libre={libre} recettes={recettes} />
    </div>
  );
}

function ProgressionPicker({ open, onClose, options, onPick, char, details, niveau, libre, recettes }) {
  const [q, setQ] = useState('');
  const [voirToutEtat, setVoirTout] = useState(false);
  const voirTout = voirToutEtat || libre;
  const profil = profilById[char.profilId];
  const t = q.trim().toLowerCase();

  const filtre = options.filter((o) => (voirTout || o.possible) && (!t || o.cap.nom.toLowerCase().includes(t) || o.voie.nom.toLowerCase().includes(t) || origineVoie(o.voie).toLowerCase().includes(t)));
  const groupes = [
    { titre: 'Voies déjà ouvertes', liste: filtre.filter((o) => !o.nouvelle) },
    { titre: `Nouvelles voies de ${profil?.nom.toLowerCase() || 'profil'}`, liste: filtre.filter((o) => o.nouvelle && o.voie.type === 'profil' && !o.hybride) },
    { titre: 'Voie de peuple / du mage / de domaine', liste: filtre.filter((o) => o.nouvelle && ['peuple', 'mage', 'domaine'].includes(o.voie.type)) },
    { titre: 'Voies de prestige', liste: filtre.filter((o) => o.nouvelle && o.voie.type === 'prestige') },
    { titre: 'Profil hybride (autres profils)', liste: filtre.filter((o) => o.nouvelle && o.hybride) },
    { titre: 'Voies d’artisan (1 pt par rang, hors limite)', liste: filtre.filter((o) => o.nouvelle && o.voie.type === 'artisan') },
    { titre: `Voies de recettes (${recettes.restants} rang${recettes.restants > 1 ? 's' : ''} disponible${recettes.restants > 1 ? 's' : ''})`, liste: filtre.filter((o) => o.nouvelle && o.voie.type === 'recette') },
  ].filter((g) => g.liste.length);
  return (
    <Sheet open={open} onClose={onClose} title={`Capacités — niveau ${niveau}`} tall>
      <label className="flex items-center gap-2 rounded-xl bg-surface2 px-3 rune-border">
        <Search size={16} className="text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer…" className="min-h-[44px] w-full bg-transparent outline-none" />
      </label>
      {libre && <p className="mt-2 font-ui text-xs text-gold">Mode libre : toutes les capacités peuvent être choisies, même indisponibles.</p>}
      <button type="button" hidden={libre} className="mt-1 min-h-[44px] px-1 font-ui text-sm text-gold" onClick={() => setVoirTout((x) => !x)}>
        {voirTout ? 'Masquer les capacités indisponibles' : 'Afficher aussi les capacités indisponibles'}
      </button>
      {!groupes.length && <Empty title="Aucune capacité disponible">Les points restants ne peuvent pas être dépensés à ce niveau.</Empty>}
      {groupes.map((g) => (
        <div key={g.titre}>
          <SectionTitle>{g.titre}</SectionTitle>
          <ul className="space-y-2">
            {g.liste.map((o) => (
              <li key={o.cap.id} className={cx('flex items-stretch rounded-xl bg-surface rune-border', !o.possible && 'opacity-50')}>
                <button type="button" className="flex min-h-[56px] min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left" onClick={() => details.cap(o.cap)}>
                  <RangCarre rang={o.rang} plein={false} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-tight">{o.cap.nom}</span>
                    <span className="block truncate font-ui text-xs text-muted">
                      {o.voie.nom} · {o.voie.type === 'recette' ? '1 rang de recette' : `${o.cout} pt${o.cout > 1 ? 's' : ''}`} · niv. {NIVEAU_REQUIS[o.rang]}+
                    </span>
                    {!o.possible && <span className="block font-ui text-xs text-blood">{o.raisons.join(' · ')}</span>}
                    {o.voie.prerequis && o.nouvelle && <span className="block font-ui text-xs text-gold">Prérequis : {o.voie.prerequis}</span>}
                  </span>
                  <ActionBadge action={o.cap.action} sort={o.cap.sort} />
                </button>
                <button type="button" disabled={!o.possible && !libre} onClick={() => onPick(o)} aria-label={`Choisir ${o.cap.nom}`} className="flex w-14 shrink-0 items-center justify-center rounded-r-xl border-l border-line text-gold disabled:text-muted">
                  <Plus size={22} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Sheet>
  );
}

/** PV de base gagnés à ce niveau : calcul automatique (familles des capacités) ou valeur imposée. */
function PVNiveau({ lvl, setLvl, gainsPV, cible }) {
  const g = gainsPV.find((x) => x.niveau === cible);
  const manuel = typeof lvl.pvBase === 'number';
  return (
    <div className="mt-3 rounded-xl bg-surface2 p-3 rune-border">
      <div className="flex items-center gap-2 font-ui text-sm">
        <span className="flex-1">
          PV de base gagnés <span className="text-muted">(+ CON)</span>
        </span>
        <Chip active={!manuel} onClick={() => setLvl((l) => ({ ...l, pvBase: undefined }))}>
          Auto{g ? ` (${g.auto})` : ''}
        </Chip>
        <Chip active={manuel} onClick={() => setLvl((l) => ({ ...l, pvBase: g?.auto ?? 0 }))}>
          Manuel
        </Chip>
      </div>
      {manuel && <Stepper className="mt-2" value={lvl.pvBase} min={0} max={50} format={(v) => `+${v}`} onChange={(v) => setLvl((l) => ({ ...l, pvBase: v }))} />}
    </div>
  );
}

/** Niveau déjà validé : rappel des choix et retour en arrière pour les corriger. */
function NiveauAcquis({ char, n, details, onRevenir }) {
  const h = (char.historique || []).find((x) => x.niveau === n);
  const nb = char.niveau - n + 1;
  const orph = ORPHELINS.find((o) => o.id === h?.orphelin);
  return (
    <Card className="mt-3 overflow-hidden p-3">
      <div className="etiquette-or -mx-3 -mt-3 flex min-h-[44px] items-center gap-2 px-3 py-1.5">
        <span className="text-[17px]">Niveau {n}</span>
        <span className="font-ui text-[12px] normal-case tracking-normal opacity-90">acquis</span>
        {h?.date && <span className="ml-auto font-ui text-[12px] normal-case tracking-normal opacity-90">{new Date(h.date).toLocaleDateString('fr-FR')}</span>}
      </div>
      {h ? (
        <>
          <ul className="mt-3 space-y-2">
            {(h.picks || []).map((p, i) => {
              const v = voieById[p.voieId];
              const cap = v?.capacites.find((c) => c.rang === p.rang);
              return (
                <li key={i}>
                  <button type="button" className="flex min-h-[52px] w-full items-center gap-2 rounded-xl bg-surface2 px-3 text-left rune-border" onClick={() => cap && details.cap(cap)}>
                    <RangCarre rang={p.rang} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{cap?.nom || p.voieId}</span>
                      <span className="block truncate font-ui text-xs text-muted">{v?.nom}</span>
                    </span>
                    <ActionBadge action={cap?.action} sort={cap?.sort} />
                  </button>
                </li>
              );
            })}
            {!h.picks?.length && <li className="font-ui text-sm text-muted">Aucune capacité choisie à ce niveau.</li>}
          </ul>
          <p className="mt-2 font-ui text-sm text-muted">
            PV de base : +{h.pvBase}
            {h.manuel ? ' (saisi à la main)' : ''}
            {orph ? ` · point orphelin : ${orph.label}` : ''}
          </p>
        </>
      ) : (
        <p className="mt-2 font-ui text-sm text-muted">Niveau réglé à la main : ses choix ne sont pas connus. Revenir en arrière baisse seulement le niveau ; ajustez ensuite les voies dans « Gérer les voies ».</p>
      )}
      <ConfirmBtn
        className="mt-3 w-full"
        confirmLabel={nb > 1 ? `Annuler les niveaux ${n} à ${char.niveau} ?` : `Annuler le niveau ${n} ?`}
        onConfirm={() => onRevenir(n - 1)}
      >
        <Undo2 size={18} /> Revenir au niveau {n - 1} pour corriger
      </ConfirmBtn>
      <p className="mt-1 px-1 font-ui text-xs text-muted">
        {nb > 1 ? `Les niveaux ${n} à ${char.niveau} sont annulés` : `Le niveau ${n} est annulé`} : rangs, PV et point orphelin retirés, choix remis dans le plan pour être corrigés puis revalidés.
      </p>
    </Card>
  );
}
