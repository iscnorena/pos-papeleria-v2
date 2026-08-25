# Investigación — avisos de privacidad de grandes de tecnología (25 de agosto de 2026)

**Estado: investigación cruda, sin incorporar al skill activo.** A diferencia de
`references/mexico/notice-patterns.md` (que sí alimenta el comportamiento del skill), este
archivo vive en `research/` a propósito — son notas para evaluar en una futura versión, no
instrucciones que una corrida deba seguir hoy. No enlazado desde `SKILL.md`.

## Por qué se hizo

Continuación de la comparación de avisos de privacidad de POS pequeños/medianos (ver
`references/mexico/notice-patterns.md`) — el usuario quiso ver cómo lo hacen empresas de
tecnología grandes y globales, para contrastar el enfoque.

## Sitios revisados

| Sitio                                                            | País de origen | Página                                 | Resultado                                                                                                       |
| ---------------------------------------------------------------- | -------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [Apple](https://www.apple.com/mx/privacy/)                       | EUA            | Portal de privacidad (mercadeo)        | Extraído — ver hallazgo 1                                                                                       |
| [Apple](https://www.apple.com/mx/legal/privacy/)                 | EUA            | Política legal formal                  | **Falló** — página requiere JavaScript, la herramienta no pudo renderizarla                                     |
| [Google](https://policies.google.com/privacy?hl=es-MX&fg=1)      | EUA            | Política de privacidad (versión es-MX) | Extraído — ver hallazgo 2                                                                                       |
| [PayPal](https://www.paypal.com/mx/legalhub/paypal/privacy-full) | EUA            | Aviso de privacidad completo           | **Falló** — contenido truncado antes de llegar a la herramienta de resumen, en 3 intentos con distintos prompts |
| [Stripe](https://stripe.com/mx/privacy)                          | EUA            | Política de privacidad (mx)            | Extraído — ver hallazgo 3                                                                                       |

## Hallazgo principal — patrón consistente en las tres que sí se pudieron leer

**Ninguna de las tres (Apple, Google, Stripe) cita LFPDPPP, ninguna autoridad mexicana, ni
declara un "Aviso de Privacidad" formal separado con la estructura que exige la ley
mexicana** (responsable con domicilio, transferencias declaradas específicamente,
mecanismo ARCO explícito conforme a esa ley). Las tres usan un **marco global único,
derivado de RGPD**, aplicado de la misma forma a todas las jurisdicciones —
"proporcionamos los mismos controles sin importar dónde vivas" en vez de un documento
jurisdicción por jurisdicción.

Esto es **fundamentalmente distinto** de lo que hacen los POS mexicanos/latinoamericanos
pequeños que ya comparamos (MyBusiness POS, SICAR): esos sí tienen un documento con
estructura LFPDPPP explícita, responsable identificado con domicilio mexicano, y cita
normativa (aunque a veces desactualizada).

### Detalle por sitio

**Apple** (portal de mercadeo, no la política legal formal):

- Estructura por producto (Safari, Apple Intelligence, Salud, Wallet, Mensajes, Siri, App
  Store), no por obligación legal.
- Cero mención de LFPDPPP, INAI, o cualquier autoridad mexicana.
- No enlaza un "Aviso de Privacidad" formal desde esta página — solo enlaza a
  `/mx/legal/privacy/`, que resultó ser una página que requiere JavaScript y no se pudo
  leer con las herramientas disponibles en esta corrida.
- Énfasis en "procesamiento en el dispositivo" y "Private Cloud Compute" como argumento de
  privacidad técnica, más que como cumplimiento normativo declarado.

**Google** (`policies.google.com/privacy?hl=es-MX`):

- Estructura clara y completa: qué recaba, por qué, controles, uso compartido, protección,
  exportación/borrado, **conservación** (con diferenciación real por tipo de dato — el
  mismo patrón 1 de `notice-patterns.md`, pero a escala mucho mayor), cumplimiento con
  reguladores.
- Responsable declarado explícitamente para toda Latinoamérica: **"Google LLC, con
  dirección en 1600 Amphitheatre Parkway, Mountain View, California 94043 (Estados
  Unidos)"** — un solo responsable global, no una entidad mexicana local.
- Derechos redactados en lenguaje tipo RGPD ("acceder, actualizar, rectificar y suprimir")
  ofrecidos "si la normativa local... es de aplicación" — es decir, el compromiso de
  derechos es condicional a la ley local, no una declaración LFPDPPP explícita.
- Transferencias reconocidas de forma genérica ("las leyes de protección de datos varían
  según los países"), sin la declaración específica que exige el formato mexicano.

**Stripe** (`stripe.com/mx/privacy`):

- Ni LFPDPPP ni ninguna autoridad mexicana mencionada en ningún lado.
- No identifica una entidad ni domicilio específico para México — remite a un "Privacy
  Center" externo para saber "qué entidad de Stripe aplica según tu jurisdicción".
- Tiene una sección "Jurisdiction-specific provisions" (disposiciones específicas por
  jurisdicción) — no se pudo ver su contenido en esta corrida, podría contener lo que
  falta arriba; queda pendiente de revisar si se retoma esta investigación.
- Retención y transferencias descritas en términos generales/RGPD, no LFPDPPP.

## Pregunta abierta para una futura versión del skill

¿Cómo debe tratar el skill un caso donde una empresa (mexicana o extranjera operando en
México) adopta el enfoque "una sola política global, sin documento LFPDPPP específico"?
Dos lecturas posibles, ninguna resuelta aquí:

1. Es un hueco real — LFPDPPP exige su propio aviso con secciones mínimas específicas
   (responsable, transferencias, ARCO) independientemente de que ya exista una política
   global — `DOCUMENT_NOT_IDENTIFIED` para "aviso de privacidad conforme a LFPDPPP"
   incluso si existe una política de privacidad genérica.
2. Una política global bien redactada, con compromisos equivalentes o superiores,
   _podría_ considerarse suficiente si cubre en sustancia lo que pide la ley mexicana —
   pero esto es una interpretación jurídica que el skill no debe resolver por su cuenta.

Si se retoma esta investigación, vale la pena decidir explícitamente cuál lectura adopta
el skill (probablemente la 1, por ser la más conservadora y consistente con "nunca asumir
cumplimiento por ausencia de hallazgos" — `references/finding-language.md`), y
documentarlo en `references/mexico/privacy.md` con su propio nombre de patrón, igual que
los 6 de `notice-patterns.md`.

## Limitaciones técnicas encontradas

Relevantes para el propio skill, no solo para esta investigación.

- Sitios con protección anti-bot fuerte (Doritos F1, ver conversación anterior) o
  renderizado 100% client-side sin fallback (Apple `/mx/legal/privacy/`) no se pueden leer
  con `WebFetch` — el skill debe reportar esto honestamente como `SOURCE_NOT_VERIFIED` o
  "no se pudo acceder", nunca inventar contenido para compensar.
- Páginas extremadamente largas (PayPal) pueden truncarse antes de llegar al resumen —
  mismo tratamiento: reportar la limitación, no simular haber leído el documento.
