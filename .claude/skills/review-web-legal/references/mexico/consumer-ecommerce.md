# PROFECO / LFPC — consumidor y comercio electrónico

Aplica si hay venta, cobro o publicidad de precios al público en general (no solo B2B
interno, no solo ventas internas tipo POS sin componente en línea dirigido al público).
Verifica primero contra `references/mexico/sources.md`.

## Cómo confirmar antes de evaluar nada — no actives todo por encontrar una página con precios

**Corrección de v1.0.1**: mostrar precios, tener un plan de suscripción o cobrar entre
empresas no equivale automáticamente a activar el capítulo de comercio electrónico al
consumidor de la LFPC. Distingue el escenario primero:

| Escenario                                                          | ¿Cómo se ve técnicamente?                                                                                    | ¿Activa LFPC/PROFECO de consumidor?                                                                                                                                                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E-commerce directo (el negocio vende directo al público)           | Checkout propio, integración de pago, carrito orientado a consumidor final                                   | Sí, si hay venta a distancia por medios electrónicos                                                                                                                                                                    |
| Marketplace (terceros venden a través de la plataforma)            | Cuentas de "vendedor", listados de terceros, la plataforma no es la contraparte de la venta                  | Sí, pero con obligaciones adicionales de identificar claramente quién es el vendedor real vs. la plataforma — `LEGAL_REVIEW_REQUIRED` para deslindar responsabilidades                                                  |
| Publicidad/promociones sin venta directa en el sitio               | Precios mostrados con fines informativos, sin checkout, la venta ocurre fuera del sistema (ej. en mostrador) | Aplica LFPC general de publicidad no engañosa, no el capítulo de comercio electrónico completo                                                                                                                          |
| SaaS B2B (contraparte es otra empresa, no un consumidor)           | Facturación a RFC de empresa, contratos, sin relación proveedor-consumidor final                             | Generalmente no — LFPC protege a consumidores, no a otras empresas en su carácter comercial. Verifica igual si hay algún componente B2C mezclado (ej. empleados de esa empresa como usuarios finales con datos propios) |
| Punto de venta puramente interno (empleados cobrando en mostrador) | Sin componente en línea dirigido al público                                                                  | No activa las obligaciones específicas de comercio electrónico — sigue existiendo LFPC general del negocio (precios correctos, no publicidad engañosa), pero eso rara vez se ve reflejado en el código                  |

Antes de concluir el escenario, verifica explícitamente: ¿existe relación
proveedor-consumidor? ¿hay venta, contratación o pago real? ¿la contraparte es un
consumidor final (B2C) o una empresa actuando en su carácter comercial (B2B)? ¿es la
propia plataforma la vendedora, o solo intermedia entre terceros (marketplace)? Si el
código no deja claro cuál escenario es, repórtalo como `LEGAL_REVIEW_REQUIRED` en vez de
asumir el más común.

## Qué verificar si sí aplica

- **Precios visibles con impuestos incluidos**, sin letras chiquitas engañosas.
- **Confidencialidad de la información del consumidor** en la transacción — el
  proveedor no debe compartirla con terceros ajenos a la transacción sin autorización
  expresa.
- **Domicilio físico y contacto** proporcionados al consumidor antes de celebrar la
  transacción.
- **Seguridad técnica** de la información capturada, informada previamente al
  consumidor.
- **Política de cancelación/reembolso/devolución** si se cobra en línea — verifica si
  existe un documento y si el flujo del código realmente lo respeta (p. ej. un botón de
  "cancelar" que no hace nada del lado servidor sería `DOCUMENT_MISMATCH`).
- **Publicidad no engañosa** — comparativos de precio, uso de "gratis", descuentos que el
  código pueda contradecir (p. ej. un precio "gratis" que en realidad cobra algo en un
  paso posterior).

## REPEP — Registro Público para Evitar Publicidad

Si el sistema hace o permite marketing telefónico o por mensajes hacia consumidores
(no solo transaccional), verifica si hay algún mecanismo para respetar números
inscritos en REPEP (`https://repep.profeco.gob.mx/`, confirmar vigencia del mecanismo en
`references/mexico/sources.md`). Rara vez es visible en código de una app pequeña; si no
hay evidencia, repórtalo como `INSUFFICIENT_EVIDENCE`, no como incumplimiento.

## Qué NO asumir

- Que cualquier venta activa automáticamente todo el capítulo de comercio electrónico de
  la LFPC — depende de que la venta sea a distancia por medios electrónicos, no en
  persona.
- Que la ausencia de una política de devoluciones visible significa que no existe —
  podría estar en un documento fuera del repo; usa `DOCUMENT_NOT_IDENTIFIED`.
