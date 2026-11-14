// Outils communs aux tests d'intégration.
import { test as base, expect } from '@playwright/test';

/** `page` enrichie : toute erreur JavaScript ou console fait échouer le test. */
export const test = base.extend({
  page: async ({ page }, use) => {
    const erreurs = [];
    page.on('pageerror', (e) => erreurs.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) erreurs.push(`console: ${m.text()}`);
    });
    await use(page);
    expect(erreurs, 'erreurs JavaScript pendant le test').toEqual([]);
  },
});
export { expect };

export const btn = (page, name, opts = {}) => page.getByRole('button', { name, ...opts });
export const nav = (page, name) => page.getByRole('navigation').getByRole('button', { name });
export const dialog = (page, name) => page.getByRole('dialog', { name });
export const fermer = (page) => page.getByRole('button', { name: 'Fermer' }).last().click();

/** Lit le premier personnage enregistré dans localStorage. */
export const perso = (page, i = 0) => page.evaluate((k) => JSON.parse(localStorage.getItem('co2-personnages') || '[]')[k], i);

/** Débordement horizontal de la page (doit rester nul). */
export async function sansDebordement(page, contexte) {
  const d = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(d, `débordement horizontal (${contexte})`).toBeLessThanOrEqual(0);
}

/**
 * Crée un personnage via l'assistant.
 * opts : nom, peuple (libellé), profil (libellé), plus (carac du +1 de peuple), voies (2 libellés), mage ({ voieDuMage, rang2 })
 */
export async function creerPerso(page, opts = {}) {
  const o = { nom: 'Lhagva', peuple: 'Humain', profil: 'Barbare', plus: 'CHA', voies: ['Voie du pourfendeur', 'Voie de la rage'], ...opts };
  const ouvrir = btn(page, 'Créer un personnage').first();
  if (await ouvrir.isVisible()) await ouvrir.click();
  else {
    await btn(page, 'Changer de personnage').click();
    await btn(page, 'Nouveau').click();
  }
  await page.getByPlaceholder(/ex\. Lhagva/).fill(o.nom);
  await btn(page, new RegExp(`^${o.peuple}`)).click();
  await btn(page, 'Suivant').click();
  await btn(page, new RegExp(`^${o.profil}`)).click();
  await btn(page, 'Suivant').click();
  await btn(page, /Méthode rapide/).click();
  if (o.plus) await btn(page, o.plus, { exact: true }).click();
  await btn(page, 'Suivant').click();
  for (const v of o.voies) await btn(page, new RegExp(v)).click();
  if (o.mage?.voieDuMage) await btn(page, 'Voie du mage', { exact: true }).click();
  if (o.mage?.rang2) await btn(page, new RegExp(o.mage.rang2)).click();
  await btn(page, 'Suivant').click();
  if (o.ideal) await page.getByRole('combobox', { name: 'Idéal héroïque' }).selectOption(o.ideal);
  if (o.travers) await page.getByRole('combobox', { name: 'Travers' }).selectOption(o.travers);
  await btn(page, new RegExp(`^Créer ${o.nom}`)).click();
  await expect(page.getByRole('banner')).toContainText(o.nom);
}

/** Valeur affichée d'une tuile de combat (ex. « Défense 14 (16) » → 14). */
export async function tuile(page, label) {
  const t = await btn(page, new RegExp(`^${label} [+-]?\\d`)).textContent();
  return parseInt(t.replace(label, '').replace(/^[^\d+-]*/, ''), 10);
}
