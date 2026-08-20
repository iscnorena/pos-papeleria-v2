# Prompt: Precarga de Ticket por Voz en Caja

## Contexto

Tengo un sistema de punto de venta (POS) ya desarrollado. En caja, en vez de
escanear cada código de barras, quiero que el cajero pueda **decir en voz
alta la lista de lo que lleva el cliente** (ej. "lleva un borrador marca
Dixon, lleva un lapicero marca Bic, lleva una libreta raya marca Escribe,
lleva 4 libretas raya marca Swing") y que el sistema:

1. Transcriba el audio.
2. Interprete esa transcripción y extraiga una lista estructurada de items
   (cantidad, producto, marca).
3. Busque cada item contra el catálogo y arme un **ticket precargado**
   (carrito borrador), no una venta ya cerrada.
4. El cajero **revisa y ajusta** el ticket (cantidades, resolver
   ambigüedades de producto, agregar/quitar líneas) y **confirma** para
   cerrar la venta y cobrar.

**Idea central, no negociable**: la voz nunca cobra directo. Es exactamente
el mismo principio de control que ya usamos en el módulo de Recepción de
Mercancía por factura XML — la voz **precarga**, un humano **revisa y
autoriza** (aquí, cierra la venta). Nada se descuenta de inventario ni se
cobra hasta que el cajero confirma el ticket.

**Antes de proponer o escribir código**, explora el repositorio actual
(cómo está armado hoy el flujo de caja/carrito, qué usa para búsqueda de
productos, qué stack de frontend/backend tiene) y adapta la propuesta a
eso. No asumas un framework específico.

## Pipeline técnico (visión general)

```
Audio (micrófono) → Speech-to-Text → Texto plano
   → Extracción de items (cantidad + producto + marca) → Lista estructurada
   → Matching contra catálogo (por item) → Carrito precargado con candidatos
   → Revisión/ajuste del cajero → Confirmar → Venta cerrada (flujo normal del POS)
```

Cada flecha es un componente reemplazable — no acoplar el flujo completo a
un solo proveedor de STT o de matching, para poder cambiarlo si el costo o
la precisión no convence en producción.

## Opciones técnicas por componente

### 1. Speech-to-Text (audio → texto)

| Opción                                                 | Costo                                             | Notas                                                                                                                                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Web Speech API** (`SpeechRecognition` del navegador) | Gratis                                            | Nativo en Chrome/Edge (usa el motor de Google por debajo). Requiere internet, no funciona bien en Firefox/Safari, no hay garantía de soporte a largo plazo del estándar. Bueno para arrancar un piloto sin costo ni infraestructura. |
| **Whisper (OpenAI, open source) autoalojado**          | Gratis (solo tu hardware)                         | Corre en tu propio servidor/PC, sin enviar audio a terceros. Buena precisión en español. Necesita CPU decente o idealmente GPU para que la latencia sea aceptable en caja (con solo CPU puede tardar varios segundos).               |
| **API de Whisper (OpenAI, cloud)**                     | De paga, muy barato (~$0.006 USD/minuto de audio) | Sin infraestructura propia, buena precisión, fácil de integrar.                                                                                                                                                                      |
| **Google Cloud Speech-to-Text**                        | Tiene capa gratuita (60 min/mes) y luego de paga  | Buen soporte de español de México específicamente.                                                                                                                                                                                   |
| **Azure Speech Services**                              | Tiene capa gratuita (5 horas/mes) y luego de paga | Similar a Google, buen soporte de español.                                                                                                                                                                                           |
| **Deepgram / AssemblyAI**                              | De paga (con crédito gratis de prueba)            | Muy rápidos (streaming en tiempo real), pensados para casos de uso en vivo como este.                                                                                                                                                |

**Para un solo punto de venta**, el volumen de audio real es bajísimo
(segundos por venta, no hoy corriendo 24/7), así que casi cualquier capa
gratuita (Google/Azure) o el costo de Whisper cloud es prácticamente
insignificante en la práctica — no es donde hay que optimizar presupuesto.

### 2. Extracción de items desde el texto (texto → lista estructurada)

| Opción                                            | Costo                               | Notas                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reglas/regex a mano** ("lleva N... marca...")   | Gratis                              | Rápido de implementar si la forma de hablar es consistente, pero frágil ante variaciones de fraseo, números en palabras ("cuatro" vs "4"), o frases que no siguen el patrón esperado.                                                                                                                                                        |
| **LLM vía API (Claude Haiku, GPT-4o mini, etc.)** | De paga, muy barato por transacción | Se le manda el texto transcrito con instrucción de devolver JSON con `[{cantidad, producto, marca}]`. Maneja lenguaje natural variado, números en palabras, sinónimos, sin tener que programar reglas. El costo por ticket es fracciones de centavo dado lo corto del texto — para el volumen de una papelería es prácticamente nulo al mes. |
| **LLM local (Llama/Mistral vía Ollama)**          | Gratis (solo tu hardware)           | Sin costo por uso ni dependencia de internet, pero requiere más configuración y hardware, y suele ser menos preciso que un modelo comercial para este tipo de extracción.                                                                                                                                                                    |

**Recomendación**: para la calidad de resultado vs. esfuerzo de desarrollo,
un LLM comercial barato (extracción) es la opción con mejor costo-beneficio
— el volumen de una caja no genera gasto relevante, y ahorra tener que
mantener reglas frágiles de lenguaje natural a mano.

### 3. Matching de cada item contra el catálogo (texto → producto/SKU)

| Opción                                                                                                      | Costo                                         | Notas                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Búsqueda por similitud en la propia base de datos** (`pg_trgm` en PostgreSQL, `LIKE`/`FULLTEXT` en MySQL) | Gratis                                        | Si el POS ya usa una de estas bases de datos, es la opción más simple: no agrega infraestructura nueva.                                                         |
| **Fuse.js** (JS, búsqueda difusa en memoria)                                                                | Gratis                                        | Útil si el catálogo no es enorme y quieres resolver el matching en el propio backend/frontend sin tocar la base de datos.                                       |
| **Meilisearch / Typesense** (self-hosted)                                                                   | Gratis (open source, solo tu infraestructura) | Motores de búsqueda tolerantes a errores tipográficos, pensados justo para este tipo de búsqueda "por nombre parecido". Requieren correr un servicio adicional. |
| **Meilisearch Cloud / Typesense Cloud / Algolia**                                                           | De paga (con capa gratuita pequeña)           | Mismo motor, administrado — quitas la carga de mantenerlo tú, pero agrega costo mensual si el catálogo/tráfico crece.                                           |

**Recomendación**: reutilizar el mismo mecanismo de "sugerencias por
similitud de texto" que ya se definió en el módulo de Recepción de
Mercancía para vincular productos nuevos — es exactamente el mismo
problema (texto libre → producto del catálogo) y evita mantener dos
soluciones distintas para lo mismo.

## Requerimientos funcionales

1. **Captura de audio**: botón de "grabar" en la pantalla de caja (push-to-
   talk, no siempre escuchando, para no gastar procesamiento ni levantar
   dudas de privacidad). El cajero graba la lista completa y suelta para
   procesar.

2. **Transcripción + extracción → precarga**: el resultado se muestra como
   una lista de líneas propuestas (cantidad, producto, marca detectada) con
   un estado por línea:
   - **Resuelta**: matcheó con confianza alta a un producto único del
     catálogo — se agrega al carrito con esa cantidad.
   - **Ambigua**: varios candidatos posibles (ej. "lapicero marca Bic" con
     varias presentaciones) — se muestra la lista corta de candidatos para
     que el cajero elija con un toque, igual que en la resolución de
     productos nuevos en Recepción de Mercancía.
   - **No reconocida**: no se encontró nada parecido — se marca para que
     el cajero la busque manualmente o la descarte (pudo ser un error de
     transcripción).

3. **Revisión y ajuste**: el carrito precargado se comporta como cualquier
   carrito normal del POS a partir de aquí — el cajero puede corregir
   cantidades, quitar líneas mal interpretadas, agregar productos a mano o
   por código de barras (complementario, no excluyente), y ver el total
   actualizado en vivo.

4. **Confirmar y cerrar venta**: un botón explícito de confirmación entrega
   el carrito al flujo de cobro ya existente del POS — no se crea un
   camino de cobro paralelo, solo una forma distinta de llenar el carrito
   antes de llegar a la pantalla de cobro habitual.

5. **Nunca autocompletar el cobro**: si la transcripción o la extracción
   fallan completamente (audio no entendible, sin productos reconocidos),
   el sistema debe mostrarlo claramente y dejar el carrito vacío o parcial
   para que el cajero complete manualmente — nunca debe fallar en
   silencio ni cobrar de más/menos por una mala interpretación no
   revisada.

## Casos borde a cubrir explícitamente

- Cliente pide "4 libretas" pero el cajero solo alcanza a grabar
  "libretas" sin la cantidad — debe pedir cantidad al momento de resolver
  esa línea, no asumir 1 por default silenciosamente si el habla sugería
  más.
- Ambiente ruidoso (tienda con clientes) degradando la transcripción — el
  cajero debe poder reintentar la grabación fácilmente sin perder lo que
  ya se había resuelto bien.
- Nombres de marca mal transcritos ("Bic" → "Bik") — el matching contra
  catálogo debe tolerar variaciones típicas de transcripción, no solo
  errores de tipeo.
- Productos sin marca distinguible en el catálogo (genéricos) — la
  extracción debe seguir funcionando aunque la frase no incluya marca.

## Entregable esperado

1. Selección concreta de proveedor/mecanismo para cada componente del
   pipeline (STT, extracción, matching), justificada por el costo real
   esperado dado el volumen de un solo punto de venta.
2. Diseño de la pantalla de precarga/revisión de ticket por voz,
   reutilizando en lo posible componentes de UI ya existentes del carrito.
3. Integración con el flujo de cobro actual sin duplicar lógica de venta.
4. Manejo explícito de los estados resuelto/ambiguo/no-reconocido descritos
   arriba.
