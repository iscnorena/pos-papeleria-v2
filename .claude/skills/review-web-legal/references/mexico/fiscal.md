# CFDI / SAT

**Corrección de v1.0.1**: no reduzcas la evaluación a un binario "emite / no emite". Hay
al menos tres escenarios distintos con tratamiento diferente — confírmalos en este orden
antes de evaluar nada más. Verifica primero contra `references/mexico/sources.md`.

## Los tres escenarios a distinguir

1. **Emisión propia** — el sistema genera y timbra CFDI directamente (ver detalle abajo).
2. **Generación delegada** — el sistema **no** timbra directamente, pero dispara la
   emisión a través de un tercero (un PAC, una pasarela de pago que factura por cuenta del
   negocio, un servicio externo de facturación) — el comprobante sale a nombre del
   negocio aunque la infraestructura de timbrado sea ajena. Esto **no es lo mismo que
   emisión propia ni que solo importar**: el negocio sigue siendo el emisor fiscal aunque
   delegue la mecánica técnica, así que las obligaciones de datos fiscales del emisor
   (RFC, régimen, domicilio) siguen aplicando — solo cambia quién opera el timbrado.
   Márcalo `REGULATORY_REQUIREMENT` para los datos que el propio sistema debe capturar y
   enviar correctamente al delegado, y `LEGAL_REVIEW_REQUIRED` para la relación
   contractual con el delegado si no es evidente en el código.
3. **Solo consumo/importación** — el sistema únicamente recibe, parsea o solicita CFDI ya
   emitidos por terceros (proveedores) para su propia contabilidad — sin emitir a nombre
   propio, ni siquiera de forma delegada. Es el único de los tres sin obligación de
   emisor.

## Cómo confirmar cuál escenario es

- **Emisión propia**: busca integración con un PAC (Proveedor Autorizado de
  Certificación) o llamadas a un servicio de timbrado hechas directamente por el sistema,
  y generación de XML con estructura de CFDI (nodos `Comprobante`, `Emisor`, `Receptor`,
  sello, certificado) construida por el propio sistema.
- **Generación delegada**: busca un flujo de "solicitar factura" que envíe los datos
  fiscales del cliente/negocio a un servicio externo (una pasarela de pago con
  facturación integrada, un SaaS de facturación) que devuelve o notifica el CFDI ya
  timbrado — el sistema participa capturando datos y disparando la solicitud, pero no
  construye ni timbra el XML.
- **Solo consumo/importación**: el sistema **lee/parsea** XMLs de CFDI que le llegan de
  proveedores (para registrar una compra, por ejemplo) sin generar ni disparar emisión
  propia. Dilo explícitamente como `NOT_APPLICABLE` para obligaciones de emisor, con la
  justificación.

## Si es emisión propia o generación delegada

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
