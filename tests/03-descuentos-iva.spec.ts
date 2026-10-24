import { test, expect } from '@playwright/test';
import { TiendaPage } from '../pages/TiendaPage';

/**
 * BLOQUE DESCUENTOS E IMPUESTOS · US-09 a US-12.
 * Valores útiles (producto: Mochila escolar, $ 65.000): DESC10 → descuento $ 6.500 · DESC20 → $ 13.000.
 */

/** Formatea un número como lo hace la tienda (pesos colombianos, sin decimales). */
const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

test.describe('US-09 · Aplicar un código de descuento', () => {
  test('CA1: DESC10 descuenta el 10% del subtotal', async ({ page }) => {
    // ARRANGE: 1 mochila en el carrito
    await page.goto('/');
    const tarjeta = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Mochila escolar', level: 3 }) });
    await tarjeta.getByRole('button', { name: 'Agregar' }).click();
    const carrito = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Carrito' }) });

    // ACT
    await carrito.getByPlaceholder('Código de descuento').fill('DESC10');
    await carrito.getByRole('button', { name: 'Aplicar' }).click();

    // ASSERT: la fila "Descuento" muestra "− $ 6.500" (por eso toContainText y no toHaveText)
    await expect(carrito.locator('dt:text("Descuento") + dd')).toContainText('$ 6.500');
  });

  // Prueba dirigida por datos: una prueba por variante. Las variantes con bug fallan hoy (la tienda distingue
  // mayúsculas y minúsculas), así que solo ESAS filas quedan como fallo esperado.
  const VARIANTES = [
    { codigo: 'desc10', bug: 'JIRA-MAYUS' },
    { codigo: 'Desc10', bug: 'JIRA-MAYUS' },
    { codigo: ' DESC10 ', bug: '' },
  ];
  for (const { codigo, bug } of VARIANTES) {
    test(`CA3: el código "${codigo}" se reconoce igual que DESC10`, async ({ page }) => {
      test.fail(bug !== '', `${bug} · el código de descuento distingue mayúsculas y minúsculas`);
      const tienda = new TiendaPage(page);
      await tienda.abrir();
      await tienda.agregar('Mochila escolar');

      await tienda.aplicarCodigo(codigo);

      await expect(tienda.total('Descuento')).toContainText('$ 6.500');
    });
  }
});

test.describe('US-10 · Recibir aviso si el código no es válido', () => {
  test('CA1: un código inexistente muestra el aviso y el total no cambia', async ({ page }) => {
    // ARRANGE: 1 mochila ($ 77.350 de total)
    await page.goto('/');
    const tarjeta = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Mochila escolar', level: 3 }) });
    await tarjeta.getByRole('button', { name: 'Agregar' }).click();
    const carrito = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Carrito' }) });
    await expect(carrito.locator('dt:text-is("Total") + dd')).toHaveText('$ 77.350');

    // ACT
    await carrito.getByPlaceholder('Código de descuento').fill('ABC123');
    await carrito.getByRole('button', { name: 'Aplicar' }).click();

    // ASSERT
    await expect(carrito.locator('p.text-xs')).toHaveText('Código de descuento no válido.');
    await expect(carrito.locator('dt:text-is("Total") + dd')).toHaveText('$ 77.350');
  });

  test('CA2: un código inválido NO borra un descuento válido ya aplicado', async ({ page }) => {
    test.fail(true, 'JIRA-CODIGO · aplicar un código inválido borra el descuento válido que ya estaba');
    // ARRANGE: 1 mochila con DESC10 aplicado
    await page.goto('/');
    const tarjeta = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Mochila escolar', level: 3 }) });
    await tarjeta.getByRole('button', { name: 'Agregar' }).click();
    const carrito = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Carrito' }) });
    const codigo = carrito.getByPlaceholder('Código de descuento');
    const descuento = carrito.locator('dt:text("Descuento") + dd');
    await codigo.fill('DESC10');
    await carrito.getByRole('button', { name: 'Aplicar' }).click();
    await expect(descuento).toContainText('$ 6.500');

    // ACT: aplicar un código inválido
    await codigo.fill('ABC123');
    await carrito.getByRole('button', { name: 'Aplicar' }).click();

    // ASSERT: el descuento de $ 6.500 se mantiene
    await expect(descuento).toContainText('$ 6.500');
  });
});

test.describe('US-11 · Ver el IVA correcto', () => {
  test('CA2: con descuento, el IVA se calcula sobre el valor descontado', async ({ page }) => {
    test.fail(true, 'JIRA-IVA · con descuento, el IVA se calcula sobre el subtotal sin descontar');
    // ORÁCULO: el valor esperado sale del REQUISITO, no de lo que muestra la tienda.
    const subtotal = 65000;
    const descuento = subtotal * 0.1;
    const ivaEsperado = (subtotal - descuento) * 0.19; // $ 11.115

    const tienda = new TiendaPage(page);
    await tienda.abrir();
    await tienda.agregar('Mochila escolar');
    await tienda.aplicarCodigo('DESC10');

    await expect(tienda.total('IVA')).toHaveText(cop(ivaEsperado));
  });
});

test.describe('US-12 · Ver el total a pagar correcto', () => {
  test('CA2: con descuento, el total es subtotal − descuento + IVA (IVA sobre lo descontado)', async ({ page }) => {
    test.fail(true, 'JIRA-IVA · el total sale mal porque el IVA se calcula sobre el subtotal sin descontar');
    const subtotal = 65000;
    const descuento = subtotal * 0.1;
    const iva = (subtotal - descuento) * 0.19;
    const totalEsperado = subtotal - descuento + iva; // $ 69.615

    const tienda = new TiendaPage(page);
    await tienda.abrir();
    await tienda.agregar('Mochila escolar');
    await tienda.aplicarCodigo('DESC10');

    await expect(tienda.total('Total')).toHaveText(cop(totalEsperado));
  });
});
