# Metodología — discovery e intake

## Intake

Pregunta solo lo que no puedas determinar de forma confiable leyendo el código. Sugerido,
según el perfil que vayas descubriendo:

- Nombre de la aplicación y de la empresa/responsable.
- Modelo de negocio y finalidad principal (¿para qué existe esta app?).
- Tipo de usuarios (público en general, B2B, empleados, menores posibles).
- ¿Vende bienes o servicios? ¿Cobra en línea? ¿Usa suscripciones?
- ¿Procesa datos sensibles (salud, biométricos, origen étnico, religión, afiliación
  sindical, orientación sexual)?
- ¿Participan menores de edad, con o sin supervisión de un adulto?
- Proveedores o terceros relevantes que el código por sí solo no explica del todo (p. ej.
  quién es el responsable legal de un servicio de terceros detectado).
- Datos de contacto legal, domicilio fiscal — necesarios si vas a generar un borrador.

Etiqueta cada dato con su origen, siempre:

- `DETECTADO TÉCNICAMENTE` — lo viste en el código, con evidencia.
- `PROPORCIONADO POR EL NEGOCIO` — te lo dijo el usuario en el intake.
- `INFORMACIÓN REQUERIDA` — falta y lo necesitas para continuar una sección o generar un
  borrador completo.

## Discovery

### Frontend

Formularios y sus campos, validaciones, mecanismos de consentimiento (checkboxes, banners
de cookies), uso de cookies/localStorage/sessionStorage, SDKs de analytics o trackers,
páginas legales existentes, contenido publicado, rutas públicas vs con sesión.

### Backend

Endpoints y qué reciben, autenticación/autorización, dónde se procesan los datos que
entran, qué se registra en logs, envío de correos, integraciones salientes,
almacenamiento (disco, storage de objetos, base de datos).

### Base de datos

Tablas y columnas con datos personales o sensibles, relaciones entre ellas, timestamps de
creación/actualización, mecanismos de retención aparente (soft delete, purga programada,
`ON DELETE CASCADE`), si hay backups identificables en la config.

### APIs

Endpoints propios y de terceros, qué entra y qué sale de cada uno, si transmiten datos
personales fuera del sistema.

### Dependencias

SDKs de analytics, proveedores de pago, proveedores de email, servicios cloud, monitoreo
de errores, CRM, cualquier otro SaaS de terceros declarado en manifiestos de paquetes o
variables de entorno.

### Configuración

Dominios, URLs, correos de contacto, identificadores, si hay claves de terceros
detectables sin exponer secretos, diferencias entre configuración de producción y
heredada/de prueba.

## Detectando el perfil de la aplicación

No apliques todo el checklist legal a toda aplicación. El perfil decide qué activar —
ejemplos de cómo detectarlo técnicamente, no exhaustivo:

- **¿Cobra en línea?** Busca integraciones de pago (Stripe, Conekta, Mercado Pago,
  PayPal, Openpay) y flujos de checkout. Si no hay ninguna, LFPC/PROFECO de e-commerce
  probablemente no aplica más allá de lo genérico (sigue aplicando si hay venta física
  con publicidad de precios, pero eso rara vez se ve en el código).
- **¿Emite CFDI?** Busca integración con un PAC (proveedor autorizado de certificación) o
  llamadas a timbrado. Si el sistema solo _importa_ XMLs de proveedores para su propia
  contabilidad, no está emitiendo — es un caso distinto, sin esta obligación.
- **¿Hay menores?** Busca campos de fecha de nacimiento, validaciones de edad, contenido
  dirigido a menores, o pregúntalo directamente si el público no está acotado por diseño
  (ej. una app de consumo general sin control de edad).
- **¿Hay datos sensibles?** Grep por campos de salud, biometría, afiliación religiosa o
  sindical, orientación sexual, preferencia política, huellas/reconocimiento facial.
- **¿Hay procesamiento o infraestructura fuera de México?** Busca Supabase, Vercel,
  AWS/GCP en regiones fuera de México, APIs de terceros (incluida una API de un modelo de
  lenguaje). Esto activa el módulo de transferencias para revisión — **no lo declares
  automáticamente como "transferencia internacional"**: infraestructura fuera de México no
  equivale por sí sola a una transferencia jurídica declarable. Sigue el proceso completo
  de `references/mexico/transfers.md` (proveedor, flujo, datos, relación
  encargado-vs-tercero) antes de calificarlo.

## Data Flow Discovery

Construye el mapa conceptual, aunque sea en prosa:

```
Usuario → Frontend → API → Backend → Base de datos
                                        ├── CRM
                                        ├── Email provider
                                        ├── Analytics
                                        ├── Payment provider
                                        └── otros terceros
```

El objetivo: qué datos entran, a dónde van, dónde se quedan, con qué terceros interactúan.

## Third-Party Discovery

Ejemplos de lo que buscar (no es lista cerrada): Google Analytics, Google Tag Manager,
Meta Pixel, TikTok Pixel, Stripe, PayPal, Conekta, Mercado Pago, Firebase, AWS, Azure,
Supabase, Sentry, SendGrid, Mailchimp, CRMs, WhatsApp Business API, cualquier API de un
proveedor de IA (incluida Anthropic/Claude si el propio sistema la usa).

Detectar un tercero técnicamente **no** prueba automáticamente una transferencia jurídica
de datos personales — depende de qué dato específico recibe ese tercero. Registra el
hallazgo como `TECHNICAL_FACT` y deja la calificación jurídica para la comparación.

## Legal Document Discovery

Busca en el repositorio, en rutas públicas del sitio, en contenido estático servido, y en
documentación del proyecto. Como mínimo: Aviso de Privacidad, Términos y Condiciones,
Política de Cookies, Política de Devoluciones/Cancelaciones/Reembolsos, Política de
Envíos — y cualquier otro que el perfil de la aplicación sugiera.

No hallar un documento en el repo no es lo mismo que confirmar que no existe (podría
existir fuera del repo, en un CMS, en papel). El resultado correcto es:

> No se identificó el documento en las fuentes revisadas.

nunca:

> El documento no existe.

## Identidad y contenido

Busca inconsistencias internas: nombres de empresa distintos entre pantallas, dominios que
no coinciden, correos o teléfonos de contacto distintos entre el código y los documentos
legales, referencias a un proyecto anterior, configuración claramente heredada,
placeholders sin reemplazar (`Empresa XYZ`, `Your Company`, `Company Name`,
`Example Company`, `test@example.com`, `example.com`, `Lorem ipsum`, `TODO`, `FIXME`,
`CHANGE THIS`, `REMOVE BEFORE PRODUCTION`).

Una coincidencia no es automáticamente un error — un placeholder en un test o fixture no
tiene el mismo riesgo que uno publicado en producción. Distingue el ambiente
(producción / staging / desarrollo / test / mock / seed / documentación) antes de asignar
severidad; el ambiente debe influir en severidad, prioridad y confianza.

Expresamente fuera de alcance: búsqueda de marcas registradas, conflictos marcarios,
nombres de competidores, disponibilidad legal de una denominación comercial frente a
terceros. Esto se limita a consistencia _interna_.
