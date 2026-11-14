import { test, expect, btn, creerPerso, perso, tuile, sansDebordement } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('écran d’accueil sans personnage', async ({ page }) => {
  await expect(page.getByText('Bienvenue, aventurier !')).toBeVisible();
  await expect(btn(page, 'Journal')).toHaveCount(0);
  await sansDebordement(page, 'accueil');
});

test('Lhagva, barbare humaine : valeurs de la fiche conformes au livre', async ({ page }) => {
  await creerPerso(page, { ideal: 'Courage', travers: 'Colérique' });
  const c = await perso(page);
  expect(c.carac).toEqual({ AGI: 1, CON: 2, FOR: 3, PER: 1, CHA: 1, INT: 0, VOL: -1 });
  expect([c.ideal, c.travers]).toEqual(['Courage', 'Colérique']);
  expect([c.pv.actuel, c.dr.actuel, c.pc.actuel, c.pm.actuel]).toEqual([12, 4, 4, 0]);
  // barbare en cuir avec hache à deux mains (sans bouclier) : 10 + AGI 1 + cuir 2 + Réflexes éclair 1
  expect(await tuile(page, 'Défense')).toBe(14);
  expect(await tuile(page, 'Initiative')).toBe(14);
  expect(await tuile(page, 'Attaque au contact')).toBe(4);
  expect(await tuile(page, 'Attaque à distance')).toBe(2);
  await expect(page.getByText('/ 12', { exact: true })).toBeVisible();
  await sansDebordement(page, 'fiche');
});

test('Ionas, ensorceleur elfe haut avec la voie du mage : PV 7, PC 6, PM 5, Init. 11, DEF 12', async ({ page }) => {
  await creerPerso(page, {
    nom: 'Ionas',
    peuple: 'Elfe haut',
    profil: 'Ensorceleur',
    voies: ['Voie de l’air', 'Voie de l’invocation'],
    mage: { voieDuMage: true, rang2: 'Serviteur invisible' },
  });
  const c = await perso(page);
  expect([c.pv.actuel, c.pc.actuel, c.pm.actuel, c.dr.actuel]).toEqual([7, 6, 5, 3]);
  expect(c.voies).toEqual({ 'voie-de-l-elfe-haut': 1, 'voie-de-l-air': 1, 'voie-de-l-invocation': 2, 'voie-du-mage': 1 });
  expect(await tuile(page, 'Initiative')).toBe(11);
  expect(await tuile(page, 'Défense')).toBe(12);
  expect(await tuile(page, 'Attaque magique')).toBe(3);
});

test('demi-elfe : choix de la voie de peuple, modificateurs au choix', async ({ page }) => {
  await btn(page, 'Créer un personnage').first().click();
  await page.getByPlaceholder(/ex\. Lhagva/).fill('Elandra');
  await btn(page, /^Demi-elfe/).click();
  await btn(page, 'Voie de l’elfe sylvain', { exact: true }).click();
  await btn(page, 'Suivant').click();
  await btn(page, /^Rôdeur/).click();
  await btn(page, 'Suivant').click();
  await btn(page, /Méthode rapide/).click();
  // « Suivant » bloqué tant que les modificateurs ne sont pas choisis
  await expect(btn(page, 'Suivant')).toBeDisabled();
  await btn(page, 'PER', { exact: true }).click();
  await btn(page, 'CON', { exact: true }).click();
  await btn(page, 'Suivant').click();
  await btn(page, /Voie de l’archer/).click();
  await btn(page, /Voie de la survie/).click();
  await btn(page, 'Suivant').click();
  await btn(page, /^Créer Elandra/).click();
  const c = await perso(page);
  expect(c.voiePeuple).toBe('voie-de-l-elfe-sylvain');
  expect(c.voies['voie-de-l-elfe-sylvain']).toBe(1);
  // rôdeur [AGI, PER, CON] : +3 AGI, +2 PER(+1), +1 CON(-1)
  expect(c.carac).toMatchObject({ AGI: 3, PER: 3, CON: 0 });
});

test('mode « Libre » des caractéristiques et équipement de départ décochable', async ({ page }) => {
  await btn(page, 'Créer un personnage').first().click();
  await page.getByPlaceholder(/ex\. Lhagva/).fill('Brok');
  await btn(page, /^Nain/).click();
  await btn(page, 'Suivant').click();
  await btn(page, /^Guerrier/).click();
  await btn(page, 'Suivant').click();
  await btn(page, 'Libre', { exact: true }).click();
  for (let i = 0; i < 4; i++) await btn(page, 'Augmenter Force').click();
  await btn(page, 'CON', { exact: true }).click();
  await btn(page, 'Suivant').click();
  await btn(page, /Voie du bouclier/).click();
  await btn(page, /Voie du combat/).click();
  await btn(page, 'Suivant').click();
  await btn(page, 'Grand bouclier', { exact: true }).click(); // décoché
  await btn(page, /^Créer Brok/).click();
  const c = await perso(page);
  expect(c.carac.FOR).toBe(4);
  expect(c.carac.AGI).toBe(-1); // nain : -1 AGI
  expect(c.inventaire.some((i) => i.refId === 'grand-bouclier')).toBe(false);
  expect(c.inventaire.some((i) => i.refId === 'chemise-de-mailles' && i.equipe)).toBe(true);
});
