import { test, expect } from '@playwright/test';

/**
 * PRUEBAS HEREDADAS (Parte 4) · ya diagnosticadas. El veredicto y la evidencia están en ENTREGA.md, sección 3.
 *
 *  H1 · DEFECTO DE LA PRUEBA: esperaba 6 productos, pero el catálogo (US-01 · CA1) tiene 8. Dato viejo → corregida.
 *  H2 · BUG DEL PRODUCTO: el valor esperado ($ 19.760 = 19% de 130.000 − 26.000) es correcto según el requisito;
 *       la tienda calcula el IVA sobre el subtotal sin descontar ($ 24.700). Mismo bug que US-11 · CA2 → fallo esperado.
 *  H3 · PRUEBA INESTABLE: hacía clic apenas llegaba el HTML (waitUntil: 'domcontentloaded'), antes de que la página
 *       estuviera lista para responder, y a veces el clic se perdía. Se estabilizó esperando una CONDICIÓN, no un tiempo.
 */

test('H1 · el catálogo tiene 8 productos', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(8);
});

test('H2 · el IVA de 2 mochilas con DESC20 es $ 19.760', async ({ page }) => {
  test.fail(true, 'JIRA-IVA · con descuento, el IVA se calcula sobre el subtotal sin descontar');
  await page.goto('/');
  const tarjeta = page
    .locator('.rounded-lg')
    .filter({ has: page.getByRole('heading', { name: 'Mochila escolar', level: 3 }) });
  await tarjeta.getByRole('spinbutton').fill('2');
  await tarjeta.getByRole('button', { name: 'Agregar' }).click();
  await page.getByPlaceholder('Código de descuento').fill('DESC20');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.locator('dt:text-is("IVA (19%)") + dd')).toHaveText('$ 19.760');
});

test('H3 · agregar un cuaderno justo después de cargar', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // La página está lista cuando guarda el carrito en localStorage por primera vez: se espera esa condición.
  await page.waitForFunction(() => window.localStorage.getItem('qa-tienda-cart') !== null);
  await page.getByRole('button', { name: 'Agregar' }).first().click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Cuaderno universitario' })).toBeVisible();
});
