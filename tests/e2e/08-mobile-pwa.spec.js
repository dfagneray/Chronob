import { test, expect, btn, nav, creerPerso, perso, sansDebordement, fermer , ouvrirSac } from './fixtures.js';

const ONGLETS = ['Personnage', 'Voies', 'Progression', 'Grimoire'];

/** Boutons visibles plus petits que `min` px (hauteur ou largeur). */
async function petitesCibles(page, min = 44) {
  return page.evaluate((min) => {
    const out = [];
    for (const el of document.querySelectorAll('button, select, [role=button], input:not([type=file]), textarea')) {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (!r.width || !r.height || st.visibility === 'hidden' || st.display === 'none') continue;
      if (r.bottom < 0 || r.top > innerHeight * 4) continue;
      if (r.height < min - 0.5 || r.width < min - 0.5) out.push(`${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40)} (${Math.round(r.width)}×${Math.round(r.height)})`);
    }
    return out;
  }, min);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await creerPerso(page);
});

test('aucun débordement horizontal sur les 4 onglets et les tiroirs principaux', async ({ page }) => {
  for (const o of ONGLETS) {
    await nav(page, o).click();
    await sansDebordement(page, o);
  }
  await nav(page, 'Personnage').click();
  for (const b of ['Modifier les PV', 'Journal']) {
    await btn(page, b).click();
    await sansDebordement(page, b);
    await fermer(page);
  }
});

test('zones tactiles d’au moins 44 px sur tous les écrans', async ({ page }) => {
  const trop = {};
  for (const o of ONGLETS) {
    await nav(page, o).click();
    const p = await petitesCibles(page);
    if (p.length) trop[o] = p;
  }
  expect(trop).toEqual({});
});

test('zones tactiles d’au moins 44 px dans les tiroirs', async ({ page }) => {
  const trop = {};
  const verifier = async (nom) => {
    const p = await petitesCibles(page);
    if (p.length) trop[nom] = p;
    await fermer(page);
  };
  await btn(page, 'Modifier les PV').click();
  await verifier('PV');
  await btn(page, 'Récupération', { exact: true }).click();
  await verifier('Récupération');
  await btn(page, /Modifier la fiche/).click();
  await verifier('Fiche');
  await btn(page, 'Journal').click();
  await verifier('Journal');
  await btn(page, /Subir des DM/).click();
  await verifier('Pavé numérique');
  await nav(page, 'Voies').click();
  await btn(page, /Gérer les voies/).click();
  await verifier('Gérer les voies');
  await btn(page, /^Rang 1 : Réflexes éclair/).click();
  await verifier('Capacité');
  await nav(page, 'Progression').click();
  await btn(page, /Choisir une capacité/).click();
  await verifier('Choix de capacité');
  await ouvrirSac(page);
  await btn(page, /^Catalogue/).click();
  await verifier('Catalogue');
  await btn(page, /Objet perso/).click();
  await verifier('Objet perso');
  await btn(page, 'Changer de personnage').click();
  await btn(page, 'Nouveau').click();
  await verifier('Création');
  expect(trop).toEqual({});
});

test('barre de navigation fixe en bas, toujours accessible après défilement', async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const vh = page.viewportSize().height;
  // la barre reste collée au bas de l'écran (mesure répétée jusqu'à la fin du défilement)
  await expect.poll(async () => {
    const b = await page.getByRole('navigation').boundingBox();
    return Math.round(b.y + b.height);
  }).toBe(vh);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await nav(page, 'Voies').click();
  await expect(page.getByText('Voies de profil', { exact: true })).toBeVisible();
});

test('les boutons + / − n’ouvrent jamais le clavier', async ({ page }) => {
  await btn(page, '-1', { exact: true }).click();
  await btn(page, 'Augmenter PV temporaires').click();
  await btn(page, 'Modifier les PV').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Augmenter' }).first().click();
  const tag = await page.evaluate(() => document.activeElement?.tagName);
  expect(['INPUT', 'TEXTAREA', 'SELECT']).not.toContain(tag);
});

test('persistance : les données survivent au rechargement', async ({ page }) => {
  await btn(page, '-5', { exact: true }).click();
  await page.reload();
  await expect(page.getByRole('banner')).toContainText('Lhagva');
  expect((await perso(page)).pv.actuel).toBe(7);
  await expect(page.getByText('7', { exact: true }).first()).toBeVisible();
});

test('PWA : manifeste, icônes et fonctionnement hors ligne', async ({ page, context }) => {
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ lang: 'fr', display: 'standalone' });
  for (const i of manifest.icons) expect((await page.request.get(`/${i.src}`)).ok()).toBe(true);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // le service worker contrôle maintenant la page et met les fichiers en cache
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('banner')).toContainText('Lhagva');
  await nav(page, 'Grimoire').click();
  await page.getByPlaceholder('Rechercher dans les règles…').fill('choc');
  await expect(btn(page, /^Choc/).first()).toBeVisible();
  await context.setOffline(false);
});
