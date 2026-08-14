# Validación a mano

Las 7 fases están cerradas y sus criterios de aceptación se verifican solos:

```bash
npm test          # 64 pruebas de lógica pura (dinero, folios, fechas, retícula, precios)
npm run test:e2e  # 41 pruebas de navegador: los criterios de las 7 fases
npm run verify    # tipos + lint + formato + build
```

Esta guía es para lo otro: **lo que una máquina no puede firmar**. Son ocho cosas.
Las cuatro primeras necesitan papel o dinero de verdad; las cuatro últimas son
juicio tuyo sobre el producto.

Producción: <https://pos-papeleria.vercel.app> · `admin` / `password` · PIN `1234`

---

## Lo que hay que ver en el mundo físico

### 1. El ticket sale bien en la impresora térmica

**Por qué falta:** la prueba mide que la cinta ocupa 80mm en el navegador y que la
regla `@page` es la correcta. Lo que no puede saber es cómo se comporta tu
impresora.

**Cómo:** haz una venta cualquiera → «Imprimir ticket» → Ctrl+P con el rollo
puesto.

**Qué mirar:** que no se corte por los lados, que el total se lea de lejos, que
los importes queden alineados en columna, y que el corte automático no se coma el
pie.

### 2. Una imagen de 5×5 cm mide 5×5 cm

**Por qué falta:** §7.8 lo dice con todas sus letras — «mídelo con regla». Es la
única prueba real de que la conversión de unidades quedó bien.

**Cómo:** Herramientas → Acomodar impresión → sube una imagen → layout `1 (1×1)`,
papel Carta, orientación Vertical → marca «Usar tamaño fijo» con 5 y 5 → Generar
PDF → imprime **al 100%, sin «ajustar a la página»**.

**Qué mirar:** que el cuadro mida 5cm de lado con una regla encima.

### 3. El PDF coincide con la vista previa, celda por celda

**Por qué falta:** la prueba verifica que el PDF es válido y tiene las páginas que
anuncia la pantalla, pero comparar dos imágenes a ojo es cosa tuya.

**Cómo:** sube 5 imágenes con layout `4 (2×2)` y compara la pantalla con el PDF,
hoja por hoja.

**Qué mirar:** que cada imagen esté en la misma celda, del mismo tamaño, y que las
guías de corte caigan donde mismo.

### 4. Un corte de caja con dinero de verdad

**Por qué falta:** las pruebas cuadran los números, pero el corte solo vale si
coincide con lo que hay en el cajón.

**Cómo:** abre turno con un fondo real, haz unas ventas del día, cierra contando
el efectivo.

**Qué mirar:** que el efectivo esperado sea el fondo más lo cobrado en efectivo, y
que la diferencia salga en verde si cuadra y en rojo si falta.

---

## Lo que es juicio tuyo

### 5. Buscar en los bancos de imágenes

**Por qué falta:** no hay llaves de API configuradas. Hoy el buscador dice
«Configura la API Key de {proveedor} para buscar», que es el criterio 10 y sí está
probado.

**Cómo:** consigue las llaves gratuitas de Unsplash, Pexels y Pixabay, ponlas en
`.env.local` y en Vercel, y busca «gato» en los tres.

**Qué mirar:** que lleguen miniaturas, que puedas marcar dos y que entren al lote
como imágenes normales.

### 6. ¿Se ve como una papelería?

§4 dice que la estética es papel bond, tinta y filetes, no software genérico.

**Qué mirar:** que el amarillo `marcador` aparezca **solo** en el total y en el
renglón activo del carrito. Si lo ves en un tercer sitio, se perdió. Que las
sombras sean un filete seco y no un difuminado. Que los bordes estén casi sin
redondear.

### 7. ¿Se puede cobrar sin mouse, de verdad?

La prueba lo hace: F2 → buscar → Enter → F12 → importe → Enter → F12. Pero una
cajera con prisa es otra cosa.

**Qué mirar:** siéntate en la caja y cobra cinco ventas seguidas sin tocar el
mouse. Si algo te obliga a soltar el teclado, eso es el hallazgo.

### 8. ¿Los textos suenan a mostrador?

§ del documento pide tono llano: «Cobrar», no «Procesar transacción».

**Qué mirar:** los mensajes de error sobre todo. Si alguno suena a informático,
dímelo y lo cambio.

---

## Lo que queda pendiente, y no es un descuido

- **Producción y desarrollo comparten la misma base de Supabase.** Antes de la
  primera venta real hace falta separarlas, o las pruebas escribirán donde escribe
  el negocio.
- **No hay auto-deploy.** Cada despliegue va por `npx vercel deploy --prod --yes`,
  porque la cuenta de Vercel no está conectada con GitHub.
- **«Descargar PDF» del ticket.** §6 lo pide con pdf-lib; hoy solo está
  «Imprimir». La librería ya está instalada por la Fase 7.
- **La migración de `sale_items`** para cobrar servicios sin producto asociado.
  §6 manda dejarla anotada y no hacerla todavía. Sigue anotada.
