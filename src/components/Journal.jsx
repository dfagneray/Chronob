import { useMemo, useState } from 'react';
import { ArrowRight, MessageSquare, Send, Trash2, Activity, History } from 'lucide-react';
import { Sheet, Btn, Chip, ConfirmBtn, Empty, cx } from './ui.jsx';
import { useStore } from '../lib/store.jsx';
import { CATEGORIES_JOURNAL, categoriesEntree } from '../lib/journal.js';

const jour = (iso) => {
  const d = new Date(iso);
  const auj = new Date();
  const hier = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === auj.toDateString()) return 'Aujourd’hui';
  if (d.toDateString() === hier.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === auj.getFullYear() ? undefined : 'numeric' });
};
const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const PAS = 80;

/** Journal des actions du personnage actif, affiché à la demande (tiroir). */
export default function Journal({ open, onClose }) {
  const { actif, noter, supprimerEntree, viderJournal } = useStore();
  const [texte, setTexte] = useState('');
  const [filtre, setFiltre] = useState('tout');
  const [limite, setLimite] = useState(PAS);
  const journal = actif?.journal || [];

  const entrees = useMemo(() => {
    const l = [...journal].reverse();
    return filtre === 'tout' ? l : l.filter((e) => categoriesEntree(e).includes(filtre));
  }, [journal, filtre]);

  const groupes = useMemo(() => {
    const out = [];
    for (const e of entrees.slice(0, limite)) {
      const j = jour(e.date);
      if (!out.length || out[out.length - 1].jour !== j) out.push({ jour: j, entrees: [] });
      out[out.length - 1].entrees.push(e);
    }
    return out;
  }, [entrees, limite]);

  const publier = () => {
    if (!texte.trim()) return;
    noter(texte);
    setTexte('');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      tall
      label="Journal"
      title={
        <span className="flex items-center gap-2">
          <History size={20} /> Journal
        </span>
      }
      footer={
        journal.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 font-ui text-xs text-muted">
              {journal.length} entrée{journal.length > 1 ? 's' : ''} · conservées : 500 dernières
            </span>
            <ConfirmBtn small variant="ghost" confirmLabel="Tout effacer ?" onConfirm={viderJournal}>
              <Trash2 size={15} /> Vider
            </ConfirmBtn>
          </div>
        ) : null
      }
    >
      {/* Composer une note */}
      <div className="rounded-2xl bg-surface2 p-2 rune-border">
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={2}
          aria-label="Nouvelle note"
          placeholder="Ajouter une note : butin, rencontre, décision du MJ…"
          className="w-full resize-none bg-transparent px-2 py-1 text-[16px] text-ink outline-none"
        />
        <div className="flex justify-end">
          <Btn small variant="primary" disabled={!texte.trim()} onClick={publier}>
            <Send size={15} /> Publier
          </Btn>
        </div>
      </div>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <Chip active={filtre === 'tout'} onClick={() => setFiltre('tout')}>
          Tout
        </Chip>
        {Object.entries(CATEGORIES_JOURNAL).map(([k, v]) => (
          <Chip key={k} active={filtre === k} onClick={() => setFiltre(k)}>
            {v}
          </Chip>
        ))}
      </div>

      {!entrees.length && (
        <Empty icon={Activity} title="Rien pour l’instant">
          Les modifications de la fiche (PV, niveaux, équipement, états…) apparaîtront ici automatiquement.
        </Empty>
      )}

      {groupes.map((g) => (
        <section key={g.jour} className="mt-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-px flex-1 bg-line" />
            <span className="font-ui text-xs font-semibold first-letter:uppercase text-muted">{g.jour}</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <ol className="space-y-2">
            {g.entrees.map((e) => (
              <Entree key={e.id} e={e} onSupprimer={() => supprimerEntree(e.id)} />
            ))}
          </ol>
        </section>
      ))}

      {entrees.length > limite && (
        <Btn className="mt-3 w-full" onClick={() => setLimite((l) => l + PAS)}>
          Afficher les entrées plus anciennes ({entrees.length - limite})
        </Btn>
      )}
    </Sheet>
  );
}

function Entree({ e, onSupprimer }) {
  const note = e.type === 'note';
  return (
    <li className="flex gap-3">
      <span className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', note ? 'bg-gold/20 text-gold' : 'bg-surface2 text-muted')}>
        {note ? <MessageSquare size={15} /> : <Activity size={15} />}
      </span>
      <div className={cx('min-w-0 flex-1 rounded-xl px-3 py-2', note ? 'bg-gold/10 rune-border' : 'bg-surface rune-border')}>
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 font-ui text-sm font-semibold">{e.titre || (note ? 'Note' : CATEGORIES_JOURNAL[categoriesEntree(e)[0]] || 'Modification')}</span>
          <time dateTime={e.date} className="shrink-0 font-ui text-[11px] text-muted">
            {heure(e.date)}
          </time>
        </div>
        {e.texte && <p className="mt-0.5 whitespace-pre-wrap text-[16px] leading-snug">{e.texte}</p>}
        {e.changes?.length > 0 && (
          <ul className="mt-1 space-y-0.5 font-ui text-[13px]">
            {e.changes.map((c, i) => (
              <li key={i} className="leading-snug">
                {c.texte ? (
                  <>
                    {c.texte}
                    {c.apercu && <span className="block truncate italic text-muted">« {c.apercu} »</span>}
                  </>
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-x-1.5">
                    <span className="text-muted">{c.label}</span>
                    <span className="tabular-nums">{String(c.de)}</span>
                    <ArrowRight size={12} className="text-gold" aria-label="devient" />
                    <b className="tabular-nums">{String(c.a)}</b>
                  </span>
                )}
                {c.detail && <span className="block text-xs text-muted">{c.detail}</span>}
              </li>
            ))}
          </ul>
        )}
        {note && (
          <div className="mt-1 flex justify-end">
            <ConfirmBtn small variant="ghost" className="!px-3 text-muted" confirmLabel="Supprimer ?" onConfirm={onSupprimer}>
              <Trash2 size={14} />
            </ConfirmBtn>
          </div>
        )}
      </div>
    </li>
  );
}
