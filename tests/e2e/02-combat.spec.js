import { test, expect, btn, creerPerso, perso, tuile, dialog, fermer } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await creerPerso(page);
});

const pv = (page) => perso(page).then((c) => c.pv);

test('dégâts et soins, PV temporaires absorbés en premier', async ({ page }) => {
  await btn(page, '-5', { exact: true }).click();
  expect((await pv(page)).actuel).toBe(7);
  await btn(page, '+1', { exact: true }).click();
  expect((await pv(page)).actuel).toBe(8);
  for (let i = 0; i < 3; i++) await btn(page, 'Augmenter PV temporaires').click();
  await btn(page, '-5', { exact: true }).click();
  expect(await pv(page)).toEqual({ actuel: 6, temp: 0 });
  // les soins ne dépassent pas le maximum
  for (let i = 0; i < 3; i++) await btn(page, '+5', { exact: true }).click();
  expect((await pv(page)).actuel).toBe(12);
});

test('pavé numérique : subir 20 DM → 0 PV, inconscient, perte d’un DR proposée', async ({ page }) => {
  await btn(page, /Subir des DM/).click();
  const pad = dialog(page, 'Subir des DM');
  await pad.getByRole('button', { name: '2', exact: true }).click();
  await pad.getByRole('button', { name: '0', exact: true }).click();
  await pad.getByRole('button', { name: /Valider 20/ }).click();
  expect((await pv(page)).actuel).toBe(0);
  await expect(page.getByText('Inconscient', { exact: true })).toBeVisible();
  await btn(page, 'Retirer 1 DR').click();
  expect((await perso(page)).dr.actuel).toBe(3);
});

test('à 1 PV : affaibli automatiquement (dé malus)', async ({ page }) => {
  await btn(page, 'PV actuels').click();
  const pad = dialog(page, 'Points de vigueur actuels');
  await pad.getByRole('button', { name: 'Effacer' }).click();
  await pad.getByRole('button', { name: 'Effacer' }).click();
  await pad.getByRole('button', { name: '1', exact: true }).click();
  await pad.getByRole('button', { name: /^Valider/ }).click();
  await expect(page.getByText('Affaibli (dernier PV)')).toBeVisible();
  await expect(page.getByText(/dé malus à tous les tests/)).toBeVisible();
});

test('états préjudiciables : renversé (-5 attaque et DEF), aveuglé (-10 à distance)', async ({ page }) => {
  await btn(page, 'Renversé', { exact: true }).click();
  expect(await tuile(page, 'Défense')).toBe(9);
  expect(await tuile(page, 'Attaque au contact')).toBe(-1);
  await btn(page, 'Renversé', { exact: true }).click();
  await btn(page, 'Aveuglé', { exact: true }).click();
  expect(await tuile(page, 'Attaque à distance')).toBe(-8);
  expect(await tuile(page, 'Initiative')).toBe(9);
  expect((await perso(page)).etats).toEqual(['aveugle']);
});

test('postures : défense partielle, défense totale, sprint (une seule à la fois)', async ({ page }) => {
  await btn(page, /^Défense partielle/).click();
  expect(await tuile(page, 'Défense')).toBe(17);
  await btn(page, /^Défense totale/).click();
  expect(await tuile(page, 'Défense')).toBe(19);
  await btn(page, /^Sprint/).click();
  expect(await tuile(page, 'Défense')).toBe(9);
  await expect(page.getByText(/Sprint : dé malus à tous les tests/)).toBeVisible();
  await btn(page, /^Sprint/).click();
  expect(await tuile(page, 'Défense')).toBe(14);
});

test('récupération rapide (résultat du dé saisi) puis complète', async ({ page }) => {
  await btn(page, '-5', { exact: true }).click();
  await btn(page, '-5', { exact: true }).click();
  await btn(page, 'Récupération', { exact: true }).click();
  const r = dialog(page, 'Récupération');
  // d10, valeur proposée 6 → on monte à 8
  await r.getByRole('button', { name: 'Augmenter' }).first().click();
  await r.getByRole('button', { name: 'Augmenter' }).first().click();
  await r.getByRole('button', { name: /\+8 PV/ }).click();
  let c = await perso(page);
  expect([c.pv.actuel, c.dr.actuel]).toEqual([10, 3]);
  await btn(page, '-5', { exact: true }).click();
  await btn(page, 'Récupération', { exact: true }).click();
  await dialog(page, 'Récupération').getByRole('button', { name: /l’utiliser \(\+10 PV\)/ }).click();
  c = await perso(page);
  // +1 DR (4) puis utilisé aussitôt (3) ; PV 5 + 10 plafonné à 12
  expect([c.pv.actuel, c.dr.actuel]).toEqual([12, 3]);
});

test('PC, DR et ressource de profil personnalisée', async ({ page }) => {
  await btn(page, 'Retirer 1 — Chance (PC)').click();
  expect((await perso(page)).pc.actuel).toBe(3);
  await btn(page, /Ressource de profil/).click();
  await page.getByPlaceholder('ex. Charges explosives').fill('Rages');
  await dialog(page, 'Nouvelle ressource').getByRole('button', { name: 'Ajouter' }).click();
  await btn(page, 'Retirer 1 — Rages').click();
  const c = await perso(page);
  expect(c.ressources[0]).toMatchObject({ nom: 'Rages', actuel: 2, max: 3 });
});

test('maximum manuel des PV et bonus manuel de DEF', async ({ page }) => {
  await btn(page, 'Modifier les PV').click();
  const s = dialog(page, 'Points de vigueur');
  await s.getByRole('button', { name: 'Maximum manuel' }).click();
  await s.getByRole('button', { name: 'Augmenter' }).nth(1).click();
  await fermer(page);
  await expect(page.getByText('/ 13', { exact: true })).toBeVisible();
  await expect(page.getByText(/maximum saisi à la main/i)).toBeVisible();
  await btn(page, /^Défense \d/).click();
  await dialog(page, 'Défense').getByRole('button', { name: 'Augmenter' }).click();
  await fermer(page);
  expect(await tuile(page, 'Défense')).toBe(15);
});

test('caractéristique modifiée : impacts en chaîne (CON → PV et DR)', async ({ page }) => {
  await btn(page, /^Constitution/).click();
  await dialog(page, /Constitution/).getByRole('button', { name: 'Augmenter' }).first().click();
  await expect.poll(async () => (await perso(page)).carac.CON).toBe(3);
  await fermer(page);
  // PV max 12 → 13, DR max 4 → 5
  await expect(page.getByText('/ 13', { exact: true })).toBeVisible();
  await expect(page.getByText('/ 5', { exact: true })).toBeVisible();
});
