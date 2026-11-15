// Extraction des illustrations d'un PDF (pdf.js exécuté dans le Chromium de Playwright, qui décode
// les images et sait les réencoder en WebP). Les paires image + masque de fondu (même emplacement)
// sont fusionnées : le masque devient la transparence de l'image.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PDFJS = path.join(ROOT, 'node_modules/pdfjs-dist/legacy/build/');

/** Ouvre un navigateur avec pdf.js et le PDF servis sur une origine locale fictive. */
export async function ouvrirPdf(pdf) {
  const navigateur = await chromium.launch();
  const page = await navigateur.newPage();
  await page.route('http://local/**', (r) => {
    const u = new URL(r.request().url());
    if (u.pathname === '/doc.pdf') return r.fulfill({ body: fs.readFileSync(pdf), contentType: 'application/pdf' });
    if (u.pathname === '/i.html') return r.fulfill({ body: '<!doctype html><p></p>', contentType: 'text/html' });
    return r.fulfill({ body: fs.readFileSync(path.join(PDFJS, u.pathname.slice(1))), contentType: 'text/javascript' });
  });
  await page.goto('http://local/i.html');
  await page.evaluate(async () => {
    const lib = await import('http://local/pdf.mjs');
    lib.GlobalWorkerOptions.workerSrc = 'http://local/pdf.worker.mjs';
    window.lib = lib;
    window.doc = await lib.getDocument('http://local/doc.pdf').promise;
  });
  return { navigateur, page };
}

/**
 * Illustrations d'une page : liste { bbox, largeur, hauteur, webp (data URL) }, fonds de page exclus
 * (images couvrant presque toute la page).
 * @param opts.max   plus grand côté en pixels (réduction éventuelle)
 * @param opts.qualite qualité WebP
 * @param opts.rogner  recadre sur le dessin (marges blanches ou transparentes retirées)
 * @param opts.gamma   > 1 fonce les traits (dessins au crayon pâles)
 */
export async function illustrationsDePage(page, numero, { max = 900, qualite = 0.8, surfaceMin = 6000, rogner = false, gamma = 1 } = {}) {
  return page.evaluate(
    async ({ numero, max, qualite, surfaceMin, rogner, gamma }) => {
      const { lib, doc } = window;
      const pg = await doc.getPage(numero);
      const ops = await pg.getOperatorList();
      const vp = pg.getViewport({ scale: 1 });
      const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
      let ctm = [1, 0, 0, 1, 0, 0];
      const pile = [];
      const vues = new Map();
      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        const args = ops.argsArray[i];
        if (fn === lib.OPS.save) pile.push(ctm);
        else if (fn === lib.OPS.restore) ctm = pile.pop() || ctm;
        else if (fn === lib.OPS.transform) ctm = mul(ctm, args);
        else if (fn === lib.OPS.paintImageXObject) {
          const w = Math.abs(ctm[0]) + Math.abs(ctm[2]);
          const h = Math.abs(ctm[1]) + Math.abs(ctm[3]);
          const bbox = { x: ctm[4], y: vp.height - ctm[5] - h, w, h };
          if (w * h < surfaceMin || w * h > vp.width * vp.height * 0.8) continue; // vignettes, fonds de page
          if (!vues.has(args[0])) vues.set(args[0], bbox);
        }
      }
      const toile = (o) => {
        const c = document.createElement('canvas');
        c.width = o.width;
        c.height = o.height;
        const ctx = c.getContext('2d');
        if (o.bitmap) ctx.drawImage(o.bitmap, 0, 0);
        else {
          const id = ctx.createImageData(o.width, o.height);
          const k = o.data.length / (o.width * o.height);
          for (let i = 0, j = 0; i < o.width * o.height; i++, j += k) {
            id.data[i * 4] = o.data[j];
            id.data[i * 4 + 1] = o.data[j + (k > 2 ? 1 : 0)];
            id.data[i * 4 + 2] = o.data[j + (k > 2 ? 2 : 0)];
            id.data[i * 4 + 3] = k === 4 ? o.data[j + 3] : 255;
          }
          ctx.putImageData(id, 0, 0);
        }
        return c;
      };
      const images = [];
      for (const [nom, bbox] of vues) {
        // les images partagées entre pages (« g_… ») sont dans commonObjs
        const depot = nom.startsWith('g_') ? pg.commonObjs : pg.objs;
        const o = await new Promise((ok) => depot.get(nom, ok));
        images.push({ nom, bbox, c: toile(o) });
      }
      // masque de fondu : coins noirs et image en niveaux de gris
      const estMasque = (c) => {
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const px = (x, y) => d[(y * c.width + x) * 4];
        const coins = [px(1, 1), px(c.width - 2, 1), px(1, c.height - 2), px(c.width - 2, c.height - 2)];
        let gris = true;
        for (let i = 0; i < d.length && gris; i += 4 * 97) if (Math.abs(d[i] - d[i + 1]) > 6 || Math.abs(d[i] - d[i + 2]) > 6) gris = false;
        return gris && coins.every((v) => v < 40);
      };
      const recouvre = (a, b) => {
        const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
        const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
        return (x * y) / Math.min(a.w * a.h, b.w * b.h);
      };
      const masques = images.filter((i) => estMasque(i.c));
      const sortie = [];
      for (const im of images.filter((i) => !masques.includes(i))) {
        let c = im.c;
        const m = masques.find((mk) => recouvre(mk.bbox, im.bbox) > 0.8);
        if (m) {
          // le masque couvre parfois une zone un peu plus grande : on le cale sur la boîte de l'image
          const r = document.createElement('canvas');
          r.width = c.width;
          r.height = c.height;
          const rc = r.getContext('2d');
          const sx = (im.bbox.x - m.bbox.x) / m.bbox.w * m.c.width;
          const sy = (im.bbox.y - m.bbox.y) / m.bbox.h * m.c.height;
          rc.drawImage(m.c, sx, sy, (im.bbox.w / m.bbox.w) * m.c.width, (im.bbox.h / m.bbox.h) * m.c.height, 0, 0, r.width, r.height);
          const md = rc.getImageData(0, 0, r.width, r.height).data;
          const ctx = c.getContext('2d');
          const id = ctx.getImageData(0, 0, c.width, c.height);
          for (let i = 0; i < id.data.length; i += 4) id.data[i + 3] = Math.round((id.data[i + 3] * md[i]) / 255);
          ctx.putImageData(id, 0, 0);
        }
        // traits au crayon foncés (gamma) : plus lisibles en vignette et une fois inversés (Veillée)
        if (gamma !== 1) {
          const ctx = c.getContext('2d');
          const id = ctx.getImageData(0, 0, c.width, c.height);
          const lut = Array.from({ length: 256 }, (_, v) => Math.round(255 * Math.pow(v / 255, gamma)));
          for (let i = 0; i < id.data.length; i += 4) {
            id.data[i] = lut[id.data[i]];
            id.data[i + 1] = lut[id.data[i + 1]];
            id.data[i + 2] = lut[id.data[i + 2]];
          }
          ctx.putImageData(id, 0, 0);
        }
        // recadrage sur le dessin : on retire les marges transparentes ou blanches (papier)
        if (rogner) {
          const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
          let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
          for (let y = 0; y < c.height; y += 2)
            for (let x = 0; x < c.width; x += 2) {
              const i = (y * c.width + x) * 4;
              const encre = d[i + 3] > 40 && (d[i] + d[i + 1] + d[i + 2]) / 3 < 228;
              if (encre) {
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
              }
            }
          if (x1 > x0 && y1 > y0) {
            const marge = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04);
            x0 = Math.max(0, x0 - marge);
            y0 = Math.max(0, y0 - marge);
            x1 = Math.min(c.width - 1, x1 + marge);
            y1 = Math.min(c.height - 1, y1 + marge);
            const r = document.createElement('canvas');
            r.width = x1 - x0 + 1;
            r.height = y1 - y0 + 1;
            r.getContext('2d').drawImage(c, x0, y0, r.width, r.height, 0, 0, r.width, r.height);
            c = r;
          }
        }
        // réduction
        const k = Math.min(1, max / Math.max(c.width, c.height));
        if (k < 1) {
          const r = document.createElement('canvas');
          r.width = Math.round(c.width * k);
          r.height = Math.round(c.height * k);
          r.getContext('2d').drawImage(c, 0, 0, r.width, r.height);
          c = r;
        }
        sortie.push({ nom: im.nom, bbox: im.bbox, largeur: c.width, hauteur: c.height, masque: !!m, webp: c.toDataURL('image/webp', qualite) });
      }
      return sortie;
    },
    { numero, max, qualite, surfaceMin, rogner, gamma },
  );
}

export const ecrireWebp = (fichier, dataUrl) => {
  fs.mkdirSync(path.dirname(fichier), { recursive: true });
  fs.writeFileSync(fichier, Buffer.from(dataUrl.split(',')[1], 'base64'));
};
