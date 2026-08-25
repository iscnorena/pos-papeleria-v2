# PROFECO / LFPC — consumidor y comercio electrónico

Aplica si hay venta, cobro o publicidad de precios al público en general (no solo B2B
interno, no solo ventas internas tipo POS sin componente en línea dirigido al público).
Verifica primero contra `references/mexico/sources.md`.

## Cómo confirmar si aplica antes de evaluar nada

- ¿Hay un flujo de checkout/cobro accesible al público sin cuenta administrativa? Busca
  integraciones de pago (Stripe, Conekta, Mercado Pago, PayPal, Openpay) y páginas de
  precios/carrito orientadas a un consumidor final.
- Un sistema de punto de venta puramente interno (empleados cobrando en mostrador) no
  activa por sí mismo las obligaciones específicas de *comercio electrónico* de la LFPC
  — esas nacen de la venta a distancia por medios electrónicos. Sigue existiendo LFPC
  general para el negocio (precios correctos, no publicidad engañosa), pero eso rara vez
  se ve reflejado en el código y suele quedar fuera del alcance técnico de este skill.

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
