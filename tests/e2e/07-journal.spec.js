import { test, expect, btn, nav, creerPerso, perso, dialog, fermer } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await creerPerso(page);
});

test('journal masqué par défaut, ouvert et fermé à la demande', async ({ page }) => {
  await expect(dialog(page, 'Journal')).toHaveCount(0);
  await btn(page, 'Journal').click();
  await expect(dialog(page, 'Journal')).toBeVisible();
  await expect(dialog(page, 'Journal')).toContainText('Personnage créé');
  await fermer(page);
  await expect(dialog(page, 'Journal')).toHaveCount(0);
});

test('modifications suivies, clics rapides regroupés, actions titrées', async ({ page }) => {
  for (let i = 0; i < 3; i++) await btn(page, '-1', { exact: true }).click();
  await btn(page, 'Renversé', { exact: true }).click();
  await btn(page, /^Défense totale/).click();
  await nav(page, 'Progression').click();
  await btn(page, /Forcer le passage au niveau 2/).click();
  await btn(page, /Forcer le niveau 2 malgré les règles/).click();
  await btn(page, 'Journal').click();
  const j = dialog(page, 'Journal');
  await expect(j).toContainText('État Renversé appliqué');
  await expect(j).toContainText('Posture : Défense totale');
  await expect(j).toContainText('Passage forcé au niveau 2');
  const entrees = (await perso(page)).journal;
  const pv = entrees.filter((e) => e.changes?.some((c) => c.cle === 'pv') && !e.titre);
  expect(pv).toHaveLength(1);
  expect(pv[0].changes[0]).toMatchObject({ de: 12, a: 9 });
});

test('notes : publication, filtre, suppression ; vider le journal', async ({ page }) => {
  await btn(page, 'Journal').click();
  const j = dialog(page, 'Journal');
  await j.getByRole('textbox', { name: 'Nouvelle note' }).fill('Le troll a fui vers le nord.');
  await j.getByRole('button', { name: /Publier/ }).click();
  await expect(j).toContainText('Le troll a fui vers le nord.');
  await j.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(j).not.toContainText('Personnage créé');
  await j.getByRole('button', { name: 'Tout', exact: true }).click();
  await j.getByRole('button', { name: /Vider/ }).click();
  await j.getByRole('button', { name: 'Tout effacer ?' }).click();
  await expect(j).toContainText('Rien pour l’instant');
  expect((await perso(page)).journal).toEqual([]);
});
