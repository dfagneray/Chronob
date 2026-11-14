// Parcours utilisateur complets dans l'interface (jsdom).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup, act } from '@testing-library/react';
import { StoreProvider } from '../src/lib/store.jsx';
import { ToastProvider } from '../src/components/ui.jsx';
import App from '../src/App.jsx';

const clic = (el) => fireEvent.click(el);
const bouton = (name) => screen.getByRole('button', { name });
const onglet = (name) => clic(within(screen.getByRole('navigation')).getByRole('button', { name }));
const perso = () => JSON.parse(localStorage.getItem('co2-personnages'))[0];

function monter() {
  return render(
    <StoreProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StoreProvider>
  );
}

/** Crée Lhagva (barbare humaine) via l'assistant, comme dans le livre. */
function creerLhagva({ ideal = 'Courage', travers = 'Colérique' } = {}) {
  clic(bouton('Créer un personnage'));
  fireEvent.change(screen.getByPlaceholderText(/ex\. Lhagva/), { target: { value: 'Lhagva' } });
  clic(bouton('Suivant'));
  clic(screen.getByRole('button', { name: /^Barbare/ }));
  clic(bouton('Suivant'));
  clic(screen.getByRole('button', { name: /Méthode rapide/ }));
  clic(screen.getByRole('button', { name: 'CHA', exact: true })); // humain : +1 à une des deux plus faibles
  clic(bouton('Suivant'));
  clic(screen.getByRole('button', { name: /Voie du pourfendeur/ }));
  clic(screen.getByRole('button', { name: /Voie de la rage/ }));
  clic(bouton('Suivant'));
  fireEvent.change(screen.getByRole('combobox', { name: 'Idéal héroïque' }), { target: { value: ideal } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Travers' }), { target: { value: travers } });
  clic(screen.getByRole('button', { name: /^Créer Lhagva/ }));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(cleanup);

describe('Création de personnage', () => {
  it('crée Lhagva avec les valeurs du livre, idéal et travers choisis dans des listes', () => {
    monter();
    creerLhagva();
    expect(screen.getAllByText('Lhagva').length).toBeGreaterThan(0);
    const c = perso();
    expect(c.ideal).toBe('Courage');
    expect(c.travers).toBe('Colérique');
    expect(c.carac).toMatchObject({ FOR: 3, CON: 2, AGI: 1 });
    expect(c.pv.actuel).toBe(12);
    expect(c.voies).toEqual({ 'voie-de-l-humain': 1, 'voie-du-pourfendeur': 1, 'voie-de-la-rage': 1 });
    expect(c.bourse.pa).toBe(7);
  });

  it('les listes d’idéaux et de travers contiennent les 20 entrées du livre et une saisie libre', () => {
    monter();
    clic(bouton('Créer un personnage'));
    for (let i = 0; i < 2; i++) clic(bouton('Suivant'));
    clic(screen.getByRole('button', { name: /Méthode rapide/ }));
    clic(screen.getByRole('button', { name: 'CHA', exact: true }));
    clic(bouton('Suivant'));
    clic(screen.getByRole('button', { name: /Voie du bouclier/ }));
    clic(screen.getByRole('button', { name: /Voie du combat/ }));
    clic(bouton('Suivant'));
    const sel = screen.getByRole('combobox', { name: 'Idéal héroïque' });
    // 20 idéaux + « Aucun » + « Autre »
    expect(within(sel).getAllByRole('option')).toHaveLength(22);
    fireEvent.change(sel, { target: { value: '__autre__' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Idéal héroïque (texte libre)' }), { target: { value: 'Vengeance' } });
    clic(screen.getByRole('button', { name: 'Créer le héros' }));
    expect(perso().ideal).toBe('Vengeance');
  });

  it('crée Ionas, ensorceleur elfe haut avec la voie du mage (PV 7, PC 6, PM 5, Init. 11, DEF 12 — p. 29-32)', () => {
    monter();
    clic(bouton('Créer un personnage'));
    fireEvent.change(screen.getByPlaceholderText(/ex\. Lhagva/), { target: { value: 'Ionas' } });
    clic(screen.getByRole('button', { name: /^Elfe haut/ }));
    clic(bouton('Suivant'));
    clic(screen.getByRole('button', { name: /^Ensorceleur/ }));
    clic(bouton('Suivant'));
    clic(screen.getByRole('button', { name: /Méthode rapide/ }));
    clic(screen.getByRole('button', { name: 'CHA', exact: true }));
    clic(bouton('Suivant'));
    clic(screen.getByRole('button', { name: /Voie de l’air/ }));
    clic(screen.getByRole('button', { name: /Voie de l’invocation/ }));
    clic(screen.getByRole('button', { name: 'Voie du mage', exact: true }));
    clic(screen.getByRole('button', { name: /Serviteur invisible/ }));
    clic(bouton('Suivant'));
    clic(screen.getByRole('button', { name: /^Créer Ionas/ }));
    const c = perso();
    expect(c.carac.CHA).toBe(4);
    expect(c.voieDuMage).toBe(true);
    expect(c.voies).toEqual({ 'voie-de-l-elfe-haut': 1, 'voie-de-l-air': 1, 'voie-de-l-invocation': 2, 'voie-du-mage': 1 });
    expect([c.pv.actuel, c.pc.actuel, c.pm.actuel, c.dr.actuel]).toEqual([7, 6, 5, 3]);
    expect(screen.getByRole('button', { name: /^Initiative/ }).textContent).toContain('11');
    expect(screen.getByRole('button', { name: /^Défense \d/ }).textContent).toContain('12');
  });

  it('le lanceur de dés a été retiré', () => {
    monter();
    creerLhagva();
    expect(screen.queryByRole('button', { name: /Lanceur de dés/ })).toBeNull();
  });
});

describe('Saisies manuelles sur la fiche', () => {
  it('PV : valeur actuelle libre au-delà du maximum et maximum manuel', () => {
    monter();
    creerLhagva();
    clic(bouton('Modifier les PV'));
    const sheet = screen.getByRole('dialog', { name: 'Points de vigueur' });
    clic(within(sheet).getByRole('button', { name: 'Maximum manuel' }));
    expect(perso().maxManuel.PV).toBe(12);
    const steppers = within(sheet).getAllByRole('button', { name: 'Augmenter' });
    clic(steppers[1]); // maximum
    clic(steppers[1]);
    expect(perso().maxManuel.PV).toBe(14);
    clic(steppers[0]); // valeur actuelle : peut dépasser le maximum
    clic(steppers[0]);
    clic(steppers[0]);
    expect(perso().pv.actuel).toBe(15);
    clic(within(sheet).getByRole('button', { name: 'Automatique' }));
    expect(perso().maxManuel.PV).toBeNull();
  });

  it('PC, DR, PM : maximum manuel, et ajout de PM à un personnage sans sort', () => {
    monter();
    creerLhagva();
    clic(screen.getByRole('button', { name: 'Ajouter des points de mana manuellement' }));
    const sheet = screen.getByRole('dialog', { name: 'Points de mana' });
    clic(within(sheet).getByRole('button', { name: 'Maximum manuel' }));
    clic(within(sheet).getAllByRole('button', { name: 'Augmenter' })[1]);
    clic(within(sheet).getAllByRole('button', { name: 'Augmenter' })[1]);
    expect(perso().maxManuel.PM).toBe(2);
  });

  it('bonus manuel sur une valeur de combat (DEF)', () => {
    monter();
    creerLhagva();
    clic(screen.getByRole('button', { name: /^Défense \d/ }));
    const sheet = screen.getByRole('dialog', { name: 'Défense' });
    clic(within(sheet).getByRole('button', { name: 'Augmenter' }));
    expect(perso().bonus.DEF).toBe(1);
  });

  it('postures : défense totale (+5 DEF), une seule à la fois, retirée d’un second toucher', () => {
    monter();
    creerLhagva();
    const def = () => screen.getByRole('button', { name: /^Défense \d/ }).textContent;
    expect(def()).toContain('14');
    clic(screen.getByRole('button', { name: /^Défense totale/ }));
    expect(def()).toContain('19');
    clic(screen.getByRole('button', { name: /^Défense partielle/ }));
    expect(def()).toContain('17');
    expect(perso().posture).toBe('defense-partielle');
    clic(screen.getByRole('button', { name: /^Défense partielle/ }));
    expect(perso().posture).toBeNull();
  });

  it('caractéristique modifiable directement', () => {
    monter();
    creerLhagva();
    clic(screen.getByRole('button', { name: /^Force/ }));
    const sheet = screen.getByRole('dialog', { name: /Force/ });
    clic(within(sheet).getAllByRole('button', { name: 'Augmenter' })[0]);
    expect(perso().carac.FOR).toBe(4);
  });

  it('récupération rapide avec le résultat du dé saisi par le joueur', () => {
    monter();
    creerLhagva();
    clic(bouton('-5'));
    expect(perso().pv.actuel).toBe(7);
    clic(screen.getByRole('button', { name: 'Récupération' }));
    const sheet = screen.getByRole('dialog', { name: 'Récupération' });
    // valeur par défaut = moyenne du d10 (6) ; on la baisse à 4
    clic(within(sheet).getAllByRole('button', { name: 'Diminuer' })[0]);
    clic(within(sheet).getAllByRole('button', { name: 'Diminuer' })[0]);
    clic(within(sheet).getByRole('button', { name: /\+4 PV/ }));
    expect(perso().pv.actuel).toBe(11);
    expect(perso().dr.actuel).toBe(3);
  });
});

describe('Progression', () => {
  it('passage au niveau 2 guidé : 19 PV (p. 39)', () => {
    monter();
    creerLhagva();
    onglet('Progression');
    clic(screen.getByRole('button', { name: /Choisir une capacité/ }));
    clic(bouton('Choisir Charge'));
    clic(screen.getByRole('button', { name: /Choisir une capacité/ }));
    clic(bouton('Choisir Défier la mort'));
    clic(screen.getByRole('button', { name: /Valider le passage de niveau/ }));
    clic(screen.getByRole('button', { name: /Confirmer : passer au niveau 2/ }));
    const c = perso();
    expect(c.niveau).toBe(2);
    expect(c.voies['voie-du-pourfendeur']).toBe(2);
    expect(c.historique.at(-1).pvBase).toBe(5);
    onglet('Personnage');
    expect(screen.getByText('/ 19')).toBeTruthy();
  });

  it('PV de base imposés pour un niveau planifié', () => {
    monter();
    creerLhagva();
    onglet('Progression');
    clic(screen.getByRole('button', { name: 'Manuel' }));
    clic(screen.getAllByRole('button', { name: 'Augmenter' })[0]);
    expect(perso().plan[2].pvBase).toBe(6);
  });

  it('passage de niveau forcé sans choix (scénario spécial)', () => {
    monter();
    creerLhagva();
    onglet('Progression');
    clic(screen.getByRole('button', { name: /Forcer le passage au niveau 2/ }));
    clic(screen.getByRole('button', { name: /Forcer le niveau 2 malgré les règles/ }));
    expect(perso().niveau).toBe(2);
  });

  it('mode libre : une capacité hors règles peut être choisie', () => {
    monter();
    creerLhagva();
    onglet('Progression');
    clic(screen.getByRole('button', { name: /Mode libre/ }));
    clic(screen.getByRole('button', { name: /Choisir une capacité/ }));
    // rang 4 de la voie de l'ours (prestige, niveau 5 requis) — choisissable en mode libre
    const btn = screen.getByRole('button', { name: 'Choisir Caractère d’ours' });
    expect(btn.disabled).toBe(false);
    clic(btn);
    expect(perso().plan[2].picks).toEqual([{ voieId: 'voie-de-l-ours', rang: 4 }]);
  });

  it('PV de base d’un niveau modifiables après coup dans la fiche', () => {
    monter();
    creerLhagva();
    onglet('Progression');
    clic(screen.getByRole('button', { name: /Forcer le passage au niveau 2/ }));
    clic(screen.getByRole('button', { name: /Forcer le niveau 2/ }));
    onglet('Personnage');
    clic(screen.getByRole('button', { name: /Fiche/ }));
    const sheet = screen.getByRole('dialog', { name: 'Modifier le personnage' });
    const ligne = within(sheet).getByText('Niveau 2', { selector: 'span' }).parentElement;
    clic(within(ligne).getByRole('button', { name: 'Diminuer' }));
    expect(perso().historique.find((h) => h.niveau === 2)).toMatchObject({ pvBase: 4, manuel: true });
  });
});

describe('Journal des actions', () => {
  it('masqué par défaut, ouvert à la demande, il consigne la création, les PV, la récupération et les notes', () => {
    monter();
    creerLhagva();
    expect(screen.queryByRole('dialog', { name: /Journal/ })).toBeNull();
    // cinq clics rapides sur « -1 » : une seule ligne PV 12 → 7
    for (let i = 0; i < 5; i++) clic(bouton('-1'));
    clic(screen.getByRole('button', { name: 'Journal' }));
    let dlg = screen.getByRole('dialog', { name: /Journal/ });
    expect(within(dlg).getByText('Personnage créé')).toBeTruthy();
    const lignesPV = within(dlg).getAllByText('PV');
    expect(lignesPV).toHaveLength(1);
    expect(lignesPV[0].parentElement.textContent).toMatch(/12.*7/);
    // note libre
    fireEvent.change(within(dlg).getByRole('textbox', { name: 'Nouvelle note' }), { target: { value: 'Embuscade de gobelins' } });
    clic(within(dlg).getByRole('button', { name: /Publier/ }));
    expect(within(dlg).getByText('Embuscade de gobelins')).toBeTruthy();
    // filtre : seulement les notes
    clic(within(dlg).getByRole('button', { name: 'Notes' }));
    expect(within(dlg).queryByText('Personnage créé')).toBeNull();
    // fermeture
    clic(within(dlg).getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog', { name: /Journal/ })).toBeNull();
    expect(perso().journal.some((e) => e.type === 'note')).toBe(true);
  });

  it('un passage de niveau apparaît comme une seule action titrée', () => {
    monter();
    creerLhagva();
    onglet('Progression');
    clic(screen.getByRole('button', { name: /Forcer le passage au niveau 2/ }));
    clic(screen.getByRole('button', { name: /Forcer le niveau 2/ }));
    const e = perso().journal.at(-1);
    expect(e.titre).toBe('Passage forcé au niveau 2');
    expect(e.changes.find((c) => c.cle === 'niveau')).toMatchObject({ de: 1, a: 2 });
  });
});

describe('Grimoire', () => {
  it('recherche dans les capacités', () => {
    monter();
    onglet('Grimoire');
    fireEvent.change(screen.getByPlaceholderText('Rechercher dans les règles…'), { target: { value: 'explosion de feu' } });
    expect(screen.getAllByText('Explosion de feu').length).toBeGreaterThan(0);
  });
});

// évite les avertissements de minuteurs restants (toasts)
afterEach(async () => {
  await act(async () => {});
});
