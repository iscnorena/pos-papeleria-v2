# Plantilla de borrador de documento legal

Todo documento generado por este skill empieza con este encabezado, sin excepción:

```
BORRADOR GENERADO AUTOMÁTICAMENTE — REQUIERE REVISIÓN Y APROBACIÓN LEGAL

Generado a partir de la revisión técnico-legal del [fecha]. Cada afirmación de este
documento fue redactada contra el código y la información proporcionada en esa fecha —
no es una plantilla genérica. Donde falte información se marca [INFORMATION_REQUIRED]:
no se completó con un valor plausible, así que no debe publicarse hasta llenarse.
```

## Ejemplo — Aviso de Privacidad (esqueleto, adaptar según el perfil real)

Estructura actualizada en v1.0.1 con los patrones de forma de
`references/mexico/notice-patterns.md` (tablas en vez de párrafos para retención y
transferencias, mecanismo ARCO concreto, declaración negativa proactiva cuando sea un
hecho verificado) — el contenido de cada patrón sigue viniendo exclusivamente del
discovery de esta corrida, nunca de los ejemplos que motivaron el patrón.

```
Aviso de Privacidad

Responsable: [INFORMATION_REQUIRED — razón social / nombre del negocio]
Domicilio: [INFORMATION_REQUIRED]
Contacto para temas de privacidad: [INFORMATION_REQUIRED — sugerido: correo dedicado
tipo privacidad@dominio, patrón 3 de notice-patterns.md; no inventar el dominio]

Datos personales que recabamos
[lista basada en TECHNICAL_FACT detectados en esta corrida — cada uno con su fuente
interna, no un genérico "nombre, correo, teléfono, etc."]

[Si el discovery confirmó que NO se capturan datos sensibles: agregar declaración
negativa explícita, patrón 5 — "No recabamos datos sensibles (salud, origen étnico,
creencias religiosas, afiliación sindical, preferencia sexual, etc.)". Solo si es un
TECHNICAL_FACT verificado, nunca por defecto.]

Finalidades del tratamiento
[cada finalidad debe corresponder a un flujo real detectado o confirmado en el intake —
si una finalidad no se pudo verificar, [INFORMATION_REQUIRED]]

Transferencias — dónde viven estos datos (patrón 2: tabla, no párrafo)
| Proveedor | Ubicación | Propósito | Estado |
|---|---|---|---|
| [proveedor detectado, nombre real — nunca "servidores protegidos" genérico] | [país/región detectado] | [flujo detectado] | LEGAL_REVIEW_REQUIRED salvo que ya esté resuelto |
[cada tercero con transferencia real de datos personales, incluida infraestructura
(hosting, APIs de terceros) — no omitir por ser "técnica"; ver
references/mexico/transfers.md para la calificación]

[Si el discovery confirmó que no se comparte/vende información fuera de lo declarado
arriba: agregar declaración negativa explícita, patrón 5 — "No vendemos ni compartimos
tus datos con nadie más".]

Conservación (patrón 1: tabla por tipo de dato, no una promesa genérica)
| Dato | Plazo | Qué pasa al vencer |
|---|---|---|
| [dato detectado] | [INFORMATION_REQUIRED o el plazo real si hay mecanismo técnico verificado] | [INFORMATION_REQUIRED o "se elimina automáticamente" si hay evidencia en código] |

Derechos de acceso, rectificación, cancelación y oposición (o el mecanismo vigente) —
patrón 4: procedimiento concreto, no un párrafo genérico
[
Para ejercer tus derechos, envía una solicitud por escrito a [correo de privacidad] que
incluya: identificación oficial, descripción clara del dato sobre el que ejerces tu
derecho, y tus datos de contacto para dar seguimiento. Responderemos en un plazo de
[INFORMATION_REQUIRED — días hábiles, decisión de negocio/Legal, nunca copiar el número
de otro aviso que hayas visto de referencia].
]

Uso de cookies y tecnologías similares
[solo lo que el discovery técnico confirmó]

Cambios a este aviso
[INFORMATION_REQUIRED — política de actualización, si el negocio ya tiene una]

Última actualización: [fecha]
```

## Reglas al llenar cualquier borrador

- Nunca completes `[INFORMATION_REQUIRED]` con un valor "razonable" para que se vea
  completo — eso rompe el principio central del skill.
- Cada oración debe poder rastrearse a un `TECHNICAL_FACT` verificado en esta corrida, a
  información `PROPORCIONADO POR EL NEGOCIO` en el intake, o a una fuente legal verificada
  — nunca a una plantilla genérica bajada de internet.
- Si el documento ya existía y solo se está actualizando, señala explícitamente qué
  cambió respecto a la versión anterior (útil para que Legal revise solo el delta).
- Los patrones de forma de `references/mexico/notice-patterns.md` (tablas, mecanismo
  ARCO, declaraciones negativas) son estructura reutilizable, verificada contra ejemplos
  reales — pero **cualquier número, plazo o dato concreto de esos ejemplos nunca se copia
  al borrador**. Un plazo de respuesta, un dominio de correo, una dirección: todos deben
  salir del discovery de esta corrida o quedar `[INFORMATION_REQUIRED]`, nunca de un
  aviso de otra empresa que se haya usado de referencia para la forma.
