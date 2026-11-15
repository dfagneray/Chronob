import fs from 'node:fs';
import { test, expect, btn, nav, creerPerso, perso, dialog, fermer } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('encyclopédie : recherche, filtres et fiches détaillées', async ({ page }) => {
  await nav(page, 'Grimoire').click();
  const recherche = page.getByPlaceholder('Rechercher dans les règles…');
  await recherche.fill('explosion de feu');
  await btn(page, /^Explosion de feu/).first().click();
  await expect(dialog(page, 'Explosion de feu')).toContainText('[4d4°+INT] DM');
  await dialog(page, 'Explosion de feu').getByRole('button', { name: /Voie de la magie destructrice/ }).click();
  await expect(dialog(page, 'Voie de la magie destructrice')).toContainText('Arc de feu');
  await fermer(page);

  await recherche.fill('');
  await btn(page, 'Profils', { exact: true }).click();
  await btn(page, /^Barbare/).click();
  await expect(dialog(page, 'Barbare')).toContainText('Voie de la rage');
  await fermer(page);

  await btn(page, 'États', { exact: true }).click();
  await expect(page.getByText('10 résultats')).toBeVisible();
  await btn(page, 'Règles', { exact: true }).click();
  await recherche.fill('récupération rapide');
  await btn(page, /^Récupération rapide/).click();
  await expect(dialog(page, 'Récupération rapide')).toContainText('½ Niveau');
});

test('plusieurs héros : création, changement, copie, suppression', async ({ page }) => {
  await creerPerso(page);
  await creerPerso(page, { nom: 'Wilibert', peuple: 'Halfelin', profil: 'Voleur', plus: 'AGI', voies: ['Voie de l’assassin', 'Voie du roublard'] });
  await btn(page, 'Changer de personnage').click();
  await dialog(page, 'Mes héros').getByRole('button', { name: /^1 Lhagva/ }).click();
  await expect(page.getByRole('banner')).toContainText('Lhagva');

  await nav(page, 'Grimoire').click();
  await btn(page, 'Héros & sauvegardes').click();
  await btn(page, /Copier/).first().click();
  await expect(page.getByRole('banner')).toContainText('Lhagva (copie)');
  const carte = page.locator('main .rounded-2xl', { hasText: 'Lhagva (copie)' });
  await carte.getByRole('button', { name: /Suppr\./ }).click();
  await carte.getByRole('button', { name: 'Supprimer ?' }).click();
  await expect(page.getByText('Lhagva (copie)')).toHaveCount(0);
  const n = await page.evaluate(() => JSON.parse(localStorage.getItem('co2-personnages')).length);
  expect(n).toBe(2);
});

test('export JSON puis import dans un navigateur vierge', async ({ page, browser }, testInfo) => {
  await creerPerso(page);
  await btn(page, '-5', { exact: true }).click();
  await nav(page, 'Grimoire').click();
  await btn(page, 'Héros & sauvegardes').click();
  const [dl] = await Promise.all([page.waitForEvent('download'), btn(page, /Exporter tous les héros/).click()]);
  const fichier = testInfo.outputPath('export.json');
  await dl.saveAs(fichier);
  const data = JSON.parse(fs.readFileSync(fichier, 'utf8'));
  expect(data.format).toBe('co2-compagnon');
  expect(data.personnages[0]).toMatchObject({ nom: 'Lhagva', pv: { actuel: 7 } });

  // autre « appareil » : contexte neuf, stockage vide
  const ctx = await browser.newContext({ ...testInfo.project.use });
  const p2 = await ctx.newPage();
  await p2.goto('/');
  await p2.getByRole('navigation').getByRole('button', { name: 'Grimoire' }).click();
  await p2.getByRole('button', { name: 'Héros & sauvegardes' }).click();
  await p2.locator('input[type=file]').setInputFiles(fichier);
  await expect(p2.getByText('1 personnage importé.')).toBeVisible();
  await p2.getByRole('navigation').getByRole('button', { name: 'Personnage' }).click();
  await expect(p2.getByText('/ 12', { exact: true })).toBeVisible();
  const c = await p2.evaluate(() => JSON.parse(localStorage.getItem('co2-personnages'))[0]);
  expect(c.pv.actuel).toBe(7);
  expect(c.journal.at(-1).titre).toBe('Import');
  await ctx.close();
});

test('import d’un fichier invalide : message d’erreur, aucune perte', async ({ page }, testInfo) => {
  await creerPerso(page);
  await nav(page, 'Grimoire').click();
  await btn(page, 'Héros & sauvegardes').click();
  const f = testInfo.outputPath('invalide.json');
  fs.writeFileSync(f, '{"pas": "un héros"}');
  await page.locator('input[type=file]').setInputFiles(f);
  await expect(page.getByText(/Import impossible/)).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('co2-personnages')).length)).toBe(1);
});

test('papier par défaut ; thème Veillée conservé après rechargement', async ({ page }) => {
  await creerPerso(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await btn(page, 'Passer au thème Veillée').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await btn(page, 'Passer au thème Papier').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
