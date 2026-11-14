import { useMemo, useRef, useState } from 'react';
import { Search, Users, Download, Upload, Copy, Trash2, UserPlus, Check, Library } from 'lucide-react';
import { Card, SectionTitle, Btn, Chip, Badge, cx, Segmented, ConfirmBtn, useToast, Empty, ActionBadge } from '../components/ui.jsx';
import { peuples, profils, voies, etats, regles, EQUIPEMENT, peupleById, profilById, familles } from '../data/index.js';
import { CATEGORIES_EQUIPEMENT } from '../data/equipement.js';
import { useStore, exporterJSON } from '../lib/store.jsx';
import { origineVoie } from '../components/Details.jsx';
import { Hexa, IconeProfil, ICONES_CATEGORIE, ICONES_ETAT } from '../components/visuels.jsx';
import { Users as IcPeuple, Waypoints, Sparkle, ScrollText, AlertTriangle as IcEtat, Package as IcObjet } from 'lucide-react';

/** Pastille d'icône selon le type de résultat de l'encyclopédie. */
function IconeType({ x }) {
  let I = Sparkle;
  if (x.type === 'peuple') I = IcPeuple;
  else if (x.type === 'voie') I = Waypoints;
  else if (x.type === 'regle') I = ScrollText;
  else if (x.type === 'equipement') I = ICONES_CATEGORIE[x.ref.categorie] || IcObjet;
  else if (x.type === 'etat') I = ICONES_ETAT[x.ref.id] || IcEtat;
  const ton = x.type === 'etat' ? 'bg-blood/15 text-blood' : x.type === 'regle' ? 'bg-mana/15 text-mana' : 'bg-gold/15 text-gold';
  return (
    <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', ton)} aria-hidden="true">
      {x.type === 'profil' ? <IconeProfil id={x.ref.id} size={17} /> : <I size={17} />}
    </span>
  );
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ');

const TYPES = {
  peuple: 'Peuples',
  profil: 'Profils',
  voie: 'Voies',
  capacite: 'Capacités',
  equipement: 'Équipement',
  etat: 'États',
  regle: 'Règles',
};

function construireIndex() {
  const idx = [];
  for (const p of peuples) idx.push({ type: 'peuple', ref: p, titre: p.nom, sous: p.modificateurs, texte: p.description });
  for (const p of profils) idx.push({ type: 'profil', ref: p, titre: p.nom, sous: `${familles[p.famille].nom} · ${p.pvParNiveau} PV/niveau · DR d${p.de}`, texte: `${p.description} ${p.equipementDepart}` });
  for (const v of voies) {
    idx.push({ type: 'voie', ref: v, titre: v.nom, sous: origineVoie(v), texte: `${v.intro || ''} ${v.capacites.map((c) => c.nom).join(' ')}` });
    for (const c of v.capacites) idx.push({ type: 'capacite', ref: c, titre: c.nom, sous: `${v.nom} · rang ${c.rang}`, texte: c.description, cap: c });
  }
  for (const e of EQUIPEMENT) idx.push({ type: 'equipement', ref: e, titre: e.nom, sous: CATEGORIES_EQUIPEMENT[e.categorie], texte: `${e.dm || ''} ${e.notes || ''}` });
  for (const e of etats) idx.push({ type: 'etat', ref: e, titre: e.nom, sous: 'État préjudiciable', texte: e.description });
  for (const r of regles) idx.push({ type: 'regle', ref: r, titre: r.titre, sous: `${r.chapitre} · p. ${r.page}`, texte: r.texte });
  return idx.map((x) => ({ ...x, nt: norm(x.titre), nx: norm(`${x.titre} ${x.sous} ${x.texte}`) }));
}

export default function Grimoire({ details, onNouveau }) {
  const [vue, setVue] = useState('encyclo');
  return (
    <div className="pb-6">
      <div className="mt-3">
        <Segmented
          value={vue}
          onChange={setVue}
          options={[
            { value: 'encyclo', label: 'Encyclopédie' },
            { value: 'heros', label: 'Héros & sauvegardes' },
          ]}
        />
      </div>
      {vue === 'encyclo' ? <Encyclopedie details={details} /> : <Roster onNouveau={onNouveau} />}
    </div>
  );
}

function Encyclopedie({ details }) {
  const index = useMemo(construireIndex, []);
  const [q, setQ] = useState('');
  const [type, setType] = useState('tout');
  const [limite, setLimite] = useState(60);
  const resultats = useMemo(() => {
    const termes = norm(q).split(/\s+/).filter(Boolean);
    let r = index.filter((x) => type === 'tout' || x.type === type);
    if (termes.length) {
      r = r.filter((x) => termes.every((t) => x.nx.includes(t)));
      r = r
        .map((x) => ({ x, s: (termes.every((t) => x.nt.includes(t)) ? 0 : 1) + (x.nt.startsWith(termes[0]) ? -0.5 : 0) }))
        .sort((a, b) => a.s - b.s || a.x.titre.localeCompare(b.x.titre, 'fr'))
        .map((y) => y.x);
    }
    return r;
  }, [index, q, type]);

  const ouvrir = (x) => {
    if (x.type === 'peuple') details.peuple(x.ref);
    else if (x.type === 'profil') details.profil(x.ref);
    else if (x.type === 'voie') details.voie(x.ref);
    else if (x.type === 'capacite') details.cap(x.ref);
    else if (x.type === 'equipement') details.equip(x.ref);
    else if (x.type === 'etat') details.etat(x.ref);
    else if (x.type === 'regle') details.regle(x.ref);
  };

  return (
    <>
      <label className="sticky top-0 z-10 mt-3 flex items-center gap-2 rounded-xl bg-surface px-3 shadow-sm rune-border">
        <Search size={18} className="text-muted" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimite(60);
          }}
          placeholder="Rechercher dans les règles…"
          className="min-h-[48px] w-full bg-transparent outline-none"
          enterKeyHint="search"
          type="search"
        />
      </label>
      <div className="no-scrollbar -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <Chip active={type === 'tout'} onClick={() => setType('tout')}>
          Tout
        </Chip>
        {Object.entries(TYPES).map(([k, v]) => (
          <Chip key={k} active={type === k} onClick={() => setType(k)}>
            {v}
          </Chip>
        ))}
      </div>
      <div className="mt-2 px-1 font-ui text-xs text-muted">
        {resultats.length} résultat{resultats.length > 1 ? 's' : ''}
      </div>
      {!resultats.length && (
        <Empty icon={Library} title="Rien trouvé">
          Essayez un autre mot-clé.
        </Empty>
      )}
      <ul className="mt-1 divide-y divide-line overflow-hidden rounded-2xl bg-surface rune-border">
        {resultats.slice(0, limite).map((x, i) => (
          <li key={`${x.type}-${x.ref.id}-${i}`}>
            <button type="button" onClick={() => ouvrir(x)} className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left active:bg-surface2">
              <IconeType x={x} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{x.titre}</span>
                <span className="block truncate font-ui text-xs text-muted">{x.sous}</span>
              </span>
              {x.cap ? <ActionBadge action={x.cap.action} sort={x.cap.sort} /> : null}
              <Badge>{TYPES[x.type].replace(/s$/, '').replace('Capacité', 'Capa.')}</Badge>
            </button>
          </li>
        ))}
      </ul>
      {resultats.length > limite && (
        <Btn className="mt-2 w-full" onClick={() => setLimite((l) => l + 100)}>
          Afficher plus ({resultats.length - limite})
        </Btn>
      )}
    </>
  );
}

function Roster({ onNouveau }) {
  const { persos, actif, choisir, dupliquer, supprimer, importer, theme, setTheme, saveOk } = useStore();
  const toast = useToast();
  const fileRef = useRef(null);
  const date = new Date().toISOString().slice(0, 10);
  const slug = (s) =>
    norm(s)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'heros';

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const n = importer(data);
      toast(`${n} personnage${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''}.`);
    } catch (err) {
      toast(`Import impossible : ${err.message || 'fichier invalide'}`);
    }
  };

  return (
    <>
      <SectionTitle>Thème</SectionTitle>
      <Segmented
        value={theme}
        onChange={setTheme}
        options={[
          { value: 'dark', label: 'Veillée (nuit)' },
          { value: 'light', label: 'Grimoire (livre)' },
        ]}
      />

      <SectionTitle right={<span className={cx('font-ui text-xs', saveOk ? 'text-leaf' : 'text-blood')}>{saveOk ? 'Sauvegarde auto. ✓' : 'Stockage indisponible !'}</span>}>Mes héros</SectionTitle>
      <Btn variant="primary" className="w-full" onClick={onNouveau}>
        <UserPlus size={18} /> Créer un personnage
      </Btn>
      {!persos.length && (
        <Empty icon={Users} title="Aucun héros">
          Créez votre premier personnage ou importez une sauvegarde.
        </Empty>
      )}
      <div className="mt-3 space-y-2">
        {persos.map((p) => {
          const on = actif?.id === p.id;
          return (
            <Card key={p.id} className={cx('p-3', on && 'border-gold')}>
              <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => choisir(p.id)}>
                <Hexa taille={44} plein={on}>
                  {p.niveau}
                </Hexa>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[18px]">{p.nom}</span>
                  <span className="block truncate font-ui text-xs text-muted">
                    {peupleById[p.peupleId]?.nom} · {profilById[p.profilId]?.nom} · niveau {p.niveau}
                  </span>
                </span>
                {on && <Check size={20} className="text-gold" />}
              </button>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <Btn small onClick={() => exporterJSON(`co2-${slug(p.nom)}-${date}.json`, p)}>
                  <Download size={15} /> JSON
                </Btn>
                <Btn small onClick={() => dupliquer(p.id)}>
                  <Copy size={15} /> Copier
                </Btn>
                <ConfirmBtn small confirmLabel="Supprimer ?" onConfirm={() => supprimer(p.id)}>
                  <Trash2 size={15} /> Suppr.
                </ConfirmBtn>
              </div>
            </Card>
          );
        })}
      </div>

      <SectionTitle>Sauvegardes</SectionTitle>
      <Card className="p-3">
        <p className="mb-3 text-[15px] text-muted">Tout est enregistré automatiquement sur cet appareil. Exportez un fichier JSON pour sauvegarder ou transférer vos héros entre iPhone, Android et ordinateur.</p>
        <div className="grid grid-cols-1 gap-2">
          <Btn variant="primary" disabled={!persos.length} onClick={() => exporterJSON(`co2-tous-les-heros-${date}.json`, { format: 'co2-compagnon', version: 1, exporteLe: new Date().toISOString(), personnages: persos })}>
            <Download size={18} /> Exporter tous les héros (JSON)
          </Btn>
          <Btn variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload size={18} /> Importer (JSON)
          </Btn>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
        </div>
      </Card>
      <p className="mt-4 px-1 font-ui text-xs text-muted">
        Données de règles : {peuples.length} peuples · {profils.length} profils · {voies.length} voies · {voies.reduce((n, v) => n + v.capacites.length, 0)} capacités · {etats.length} états · {regles.length} sections de règles, issues de <i>Chroniques Oubliées Fantasy</i> (© Black Book Éditions).
      </p>
    </>
  );
}

