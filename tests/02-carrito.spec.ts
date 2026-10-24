import { test, expect } from '@playwright/test';

/**
 * BLOQUE CARRITO · US-04 a US-07.
 *
 * Las pruebas marcadas con test.fail(...) fallan por un bug conocido del PRODUCTO: la anotación lleva la clave
 * del bug en Jira. El día que la tienda se corrija, Playwright avisará ("Expected to fail, but passed").
 */

test.describe('US-04 · Agregar productos sin superar el stock', () => {
  // ─────────────── EJEMPLO GUIADO (resuelto) ───────────────
  test('CA1: se pueden agregar 15 cuadernos (stock 15)', async ({ page }) => {
    // ARRANGE: abrir la tienda
    await page.goto('/');

    // ACT: ubicar la tarjeta del cuaderno, escribir 15 en su cantidad y presionar "Agregar"
    const tarjeta = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Cuaderno universitario', level: 3 }) });
    await tarjeta.getByRole('spinbutton').fill('15');
    await tarjeta.getByRole('button', { name: 'Agregar' }).click();

    // ASSERT: en el carrito (la tarjeta con el encabezado "Carrito") aparece el cuaderno con cantidad 15
    const carrito = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Carrito' }) });
    const linea = carrito.getByRole('listitem').filter({ hasText: 'Cuaderno universitario' });
    await expect(linea.locator('span')).toHaveText('15');
  });

  test('CA2: no deja agregar 7 mochilas de una vez (stock 6) y avisa', async ({ page }) => {
    // ARRANGE
    await page.goto('/');
    const tarjeta = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Mochila escolar', level: 3 }) });
    const carrito = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Carrito' }) });

    // El alert() bloquea la página: el manejador se registra ANTES del clic que lo dispara.
    let aviso = '';
    page.once('dialog', async (dialogo) => {
      aviso = dialogo.message();
      await dialogo.accept();
    });

    // ACT
    await tarjeta.getByRole('spinbutton').fill('7');
    await tarjeta.getByRole('button', { name: 'Agregar' }).click();

    // ASSERT: avisó y el carrito sigue vacío
    await expect.poll(() => aviso).toContain('Solo hay 6 unidades');
    await expect(carrito.getByText('Tu carrito está vacío.')).toBeVisible();
  });

  test('CA3: 4 + 4 mochilas supera el stock (6) y debe rechazarse', async ({ page }) => {
    test.fail(true, 'JIRA-STOCK · sumando dos veces se supera el stock: el carrito queda con 8 mochilas');
    // ARRANGE
    await page.goto('/');
    const tarjeta = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Mochila escolar', level: 3 }) });
    const carrito = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Carrito' }) });
    page.on('dialog', (dialogo) => dialogo.accept()); // si la tienda avisa, se acepta el aviso

    // ACT: 4 mochilas y luego otras 4
    await tarjeta.getByRole('spinbutton').fill('4');
    await tarjeta.getByRole('button', { name: 'Agregar' }).click();
    await tarjeta.getByRole('button', { name: 'Agregar' }).click();

    // ASSERT: el criterio exige que no se supere el stock, así que la cantidad se queda en 4
    const linea = carrito.getByRole('listitem').filter({ hasText: 'Mochila escolar' });
    await expect(linea.locator('span')).toHaveText('4');
  });
});

test.describe('US-05 · Aumentar la cantidad desde el carrito', () => {
  test('CA2: "+" no pasa del stock (6 mochilas)', async ({ page }) => {
    test.fail(true, 'JIRA-MAS · el botón "+" del carrito deja pasar del stock (6 → 7)');
    // ARRANGE: las 6 mochilas del stock en el carrito
    await page.goto('/');
    const tarjeta = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Mochila escolar', level: 3 }) });
    await tarjeta.getByRole('spinbutton').fill('6');
    await tarjeta.getByRole('button', { name: 'Agregar' }).click();
    const carrito = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Carrito' }) });
    page.on('dialog', (dialogo) => dialogo.accept());

    // ACT
    await carrito.getByRole('button', { name: 'Aumentar cantidad de Mochila escolar' }).click();

    // ASSERT
    const linea = carrito.getByRole('listitem').filter({ hasText: 'Mochila escolar' });
    await expect(linea.locator('span')).toHaveText('6');
  });
});

test.describe('US-06 · Disminuir la cantidad desde el carrito', () => {
  test('CA2: con cantidad 1, "−" no la deja en 0 ni en negativo (elegimos: se queda en 1)', async ({ page }) => {
    test.fail(true, 'JIRA-MENOS · con cantidad 1, el botón "−" deja la cantidad en 0');
    // ARRANGE
    await page.goto('/');
    const tarjeta = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Mochila escolar', level: 3 }) });
    await tarjeta.getByRole('button', { name: 'Agregar' }).click();
    const carrito = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Carrito' }) });

    // ACT
    await carrito.getByRole('button', { name: 'Disminuir cantidad de Mochila escolar' }).click();

    // ASSERT: elegimos la salida "se queda en 1"
    const linea = carrito.getByRole('listitem').filter({ hasText: 'Mochila escolar' });
    await expect(linea.locator('span')).toHaveText('1');
  });
});

test.describe('US-07 · Quitar un producto del carrito', () => {
  test('CA2: quitar el único producto deja el carrito vacío y el total en $ 0', async ({ page }) => {
    // ARRANGE: abrir la tienda y agregar un esfero
    await page.goto('/');
    const tarjeta = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Esfero azul', level: 3 }) });
    await tarjeta.getByRole('button', { name: 'Agregar' }).click();

    // ACT: quitar el esfero desde el carrito
    const carrito = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Carrito' }) });
    await carrito.getByRole('button', { name: 'Eliminar Esfero azul' }).click();

    // ASSERT: el carrito queda vacío y el total en $ 0
    await expect(carrito.getByText('Tu carrito está vacío.')).toBeVisible();
    await expect(carrito.locator('dt:text-is("Total") + dd')).toHaveText('$ 0');
  });
});
