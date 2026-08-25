# Cómo redactar hallazgos y preguntas para Legal

## Nunca escribas esto

- "La empresa incumple la ley."
- "La empresa está fuera de cumplimiento."
- "Esto es ilegal."
- Cualquier veredicto jurídico definitivo — eso lo decide Legal, no este skill.

## Escribe esto en su lugar

- "Se detectó una posible brecha que requiere validación jurídica."
- "No se identificó evidencia suficiente."
- "La implementación observada no coincide con el documento analizado."
- "Se identificó un cambio que puede tener implicaciones legales."

## De evidencia técnica a lenguaje que Legal puede leer sin contexto de código

Mal (expone detalle técnico innecesario en el reporte para Legal):

> En `src/app/(app)/recepcion/acciones.ts:419`, la función `crearRecepcionDesdeFoto` llama
> a `extraerListadoDeTicket` que manda un `Buffer.from(...).toString('base64')` a la API de
> Claude.

Bien (mismo hecho, para el reporte de Legal — el detalle técnico de arriba queda como
evidencia interna, no desaparece, solo no va en el cuerpo principal):

> La función de "carga de recepción por foto" envía la imagen del ticket de compra a un
> proveedor de IA fuera de México para su lectura automática. La imagen no se almacena.
> Esto constituye una transferencia internacional de datos que hoy no está declarada en
> ningún aviso de privacidad.

## Preguntas para Legal: concretas y accionables

Mal:

> "Revisar marketing."

> "Ver si el aviso está bien."

Bien:

> "¿La finalidad de marketing detectada (envío de promociones por correo) debe
> incorporarse como finalidad independiente en el Aviso de Privacidad, y requiere un
> mecanismo específico de oposición distinto del ARCO general?"

> "La imagen de un ticket de compra se envía a un proveedor de IA en EUA para lectura
> automática y no se almacena después. ¿Esta transferencia requiere consentimiento expreso
> adicional al aviso general, dado que el ticket puede contener datos de terceros (el
> cliente que compró) además de los del proveedor?"

## Reporte ejecutivo vs reporte para Legal

El resumen ejecutivo (`templates/legal-review-report.md`) debe ser legible por Legal,
dirección o negocio sin necesitar interpretar código. Nunca incluyas ahí, salvo que te lo
pidan explícitamente:

- rutas de archivo;
- números de línea;
- nombres de funciones o clases;
- stack traces;
- nombres internos de tablas o columnas de base de datos.

Esa información vive en tu evidencia interna (`references/evidence.md`) y queda
disponible si alguien —típicamente desarrollo— la necesita para corregir algo.

## No declarar cumplimiento por ausencia de hallazgos

"No encontré nada" no es lo mismo que "cumple". Si el discovery fue limitado (repo
incompleto, sin acceso a producción, sin poder verificar un tercero), dilo con
`INSUFFICIENT_EVIDENCE` en vez de reportar la sección como resuelta.
