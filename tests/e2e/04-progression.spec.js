import { test, expect, btn, nav, creerPerso, perso, tuile, dialog } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await creerPerso(page);
  await nav(page, 'Progression').click();
});

async function choisir(page, nom) {
  await btn(page, /Choisir une capacité|Ajouter une capacité/).click();
  await btn(page, `Choisir ${nom}`).click();
}
async function valider(page, niveau) {
  await btn(page, /Valider le passage de niveau/).click();
  await btn(page, new RegExp(`Confirmer : passer au niveau ${niveau}`)).click();
  await expect(page.getByRole('banner')).toContainText(`Niveau ${niveau}`);
}

test('niveaux 2 et 3 : Lhagva passe à 19 puis 26 PV, rang 3 au niveau 3 (p. 39)', async ({ page }) => {
  await choisir(page, 'Charge');
  await choisir(page, 'Défier la mort');
  await valider(page, 2);
  await choisir(page, 'Enchaînement'); // rang 3 : 2 points
  await valider(page, 3);
  const c = await perso(page);
  expect(c.voies).toMatchObject({ 'voie-du-pourfendeur': 3, 'voie-de-la-rage': 2 });
  expect(c.historique.map((h) => h.pvBase)).toEqual([5, 5]);
  await nav(page, 'Personnage').click();
  await expect(page.getByText('/ 26', { exact: true })).toBeVisible();
  expect(await tuile(page, 'Attaque au contact')).toBe(6);
});

test('restrictions : rang 3 au niveau 2 et voie de prestige avant le niveau 5 indisponibles', async ({ page }) => {
  await btn(page, /Choisir une capacité/).click();
  await btn(page, /Afficher aussi les capacités indisponibles/).click();
  await expect(btn(page, 'Choisir Caractère d’ours')).toBeDisabled();
  await expect(page.getByText(/voie de prestige dès le niveau 5/).first()).toBeVisible();
});

test('profil hybride : capacité de mage, PV = (5 + 3) / 2 = 4 (p. 177)', async ({ page }) => {
  await choisir(page, 'Charge');
  await btn(page, /Choisir une capacité/).click();
  await page.getByPlaceholder('Filtrer…').fill('Murmures');
  await btn(page, 'Choisir Murmures dans le vent').click();
  await valider(page, 2);
  const c = await perso(page);
  expect(c.historique[0].pvBase).toBe(4);
  await nav(page, 'Personnage').click();
  await expect(page.getByText('/ 18', { exact: true })).toBeVisible();
  // un sort appris : apparition des PM (VOL -1 + 1 sort = 0 → PM 0, réserve affichée seulement si > 0)
  expect(c.voies['voie-de-l-air']).toBe(1);
});

test('aperçu bac à sable : rien n’est appliqué avant validation', async ({ page }) => {
  await choisir(page, 'Charge');
  await choisir(page, 'Défier la mort');
  await expect(page.getByText('PV max').locator('..')).toContainText('19');
  const c = await perso(page);
  expect(c.niveau).toBe(1);
  expect(c.voies['voie-du-pourfendeur']).toBe(1);
});

test('planification de plusieurs niveaux à l’avance', async ({ page }) => {
  await choisir(page, 'Charge');
  await choisir(page, 'Défier la mort');
  await btn(page, 'Niveau 3', { exact: true }).click();
  await choisir(page, 'Enchaînement');
  const plan = (await perso(page)).plan;
  expect(Object.keys(plan)).toEqual(['2', '3']);
  await valider(page, 2);
  // le niveau 3 planifié reste prêt
  await valider(page, 3);
});

test('PV manuels, mode libre et passage forcé', async ({ page }) => {
  await btn(page, 'Manuel', { exact: true }).click();
  await page.getByRole('button', { name: 'Augmenter' }).first().click();
  await btn(page, /Mode libre/).click();
  await choisir(page, 'Caractère d’ours'); // prestige, hors règles au niveau 2
  await btn(page, /Forcer le passage au niveau 2/).click();
  await btn(page, /Forcer le niveau 2 malgré les règles/).click();
  const c = await perso(page);
  expect(c.niveau).toBe(2);
  expect(c.voies['voie-de-l-ours']).toBe(4);
  expect(c.historique[0].pvBase).toBe(6);
});

test('PV de base d’un niveau corrigés après coup dans la fiche', async ({ page }) => {
  await choisir(page, 'Charge');
  await choisir(page, 'Défier la mort');
  await valider(page, 2);
  await nav(page, 'Personnage').click();
  await btn(page, /Fiche/).click();
  const s = dialog(page, 'Modifier le personnage');
  const ligne = s.locator('div.px-3.py-2', { hasText: 'Niveau 2' });
  await ligne.getByRole('button', { name: 'Diminuer' }).click();
  await expect(ligne.getByRole('button', { name: 'Valeur par défaut' })).toBeVisible();
  expect((await perso(page)).historique[0]).toMatchObject({ pvBase: 4, manuel: true });
  await ligne.getByRole('button', { name: 'Valeur par défaut' }).click();
  expect((await perso(page)).historique[0]).toMatchObject({ pvBase: 5, manuel: false });
});
