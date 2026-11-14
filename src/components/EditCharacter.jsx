import { Sheet, Stepper, Chip, SectionTitle, Card, Btn } from './ui.jsx';
import TraitSelect from './TraitSelect.jsx';
import { IDEAUX, TRAVERS } from '../data/personnalite.js';
import { peuples, profils, peupleById, voieById, CARACS, CARAC_NOMS, familles, profilById } from '../data/index.js';
import { fmt, NIVEAU_MAX } from '../lib/rules.js';

const BONUS = [
  ['DEF', 'Défense'],
  ['INIT', 'Initiative'],
  ['CONTACT', 'Attaque au contact'],
  ['DISTANCE', 'Attaque à distance'],
  ['MAGIQUE', 'Attaque magique'],
  ['PV', 'PV max'],
  ['PM', 'PM max'],
  ['PC', 'PC max'],
  ['DR', 'DR max'],
];

export default function EditCharacter({ open, onClose, char, maj, d }) {
  if (!char) return null;
  const set = (patch) => maj((c) => ({ ...c, ...patch }));
  const setBonus = (k, v) => maj((c) => ({ ...c, bonus: { ...(c.bonus || {}), [k]: v } }));
  const peuple = peupleById[char.peupleId];
  return (
    <Sheet open={open} onClose={onClose} title="Modifier le personnage" tall>
      <label className="block font-ui text-sm text-muted">
        Nom
        <input value={char.nom} onChange={(e) => set({ nom: e.target.value })} className="mt-1 w-full rounded-xl bg-surface2 px-3 py-3 font-display text-lg text-ink outline-none rune-border" />
      </label>
      <label className="mt-3 block font-ui text-sm text-muted">
        Joueur / joueuse
        <input value={char.joueur || ''} onChange={(e) => set({ joueur: e.target.value })} className="mt-1 w-full rounded-xl bg-surface2 px-3 py-3 text-ink outline-none rune-border" />
      </label>

      <SectionTitle>Niveau</SectionTitle>
      <Stepper value={char.niveau} min={1} max={NIVEAU_MAX} format={(v) => `Niveau ${v}`} onChange={(v) => maj((c) => ({ ...c, niveau: v, plan: Object.fromEntries(Object.entries(c.plan || {}).filter(([n]) => +n > v)) }))} />
      <p className="mt-1 px-1 font-ui text-xs text-muted">Réglage manuel (fiche existante). Pour une montée de niveau guidée, utilisez le Planificateur.</p>

      <SectionTitle>Peuple</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {peuples.map((p) => (
          <Chip key={p.id} active={char.peupleId === p.id} onClick={() => set({ peupleId: p.id, voiePeuple: p.voies[0] })}>
            {p.nom}
          </Chip>
        ))}
      </div>
      {peuple?.voies.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {peuple.voies.map((id) => (
            <Chip key={id} active={char.voiePeuple === id} onClick={() => set({ voiePeuple: id })}>
              {voieById[id]?.nom}
            </Chip>
          ))}
        </div>
      )}

      <SectionTitle>Profil principal</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {profils.map((p) => (
          <Chip key={p.id} active={char.profilId === p.id} onClick={() => set({ profilId: p.id })}>
            {p.nom}
          </Chip>
        ))}
      </div>

      <SectionTitle>Caractéristiques (valeurs de base)</SectionTitle>
      <p className="-mt-1 mb-2 px-1 font-ui text-xs text-muted">Valeurs après modificateurs de peuple, sans les bonus de capacités (appliqués automatiquement).</p>
      <Card className="divide-y divide-line">
        {CARACS.map((k) => (
          <div key={k} className="flex items-center gap-2 px-3 py-1.5">
            <span className="w-24 font-ui text-sm">
              <b className="text-gold">{k}</b>
              <span className="block text-[11px] text-muted">{CARAC_NOMS[k]}</span>
            </span>
            <Stepper className="flex-1" value={char.carac[k]} min={-4} max={10} format={fmt} onChange={(v) => maj((c) => ({ ...c, carac: { ...c.carac, [k]: v } }))} />
            <span className="w-10 text-right font-num font-semibold text-goldsoft">{fmt(d.caracBase[k])}</span>
          </div>
        ))}
      </Card>

      <SectionTitle>Bonus manuels</SectionTitle>
      <p className="-mt-1 mb-2 px-1 font-ui text-xs text-muted">Objets magiques, capacités conditionnelles, décisions du MJ…</p>
      <Card className="divide-y divide-line">
        {[...BONUS, ...CARACS.map((k) => [k, CARAC_NOMS[k]])].map(([k, l]) => (
          <div key={k} className="flex items-center gap-2 px-3 py-1.5">
            <span className="w-28 font-ui text-sm">{l}</span>
            <Stepper className="flex-1" value={char.bonus?.[k] || 0} min={-20} max={50} format={fmt} onChange={(v) => setBonus(k, v)} />
          </div>
        ))}
      </Card>

      <SectionTitle>Personnalité</SectionTitle>
      <div className="space-y-3">
        <TraitSelect label="Idéal héroïque" options={IDEAUX} value={char.ideal || ''} onChange={(v) => set({ ideal: v })} />
        <TraitSelect label="Travers" options={TRAVERS} value={char.travers || ''} onChange={(v) => set({ travers: v })} />
      </div>
      <label className="mt-3 block font-ui text-sm text-muted">
        Notes, langues, historique
        <textarea value={char.notes || ''} onChange={(e) => set({ notes: e.target.value })} rows={6} className="mt-1 w-full rounded-xl bg-surface2 px-3 py-2 text-ink outline-none rune-border" />
      </label>

      <PVParNiveau char={char} maj={maj} d={d} />
    </Sheet>
  );
}

/** PV de base gagnés à chaque niveau (hors CON) : calcul du livre ou valeur saisie. */
function PVParNiveau({ char, maj, d }) {
  const fam = familles[profilById[char.profilId]?.famille || 'aventuriers'];
  const hist = char.historique || [];
  const setPV = (n, v) =>
    maj((c) => {
      const h = [...(c.historique || [])];
      const i = h.findIndex((x) => x.niveau === n);
      if (i >= 0) h[i] = { ...h[i], pvBase: v, manuel: true };
      else h.push({ niveau: n, pvBase: v, picks: [], manuel: true });
      return { ...c, historique: h.sort((a, b) => a.niveau - b.niveau) };
    });
  // revient au calcul : valeur calculée au passage de niveau, sinon PV de famille
  const reset = (n) => maj((c) => ({ ...c, historique: (c.historique || []).map((x) => (x.niveau === n ? { ...x, pvBase: x.pvCalcule, manuel: false } : x)) }));
  return (
    <>
      <SectionTitle>PV de base par niveau</SectionTitle>
      <p className="-mt-1 mb-2 px-1 font-ui text-xs text-muted">
        Hors CON (ajoutée à chaque niveau). Par défaut : niveau 1 = {fam.pv * 2}, puis {fam.pv} par niveau ({fam.nom.toLowerCase()}) ou la moyenne hybride calculée au passage de niveau. Total actuel : {d.pvMax} PV.
      </p>
      <Card className="divide-y divide-line">
        {Array.from({ length: char.niveau }, (_, i) => i + 1).map((n) => {
          const h = hist.find((x) => x.niveau === n);
          const val = d.pvParNiveau[n - 1];
          const defaut = n === 1 ? fam.pv * 2 : fam.pv;
          return (
            <div key={n} className="px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-20 font-ui text-sm font-semibold">Niveau {n}</span>
                <Stepper className="flex-1" value={val} min={0} max={50} format={(v) => `+${v}`} onChange={(v) => setPV(n, v)} />
              </div>
              {(h?.picks?.length > 0 || h?.orphelin || (typeof h?.pvBase === 'number' && h.pvBase !== defaut)) && (
                <div className="mt-1 flex items-center gap-2 font-ui text-xs text-muted">
                  <span className="flex-1">
                    {(h.picks || []).map((p) => voieById[p.voieId]?.capacites.find((c) => c.rang === p.rang)?.nom).join(', ')}
                    {h.orphelin ? ` · point orphelin → ${h.orphelin}` : ''}
                  </span>
                  {h.manuel && typeof h.pvBase === 'number' && (
                    <Btn small variant="ghost" className="text-gold" onClick={() => reset(n)}>
                      Valeur par défaut
                    </Btn>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </>
  );
}
