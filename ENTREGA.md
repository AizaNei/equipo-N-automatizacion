# Entrega · Laboratorio 3.1 · Introducción a la automatización de pruebas

**Equipo:** individual · **Integrantes:** Neiver Fernandez · **Repositorio:** https://github.com/AizaNei/equipo-N-automatizacion

> Respondan aquí, en este archivo, y háganle commit. Sean breves y concretos: una frase buena vale más que un párrafo.

## 1. ¿Qué automatizamos y por qué? (decisión)

| Criterio (US-xx · CAy) | ¿Automatizamos? | Por qué (frecuencia · riesgo · estabilidad · facilidad de verificar) |
|---|---|---|
| US-04 · CA2 (no agregar más del stock) | Sí | Riesgo alto (vender lo que no hay). El aviso y el carrito vacío se verifican sin ambigüedad. |
| US-04 · CA3 (4 + 4 supera el stock) | Sí | Mismo riesgo que CA2, por otro camino. A mano casi nunca se prueba sumar dos veces; la máquina lo hace siempre. |
| US-05 · CA2 ("+" respeta el stock) | Sí | Botón que se usa mucho; el resultado es un número fácil de comparar. |
| US-06 · CA2 ("−" no baja de 1) | Sí | Valor límite clásico (1 → 0); deja el carrito en un estado inválido. |
| US-07 · CA2 (quitar el único producto) | Sí | Flujo frecuente y estable; el texto "Tu carrito está vacío." y el total $ 0 son verificables. |
| US-09 · CA1 y CA3 (códigos de descuento) | Sí | Afecta dinero. Prueba dirigida por datos: agregar una variante cuesta una línea. |
| US-10 · CA1 y CA2 (código inválido) | Sí | Riesgo de perder un descuento ya ganado; la secuencia de dos códigos es tediosa a mano. |
| US-11 · CA2 y US-12 · CA2 (IVA y total con descuento) | Sí | Riesgo máximo (cobro e impuestos). Un oráculo calculado desde el requisito evita aprobar el número que muestra la app. |
| US-13 · CA3 (no pagar con total cero) | Sí | Riesgo de pedidos inválidos; `toBeDisabled()` es una verificación exacta. |
| US-14 · CA1 y CA2 (campos obligatorios) | Sí | Estable y repetitivo: los mismos tres mensajes en cada versión. |
| US-15 · CA1 a CA4 (formato del correo) | Sí | 12 correos distintos: a mano es lento y propenso a errores; con datos es una tabla. |
| US-16 · CA1, US-17 · CA1 a CA3, US-19 · CA1 (confirmación) | Sí | Flujo completo de compra, el más importante del negocio. Con el Page Object, `comprar()` se escribe una vez. |
| US-20 (accesibilidad) | Más adelante | Una herramienta automática (axe) encuentra parte; la experiencia real con lector de pantalla requiere revisión humana. |
| Diseño visual / responsivo | No (por ahora) | Cambia seguido y "se ve bien" es difícil de verificar por una máquina sin comparaciones de imágenes. |

## 2. Bugs que nuestra suite detecta

| Prueba (archivo › título) | Bug en Jira (clave) | ¿Quedó con `test.fail(...)`? | Evidencia (captura o trace) |
|---|---|---|---|
| 02-carrito › US-04 CA3: 4 + 4 mochilas supera el stock | CDC-14 | Sí | Expected "4", Received "8" |
| 02-carrito › US-05 CA2: "+" no pasa del stock | CDC-17 | Sí | Expected "6", Received "7" |
| 02-carrito › US-06 CA2: "−" no la deja en 0 | CDC-20 | Sí | Expected "1", Received "0" |
| 03-descuentos-iva › US-09 CA3: "desc10" y "Desc10" | CDC-30 | Sí (solo esas 2 filas) | La fila Descuento queda en $ 0 |
| 03-descuentos-iva › US-10 CA2: un código inválido no borra el descuento | CDC-33 | Sí | Descuento pasa de $ 6.500 a $ 0 |
| 03-descuentos-iva › US-11 CA2 · heredados › H2 | CDC-36 | Sí | IVA esperado $ 11.115, recibido $ 12.350 (H2: esperado $ 19.760, recibido $ 24.700) |
| 03-descuentos-iva › US-12 CA2: total con descuento | CDC-39 | Sí | Total esperado $ 69.615, recibido $ 70.850 |
| 04-checkout › US-13 CA3: no se paga con total cero | CDC-42 | Sí | El botón "Ir a pagar" sigue habilitado |
| 04-checkout › US-15 CA1-CA3: correos válidos (4 de 6 filas) | CDC-48 | Sí (solo esas 4 filas) | No aparece "¡Pedido confirmado!" |
| 05-confirmacion › US-16 CA1: formulario vacío en la compra siguiente | CDC-51 | Sí | El nombre aparece como "Ana Gómez" |
| 05-confirmacion › US-17 CA3: número de pedido tras recargar | CDC-54 | Sí | Ambos pedidos salen con el mismo número (#1001) |

Sobre US-11 y US-12: en Jira son dos issues (CDC-36 y CDC-39), pero tienen **la misma causa raíz**: el IVA se calcula sobre el subtotal sin descontar, y el total sale mal como consecuencia. Si se corrige el cálculo del IVA, las dos pruebas deberían pasar. US-13 CA3 parece igual a US-06 CA2, pero es **otro bug**: aunque se corrija el "−", la tienda seguiría sin validar el total antes de cobrar.

En US-15, las 4 filas que fallan tienen en común un carácter `.`, `-` o `+` antes de la @, o un dominio de dos niveles (`.edu.co`): es **un solo bug**, una validación de correo demasiado estricta.

## 3. Pruebas heredadas: nuestro diagnóstico

| Prueba | Veredicto (producto / prueba / inestable / entorno) | Cómo lo comprobamos | Qué hicimos |
|---|---|---|---|
| H1 · el catálogo tiene 6 productos | Prueba | Falló siempre igual (Expected 6, Received 8). Contamos a mano: hay 8 productos, y US-01 · CA1 dice 8. El dato de la prueba estaba viejo. | La corregimos a 8. |
| H2 · el IVA de 2 mochilas con DESC20… | Producto | Recalculamos con el requisito: (130.000 − 26.000) × 19 % = $ 19.760; la prueba estaba bien. A mano la tienda muestra $ 24.700 (19 % de 130.000 sin descontar). Falla siempre igual. Es el mismo bug de US-11 · CA2. | `test.fail` con la clave del bug del IVA. |
| H3 · agregar un cuaderno justo después de cargar | Inestable | Con `--repeat-each=10` dio resultados mezclados: __ de 10 fallaron. Hacía clic con `waitUntil: 'domcontentloaded'`, antes de que la página estuviera lista para responder. | Esperamos una **condición** (la página escribe el carrito en localStorage al estar lista) en lugar de una pausa fija. Después: __ de 10 pasaron. |

## 4. Medidas

- Casos de prueba de nuestro plan en Jira: **61** · automatizados en este laboratorio: **27** (**44 %**)
- Tiempo que nos tomó escribir las pruebas automatizadas: **\_\_ min** · tiempo de ejecutar toda la suite: **23,8 s**
- Tiempo estimado de ejecutar **a mano** esos mismos casos: **\_\_ min**
- Con esos números, ¿en cuántas ejecuciones se paga la automatización? (inversión ÷ ahorro por ejecución): **\_\_**

## 5. Reflexión (máximo 5 líneas cada una)

1. **¿Qué casos de nuestro plan no automatizaríamos y por qué?**
   No automatizaría los de diseño, como ver la tienda en un celular de 375 px (US-01 CA4) o los contrastes de color de US-20. Pienso que ahí la pregunta es "¿se ve bien?" y eso lo juzga mejor una persona mirando que una prueba comparando textos. Tampoco automatizaría algo que se prueba una sola vez y no vuelve a cambiar, porque escribir la prueba toma más tiempo que hacerlo a mano.

2. **Si la tienda cambia el HTML de un botón, ¿qué se rompe y qué no? ¿Qué aportó el Page Object?**
   Las pruebas que escriben el localizador directamente (como las de 02-carrito) se romperían todas, y habría que corregir una por una. Las que usan `TiendaPage` no: solo cambiaría el método de la clase y listo. Lo noté al escribir la compra completa varias veces: con `comprar()` cada prueba queda de pocas líneas y se entiende qué está probando sin leer HTML.

3. **Una prueba roja que no era un bug del producto: ¿cómo nos dimos cuenta?**
   Me pasó en la Parte 1: cambié el 8 por 9 para romper la prueba, y cuando lo devolví a 8 seguía saliendo `1 failed`. La tienda no había cambiado, el problema era que no había guardado el archivo en VS Code. Me di cuenta porque el error seguía diciendo `Expected: 9`. También H1: esperaba 6 productos, pero contando a mano en la tienda hay 8, así que el dato de la prueba estaba viejo.

4. **¿Qué bug o riesgo no habría encontrado la automatización por sí sola?**
   La automatización solo encuentra lo que uno le dice que revise. Por ejemplo, que una dirección muy larga se salga de la tarjeta de confirmación (B18) o que el botón ✕ casi no se vea (B21) no lo detecta ninguna de mis pruebas. Tampoco habría encontrado los bugs si yo no hubiera leído bien los criterios: si la prueba afirma lo que la tienda hace hoy, el bug pasa como si fuera correcto.

5. **¿Qué haríamos distinto en un proyecto real?**
   Empezaría con el Page Object desde el principio y no al final, porque repetí mucho código antes de tenerlo. También le pediría al equipo de desarrollo que pusiera identificadores de prueba (`data-testid`) y que las etiquetas del formulario estén bien conectadas, porque `getByLabel` no funcionaba y tocó buscar los campos de forma más frágil. Y correría la suite en cada cambio desde el día uno, no solo al terminar.
