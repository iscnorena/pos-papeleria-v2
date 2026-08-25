# Clasificación de documentos esperados (Document Coverage)

**Nuevo en v1.0.1.** No asumas que toda aplicación necesita exactamente el mismo set de
documentos legales ("todo SaaS necesita Aviso + Términos + Cookies + Devoluciones" es
falso — depende del perfil real). Clasifica cada documento de la matriz de
`templates/legal-review-report.md` con una de estas etiquetas, justificada por el perfil
de la aplicación (`SKILL.md`, paso 2) y el marco jurídico verificado en esta corrida
(paso 10), no por defecto:

- `LEGAL_REQUIRED` — la norma vigente exige este documento para el perfil detectado,
  verificado con fuente primaria en esta corrida. Ej.: Aviso de Privacidad cuando se
  capturan datos personales — casi siempre aplica.
- `CONDITIONALLY_REQUIRED` — exigido solo si se confirma cierta condición del perfil. Ej.:
  Política de Devoluciones/Cancelaciones — `CONDITIONALLY_REQUIRED` si hay cobro en línea
  a consumidores, `NOT_REQUIRED` si no.
- `RECOMMENDED` — no hay obligación legal directa verificada, pero reduce riesgo o
  ambigüedad. Ej.: Términos y Condiciones en un sitio gratuito sin cuenta ni datos de
  terceros — recomendable por claridad, no exigido por sí solo.
- `NOT_REQUIRED` — el perfil de la aplicación no activa este documento. Justifícalo
  explícitamente (ej. "Política de Envíos: NOT_REQUIRED, la aplicación no vende ni envía
  bienes físicos").
- `LEGAL_REVIEW_REQUIRED` — no puedes determinar tú solo si aplica; depende de una
  interpretación jurídica del caso concreto (perfiles mixtos, zonas grises de modelo de
  negocio).

## Ejemplos de cómo varía por perfil

Ilustrativo, no una tabla fija — reclasifica según el caso real.

| Documento                               | SaaS B2B interno, sin datos de consumidor                                                  | E-commerce B2C directo                                                                                  | Marketplace (terceros venden)                                                                                | App interna con sesión, sin venta                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Aviso de Privacidad                     | `LEGAL_REQUIRED` si hay datos de empleados/usuarios de las empresas cliente                | `LEGAL_REQUIRED`                                                                                        | `LEGAL_REQUIRED`, además debe aclarar quién es el responsable de cada dato (la plataforma vs. cada vendedor) | `LEGAL_REQUIRED` si hay datos de empleados/proveedores  |
| Términos y Condiciones                  | `RECOMMENDED`                                                                              | `LEGAL_REVIEW_REQUIRED` (depende de si hay contratación en línea)                                       | `LEGAL_REQUIRED` — debe fijar la relación plataforma↔vendedor↔comprador                                      | `RECOMMENDED` o `NOT_REQUIRED` según exposición pública |
| Política de Cookies                     | `NOT_REQUIRED` si no hay tracking de terceros                                              | `CONDITIONALLY_REQUIRED` si hay analytics/pixeles de terceros                                           | igual que e-commerce                                                                                         | `NOT_REQUIRED` si es solo cookie de sesión propia       |
| Devoluciones/Cancelaciones/Reembolsos   | `NOT_REQUIRED`                                                                             | `CONDITIONALLY_REQUIRED` si cobra en línea                                                              | `LEGAL_REVIEW_REQUIRED` — depende de si la plataforma o el vendedor responde                                 | `NOT_REQUIRED`                                          |
| Envíos                                  | `NOT_REQUIRED`                                                                             | `CONDITIONALLY_REQUIRED` si vende bienes físicos con envío                                              | igual que e-commerce                                                                                         | `NOT_REQUIRED`                                          |
| Política de Seguridad de la Información | `RECOMMENDED` si hay hallazgos de seguridad abiertos (ej. una llave/credencial sin cifrar) | `RECOMMENDED`, sube a `CONDITIONALLY_REQUIRED` si procesan pagos directamente (no vía pasarela externa) | `RECOMMENDED`                                                                                                | `RECOMMENDED` si hay hallazgos de seguridad abiertos    |

### Política de Seguridad de la Información — nuevo tipo de documento (v1.0.1)

Agregado el 25 de agosto de 2026 al revisar la suite legal de un POS competidor (SICAR.mx,
ver `references/mexico/notice-patterns.md` patrón 6) — no estaba contemplado como tipo de
documento evaluable hasta ahora. Nunca es `LEGAL_REQUIRED` por defecto (no hay una
obligación legal mexicana genérica de publicar uno), pero es `RECOMMENDED` casi siempre
que el discovery técnico haya encontrado un hallazgo de seguridad real (credenciales sin
cifrar, falta de mecanismo de purga, etc.) — declarar públicamente qué medidas SÍ existen
(cifrado de contraseñas, no almacenamiento de datos de tarjeta, conexión directa con
pasarelas) genera confianza incluso cuando persisten hallazgos menores sin resolver.

## Cómo usar esto en el reporte

En la matriz de `templates/legal-review-report.md`, la columna "Relevancia para este
perfil" debe llevar una de estas cinco etiquetas, no una descripción libre — así Legal
puede filtrar de un vistazo qué es obligatorio vs. qué es criterio del skill.
