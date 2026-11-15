// Contenu du Compagnon du joueur : peuples, profils, voies de domaine, encyclopédie.
import { test, expect, btn, perso, nav, sansDebordement } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

/** Début de l'assistant jusqu'au choix du profil inclus. */
async function debut(page, nom, peuple, profil) {
  await btn(page, 'Créer un personnage').first().click();
  await page.getByPlaceholder(/ex\. Lhagva/).fill(nom);
  await btn(page, new RegExp(`^${peuple}`)).click();
  await btn(page, 'Suivant').click();
  await btn(page, new RegExp(`^${profil}`)).click();
}

test('kobold psionique : modificateurs fixes, famille au choix, points d’ego', async ({ page }) => {
  await debut(page, 'Sssik', 'Kobold', 'Psionique');
  // la famille doit être choisie avant de continuer
  await expect(btn(page, 'Suivant')).toBeDisabled();
  await btn(page, 'Combattants', { exact: true }).click();
  await btn(page, 'Suivant').click();
  await btn(page, /Méthode rapide/).click();
  await btn(page, 'Suivant').click();
  await btn(page, /Voie de l’attaque mentale/).click();
  await btn(page, /Voie de la télékinésie/).click();
  await btn(page, 'Suivant').click();
  await btn(page, /^Créer Sssik/).click();
  const c = await perso(page);
  // VOL +3, PER +2, CON +1, AGI +1, FOR 0, CHA 0, INT -1 ; kobold : +1 AGI, +1 PER, -1 FOR, -1 CON
  expect(c.carac).toEqual({ AGI: 2, CON: 0, FOR: -1, PER: 3, CHA: 0, INT: -1, VOL: 3 });
  expect(c.famille).toBe('combattants');
  expect([c.pv.actuel, c.pe.actuel, c.pm.actuel]).toEqual([8, 5, 0]);
  await expect(page.getByText('Ego (PE)')).toBeVisible();
  await expect(page.getByText('Récup. (DR d10)')).toBeVisible();
  await sansDebordement(page, 'fiche psionique');
});

test('prêtre nain avec la voie de domaine d’Arshran', async ({ page }) => {
  await debut(page, 'Borin', 'Nain', 'Prêtre');
  await btn(page, 'Suivant').click();
  await btn(page, /Méthode rapide/).click();
  await btn(page, 'CON', { exact: true }).click(); // nain : +1 en CON ou VOL
  await btn(page, 'Suivant').click();
  await btn(page, /Voie de la prière/).click();
  await btn(page, /Voie des soins/).click();
  await page.getByRole('combobox', { name: 'Divinité' }).selectOption('voie-de-domaine-arshran');
  await expect(page.getByText(/Capacité de peuple \+ forgeron/)).toBeVisible();
  await btn(page, 'Suivant').click();
  await btn(page, /^Créer Borin/).click();
  const c = await perso(page);
  expect(c.voieDomaine).toBe('voie-de-domaine-arshran');
  expect(c.voies).toEqual({ 'voie-du-nain': 1, 'voie-de-domaine-arshran': 1, 'voie-de-la-priere': 1, 'voie-des-soins': 1 });
  await nav(page, 'Voies').click();
  await expect(page.getByText('Voie d’Arshran')).toBeVisible();
});

test('encyclopédie : filtre par ouvrage et références de page du Compagnon', async ({ page }) => {
  await btn(page, 'Créer un personnage').first().click();
  await btn(page, 'Fermer').last().click();
  await nav(page, 'Grimoire').click();
  await btn(page, 'Compagnon du joueur', { exact: true }).click();
  await page.getByPlaceholder('Rechercher dans les règles…').fill('minotaure');
  await btn(page, /^Minotaure/).first().click();
  await expect(page.getByRole('dialog', { name: 'Minotaure' })).toContainText('Compagnon p. 29');
});

test('création : description complète des peuples, profils et voies par-dessus l’assistant', async ({ page }) => {
  await btn(page, 'Créer un personnage').first().click();
  await btn(page, 'Description complète du peuple Wolfer').click();
  await expect(page.getByRole('dialog', { name: 'Wolfer' })).toContainText('Espérance de vie');
  await btn(page, 'Voie du wolfer').click();
  await expect(page.getByRole('dialog', { name: 'Voie du wolfer' })).toBeVisible();
  await btn(page, 'Fermer').last().click();
  // l'assistant est toujours là, sans perte de saisie
  await expect(page.getByRole('dialog', { name: /Nouveau héros/ })).toBeVisible();
  await btn(page, /^Wolfer/).click();
  await btn(page, 'Suivant').click();
  await btn(page, /^Chamane/).click();
  await btn(page, /Description complète, armes et voies du chamane/).click();
  await expect(page.getByRole('dialog', { name: 'Chamane' })).toContainText('Armes & armures maîtrisées');
  await btn(page, 'Fermer').last().click();
  await btn(page, 'Suivant').click();
  await btn(page, /Méthode rapide/).click();
  await btn(page, 'PER', { exact: true }).click();
  await btn(page, 'Suivant').click();
  await btn(page, /Toutes les capacités de la voie de l’esprit animal/).click();
  await expect(page.getByRole('dialog', { name: 'Voie de l’esprit animal' })).toContainText('Esprit du loup');
});
