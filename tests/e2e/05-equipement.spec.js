import { test, expect, btn, nav, creerPerso, perso, tuile, dialog, fermer } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await creerPerso(page);
  await nav(page, 'Équipement').click();
});

const ligneObjet = (page, nom) =>
  page
    .locator('main div.flex.items-center')
    .filter({ has: page.getByRole('button', { name: new RegExp(`^${nom.replace('+', '\\+')}`) }) })
    .last();

test('équipement de départ du barbare et valeurs d’attaque des armes', async ({ page }) => {
  await expect(ligneObjet(page, 'Hache à deux mains')).toContainText('Att +4 · DM 2d6+3');
  await expect(ligneObjet(page, 'Javelot')).toContainText('Att +2 · DM 1d6 · 20 m');
  await expect(ligneObjet(page, 'Cuir simple')).toContainText('Équipé');
  const c = await perso(page);
  expect(c.inventaire.map((i) => i.refId)).toEqual(expect.arrayContaining(['cuir-simple', 'hache-a-deux-mains', 'dague', 'javelot', 'couverture', 'torche', 'briquet', 'outre', 'gamelle']));
});

test('achat avec la bourse, fonds insuffisants, change de monnaie', async ({ page }) => {
  await btn(page, /^Catalogue/).click();
  await page.getByPlaceholder('Rechercher…').fill('épée longue');
  await btn(page, /^Épée longue/).click();
  await btn(page, /Acheter 6 pa/).click();
  expect((await perso(page)).bourse).toEqual({ pp: 0, po: 0, pa: 1, pc: 0 });
  await page.getByPlaceholder('Rechercher…').fill('cotte');
  await btn(page, /^Cotte de mailles/).click();
  await btn(page, /Acheter 25 pa/).click();
  await expect(page.getByText(/Fonds insuffisants : il manque 24 pa/)).toBeVisible();
  await fermer(page);
  await fermer(page);
  // 25 pc → change : 2 pa 5 pc
  for (let i = 0; i < 25; i++) await page.locator('main div', { hasText: /^pcCuivre/ }).getByRole('button', { name: 'Augmenter' }).first().click();
  await btn(page, /Faire le change/).click();
  expect((await perso(page)).bourse).toEqual({ pp: 0, po: 0, pa: 3, pc: 5 });
});

test('changer d’armure recalcule la DEF et signale l’armure trop lourde pour le profil', async ({ page }) => {
  await btn(page, /^Catalogue/).click();
  await page.getByPlaceholder('Rechercher…').fill('cotte');
  await btn(page, /^Cotte de mailles/).click();
  await btn(page, 'Ajouter', { exact: true }).click();
  await fermer(page);
  await ligneObjet(page, 'Cotte de mailles').getByRole('button', { name: 'Rangé' }).click();
  // une seule armure portée à la fois
  await expect(ligneObjet(page, 'Cuir simple').getByRole('button', { name: 'Rangé' })).toBeVisible();
  await expect(page.getByText(/dépasse l’armure autorisée pour les voies de barbare/)).toBeVisible();
  await nav(page, 'Personnage').click();
  // 10 + AGI 1 + cotte 5 + Réflexes éclair 1
  expect(await tuile(page, 'Défense')).toBe(17);
});

test('arme : bonus magique, qualité, non maîtrisée ; objet personnalisé', async ({ page }) => {
  await btn(page, /^Hache à deux mains/).click();
  const s = dialog(page, 'Hache à deux mains');
  await s.getByRole('button', { name: 'Augmenter' }).first().click();
  await s.getByRole('button', { name: /Non maîtrisée/ }).click();
  await fermer(page);
  await expect(ligneObjet(page, 'Hache à deux mains +1')).toContainText('Att +5 (dé malus) · DM 2d6+4');

  await btn(page, /Objet perso/).click();
  const f = dialog(page, 'Objet personnalisé');
  await f.getByPlaceholder(/ex\. Épée runique/).fill('Marteau runique');
  await f.getByRole('button', { name: 'Armes de contact' }).click();
  await f.getByRole('button', { name: '1d10', exact: true }).click();
  await f.getByRole('button', { name: /Ajouter à l’inventaire/ }).click();
  await expect(ligneObjet(page, 'Marteau runique')).toContainText('DM 1d10+3');
});

test('potion de soins : le joueur saisit son jet', async ({ page }) => {
  await btn(page, /^Catalogue/).click();
  await page.getByPlaceholder('Rechercher…').fill('potion');
  await btn(page, /^Potion de soins/).click();
  await btn(page, 'Ajouter', { exact: true }).click();
  await fermer(page);
  await nav(page, 'Personnage').click();
  await btn(page, '-5', { exact: true }).click();
  await nav(page, 'Équipement').click();
  await btn(page, 'Boire').click();
  const pad = dialog(page, /Potion de soins/);
  await pad.getByRole('button', { name: 'Effacer' }).click();
  await pad.getByRole('button', { name: '4', exact: true }).click();
  await pad.getByRole('button', { name: /Valider 4/ }).click();
  const c = await perso(page);
  expect(c.pv.actuel).toBe(11);
  expect(c.inventaire.some((i) => i.refId === 'potion-de-soins')).toBe(false);
});
