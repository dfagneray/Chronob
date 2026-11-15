import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { deriver } from './rules.js';
import { diffPerso, journaliser } from './journal.js';
import { CARACS } from '../data/index.js';

const KEY = 'co2-personnages';
const KEY_ACTIF = 'co2-actif';
const VERSION = 1;

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
export { uid };

function lire(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch {
    return def;
  }
}
function ecrire(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch {
    return false;
  }
}

export function personnageVide(partial = {}) {
  return {
    id: uid(),
    version: VERSION,
    nom: 'Nouveau héros',
    joueur: '',
    peupleId: 'humain',
    profilId: 'guerrier',
    niveau: 1,
    voiePeuple: 'voie-de-l-humain',
    voieDuMage: false,
    voieDomaine: null, // voie de domaine de prêtre (Compagnon), remplace la voie de peuple
    famille: null, // famille choisie quand le profil n'en impose pas (psionique)
    carac: Object.fromEntries(CARACS.map((k) => [k, 0])),
    voies: {},
    choix: {},
    modsAppliques: {},
    bonus: {},
    pv: { actuel: null, temp: 0 },
    dr: { actuel: null },
    pc: { actuel: null },
    pm: { actuel: null },
    pe: { actuel: null },
    ressources: [],
    etats: [],
    utilise: {},
    historique: [],
    demiPV: false,
    orphelins: {},
    inventaire: [],
    bourse: { pp: 0, po: 0, pa: 0, pc: 0 },
    notes: '',
    ideal: '',
    travers: '',
    plan: {},
    journal: [],
    creeLe: new Date().toISOString(),
    majLe: new Date().toISOString(),
    ...partial,
  };
}

/** Complète les compteurs vides (nouveau personnage, import) avec les maximums. */
export function normaliser(c) {
  const base = personnageVide();
  const char = { ...base, ...c, bourse: { ...base.bourse, ...(c.bourse || {}) }, carac: { ...base.carac, ...(c.carac || {}) } };
  const d = deriver(char);
  if (char.pv?.actuel == null) char.pv = { actuel: d.pvMax, temp: char.pv?.temp || 0 };
  if (char.dr?.actuel == null) char.dr = { actuel: d.drMax };
  if (char.pc?.actuel == null) char.pc = { actuel: d.pcMax };
  if (char.pm?.actuel == null) char.pm = { actuel: d.pmMax };
  if (char.pe?.actuel == null) char.pe = { actuel: d.peMax };
  return char;
}

function valider(c) {
  return c && typeof c === 'object' && typeof c.nom === 'string' && c.carac && typeof c.niveau === 'number';
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [persos, setPersos] = useState(() => lire(KEY, []).filter(valider).map(normaliser));
  const [actifId, setActifId] = useState(() => lire(KEY_ACTIF, null));
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('co2-theme') || 'dark';
    } catch {
      return 'dark';
    }
  });
  const [saveOk, setSaveOk] = useState(true);
  useEffect(() => {
    setSaveOk(ecrire(KEY, persos));
  }, [persos]);
  useEffect(() => {
    ecrire(KEY_ACTIF, actifId);
  }, [actifId]);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#121a2f' : '#efebe1');
    try {
      localStorage.setItem('co2-theme', theme);
    } catch {
      /* stockage indisponible */
    }
  }, [theme]);

  const actif = persos.find((p) => p.id === actifId) || persos[0] || null;

  /**
   * Met à jour un personnage. Toute différence avec l'état précédent est consignée au journal ;
   * `meta.titre` regroupe les changements sous un intitulé d'action (« Récupération rapide »…).
   */
  const majPerso = useCallback((id, fn, meta = {}) => {
    setPersos((list) =>
      list.map((p) => {
        if (p.id !== id) return p;
        const next = typeof fn === 'function' ? fn(p) : { ...p, ...fn };
        const journal = journaliser(p.journal || [], diffPerso(p, next), meta);
        return { ...next, journal, majLe: new Date().toISOString() };
      })
    );
  }, []);
  const majJournal = useCallback((id, fn) => {
    setPersos((list) => list.map((p) => (p.id === id ? { ...p, journal: fn(p.journal || []) } : p)));
  }, []);

  const api = useMemo(
    () => ({
      persos,
      actif,
      theme,
      saveOk,
      setTheme: setThemeState,
      choisir: (id) => setActifId(id),
      maj: (fn, meta) => actif && majPerso(actif.id, fn, meta),
      /** Note libre postée dans le journal du personnage actif. */
      noter: (texte) => actif && texte.trim() && majJournal(actif.id, (j) => journaliser(j, [], { texte: texte.trim() })),
      supprimerEntree: (entreeId) => actif && majJournal(actif.id, (j) => j.filter((e) => e.id !== entreeId)),
      viderJournal: () => actif && majJournal(actif.id, () => []),
      majPerso,
      ajouter: (c) => {
        const n0 = normaliser({ ...c, id: c.id || uid() });
        const n = { ...n0, journal: journaliser(n0.journal || [], [], { titre: 'Personnage créé', texte: `${n0.nom} rejoint l’aventure.` }) };
        setPersos((l) => [...l, n]);
        setActifId(n.id);
        return n;
      },
      dupliquer: (id) => {
        const src = persos.find((p) => p.id === id);
        if (!src) return;
        const copie = { ...JSON.parse(JSON.stringify(src)), id: uid(), nom: `${src.nom} (copie)`, creeLe: new Date().toISOString() };
        copie.journal = journaliser(copie.journal || [], [], { titre: 'Copie', texte: `Copie de ${src.nom}.` });
        setPersos((l) => [...l, copie]);
        setActifId(copie.id);
      },
      supprimer: (id) => {
        setPersos((l) => l.filter((p) => p.id !== id));
        if (actifId === id) setActifId(null);
      },
      importer: (data) => {
        const liste = Array.isArray(data) ? data : Array.isArray(data?.personnages) ? data.personnages : [data];
        const ok = liste.filter(valider);
        if (!ok.length) throw new Error('Aucun personnage valide dans ce fichier.');
        const ajout = ok
          .map((c) => normaliser({ ...c, id: persos.some((p) => p.id === c.id) ? uid() : c.id || uid() }))
          .map((c) => ({ ...c, journal: journaliser(Array.isArray(c.journal) ? c.journal : [], [], { titre: 'Import', texte: 'Personnage importé depuis un fichier JSON.' }) }));
        setPersos((l) => [...l, ...ajout]);
        setActifId(ajout[0].id);
        return ajout.length;
      },
    }),
    [persos, actif, theme, saveOk, majPerso, majJournal, actifId]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

/** Téléchargement d'un fichier JSON (partage natif si disponible sur mobile). */
export async function exporterJSON(nomFichier, data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  try {
    const file = new File([blob], nomFichier, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: nomFichier });
      return 'partage';
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'annule';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'telecharge';
}
