import { type Locator, type Page } from '@playwright/test';

/**
 * PARTE 5 · PAGE OBJECT DE LA TIENDA.
 *
 * Las pruebas cuentan la HISTORIA ("agrego una mochila y aplico DESC10"); los localizadores (el "cómo") viven aquí,
 * en un solo lugar. Si mañana la tienda cambia su HTML, se corrige esta clase una vez y las pruebas siguen intactas.
 *
 * Regla de oro: el Page Object ofrece ACCIONES (agregar, aplicarCodigo...) y entrega LOCALIZADORES (cantidad, total...).
 * Las aserciones (expect) se quedan en las pruebas.
 */

/** Datos válidos de ejemplo para una compra. */
export const DATOS_VALIDOS = {
  nombre: 'Ana Gómez',
  correo: 'ana@correo.com',
  direccion: 'Calle 10 # 20-30',
};

const FILAS = {
  Subtotal: 'dt:text-is("Subtotal") + dd',
  Descuento: 'dt:text("Descuento") + dd', // la etiqueta incluye el porcentaje: se busca por una parte del texto
  IVA: 'dt:text-is("IVA (19%)") + dd',
  Total: 'dt:text-is("Total") + dd',
} as const;

export class TiendaPage {
  /** El panel del carrito (la tarjeta que tiene el encabezado "Carrito"). */
  readonly carrito: Locator;

  constructor(readonly page: Page) {
    this.carrito = page
      .locator('.rounded-lg')
      .filter({ has: page.getByRole('heading', { name: 'Carrito' }) });
  }

  // ---------- Catálogo ----------
  /** Abre la tienda y espera a que esté lista para recibir clics. */
  async abrir(): Promise<void> {
    await this.page.goto('/');
    await this.esperarQueEsteLista();
  }

  /**
   * Recarga la página y espera a que esté lista otra vez. Se borra antes la marca de localStorage para poder
   * esperar a que la página la vuelva a escribir (señal de que ya está lista). Úsenlo con el carrito vacío.
   */
  async recargar(): Promise<void> {
    await this.page.evaluate(() => window.localStorage.removeItem('qa-tienda-cart'));
    await this.page.reload();
    await this.esperarQueEsteLista();
  }

  /**
   * La tienda guarda el carrito en localStorage justo cuando React termina de "activar" la página. Esperar esa
   * CONDICIÓN (y no un tiempo fijo) garantiza que los botones ya responden.
   */
  private async esperarQueEsteLista(): Promise<void> {
    await this.page.waitForFunction(() => window.localStorage.getItem('qa-tienda-cart') !== null);
  }

  /** La tarjeta de un producto del catálogo. */
  tarjeta(producto: string): Locator {
    return this.page
      .locator('.rounded-lg')
      .filter({ has: this.page.getByRole('heading', { name: producto, level: 3 }) });
  }

  /** Escribe la cantidad en la tarjeta del producto y presiona "Agregar". */
  async agregar(producto: string, cantidad = 1): Promise<void> {
    const tarjeta = this.tarjeta(producto);
    await tarjeta.getByRole('spinbutton').fill(String(cantidad));
    await tarjeta.getByRole('button', { name: 'Agregar' }).click();
  }

  // ---------- Carrito ----------
  /** La línea del carrito de un producto. */
  linea(producto: string): Locator {
    return this.carrito.getByRole('listitem').filter({ hasText: producto });
  }

  /** El número de unidades que muestra el carrito para un producto. */
  cantidad(producto: string): Locator {
    return this.linea(producto).locator('span');
  }

  /** El mensaje "Tu carrito está vacío.". */
  get carritoVacio(): Locator {
    return this.carrito.getByText('Tu carrito está vacío.');
  }

  /** Escribe el código y presiona "Aplicar". */
  async aplicarCodigo(codigo: string): Promise<void> {
    await this.carrito.getByPlaceholder('Código de descuento').fill(codigo);
    await this.carrito.getByRole('button', { name: 'Aplicar' }).click();
  }

  /** Valor de una fila del resumen: 'Subtotal', 'Descuento', 'IVA' o 'Total'. */
  total(fila: 'Subtotal' | 'Descuento' | 'IVA' | 'Total'): Locator {
    return this.carrito.locator(FILAS[fila]);
  }

  /** El contador "N artículo(s)" del encabezado. */
  get contador(): Locator {
    return this.page.getByRole('banner').getByText(/artículo\(s\)/);
  }

  /** Presiona "Ir a pagar". */
  async irAPagar(): Promise<void> {
    await this.carrito.getByRole('button', { name: 'Ir a pagar' }).click();
  }

  // ---------- Checkout y confirmación ----------
  /** Un campo del formulario de envío, por el texto de su etiqueta. (getByLabel no funciona: la etiqueta no tiene "for".) */
  campo(etiqueta: 'Nombre completo' | 'Correo electrónico' | 'Dirección de entrega'): Locator {
    return this.page.locator(`label:text-is("${etiqueta}") + input`);
  }

  /** Llena el formulario con los datos que reciba. */
  async llenarDatos(datos: { nombre?: string; correo?: string; direccion?: string }): Promise<void> {
    if (datos.nombre !== undefined) await this.campo('Nombre completo').fill(datos.nombre);
    if (datos.correo !== undefined) await this.campo('Correo electrónico').fill(datos.correo);
    if (datos.direccion !== undefined) await this.campo('Dirección de entrega').fill(datos.direccion);
  }

  /** Presiona "Confirmar pedido". */
  async confirmar(): Promise<void> {
    await this.page.getByRole('button', { name: 'Confirmar pedido' }).click();
  }

  /** El encabezado "¡Pedido confirmado!". */
  get pedidoConfirmado(): Locator {
    return this.page.getByRole('heading', { name: '¡Pedido confirmado!' });
  }

  /** Lee el número de pedido de la pantalla de confirmación (ej. "1001"). */
  async numeroDePedido(): Promise<string> {
    const texto = await this.page.getByText(/Número de pedido:/).innerText();
    return texto.match(/#(\d+)/)?.[1] ?? '';
  }

  /** Presiona "Volver a la tienda" en la pantalla de confirmación. */
  async volverALaTienda(): Promise<void> {
    await this.page.getByRole('button', { name: 'Volver a la tienda' }).click();
  }

  /** Atajo: compra completa de un producto con datos válidos, hasta ver "¡Pedido confirmado!". */
  async comprar(producto: string): Promise<void> {
    await this.agregar(producto);
    await this.irAPagar();
    await this.llenarDatos(DATOS_VALIDOS);
    await this.confirmar();
    await this.pedidoConfirmado.waitFor(); // espera (no es una aserción): la compra terminó
  }
}
