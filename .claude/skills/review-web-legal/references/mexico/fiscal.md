# CFDI / SAT

Solo aplica si el sistema **emite** comprobantes fiscales digitales al público — no si
solo los importa/procesa de proveedores para su propia contabilidad, que es un caso
distinto sin esta obligación. Confirma cuál de los dos casos es antes de evaluar nada más.
Verifica primero contra `references/mexico/sources.md`.

## Cómo confirmar si el sistema emite

- Busca integración con un PAC (Proveedor Autorizado de Certificación) o llamadas a un
  servicio de timbrado.
- Busca generación de XML con estructura de CFDI (nodos `Comprobante`, `Emisor`,
  `Receptor`, sello, certificado) construida por el propio sistema, no solo parseada.
- Si el sistema solo **lee/parsea** XMLs de CFDI que le llegan de proveedores (para
  registrar una compra, por ejemplo), eso es importación, no emisión — no aplica esta
  sección, dilo explícitamente como `NOT_APPLICABLE` con la justificación.

## Si sí emite

Verifica en esta corrida (el detalle técnico cambia con cada versión de CFDI y sus reglas
de carácter general del SAT, no lo fijes de memoria):

- Requisitos de datos fiscales del emisor (RFC, régimen fiscal, domicilio) y del receptor,
  según el Código Fiscal de la Federación (art. 29 y 29-A) y las reglas vigentes del SAT.
- Versión de CFDI vigente y si el sistema la usa (verificar en `sat.gob.mx`, no asumir).
- Uso de CFDI, forma de pago, método de pago — completitud de estos campos si el sistema
  los genera.

## Si solo importa/procesa CFDI de proveedores (no emite)

No hay obligación fiscal de emisor que evaluar. Lo que sí vale la pena verificar, aunque
sea de otra naturaleza (no fiscal sino de protección de datos y buenas prácticas):

- Si el UUID, RFC del emisor u otros datos del CFDI importado se guardan, por cuánto
  tiempo y con qué propósito.
- Si hay validación de que el RFC del emisor corresponde al proveedor esperado (esto es
  control interno de negocio, no obligación legal — clasifícalo `BEST_PRACTICE` si lo
  recomiendas).

## Qué NO asumir

- Que cualquier manejo de un XML con estructura de CFDI implica obligaciones de emisor.
- Que la detección de una integración fiscal por sí misma constituye una conclusión sobre
  si la obligación fiscal se cumple correctamente — eso es un análisis contable/fiscal más
  profundo, normalmente `LEGAL_REVIEW_REQUIRED` o fuera del alcance de este skill si
  requiere a un contador, no a un abogado.
