import { useCallback, useMemo, useState, useEffect } from 'react';
import { User, BookMarked, TrendingUp, Backpack, Library, Sun, Moon, Users, UserPlus, History } from 'lucide-react';
import { useStore } from './lib/store.jsx';
import { deriver } from './lib/rules.js';
import { CapaciteSheet, VoieSheet, ProfilSheet, PeupleSheet, EquipSheet, EtatSheet, RegleSheet } from './components/Details.jsx';
import { Btn, cx, Sheet, Empty } from './components/ui.jsx';
import Personnage from './tabs/Personnage.jsx';
import Voies from './tabs/Voies.jsx';
import Planificateur from './tabs/Planificateur.jsx';
import Equipement from './tabs/Equipement.jsx';
import Grimoire from './tabs/Grimoire.jsx';
import Creation from './components/Creation.jsx';
import EditCharacter from './components/EditCharacter.jsx';
import Journal from './components/Journal.jsx';
import { peupleById, profilById } from './data/index.js';

const TABS = [
  { id: 'perso', label: 'Personnage', icon: User },
  { id: 'voies', label: 'Voies', icon: BookMarked },
  { id: 'plan', label: 'Progression', icon: TrendingUp },
  { id: 'equip', label: 'Équipement', icon: Backpack },
  { id: 'grimoire', label: 'Grimoire', icon: Library },
];

export default function App() {
  const store = useStore();
  const { actif, maj } = store;
  const [tab, setTab] = useState(() => {
    try {
      return sessionStorage.getItem('co2-onglet') || 'perso';
    } catch {
      return 'perso';
    }
  });
  const [creation, setCreation] = useState(false);
  const [edit, setEdit] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const [journal, setJournal] = useState(false);
  const [detail, setDetail] = useState(null); // { type, data }

  useEffect(() => {
    try {
      sessionStorage.setItem('co2-onglet', tab);
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0 });
  }, [tab]);

  const d = useMemo(() => (actif ? deriver(actif) : null), [actif]);

  const details = useMemo(
    () => ({
      cap: (data) => setDetail({ type: 'cap', data }),
      voie: (data) => setDetail({ type: 'voie', data }),
      profil: (data) => setDetail({ type: 'profil', data }),
      peuple: (data) => setDetail({ type: 'peuple', data }),
      equip: (data) => setDetail({ type: 'equip', data }),
      etat: (data) => setDetail({ type: 'etat', data }),
      regle: (data) => setDetail({ type: 'regle', data }),
    }),
    []
  );
  const fermerDetail = useCallback(() => setDetail(null), []);

  const toggleUse = (cap) => maj((c) => ({ ...c, utilise: { ...(c.utilise || {}), [cap.id]: !c.utilise?.[cap.id] } }));
  const toggleMod = (cap, i) =>
    maj((c) => {
      const k = `${cap.id}#${i}`;
      const cur = c.modsAppliques?.[k];
      const def = i === 'carac' ? true : !!cap.effets?.mods?.[i]?.auto;
      return { ...c, modsAppliques: { ...(c.modsAppliques || {}), [k]: !(cur ?? def) } };
    });

  const sansPerso = !actif;
  const ongletEffectif = sansPerso && tab !== 'grimoire' ? null : tab;

  return (
    <>
      <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col">
        {/* En-tête */}
        <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
          <div className="flex items-center gap-2 px-3 py-2">
            <button type="button" onClick={() => (actif ? setSwitcher(true) : setCreation(true))} className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 rounded-xl px-1 text-left active:bg-surface2" aria-label="Changer de personnage">
              <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full bg-gold text-bg">
                <span className="font-ui text-[9px] font-bold uppercase leading-none">Niv.</span>
                <span className="font-display text-lg font-bold leading-none">{actif?.niveau ?? '–'}</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-[17px] font-bold leading-tight text-goldsoft">{actif?.nom || 'Compagnon CO2'}</span>
                <span className="block truncate font-ui text-xs text-muted">{actif ? `${peupleById[actif.peupleId]?.nom || ''} · ${profilById[actif.profilId]?.nom || ''} · Niveau ${actif.niveau}` : 'Aucun personnage'}</span>
              </span>
            </button>
            {actif && (
              <button
                type="button"
                aria-label="Journal"
                aria-pressed={journal}
                onClick={() => setJournal((x) => !x)}
                className={cx('flex h-11 w-11 items-center justify-center rounded-xl active:bg-surface2', journal ? 'bg-gold/15 text-gold' : 'text-gold')}
              >
                <History size={20} />
              </button>
            )}
            <button
              type="button"
              aria-label={store.theme === 'dark' ? 'Passer au thème Parchemin' : 'Passer au thème Dark Fantasy'}
              onClick={() => store.setTheme(store.theme === 'dark' ? 'light' : 'dark')}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-gold active:bg-surface2"
            >
              {store.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 pb-[calc(84px+env(safe-area-inset-bottom,0px))]">
          {ongletEffectif === null && (
            <Empty icon={UserPlus} title="Bienvenue, aventurier !">
              <p>Créez votre premier héros pour commencer, ou importez une sauvegarde depuis le Grimoire.</p>
              <Btn variant="primary" className="mt-4" onClick={() => setCreation(true)}>
                <UserPlus size={18} /> Créer un personnage
              </Btn>
            </Empty>
          )}
          {actif && ongletEffectif === 'perso' && <Personnage char={actif} d={d} maj={maj} onEdit={() => setEdit(true)} />}
          {actif && ongletEffectif === 'voies' && <Voies char={actif} maj={maj} details={details} />}
          {actif && ongletEffectif === 'plan' && <Planificateur char={actif} maj={maj} details={details} />}
          {actif && ongletEffectif === 'equip' && <Equipement char={actif} d={d} maj={maj} />}
          {ongletEffectif === 'grimoire' && <Grimoire details={details} onNouveau={() => setCreation(true)} />}
        </main>

        {/* Barre de navigation inférieure */}
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur" aria-label="Navigation principale">
          <div className="mx-auto grid max-w-xl grid-cols-5">
            {TABS.map((t) => {
              const on = tab === t.id;
              return (
                <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cx('flex min-h-[60px] flex-col items-center justify-center gap-0.5 font-ui text-[10.5px] font-semibold', on ? 'text-gold' : 'text-muted')} aria-current={on ? 'page' : undefined}>
                  <t.icon size={22} strokeWidth={on ? 2.4 : 1.8} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Fiches de détail partagées */}
      <CapaciteSheet cap={detail?.type === 'cap' ? detail.data : null} open={detail?.type === 'cap'} onClose={fermerDetail} char={actif} onToggleUse={toggleUse} onToggleMod={toggleMod} onChoix={(cap, txt) => maj((c) => ({ ...c, choix: { ...(c.choix || {}), [cap.id]: txt } }))} onOpenVoie={details.voie} />
      <VoieSheet voie={detail?.type === 'voie' ? detail.data : null} open={detail?.type === 'voie'} onClose={fermerDetail} char={actif} onOpenCap={details.cap} />
      <ProfilSheet profil={detail?.type === 'profil' ? detail.data : null} open={detail?.type === 'profil'} onClose={fermerDetail} onOpenVoie={details.voie} />
      <PeupleSheet peuple={detail?.type === 'peuple' ? detail.data : null} open={detail?.type === 'peuple'} onClose={fermerDetail} onOpenVoie={details.voie} />
      <EquipSheet item={detail?.type === 'equip' ? detail.data : null} open={detail?.type === 'equip'} onClose={fermerDetail} />
      <EtatSheet etat={detail?.type === 'etat' ? detail.data : null} open={detail?.type === 'etat'} onClose={fermerDetail} />
      <RegleSheet regle={detail?.type === 'regle' ? detail.data : null} open={detail?.type === 'regle'} onClose={fermerDetail} />

      <Creation
        open={creation}
        onClose={() => setCreation(false)}
        onCreate={(c) => {
          store.ajouter(c);
          setCreation(false);
          setTab('perso');
        }}
      />
      {actif && <Journal open={journal} onClose={() => setJournal(false)} />}
      {actif && <EditCharacter open={edit} onClose={() => setEdit(false)} char={actif} maj={maj} d={d} />}

      <Sheet open={switcher} onClose={() => setSwitcher(false)} title="Mes héros">
        <div className="space-y-2">
          {store.persos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                store.choisir(p.id);
                setSwitcher(false);
              }}
              className={cx('flex min-h-[56px] w-full items-center gap-3 rounded-xl px-3 text-left rune-border', p.id === actif?.id ? 'border-gold bg-gold/15' : 'bg-surface')}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 font-display font-bold text-gold">{p.niveau}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display font-bold">{p.nom}</span>
                <span className="block truncate font-ui text-xs text-muted">
                  {peupleById[p.peupleId]?.nom} · {profilById[p.profilId]?.nom}
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Btn
            variant="primary"
            onClick={() => {
              setSwitcher(false);
              setCreation(true);
            }}
          >
            <UserPlus size={18} /> Nouveau
          </Btn>
          <Btn
            onClick={() => {
              setSwitcher(false);
              setTab('grimoire');
            }}
          >
            <Users size={18} /> Gérer / sauver
          </Btn>
        </div>
      </Sheet>
    </>
  );
}
