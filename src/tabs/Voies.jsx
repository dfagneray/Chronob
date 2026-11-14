import { useMemo, useState } from 'react';
import { ChevronDown, RotateCcw, Settings2, BookOpen, Plus, Trash2, Search, CircleCheck, CircleOff, Users, Crown, Sparkle } from 'lucide-react';
import { Card, SectionTitle, Btn, ActionBadge, Badge, Sheet, Stepper, Empty, cx, Segmented, ConfirmBtn } from '../components/ui.jsx';
import { voies as VOIES, profilById } from '../data/index.js';
import { voiesPossedees, capaciteSuivie, frequence, premierRang } from '../lib/rules.js';
import { origineVoie } from '../components/Details.jsx';
import { Hexa, VoieTrace } from '../components/visuels.jsx';

const FREQ = { combat: '1/combat', jour: '1/jour' };

export default function Voies({ char, maj, details }) {
  const [ouvertes, setOuvertes] = useState(() => new Set(Object.keys(char.voies || {})));
  const [filtre, setFiltre] = useState('toutes');
  const [gerer, setGerer] = useState(false);
  const possedees = voiesPossedees(char);
  const groupes = [
    { titre: 'Voie de peuple', icon: Users, liste: possedees.filter((x) => x.voie.type === 'peuple' || x.voie.type === 'mage') },
    { titre: 'Voies de profil', icon: Sparkle, liste: possedees.filter((x) => x.voie.type === 'profil') },
    { titre: 'Voie de prestige', icon: Crown, liste: possedees.filter((x) => x.voie.type === 'prestige') },
  ].filter((g) => g.liste.length);

  const toggleUse = (cap) => maj((c) => ({ ...c, utilise: { ...(c.utilise || {}), [cap.id]: !c.utilise?.[cap.id] } }));
  const nbUtilisees = Object.values(char.utilise || {}).filter(Boolean).length;

  return (
    <div className="pb-6">
      <div className="mt-3 flex gap-2">
        <div className="flex-1">
          <Segmented
            value={filtre}
            onChange={setFiltre}
            options={[
              { value: 'toutes', label: 'Toutes' },
              { value: 'combat', label: 'À suivre en combat' },
            ]}
          />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Btn small onClick={() => setGerer(true)}>
          <Settings2 size={16} /> Gérer les voies
        </Btn>
        <Btn small disabled={!nbUtilisees} onClick={() => maj((c) => ({ ...c, utilise: {} }), { titre: 'Toutes les capacités rechargées' })}>
          <RotateCcw size={16} /> Tout recharger {nbUtilisees ? `(${nbUtilisees})` : ''}
        </Btn>
      </div>

      {!possedees.length && (
        <Empty icon={BookOpen} title="Aucune voie">
          Ajoutez les voies de votre personnage avec « Gérer les voies » ou créez un personnage depuis le Grimoire.
        </Empty>
      )}

      {groupes.map((g) => (
        <div key={g.titre}>
          <SectionTitle icon={g.icon}>{g.titre}</SectionTitle>
          <div className="space-y-2.5">
            {g.liste.map(({ voie, rang }) => {
              const open = ouvertes.has(voie.id);
              const caps = voie.capacites.filter((c) => (filtre === 'combat' ? c.rang <= rang && (capaciteSuivie(c) || c.action) : true));
              if (filtre === 'combat' && !caps.length) return null;
              return (
                <Card key={voie.id} className="overflow-hidden">
                  <button
                    type="button"
                    className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left active:bg-surface2"
                    onClick={() =>
                      setOuvertes((s) => {
                        const n = new Set(s);
                        n.has(voie.id) ? n.delete(voie.id) : n.add(voie.id);
                        return n;
                      })
                    }
                    aria-expanded={open}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate font-display text-[17px] leading-tight">{voie.nom}</span>
                        <span className="shrink-0 font-num text-xs text-gold">rang {rang}</span>
                      </div>
                      <div className="truncate font-ui text-xs text-muted">{origineVoie(voie)}</div>
                      <VoieTrace voie={voie} rang={rang} className="mt-1.5" />
                    </div>
                    <ChevronDown size={18} className={cx('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
                  </button>
                  {open && (
                    <ul className="divide-y divide-line border-t border-line">
                      {caps.map((c) => {
                        const acquise = c.rang <= rang;
                        const suivie = acquise && capaciteSuivie(c);
                        const used = char.utilise?.[c.id];
                        return (
                          <li key={c.id} className={cx('flex items-stretch', !acquise && 'opacity-45')}>
                            <button type="button" onClick={() => details.cap(c)} className="flex min-h-[56px] min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left active:bg-surface2">
                              <Hexa taille={30} plein={acquise} petit>
                                {c.rang}
                              </Hexa>
                              <span className="min-w-0 flex-1">
                                <span className={cx('block font-semibold leading-tight', used && 'line-through decoration-blood/70')}>{c.nom}</span>
                                {acquise && char.choix?.[c.id] && <span className="block truncate font-ui text-xs text-gold">{char.choix[c.id]}</span>}
                                <span className="mt-0.5 flex flex-wrap gap-1">
                                  <ActionBadge action={c.action} sort={c.sort} />
                                  {frequence(c) && <Badge tone="blood">{FREQ[frequence(c)]}</Badge>}
                                  {!acquise && <Badge>à venir</Badge>}
                                </span>
                              </span>
                            </button>
                            {suivie && (
                              <button
                                type="button"
                                onClick={() => toggleUse(c)}
                                className={cx('my-1.5 mr-2 flex min-h-[44px] w-[84px] shrink-0 flex-col items-center justify-center rounded-xl font-ui text-[11px] font-bold uppercase tracking-wide rune-border', used ? 'bg-blood/15 text-blood' : 'bg-leaf/15 text-leaf')}
                                aria-pressed={!!used}
                              >
                                {used ? <CircleOff size={15} aria-hidden="true" /> : <CircleCheck size={15} aria-hidden="true" />}
                                {used ? 'Utilisée' : 'Prête'}
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <GererVoies open={gerer} onClose={() => setGerer(false)} char={char} maj={maj} details={details} />
    </div>
  );
}

export function RangDots({ voie, rang }) {
  return (
    <div className="flex shrink-0 gap-1" aria-label={`Rang ${rang}`}>
      {voie.capacites.map((c) => (
        <span key={c.rang} className={cx('h-2.5 w-2.5 rounded-full', c.rang <= rang ? 'bg-gold' : 'bg-line')} />
      ))}
    </div>
  );
}

/** Édition libre des voies (création manuelle, import d'une fiche papier, changement d'orientation). */
function GererVoies({ open, onClose, char, maj, details }) {
  const [q, setQ] = useState('');
  const [ajout, setAjout] = useState(false);
  const possedees = voiesPossedees(char);
  const setRang = (id, r) =>
    maj((c) => {
      const voies = { ...c.voies };
      if (r <= 0) delete voies[id];
      else voies[id] = r;
      return { ...c, voies };
    });
  const resultats = useMemo(() => {
    const t = q.trim().toLowerCase();
    return VOIES.filter((v) => !char.voies?.[v.id]).filter((v) => !t || v.nom.toLowerCase().includes(t) || origineVoie(v).toLowerCase().includes(t));
  }, [q, char.voies]);
  return (
    <Sheet open={open} onClose={onClose} title="Gérer les voies" tall>
      <p className="mb-3 text-[15px] text-muted">
        Ajustez librement les rangs (fiche existante, changement d’orientation, décision du MJ). Pour une progression guidée et vérifiée, utilisez le Planificateur.
      </p>
      <div className="space-y-2">
        {possedees.map(({ voie, rang }) => (
          <Card key={voie.id} className="p-3">
            <div className="flex items-center gap-2">
              <button type="button" className="min-h-[44px] min-w-0 flex-1 text-left" onClick={() => details.voie(voie)}>
                <div className="truncate font-display text-[16px]">{voie.nom}</div>
                <div className="truncate font-ui text-xs text-muted">{origineVoie(voie)}</div>
              </button>
              <ConfirmBtn small variant="ghost" className="min-w-[44px]" aria-label={`Retirer ${voie.nom}`} confirmLabel="Retirer ?" onConfirm={() => setRang(voie.id, 0)}>
                <Trash2 size={16} />
              </ConfirmBtn>
            </div>
            <Stepper value={rang} min={premierRang(voie)} max={voie.capacites[voie.capacites.length - 1].rang} format={(v) => `Rang ${v}`} onChange={(r) => setRang(voie.id, r)} className="mt-2" />
          </Card>
        ))}
      </div>
      <Btn variant="outline" className="mt-3 w-full" onClick={() => setAjout((x) => !x)}>
        <Plus size={18} /> Ajouter une voie
      </Btn>
      {ajout && (
        <div className="mt-3">
          <label className="flex items-center gap-2 rounded-xl bg-surface2 px-3 rune-border">
            <Search size={16} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une voie, un profil…" className="min-h-[44px] w-full bg-transparent outline-none" />
          </label>
          <ul className="mt-2 divide-y divide-line rounded-xl bg-surface rune-border">
            {resultats.slice(0, 60).map((v) => (
              <li key={v.id}>
                <button type="button" onClick={() => setRang(v.id, premierRang(v))} className="flex min-h-[52px] w-full items-center gap-2 px-3 py-2 text-left active:bg-surface2">
                  <Plus size={16} className="shrink-0 text-gold" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{v.nom}</span>
                    <span className="block truncate font-ui text-xs text-muted">{origineVoie(v)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(profilById[char.profilId]?.famille === 'mages' || char.voieDuMage) && (
        <Card className="mt-4 p-3">
          <div className="font-display text-sm font-bold">Voie du mage</div>
          <p className="text-[15px] text-muted">Remplace la voie de peuple : seul son rang 1 est conservé (p. 60).</p>
          <Btn
            small
            className="mt-2 w-full"
            onClick={() =>
              maj((c) => {
                const voies = { ...c.voies };
                const on = !c.voieDuMage;
                if (on) {
                  if (c.voiePeuple && voies[c.voiePeuple]) voies[c.voiePeuple] = 1;
                  voies['voie-du-mage'] = voies['voie-du-mage'] || 1;
                } else delete voies['voie-du-mage'];
                return { ...c, voieDuMage: on, voies };
              })
            }
          >
            {char.voieDuMage ? 'Revenir à la voie de peuple' : 'Adopter la voie du mage'}
          </Btn>
        </Card>
      )}
    </Sheet>
  );
}

