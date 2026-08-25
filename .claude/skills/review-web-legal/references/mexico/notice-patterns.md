# Patrones de calidad para avisos de privacidad — no son ley, son práctica

**Nuevo en v1.0.1** (agregado el 25 de agosto de 2026), a partir de comparar 5 avisos de
privacidad/términos reales publicados: Alegra (Colombia), Solvermedia (España), MyBusiness
POS (México), Odoo (Bélgica), SICAR (México — Jalisco).

**Regla de origen, no negociable**: de esta comparación **nunca se copia texto legal, cita
normativa ni redacción literal** de otra jurisdicción — eso violaría el principio central
del skill ("nunca copiar un aviso de privacidad genérico"; ver `references/mexico/
sources.md`). Lo único que se adopta aquí es **estructura y formato**, verificado como
buena práctica independientemente de qué ley aplique. Cuando generes un borrador
(`templates/document-draft.md`), usa estos patrones de forma, llenando el contenido
siempre con hechos verificados de la app auditada — nunca con el contenido de estos
ejemplos.

## Patrón 1 — tabla de retención por tipo de dato, no un párrafo genérico

Odoo (Bélgica) lo hace mejor que cualquiera de los otros cuatro: una tabla explícita,
dato por dato, con plazo y qué pasa al vencer. Ningún aviso mexicano de los dos revisados
(MyBusiness POS, SICAR) tenía esto — ambos omiten retención por completo, lo cual confirma
que es un hueco común, no una rareza del proyecto que estés auditando.

Formato a usar en un borrador:

| Dato                      | Plazo                                                                        | Qué pasa al vencer                                                                 |
| ------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [dato concreto detectado] | `[INFORMATION_REQUIRED]` o el plazo real si hay mecanismo técnico verificado | `[INFORMATION_REQUIRED]` o "se elimina automáticamente" si hay evidencia en código |

Nunca inventes el plazo. Si no hay mecanismo técnico de purga, la fila queda con
`[INFORMATION_REQUIRED]` — ver `references/mexico/privacy.md` sobre no confundir "sin
cron" con "conservación indefinida sin base legal".

## Patrón 2 — tabla de transferencias/terceros: proveedor, ubicación, propósito

Odoo tampoco se enreda en el texto público con la calificación jurídica
encargado-vs-tercero (eso lo resuelven en el contrato/DPA) — simplemente declara con
claridad dónde vive cada cosa, en tabla:

| Proveedor             | Ubicación               | Propósito         |
| --------------------- | ----------------------- | ----------------- |
| [proveedor detectado] | [país/región detectado] | [flujo detectado] |

**Antipatrón visto en 2 de 5 avisos** (MyBusiness POS, Solvermedia): quedarse en
"servidores protegidos" o "bases de datos automatizadas" sin nombrar al proveedor real.
No lo repitas — el discovery técnico de este skill siempre debe nombrar al proveedor
concreto (Supabase, Vercel, AWS, el proveedor de IA específico, etc.), no una generalidad.
La calificación jurídica final (`references/mexico/transfers.md`) sigue siendo
`LEGAL_REVIEW_REQUIRED`, pero el nombre del proveedor y su ubicación son hechos técnicos
verificables, no algo que dependa de esa calificación.

## Patrón 3 — correo dedicado de privacidad

Los dos avisos mexicanos (MyBusiness POS, SICAR) y Odoo coinciden en algo simple: un
correo dedicado (`privacidad@dominio` o similar), no un contacto genérico de soporte. Es
el mínimo viable para la sección de contacto de un borrador — no requiere infraestructura
nueva, solo una decisión del negocio. Si el negocio auditado no tiene uno, se marca
`[INFORMATION_REQUIRED]` con la sugerencia del formato, nunca se inventa el dominio ni la
dirección exacta.

## Patrón 4 — mecanismo ARCO concreto y accionable, con plazo de respuesta

MyBusiness POS y SICAR (ambos mexicanos) coinciden en un procedimiento de cuatro pasos:
solicitud por escrito, identificación oficial, descripción clara del dato, firma/datos de
contacto del solicitante. SICAR además compromete un plazo explícito ("máximo 20 días
hábiles").

Formato a usar en un borrador — la estructura del procedimiento sí se puede plantear como
plantilla (no es información inventada, es un procedimiento estándar del ejercicio de
derechos), pero el **plazo de respuesta es una decisión de negocio/Legal** — nunca copies
el número de otro aviso (ej. no asumas "20 días hábiles" porque SICAR lo usa; eso sería
inventar información de negocio, exactamente lo que el principio "nunca inventar"
prohíbe):

> Para ejercer tus derechos, envía una solicitud por escrito a `[correo de privacidad]`
> que incluya: identificación oficial, descripción clara del dato sobre el que ejerces tu
> derecho, y tus datos de contacto para dar seguimiento. Responderemos en un plazo de
> `[INFORMATION_REQUIRED — días hábiles, decisión de Legal]`.

## Patrón 5 — declaración negativa proactiva, cuando sea un hecho verificado

Odoo y SICAR declaran explícitamente qué **no** hacen: "no vendemos ni intercambiamos tus
datos", "no recabamos datos sensibles". Es gratis declarar esto cuando es
`TECHNICAL_FACT` verificado (ej. si el grep de discovery no encontró campos de datos
sensibles ni integraciones de venta de datos) — genera confianza y reduce la superficie de
`DOCUMENT_MISMATCH` futuro. No lo agregues si no lo verificaste — una declaración negativa
falsa es peor que no decir nada.

## Antipatrón que confirma el caso de advertencia de `sources.md`

MyBusiness POS y Solvermedia citan marcos legales que llevan tiempo obsoletos (la
LFPDPPP de 2010 en un caso, la LOPD española de 1999 en el otro) — evidencia real, no
hipotética, de que empresas de software real no actualizan sus avisos al mismo ritmo que
cambia la ley. SICAR.mx, en cambio, sí cita correctamente a la Secretaría Anticorrupción y
Buen Gobierno (verificado el 25 de agosto de 2026, aviso fechado abril de 2026) — es el
contraejemplo de que sí se puede estar al día. Ninguno de los dos extremos se cita como
fuente jurídica de este skill (siguen siendo ejemplos de estructura, no de derecho) — pero
vale la pena recordar este contraste la próxima vez que alguien dude si vale la pena
verificar vigencia en cada corrida.
