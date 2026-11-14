import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Wand2, BookOpen, Info, Coins } from 'lucide-react';
import { Sheet, Btn, Chip, Card, Badge, cx, Stepper, SectionTitle } from './ui.jsx';
import { peuples, profils, peupleById, profilById, voieById, familles, CARACS, CARAC_NOMS, equipById } from '../data/index.js';
import { SERIES, deriver, fmt } from '../lib/rules.js';
import { SAC_AVENTURIER } from '../data/equipement.js';
import { personnageVide } from '../lib/store.jsx';
import { IDEAUX, TRAVERS } from '../data/personnalite.js';
import TraitSelect from './TraitSelect.jsx';
import { ICONES_FAMILLE, ICONES_CARAC, IconeProfil } from './visuels.jsx';
import { itemDepuisCatalogue } from '../tabs/Equipement.jsx';

const ETAPES = ['Identité', 'Profil', 'Caractéristiques', 'Voies', 'Finalisation'];

// Correspondances texte d'équipement de départ -> catalogue
const ALIAS = [
  [/armure de cuir renforcé|cuir renforcé/, 'cuir-renforce'],
  [/armure de cuir(?! renforcé)/, 'cuir-simple'],
  [/chemise de mailles/, 'chemise-de-mailles'],
  [/cotte de mailles/, 'cotte-de-mailles'],
  [/grand bouclier/, 'grand-bouclier'],
  [/petit bouclier/, 'petit-bouclier'],
  [/outils de crochetage/, 'outils-crochetage'],
  [/arc court/, 'arc-court'],
  [/javelots?/, 'javelot'],
  [/bâton ferré/, 'baton-ferre'],
  [/bâton noueux|bâton \(/, 'baton'],
  [/lance de cavalerie/, 'lance-de-cavalerie'],
  [/hache à deux mains/, 'hache-a-deux-mains'],
  [/épée longue/, 'epee-longue'],
  [/rapière/, 'rapiere'],
  [/pétoire/, 'petoire'],
  [/\bdagues?\b/, 'dague'],
  [/marteau/, 'marteau'],
  [/\bmasse\b/, 'masse'],
  [/épieu/, 'epieu'],
  [/hachette/, 'hachette'],
];

function equipementDepart(profil) {
  const t = (profil?.equipementDepart || '').toLowerCase();
  const ids = [];
  for (const [re, id] of ALIAS) if (re.test(t) && !ids.includes(id)) ids.push(id);
  return ids;
}

export default function Creation({ open, onClose, onCreate }) {
  const [etape, setEtape] = useState(0);
  const [nom, setNom] = useState('');
  const [peupleId, setPeupleId] = useState('humain');
  const [voiePeupleDE, setVoiePeupleDE] = useState('voie-de-l-humain');
  const [profilId, setProfilId] = useState('guerrier');
  const [serie, setSerie] = useState('expert');
  const [assign, setAssign] = useState({}); // carac -> index dans la série
  const [libre, setLibre] = useState(Object.fromEntries(CARACS.map((k) => [k, 0])));
  const [sel, setSel] = useState(null);
  const [plus, setPlus] = useState(null);
  const [moins, setMoins] = useState(null);
  const [voiesChoisies, setVoiesChoisies] = useState([]);
  const [voieDuMage, setVoieDuMage] = useState(false);
  const [rang2Mage, setRang2Mage] = useState(null);
  const [equip, setEquip] = useState(null);
  const [sac, setSac] = useState(true);
  const [bourse, setBourse] = useState(7);
  const [ideal, setIdeal] = useState('');
  const [travers, setTravers] = useState('');

  const peuple = peupleById[peupleId];
  const profil = profilById[profilId];
  const famille = profil?.famille;
  const valeurs = serie === 'libre' ? null : SERIES[serie].valeurs;

  const base = useMemo(() => {
    if (serie === 'libre') return { ...libre };
    const o = Object.fromEntries(CARACS.map((k) => [k, null]));
    for (const [k, i] of Object.entries(assign)) o[k] = valeurs[i];
    return o;
  }, [serie, libre, assign, valeurs]);
  const complet = CARACS.every((k) => base[k] !== null && base[k] !== undefined);

  // options de modificateurs de peuple
  const plusOptions = peuple.mods.plus[0] === '*faibles' ? (complet ? deuxPlusFaibles(base) : CARACS) : peuple.mods.plus;
  const moinsOptions = peuple.mods.moins;
  const plusEff = plusOptions.includes(plus) ? plus : plusOptions.length === 1 ? plusOptions[0] : null;
  const moinsEff = moinsOptions.includes(moins) ? moins : moinsOptions.length === 1 ? moinsOptions[0] : null;
  const final = useMemo(() => {
    const o = {};
    for (const k of CARACS) o[k] = (base[k] ?? 0) + (k === plusEff ? 1 : 0) - (k === moinsEff ? 1 : 0);
    return o;
  }, [base, plusEff, moinsEff]);

  const voiePeuple = peupleId === 'demi-elfe' ? voiePeupleDE : peuple.voies[0];

  const brouillon = useMemo(() => {
    const voies = {};
    if (voiePeuple) voies[voiePeuple] = 1;
    for (const id of voiesChoisies) voies[id] = 1;
    if (famille === 'mages' && voieDuMage) voies['voie-du-mage'] = 1;
    if (famille === 'mages' && rang2Mage) voies[rang2Mage] = 2;
    const eqIds = equip ?? equipementDepart(profil);
    const inventaire = [...eqIds.map((id) => equipById[id]).filter(Boolean), ...(sac ? SAC_AVENTURIER.map((id) => equipById[id]) : [])].map((r) => itemDepuisCatalogue(r));
    // équipe la meilleure armure / le bouclier de départ et les armes
    const armures = inventaire.filter((i) => i.categorie === 'armure').sort((a, b) => b.def - a.def);
    if (armures[0]) armures[0].equipe = true;
    const bouclier = inventaire.find((i) => i.categorie === 'bouclier');
    if (bouclier && profil?.bouclier) bouclier.equipe = true;
    inventaire.filter((i) => i.categorie === 'contact').slice(0, 1).forEach((i) => (i.equipe = true));
    return personnageVide({
      nom: nom.trim() || 'Héros sans nom',
      peupleId,
      profilId,
      voiePeuple,
      voieDuMage: famille === 'mages' && voieDuMage,
      carac: final,
      voies,
      inventaire,
      bourse: { pp: 0, po: 0, pa: bourse, pc: 0 },
      ideal,
      travers,
      pv: { actuel: null, temp: 0 },
    });
  }, [nom, peupleId, profilId, voiePeuple, voiesChoisies, famille, voieDuMage, rang2Mage, final, equip, sac, bourse, ideal, travers, profil]);
  const apercu = useMemo(() => deriver(brouillon), [brouillon]);

  const reset = () => {
    setEtape(0);
    setNom('');
    setAssign({});
    setVoiesChoisies([]);
    setRang2Mage(null);
    setVoieDuMage(false);
    setEquip(null);
    setBourse(7);
    setPlus(null);
    setMoins(null);
    setIdeal('');
    setTravers('');
  };

  const peutSuivre = [
    !!peupleId && (peupleId !== 'demi-elfe' || !!voiePeupleDE),
    !!profilId,
    complet && (plusOptions.length <= 1 || !!plusEff) && (moinsOptions.length <= 1 || !!moinsEff),
    voiesChoisies.length === 2 && (famille !== 'mages' || !!rang2Mage),
    true,
  ][etape];

  const methodeRapide = () => {
    // Méthode rapide (p. 28) : série expert, trois meilleures valeurs dans les caractéristiques du profil
    setSerie('expert');
    const prio = profil.caracteristiques.map((c) => c.split('|')[0]);
    const reste = CARACS.filter((k) => !prio.includes(k));
    const a = {};
    prio.forEach((k, i) => (a[k] = i)); // +3, +2, +1
    a[reste[0]] = 3; // +1
    a[reste[1]] = 4; // 0
    a[reste[2]] = 5; // 0
    a[reste[3]] = 6; // -1
    setAssign(a);
    setSel(null);
  };

  const assigner = (k, i) => {
    setAssign((a) => {
      const n = { ...a };
      const deja = Object.entries(n).find(([, v]) => v === i);
      if (deja) {
        if (n[k] !== undefined) n[deja[0]] = n[k];
        else delete n[deja[0]];
      }
      n[k] = i;
      return n;
    });
    setSel(null);
  };

  const fermer = () => {
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={fermer}
      title={`Nouveau héros — ${ETAPES[etape]}`}
      tall
      footer={
        <div className="flex gap-2">
          <Btn className="w-28" disabled={etape === 0} onClick={() => setEtape((e) => e - 1)}>
            <ChevronLeft size={18} /> Retour
          </Btn>
          {etape < ETAPES.length - 1 ? (
            <Btn variant="primary" className="flex-1" disabled={!peutSuivre} onClick={() => setEtape((e) => e + 1)}>
              Suivant <ChevronRight size={18} />
            </Btn>
          ) : (
            <Btn
              variant="primary"
              className="flex-1"
              onClick={() => {
                onCreate(brouillon);
                reset();
              }}
            >
              <Check size={18} /> Créer {nom.trim() || 'le héros'}
            </Btn>
          )}
        </div>
      }
    >
      <div className="mb-4 flex gap-1">
        {ETAPES.map((e, i) => (
          <div key={e} className={cx('h-1.5 flex-1 rounded-full', i <= etape ? 'bg-gold' : 'bg-line')} />
        ))}
      </div>

      {etape === 0 && (
        <>
          <label className="block font-ui text-sm text-muted">
            Nom du personnage
            <input value={nom} onChange={(e) => setNom(e.target.value)} className="mt-1 w-full rounded-xl bg-surface2 px-3 py-3 font-display text-lg text-ink outline-none rune-border" placeholder="ex. Lhagva, fille de Nuala" />
          </label>
          <SectionTitle>Peuple</SectionTitle>
          <div className="space-y-2">
            {peuples.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeupleId(p.id);
                  setPlus(null);
                  setMoins(null);
                }}
                className={cx('w-full rounded-xl p-3 text-left rune-border', peupleId === p.id ? 'bg-gold/15 border-gold' : 'bg-surface')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-[18px]">{p.nom}</span>
                  {peupleId === p.id && <Check size={18} className="text-gold" />}
                </div>
                <div className="font-ui text-xs text-muted">{p.modificateurs}</div>
                <div className="mt-1 line-clamp-2 text-[15px]">{p.description.split('\n')[0]}</div>
              </button>
            ))}
          </div>
          {peupleId === 'demi-elfe' && (
            <Card className="mt-3 p-3">
              <p className="mb-2 text-[15px]">{peuple.noteVoie}</p>
              <div className="flex flex-wrap gap-2">
                {peuple.voies.map((id) => (
                  <Chip key={id} active={voiePeupleDE === id} onClick={() => setVoiePeupleDE(id)}>
                    {voieById[id]?.nom}
                  </Chip>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {etape === 1 &&
        Object.entries(familles).map(([fid, fam]) => (
          <div key={fid}>
            <SectionTitle icon={ICONES_FAMILLE[fid]}>
              {fam.nom} <span className="font-num text-[13px] text-muted">· {fam.pv} PV · d{fam.dr}</span>
            </SectionTitle>
            {fam.bonus && <p className="-mt-1 mb-2 px-1 font-ui text-xs text-muted">Bonus de famille : {fam.bonus}</p>}
            <div className="grid grid-cols-2 gap-2">
              {profils
                .filter((p) => p.famille === fid)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProfilId(p.id);
                      setVoiesChoisies([]);
                      setRang2Mage(null);
                      setEquip(null);
                    }}
                    className={cx('flex items-start gap-2.5 rounded-xl p-3 text-left rune-border', profilId === p.id ? 'bg-gold/15 border-gold' : 'bg-surface')}
                  >
                    <IconeProfil id={p.id} size={20} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
                    <span className="min-w-0">
                    <div className="font-display text-[17px] leading-tight">{p.nom}</div>
                    <div className="font-ui text-[11px] text-muted">[{p.caracteristiques.join(', ').replace('|', '/')}]</div>
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ))}

      {etape === 2 && (
        <>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SERIES).map(([k, s]) => (
              <Chip
                key={k}
                active={serie === k}
                onClick={() => {
                  setSerie(k);
                  setAssign({});
                }}
              >
                {s.nom}
              </Chip>
            ))}
            <Chip active={serie === 'libre'} onClick={() => setSerie('libre')}>
              Libre
            </Chip>
          </div>
          {serie !== 'libre' && (
            <>
              <p className="mt-2 font-ui text-sm text-muted">
                Touchez une caractéristique, puis une valeur. Profil {profil.nom} : [{profil.caracteristiques.join(', ').replace('|', ' ou ')}].
              </p>
              <Btn small variant="outline" className="mt-2 w-full" onClick={methodeRapide}>
                <Wand2 size={16} /> Méthode rapide pour débutants (p. 28)
              </Btn>
              <div className="mt-3 flex flex-wrap gap-2">
                {valeurs.map((v, i) => {
                  const pris = Object.values(assign).includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!sel}
                      onClick={() => sel && assigner(sel, i)}
                      className={cx('h-11 w-12 rounded-xl font-num text-lg font-semibold rune-border disabled:opacity-60', pris ? 'bg-surface2 text-muted line-through' : 'bg-gold/20 text-gold')}
                    >
                      {fmt(v)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <div className="mt-3 space-y-1.5">
            {CARACS.map((k) => {
              const imp = profil.caracteristiques.some((c) => c.split('|').includes(k));
              return (
                <div key={k} className={cx('flex items-center gap-2 rounded-xl px-3 py-1.5 rune-border', sel === k ? 'bg-gold/15 border-gold' : 'bg-surface')}>
                  <button type="button" className="flex min-h-[44px] flex-1 items-center gap-2 text-left" onClick={() => serie !== 'libre' && setSel(sel === k ? null : k)}>
                    {(() => {
                      const I = ICONES_CARAC[k];
                      return <I size={16} className="shrink-0 text-gold" aria-hidden="true" />;
                    })()}
                    <span className="w-9 font-caps font-semibold text-gold">{k}</span>
                    <span className="flex-1 font-ui text-sm">
                      {CARAC_NOMS[k]} {imp && <Badge tone="gold">profil</Badge>}
                    </span>
                  </button>
                  {serie === 'libre' ? (
                    <Stepper label={CARAC_NOMS[k]} value={libre[k]} min={-3} max={5} format={fmt} onChange={(v) => setLibre((l) => ({ ...l, [k]: v }))} className="w-40" />
                  ) : (
                    <span className="w-10 text-right font-num text-xl font-semibold">{base[k] === null || base[k] === undefined ? '—' : fmt(base[k])}</span>
                  )}
                  <span className="w-12 text-right font-num text-xl font-semibold text-goldsoft">{complet ? fmt(final[k]) : ''}</span>
                </div>
              );
            })}
          </div>
          <SectionTitle>Modificateurs de peuple — {peuple.nom}</SectionTitle>
          <p className="mb-2 px-1 font-ui text-sm text-muted">{peuple.modificateurs}</p>
          {plusOptions.length > 1 && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="w-8 font-ui font-bold text-leaf">+1</span>
              {plusOptions.map((k) => (
                <Chip key={k} active={plusEff === k} onClick={() => setPlus(k)}>
                  {k}
                </Chip>
              ))}
            </div>
          )}
          {moinsOptions.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-8 font-ui font-bold text-blood">-1</span>
              {moinsOptions.map((k) => (
                <Chip key={k} tone="blood" active={moinsEff === k} onClick={() => setMoins(k)}>
                  {k}
                </Chip>
              ))}
            </div>
          )}
          {peuple.mods.plus[0] === '*faibles' && !complet && <p className="font-ui text-xs text-muted">Attribuez toutes les valeurs pour choisir parmi vos deux caractéristiques les plus faibles.</p>}
        </>
      )}

      {etape === 3 && (
        <>
          <Card className="mb-3 flex gap-2 p-3 font-ui text-sm">
            <Info size={16} className="mt-0.5 shrink-0 text-gold" />
            <span>Choisissez deux voies de profil (rang 1). La voie de peuple ({voieById[voiePeuple]?.nom}) est acquise gratuitement au rang 1.</span>
          </Card>
          <div className="space-y-2">
            {profil.voies.map((id) => {
              const v = voieById[id];
              const on = voiesChoisies.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setVoiesChoisies((l) => (on ? l.filter((x) => x !== id) : l.length < 2 ? [...l, id] : [l[1], id]));
                    if (on && rang2Mage === id) setRang2Mage(null);
                  }}
                  className={cx('w-full rounded-xl p-3 text-left rune-border', on ? 'bg-gold/15 border-gold' : 'bg-surface')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-[17px]">{v.nom}</span>
                    {on && <Check size={18} className="text-gold" />}
                  </div>
                  <div className="font-ui text-sm">
                    1. {v.capacites[0].nom} {v.capacites[0].sort ? '✦' : ''}
                  </div>
                  <div className="mt-1 line-clamp-2 text-[14px] text-muted">{v.capacites[0].description}</div>
                </button>
              );
            })}
          </div>
          {famille === 'mages' && (
            <>
              <SectionTitle>Spécificités des mages</SectionTitle>
              <Card className="p-3">
                <div className="font-display text-[17px]">Voie du mage</div>
                <p className="text-[15px] text-muted">Remplace la voie de peuple : vous gardez seulement son rang 1, en plus du rang 1 de la voie du mage (p. 29).</p>
                <div className="mt-2 flex gap-2">
                  <Chip
                    active={!voieDuMage}
                    onClick={() => {
                      setVoieDuMage(false);
                      if (rang2Mage === 'voie-du-mage') setRang2Mage(null);
                    }}
                  >
                    Garder la voie de peuple
                  </Chip>
                  <Chip active={voieDuMage} onClick={() => setVoieDuMage(true)}>
                    Voie du mage
                  </Chip>
                </div>
              </Card>
              <Card className="mt-2 p-3">
                <div className="font-display text-[17px]">Capacité de rang 2 supplémentaire</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[...voiesChoisies, ...(voieDuMage ? ['voie-du-mage'] : [])].map((id) => (
                    <Chip key={id} active={rang2Mage === id} onClick={() => setRang2Mage(id)}>
                      {voieById[id].capacites[1].nom} {voieById[id].capacites[1].sort ? '✦' : ''}
                    </Chip>
                  ))}
                  {!voiesChoisies.length && <span className="font-ui text-sm text-muted">Choisissez d’abord vos voies.</span>}
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {etape === 4 && (
        <>
          <Card className="grid grid-cols-3 gap-2 p-3 text-center">
            {[
              ['PV', apercu.pvMax],
              ['DEF', apercu.def],
              ['Init.', apercu.init],
              ['DR', `${apercu.drMax}d${apercu.drDe}`],
              ['PC', apercu.pcMax],
              ['PM', apercu.pmMax],
              ['Contact', fmt(apercu.attaques.contact)],
              ['Distance', fmt(apercu.attaques.distance)],
              ['Magique', fmt(apercu.attaques.magique)],
            ].map(([l, v]) => (
              <div key={l}>
                <div className="font-ui text-[11px] uppercase text-muted">{l}</div>
                <div className="font-num text-xl font-semibold">{v}</div>
              </div>
            ))}
          </Card>
          <p className="mt-1 px-1 font-ui text-xs text-muted">Bonus permanents des capacités appliqués automatiquement quand ils sont détectés ; vous pourrez les ajuster dans l’onglet Voies.</p>

          <SectionTitle>Équipement de départ</SectionTitle>
          <p className="mb-2 text-[15px] text-muted">{profil.equipementDepart}</p>
          <div className="flex flex-wrap gap-2">
            {equipementDepart(profil).map((id) => {
              const e = equipById[id];
              const ids = equip ?? equipementDepart(profil);
              const on = ids.includes(id);
              return (
                <Chip key={id} active={on} onClick={() => setEquip(on ? ids.filter((x) => x !== id) : [...ids, id])}>
                  {e.nom}
                </Chip>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip active={sac} onClick={() => setSac((x) => !x)} className="max-w-full !rounded-2xl py-2 text-left">
              Sac d’aventurier (couverture, torche, briquet, outre, gamelle)
            </Chip>
          </div>
          <div className="mt-3 flex items-center gap-2 font-ui text-sm text-muted">
            <Coins size={16} className="text-gold" /> Bourse de départ (2d6 pa, p. 31) — saisissez votre jet
          </div>
          <Stepper value={bourse} min={0} max={999} format={(v) => `${v} pa`} onChange={setBourse} />

          <SectionTitle>Touche finale (p. 33)</SectionTitle>
          <div className="space-y-3">
            <TraitSelect label="Idéal héroïque" options={IDEAUX} value={ideal} onChange={setIdeal} />
            <TraitSelect label="Travers" options={TRAVERS} value={travers} onChange={setTravers} />
          </div>
          <p className="mt-3 flex items-center gap-1.5 px-1 font-ui text-xs text-muted">
            <BookOpen size={14} /> Langues, historique et notes : modifiables ensuite depuis la fiche.
          </p>
        </>
      )}
    </Sheet>
  );
}

function deuxPlusFaibles(base) {
  const tri = [...CARACS].sort((a, b) => base[a] - base[b]);
  const seuil = base[tri[1]];
  return CARACS.filter((k) => base[k] <= seuil);
}
