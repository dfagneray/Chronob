import { test, expect, btn, nav, creerPerso, perso, tuile, dialog, fermer } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await creerPerso(page);
  await nav(page, 'Voies').click();
});

test('voies affichées par groupe, capacités acquises et à venir', async ({ page }) => {
  await expect(page.getByText('Voie de peuple', { exact: true })).toBeVisible();
  await expect(page.getByText('Voies de profil', { exact: true })).toBeVisible();
  await expect(btn(page, /^1 Réflexes éclair/)).toBeVisible();
  await expect(btn(page, /^2 Charge.*à venir/)).toBeVisible();
});

test('suivi d’utilisation : Cri de guerre utilisé puis rechargé par une récupération rapide', async ({ page }) => {
  const ligne = page.getByRole('listitem').filter({ hasText: 'Cri de guerre' });
  await ligne.getByRole('button', { name: 'Prête' }).click();
  await expect(ligne.getByRole('button', { name: 'Utilisée' })).toBeVisible();
  expect((await perso(page)).utilise).toEqual({ 'voie-de-la-rage--1': true });
  await nav(page, 'Personnage').click();
  await btn(page, '-5', { exact: true }).click();
  await btn(page, 'Récupération', { exact: true }).click();
  await dialog(page, 'Récupération').getByRole('button', { name: /PV \(−1 DR\)/ }).click();
  expect((await perso(page)).utilise).toEqual({});
});

test('fiche d’une capacité : texte complet, effet désactivable, note de choix', async ({ page }) => {
  await btn(page, /^1 Réflexes éclair/).click();
  const s = dialog(page, 'Réflexes éclair');
  await expect(s.getByText(/il gagne \+3 en Init/)).toBeVisible();
  await s.getByRole('button', { name: /^DEF \+1/ }).click();
  await s.getByRole('textbox').fill('Esquive acrobatique');
  await fermer(page);
  await expect(page.getByText('Esquive acrobatique')).toBeVisible();
  await nav(page, 'Personnage').click();
  expect(await tuile(page, 'Défense')).toBe(13);
});

test('gérer les voies manuellement : ajout, rang, retrait', async ({ page }) => {
  await btn(page, /Gérer les voies/).click();
  const s = dialog(page, 'Gérer les voies');
  await s.getByRole('button', { name: /Ajouter une voie/ }).click();
  await s.getByPlaceholder(/Rechercher une voie/).fill('brute');
  await s.getByRole('button', { name: /Voie de la brute/ }).click();
  const carte = s.locator('div.rounded-2xl', { hasText: 'Voie de la brute' }).first();
  await carte.getByRole('button', { name: 'Augmenter' }).click();
  expect((await perso(page)).voies['voie-de-la-brute']).toBe(2);
  const rage = s.locator('div.rounded-2xl', { hasText: 'Voie de la rage' }).first();
  await rage.getByRole('button', { name: 'Retirer Voie de la rage' }).click(); // double confirmation
  await rage.getByRole('button', { name: /Retirer/ }).last().click();
  expect((await perso(page)).voies['voie-de-la-rage']).toBeUndefined();
});

test('filtre « À suivre en combat »', async ({ page }) => {
  await btn(page, 'À suivre en combat').click();
  await expect(btn(page, /Cri de guerre/)).toBeVisible();
  await expect(btn(page, /^2 Charge/)).toHaveCount(0);
});
