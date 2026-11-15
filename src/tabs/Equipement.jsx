import { useMemo, useState } from 'react';
import { Plus, Search, Shield, Swords, Crosshair, Package, Coins, Backpack, Trash2, FlaskConical, PenLine, Check } from 'lucide-react';
import { Card, SectionTitle, Btn, Sheet, Stepper, Chip, Badge, cx, useToast, ConfirmBtn, NumPad, Empty, Segmented } from '../components/ui.jsx';
import { EQUIPEMENT, equipById, refPage } from '../data/index.js';
import { CATEGORIES_EQUIPEMENT, SAC_AVENTURIER, formatPrix } from '../data/equipement.js';
import { dmArme, attaqueArme, fmt } from '../lib/rules.js';
import { ICONES_CATEGORIE } from '../components/visuels.jsx';
import { IllustrationObjet } from '../components/illustrations.jsx';
import { uid } from '../lib/store.jsx';

const PIECES = [
  { k: 'pp', nom: 'Platine', pc: 1000, metal: ['#eef1f6', '#9aa6b8'] },
  { k: 'po', nom: 'Or', pc: 100, metal: ['#f6d77e', '#b8862a'] },
  { k: 'pa', nom: 'Argent', pc: 10, metal: ['#e4e6ea', '#8d939d'] },
  { k: 'pc', nom: 'Cuivre', pc: 1, metal: ['#eba77e', '#9b5530'] },
];
const totalPc = (b) => PIECES.reduce((s, p) => s + (b?.[p.k] || 0) * p.pc, 0);

function repartir(total, garderPP = 0) {
  const pp = Math.min(garderPP, Math.floor(total / 1000));
  let reste = total - pp * 1000;
  const po = Math.floor(reste / 100);
  reste -= po * 100;
  const pa = Math.floor(reste / 10);
  return { pp, po, pa, pc: reste - pa * 10 };
}

const ICONES = ICONES_CATEGORIE;

/** Pièce de monnaie (dégradé du métal) avec son abréviation. */
const Piece = ({ metal, k }) => (
  <span
    aria-hidden="true"
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-num text-[11px] font-semibold uppercase text-[#2b2416]"
    style={{ background: `radial-gradient(circle at 35% 30%, ${metal[0]}, ${metal[1]})`, boxShadow: `inset 0 0 0 2px ${metal[1]}, inset 0 0 0 4px ${metal[0]}55` }}
  >
    {k}
  </span>
);

export function itemDepuisCatalogue(ref, qte = 1) {
  return { uid: uid(), refId: ref.id, ...ref, id: undefined, qte, equipe: false, magie: 0 };
}

/**
 * État et actions de l'équipement, partagés par la section Combat de la fiche (armes en main,
 * consommables) et la section « Sac & bourse ». `feuilles` contient les tiroirs à rendre une fois.
 */
export function useEquipement(char, d, maj) {
  const toast = useToast();
  const [catalogue, setCatalogue] = useState(false);
  const [perso, setPerso] = useState(false);
  const [edit, setEdit] = useState(null);
  const [pad, setPad] = useState(null);
  const inv = char.inventaire || [];
  const bourse = char.bourse || {};

  const majInv = (fn) => maj((c) => ({ ...c, inventaire: fn(c.inventaire || []) }));
  const ajouter = (items) => majInv((l) => [...l, ...items]);
  const equiper = (it) =>
    majInv((l) =>
      l.map((x) => {
        if (x.uid === it.uid) return { ...x, equipe: !x.equipe };
        // une seule armure et un seul bouclier à la fois
        if (!it.equipe && (it.categorie === 'armure' || it.categorie === 'bouclier') && x.categorie === it.categorie) return { ...x, equipe: false };
        return x;
      })
    );

  const acheter = (ref, qte = 1) => {
    const prix = (ref.prix || 0) * qte;
    const tot = totalPc(bourse);
    if (prix > tot) {
      toast(`Fonds insuffisants : il manque ${formatPrix(prix - tot)}.`);
      return false;
    }
    maj((c) => ({ ...c, bourse: repartir(totalPc(c.bourse) - prix, c.bourse?.pp || 0), inventaire: [...(c.inventaire || []), itemDepuisCatalogue(ref, qte)] }), { titre: `Achat (${formatPrix(prix)})` });
    toast(`${ref.nom} acheté (${formatPrix(prix)}).`);
    return true;
  };

  // le joueur lance son 1d4° et saisit le résultat
  const utiliserPotion = (it) => setPad({ potion: it, nom: `Potion de soins — résultat du d${d.d4} (1d4°)`, initial: Math.ceil((d.d4 + 1) / 2) });
  const boirePotion = (it, jet) => {
    maj((c) => ({
      ...c,
      pv: { ...c.pv, actuel: (c.pv?.actuel ?? 0) >= d.pvMax ? c.pv.actuel : Math.min(d.pvMax, (c.pv?.actuel ?? 0) + jet) },
      inventaire: (c.inventaire || []).flatMap((x) => (x.uid === it.uid ? (x.qte > 1 ? [{ ...x, qte: x.qte - 1 }] : []) : [x])),
    }), { titre: 'Potion de soins' });
    toast(`Potion de soins : +${jet} PV.`);
  };

  const groupes = Object.keys(CATEGORIES_EQUIPEMENT)
    .map((cat) => ({ cat, items: inv.filter((i) => (i.categorie || 'divers') === cat) }))
    .filter((g) => g.items.length);

  // consommable utilisé : -1 (retiré de l'inventaire au dernier)
  const utiliser = (it) => {
    if (it.refId === 'potion-de-soins') return utiliserPotion(it);
    majInv((l) => l.flatMap((x) => (x.uid === it.uid ? (x.qte > 1 ? [{ ...x, qte: x.qte - 1 }] : []) : [x])));
    toast(it.qte > 1 ? `${it.nom} utilisé (reste ${it.qte - 1}).` : `${it.nom} utilisé : il n’en reste plus.`);
  };

  const feuilles = (
    <>
      <Catalogue open={catalogue} onClose={() => setCatalogue(false)} onAdd={(ref, q) => ajouter([itemDepuisCatalogue(ref, q)])} onBuy={acheter} />
      <ObjetPerso open={perso} onClose={() => setPerso(false)} onAdd={(it) => ajouter([it])} />
      <EditItem
        item={edit && inv.find((x) => x.uid === edit.uid)}
        d={d}
        onClose={() => setEdit(null)}
        onChange={(patch) => majInv((l) => l.map((x) => (x.uid === edit.uid ? { ...x, ...patch } : x)))}
        onDelete={() => {
          majInv((l) => l.filter((x) => x.uid !== edit.uid));
          setEdit(null);
        }}
      />
      <NumPad
        open={!!pad}
        onClose={() => setPad(null)}
        title={pad?.nom}
        initial={pad?.initial ?? 0}
        allowNegative={false}
        onSubmit={(v) => (pad.potion ? boirePotion(pad.potion, Math.max(0, v)) : maj((c) => ({ ...c, bourse: { ...c.bourse, [pad.k]: Math.max(0, v) } })))}
      />
    </>
  );

  const resumeBourse = `${(totalPc(bourse) / 10).toLocaleString('fr-FR')} pa`;
  return { char, d, maj, inv, bourse, resumeBourse, groupes, ajouter, equiper, utiliser, utiliserPotion, setEdit, setCatalogue, setPerso, setPad, feuilles };
}

/** Ligne d'objet : arme (attaque, DM), armure, consommable. */
function LigneObjet({ eq, it }) {
  const { d } = eq;
  const Icon = ICONES[it.categorie] || Package;
  const arme = it.categorie === 'contact' || it.categorie === 'distance';
  const portable = arme || it.categorie === 'armure' || it.categorie === 'bouclier';
  return (
    <div className="flex items-center">
      <button type="button" className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left active:bg-surface2" onClick={() => eq.setEdit(it)}>
        <span className={cx('flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl', it.equipe ? 'bg-surface2 text-gold ring-2 ring-gold' : 'bg-surface2 text-muted')}
          aria-hidden="true"
        >
          <IllustrationObjet refId={it.refId} nom={it.nom} className="h-full w-full p-0.5" vignette repli={<Icon size={19} aria-hidden="true" />} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">
            {it.nom}
            {it.magie ? ` +${it.magie}` : ''}
            {it.qte > 1 ? ` ×${it.qte}` : ''}
          </span>
          <span className="block truncate font-ui text-xs text-muted">
            {arme && `Att ${fmt(attaqueArme(it, d))}${it.nonMaitrisee ? ' (dé malus)' : ''} · DM ${dmArme(it, d, it.deuxMainsUse)}${it.portee ? ` · ${it.portee} m` : ''}${it.critique ? ` · crit ${it.critique}-20` : ''}${it.explosif ? ' · dé explosif' : ''}`}
            {it.categorie === 'armure' && `DEF +${it.def} · AGI max ${fmt(it.agiMax)}`}
            {it.categorie === 'bouclier' && `DEF +${it.def}`}
            {!arme && !portable && (it.notes || formatPrix(it.prix))}
          </span>
        </span>
      </button>
      {portable && (
        <button
          type="button"
          onClick={() => eq.equiper(it)}
          aria-pressed={!!it.equipe}
          className={cx('mr-2 min-h-[44px] w-[84px] shrink-0 rounded-xl py-2.5 font-ui text-xs font-bold uppercase tracking-wide rune-border', it.equipe ? 'bg-gold text-bg' : 'bg-surface2 text-muted')}
        >
          {it.equipe ? (arme ? 'En main' : 'Équipé') : arme ? 'Rangée' : 'Rangé'}
        </button>
      )}
      {it.categorie === 'consommable' && (
        <button
          type="button"
          onClick={() => eq.utiliser(it)}
          aria-label={`${it.refId === 'potion-de-soins' ? 'Boire' : 'Utiliser'} : ${it.nom}`}
          className="mr-2 min-h-[44px] w-[84px] shrink-0 rounded-xl bg-leaf/15 py-2.5 font-ui text-xs font-bold uppercase tracking-wide text-leaf rune-border"
        >
          {it.refId === 'potion-de-soins' ? 'Boire' : 'Utiliser'}
        </button>
      )}
    </div>
  );
}

/** Dans la section Combat de la fiche : armes en main, armure portée et consommables. */
export function EquipementCombat({ eq }) {
  const { inv } = eq;
  const armes = inv.filter((i) => (i.categorie === 'contact' || i.categorie === 'distance') && i.equipe);
  const protections = inv.filter((i) => (i.categorie === 'armure' || i.categorie === 'bouclier') && i.equipe);
  const consommables = inv.filter((i) => i.categorie === 'consommable');
  return (
    <>
      <div className="mb-1.5 mt-4 flex items-center gap-2 px-1 font-caps text-[13px] font-semibold tracking-wide text-muted">
        <span className="losange" aria-hidden="true" />
        Armes en main {protections.length > 0 && '& protections'}
      </div>
      {armes.length + protections.length ? (
        <Card className="divide-y divide-line">
          {[...armes, ...protections].map((it) => (
            <LigneObjet key={it.uid} eq={eq} it={it} />
          ))}
        </Card>
      ) : (
        <p className="px-1 font-ui text-sm text-muted">Aucune arme en main : équipez-en une dans « Sac & bourse », plus bas.</p>
      )}
      {consommables.length > 0 && (
        <>
          <div className="mb-1.5 mt-4 flex items-center gap-2 px-1 font-caps text-[13px] font-semibold tracking-wide text-muted">
            <span className="losange" aria-hidden="true" />
            Consommables
          </div>
          <Card className="divide-y divide-line">
            {consommables.map((it) => (
              <LigneObjet key={it.uid} eq={eq} it={it} />
            ))}
          </Card>
        </>
      )}
    </>
  );
}

/** Section « Sac & bourse » : bourse et inventaire complet. */
export function SacEtBourse({ eq }) {
  const { char, maj, inv, bourse, groupes, ajouter, setCatalogue, setPerso, setPad } = eq;
  return (
    <>
      {/* Bourse */}
      <SectionTitle icon={Coins} right={<span className="font-num text-xs text-muted">{(totalPc(bourse) / 10).toLocaleString('fr-FR')} pa</span>}>
        Bourse
      </SectionTitle>
      <Card className="divide-y divide-line">
        {PIECES.map((p) => (
          <div key={p.k} className="flex items-center gap-2 px-3 py-2">
            <Piece metal={p.metal} k={p.k} />
            <span className="w-16 font-ui text-sm">
              <b className="uppercase">{p.k}</b>
              <span className="block text-[11px] text-muted">{p.nom}</span>
            </span>
            <Stepper
              className="flex-1"
              label={`pièces ${p.k === 'po' ? 'd’or' : p.k === 'pa' ? 'd’argent' : p.k === 'pc' ? 'de cuivre' : 'de platine'}`}
              value={bourse[p.k] || 0}
              min={0}
              max={999999}
              onChange={(v) => maj((c) => ({ ...c, bourse: { ...c.bourse, [p.k]: v } }))}
              onValueTap={() => setPad({ k: p.k, nom: `Pièces de ${p.nom.toLowerCase()} (${p.k})`, initial: bourse[p.k] || 0 })}
            />
          </div>
        ))}
        <div className="grid grid-cols-4 gap-1.5 p-2">
          {[
            ['+1 po', 'po', 1],
            ['+10 pa', 'pa', 10],
            ['-1 po', 'po', -1],
            ['-10 pa', 'pa', -10],
          ].map(([l, k, n]) => (
            <Btn key={l} small className={n < 0 ? 'text-blood' : 'text-leaf'} onClick={() => maj((c) => ({ ...c, bourse: { ...c.bourse, [k]: Math.max(0, (c.bourse?.[k] || 0) + n) } }))}>
              {l}
            </Btn>
          ))}
        </div>
        <button type="button" className="min-h-[44px] w-full font-ui text-sm text-gold" onClick={() => maj((c) => ({ ...c, bourse: repartir(totalPc(c.bourse), c.bourse?.pp || 0) }), { titre: 'Change de monnaie' })}>
          Faire le change (1 po = 10 pa = 100 pc)
        </button>
      </Card>

      {/* Inventaire */}
      <SectionTitle icon={Backpack}>Inventaire</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Btn variant="primary" onClick={() => setCatalogue(true)}>
          <Plus size={18} /> Catalogue
        </Btn>
        <Btn onClick={() => setPerso(true)}>
          <PenLine size={18} /> Objet perso.
        </Btn>
      </div>
      {!inv.some((i) => SAC_AVENTURIER.includes(i.refId)) && (
        <Btn small variant="ghost" className="mt-1 w-full text-gold" onClick={() => ajouter(SAC_AVENTURIER.map((id) => itemDepuisCatalogue(equipById[id])))}>
          <Backpack size={16} /> Ajouter le sac d’aventurier de départ
        </Btn>
      )}

      {!inv.length && (
        <Empty icon={Package} title="Inventaire vide">
          Ajoutez vos armes, armures et objets depuis le catalogue du livre ou créez vos propres objets.
        </Empty>
      )}

      {groupes.map((g) => (
        <div key={g.cat}>
          <div className="mb-1.5 mt-4 flex items-center gap-2 px-1 font-caps text-[13px] font-semibold tracking-wide text-muted">
            <span className="losange" aria-hidden="true" />
            {CATEGORIES_EQUIPEMENT[g.cat]}
          </div>
          <Card className="divide-y divide-line">
            {g.items.map((it) => <LigneObjet key={it.uid} eq={eq} it={it} />)}
          </Card>
        </div>
      ))}

    </>
  );
}

function Catalogue({ open, onClose, onAdd, onBuy }) {
  const [cat, setCat] = useState('tout');
  const [q, setQ] = useState('');
  const [choix, setChoix] = useState(null);
  const [qte, setQte] = useState(1);
  const liste = useMemo(() => {
    const t = q.trim().toLowerCase();
    return EQUIPEMENT.filter((e) => (cat === 'tout' || e.categorie === cat) && (!t || e.nom.toLowerCase().includes(t)));
  }, [cat, q]);
  return (
    <Sheet open={open} onClose={onClose} title="Catalogue d’équipement" tall>
      <label className="flex items-center gap-2 rounded-xl bg-surface2 px-3 rune-border">
        <Search size={16} className="text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="min-h-[44px] w-full bg-transparent outline-none" />
      </label>
      <div className="no-scrollbar -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <Chip active={cat === 'tout'} onClick={() => setCat('tout')}>
          Tout
        </Chip>
        {Object.entries(CATEGORIES_EQUIPEMENT)
          .filter(([k]) => k !== 'divers')
          .map(([k, v]) => (
            <Chip key={k} active={cat === k} onClick={() => setCat(k)}>
              {v}
            </Chip>
          ))}
      </div>
      <ul className="mt-2 divide-y divide-line rounded-xl bg-surface rune-border">
        {liste.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => {
                setChoix(e);
                setQte(1);
              }}
              className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left active:bg-surface2"
            >
              {(() => {
                const I = ICONES[e.categorie] || Package;
                return (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface2 text-gold" aria-hidden="true">
                    <IllustrationObjet refId={e.id} nom={e.nom} className="h-full w-full p-0.5" vignette repli={<I size={17} aria-hidden="true" />} />
                  </span>
                );
              })()}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{e.nom}</span>
                <span className="block truncate font-ui text-xs text-muted">
                  {e.dm && `DM ${e.dm}${e.dm2 ? `/${e.dm2}` : ''}`}
                  {e.portee ? ` · ${e.portee} m` : ''}
                  {e.def ? `DEF +${e.def}` : ''}
                  {e.agiMax !== undefined ? ` · AGI max ${fmt(e.agiMax)}` : ''}
                  {e.notes ? ` · ${e.notes}` : ''}
                </span>
              </span>
              <Badge>{formatPrix(e.prix)}</Badge>
            </button>
          </li>
        ))}
      </ul>
      <Sheet
        open={!!choix}
        onClose={() => setChoix(null)}
        title={choix?.nom}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Btn
              onClick={() => {
                onAdd(choix, qte);
                setChoix(null);
              }}
            >
              <Plus size={18} /> Ajouter
            </Btn>
            <Btn
              variant="primary"
              disabled={!choix?.prix}
              onClick={() => {
                if (onBuy(choix, qte)) setChoix(null);
              }}
            >
              <Coins size={18} /> Acheter {choix?.prix ? formatPrix(choix.prix * qte) : ''}
            </Btn>
          </div>
        }
      >
        {choix && (
          <>
            <IllustrationObjet refId={choix.id} nom={choix.nom} className="mx-auto mb-3 block h-44 w-full" />
            <p className="text-[16px]">{choix.notes || CATEGORIES_EQUIPEMENT[choix.categorie]}</p>
            <div className="mt-3 font-ui text-sm text-muted">Quantité</div>
            <Stepper value={qte} min={1} max={99} onChange={setQte} />
            <p className="mt-2 font-ui text-xs text-muted">{refPage(choix)}</p>
          </>
        )}
      </Sheet>
    </Sheet>
  );
}

function ObjetPerso({ open, onClose, onAdd }) {
  const vide = { nom: '', categorie: 'divers', dm: '', portee: 0, def: 0, agiMax: 5, prix: 0, notes: '', qte: 1 };
  const [f, setF] = useState(vide);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const arme = f.categorie === 'contact' || f.categorie === 'distance';
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Objet personnalisé"
      tall
      footer={
        <Btn
          variant="primary"
          className="w-full"
          disabled={!f.nom.trim()}
          onClick={() => {
            const it = { uid: uid(), refId: null, nom: f.nom.trim(), categorie: f.categorie, notes: f.notes, qte: f.qte, prix: f.prix * 10, equipe: false, magie: 0 };
            if (arme) Object.assign(it, { dm: f.dm || '1d4', portee: f.portee || undefined });
            if (f.categorie === 'armure') Object.assign(it, { def: f.def, agiMax: f.agiMax });
            if (f.categorie === 'bouclier') Object.assign(it, { def: f.def });
            onAdd(it);
            setF(vide);
            onClose();
          }}
        >
          <Check size={18} /> Ajouter à l’inventaire
        </Btn>
      }
    >
      <label className="block font-ui text-sm text-muted">
        Nom
        <input value={f.nom} onChange={(e) => set('nom')(e.target.value)} className="mt-1 w-full rounded-xl bg-surface2 px-3 py-3 text-ink outline-none rune-border" placeholder="ex. Épée runique de mon grand-père" />
      </label>
      <div className="mt-3 font-ui text-sm text-muted">Catégorie</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {Object.entries(CATEGORIES_EQUIPEMENT).map(([k, v]) => (
          <Chip key={k} active={f.categorie === k} onClick={() => set('categorie')(k)}>
            {v}
          </Chip>
        ))}
      </div>
      {arme && (
        <>
          <div className="mt-3 font-ui text-sm text-muted">Dés de dommages</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {['1d3', '1d4', '1d6', '1d8', '1d10', '1d12', '2d4', '2d6'].map((x) => (
              <Chip key={x} active={f.dm === x} onClick={() => set('dm')(x)}>
                {x}
              </Chip>
            ))}
          </div>
          {f.categorie === 'distance' && (
            <>
              <div className="mt-3 font-ui text-sm text-muted">Portée (m)</div>
              <Stepper value={f.portee} min={0} max={200} step={5} onChange={set('portee')} />
            </>
          )}
        </>
      )}
      {(f.categorie === 'armure' || f.categorie === 'bouclier') && (
        <>
          <div className="mt-3 font-ui text-sm text-muted">Bonus de DEF</div>
          <Stepper value={f.def} min={0} max={10} format={(v) => `+${v}`} onChange={set('def')} />
          {f.categorie === 'armure' && (
            <>
              <div className="mt-3 font-ui text-sm text-muted">AGI maximale</div>
              <Stepper value={f.agiMax} min={0} max={8} format={fmt} onChange={set('agiMax')} />
            </>
          )}
        </>
      )}
      <div className="mt-3 font-ui text-sm text-muted">Quantité</div>
      <Stepper value={f.qte} min={1} max={999} onChange={set('qte')} />
      <div className="mt-3 font-ui text-sm text-muted">Valeur (pa)</div>
      <Stepper value={f.prix} min={0} max={99999} onChange={set('prix')} />
      <label className="mt-3 block font-ui text-sm text-muted">
        Notes
        <textarea value={f.notes} onChange={(e) => set('notes')(e.target.value)} rows={3} className="mt-1 w-full rounded-xl bg-surface2 px-3 py-2 text-ink outline-none rune-border" />
      </label>
    </Sheet>
  );
}

function EditItem({ item, d, onClose, onChange, onDelete }) {
  if (!item) return null;
  const arme = item.categorie === 'contact' || item.categorie === 'distance';
  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title={item.nom}
      footer={
        <ConfirmBtn className="w-full" confirmLabel="Confirmer la suppression" onConfirm={onDelete}>
          <Trash2 size={18} /> Retirer de l’inventaire
        </ConfirmBtn>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge tone="gold">{CATEGORIES_EQUIPEMENT[item.categorie] || 'Divers'}</Badge>
        {item.typeDm && <Badge>{item.typeDm}</Badge>}
        {item.page && <Badge>{refPage(item)}</Badge>}
      </div>
      <IllustrationObjet refId={item.refId} nom={item.nom} className="mx-auto mb-3 block h-40 w-full" />
      {arme && (
        <Card className="mb-3 grid grid-cols-2 gap-2 p-3 text-center">
          <div>
            <div className="font-ui text-xs text-muted">Attaque</div>
            <div className="font-num text-2xl font-semibold">{fmt(attaqueArme(item, d))}</div>
          </div>
          <div>
            <div className="font-ui text-xs text-muted">Dommages</div>
            <div className="font-num text-2xl font-semibold">{dmArme(item, d, item.deuxMainsUse)}</div>
          </div>
        </Card>
      )}
      {item.notes && <p className="mb-3 text-[16px]">{item.notes}</p>}
      {item.dm2 && (
        <Segmented
          value={item.deuxMainsUse ? '2' : '1'}
          onChange={(v) => onChange({ deuxMainsUse: v === '2' })}
          options={[
            { value: '1', label: `Une main (${item.dm})` },
            { value: '2', label: `Deux mains (${item.dm2})` },
          ]}
        />
      )}
      <div className="mt-3 font-ui text-sm text-muted">Bonus magique</div>
      <Stepper value={item.magie || 0} min={0} max={5} format={(v) => `+${v}`} onChange={(v) => onChange({ magie: v })} />
      {(arme || item.categorie === 'armure') && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {arme && (
            <>
              <Chip active={item.qualiteAtt} onClick={() => onChange({ qualiteAtt: !item.qualiteAtt, qualiteDm: false })}>
                Qualité : +1 attaque
              </Chip>
              <Chip active={item.qualiteDm} onClick={() => onChange({ qualiteDm: !item.qualiteDm, qualiteAtt: false })}>
                Qualité : +1 DM
              </Chip>
              <Chip tone="blood" active={item.nonMaitrisee} onClick={() => onChange({ nonMaitrisee: !item.nonMaitrisee })}>
                Non maîtrisée (dé malus)
              </Chip>
            </>
          )}
          {item.categorie === 'armure' && (
            <Chip active={item.qualite} onClick={() => onChange({ qualite: !item.qualite })}>
              Qualité : malus d’armure -1
            </Chip>
          )}
        </div>
      )}
      <div className="mt-3 font-ui text-sm text-muted">Quantité</div>
      <Stepper value={item.qte || 1} min={1} max={999} onChange={(v) => onChange({ qte: v })} />
      <label className="mt-3 block font-ui text-sm text-muted">
        Notes
        <textarea value={item.notesPerso || ''} onChange={(e) => onChange({ notesPerso: e.target.value })} rows={2} className="mt-1 w-full rounded-xl bg-surface2 px-3 py-2 text-ink outline-none rune-border" placeholder="Enchantement, provenance…" />
      </label>
    </Sheet>
  );
}
