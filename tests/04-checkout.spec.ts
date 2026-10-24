import { test, expect } from '@playwright/test';
import { TiendaPage, DATOS_VALIDOS } from '../pages/TiendaPage';

/**
 * BLOQUE CHECKOUT · US-13 a US-15.
 *
 * HALLAZGO: en el formulario de envío page.getByLabel('Nombre completo') NO encuentra el campo, porque las
 * etiquetas <label> no están asociadas a su <input> (no tienen atributo "for" ni envuelven al campo). Es también un
 * problema de accesibilidad: un lector de pantalla no sabe cómo se llama cada campo. Se usa en cambio
 * page.locator('label:text-is("Nombre completo") + input') (la etiqueta va justo antes del campo).
 */

// Datos listos para la prueba dirigida por datos (US-15).
const CORREOS_VALIDOS = [
  'juan@correo.com',
  'ana_gomez@gmail.com',
  'ana.gomez@gmail.com',
  'ana-gomez@gmail.com',
  'ana+tienda@gmail.com',
  'ana@universidad.edu.co',
];
const CORREOS_MAL_FORMADOS = ['ana.gmail.com', 'ana@', '@gmail.com', 'ana gomez@gmail.com', 'ana@@gmail.com', 'ana@gmail'];

// Las filas que hoy fallan: todas tienen un carácter "especial" (. - +) antes de la @ o un dominio de varios
// niveles (.edu.co). Es UN solo bug: la validación del correo es demasiado estricta.
const CORREOS_CON_BUG = new Set(['ana.gomez@gmail.com', 'ana-gomez@gmail.com', 'ana+tienda@gmail.com', 'ana@universidad.edu.co']);

test.describe('US-13 · Ir a pagar desde el carrito', () => {
  test('CA3: con total cero o negativo no se puede ir a pagar', async ({ page }) => {
    test.fail(true, 'CDC-42 · con la cantidad en 0 (total $ 0) el botón "Ir a pagar" sigue habilitado');
    const tienda = new TiendaPage(page);
    await tienda.abrir();
    await tienda.agregar('Mochila escolar');

    // ACT: llevar la cantidad a 0 con "−"
    await tienda.carrito.getByRole('button', { name: 'Disminuir cantidad de Mochila escolar' }).click();

    // ASSERT
    await expect(tienda.carrito.getByRole('button', { name: 'Ir a pagar' })).toBeDisabled();
  });
});

test.describe('US-14 · Completar mis datos de envío', () => {
  test('CA1: con el formulario vacío hay un error por cada campo obligatorio', async ({ page }) => {
    const tienda = new TiendaPage(page);
    await tienda.abrir();
    await tienda.agregar('Esfero azul');
    await tienda.irAPagar();

    await tienda.confirmar();

    await expect(page.getByText('El nombre es obligatorio.')).toBeVisible();
    await expect(page.getByText('El correo es obligatorio.')).toBeVisible();
    await expect(page.getByText('La dirección es obligatoria.')).toBeVisible();
    await expect(tienda.pedidoConfirmado).toHaveCount(0);
  });

  test('CA2: un nombre y una dirección de solo espacios se rechazan como vacíos', async ({ page }) => {
    const tienda = new TiendaPage(page);
    await tienda.abrir();
    await tienda.agregar('Esfero azul');
    await tienda.irAPagar();

    await tienda.llenarDatos({ nombre: '   ', correo: DATOS_VALIDOS.correo, direccion: '   ' });
    await tienda.confirmar();

    await expect(page.getByText('El nombre es obligatorio.')).toBeVisible();
    await expect(page.getByText('La dirección es obligatoria.')).toBeVisible();
    await expect(tienda.pedidoConfirmado).toHaveCount(0);
  });
});

test.describe('US-15 · Ingresar un correo electrónico válido', () => {
  for (const correo of CORREOS_VALIDOS) {
    test(`CA1-CA3: el correo válido ${correo} se acepta`, async ({ page }) => {
      test.fail(CORREOS_CON_BUG.has(correo), 'CDC-48 · la tienda rechaza correos válidos con . - + o dominio .edu.co');
      const tienda = new TiendaPage(page);
      await tienda.abrir();
      await tienda.agregar('Esfero azul');
      await tienda.irAPagar();

      await tienda.llenarDatos({ nombre: DATOS_VALIDOS.nombre, correo, direccion: DATOS_VALIDOS.direccion });
      await tienda.confirmar();

      await expect(tienda.pedidoConfirmado).toBeVisible();
    });
  }

  for (const correo of CORREOS_MAL_FORMADOS) {
    test(`CA4: el correo mal formado "${correo}" se rechaza con un mensaje claro`, async ({ page }) => {
      const tienda = new TiendaPage(page);
      await tienda.abrir();
      await tienda.agregar('Esfero azul');
      await tienda.irAPagar();

      await tienda.llenarDatos({ nombre: DATOS_VALIDOS.nombre, correo, direccion: DATOS_VALIDOS.direccion });
      await tienda.confirmar();

      await expect(page.getByText('El correo no tiene un formato válido.')).toBeVisible();
      await expect(tienda.pedidoConfirmado).toHaveCount(0);
    });
  }
});
