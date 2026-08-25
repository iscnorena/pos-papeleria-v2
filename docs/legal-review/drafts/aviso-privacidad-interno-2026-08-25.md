BORRADOR GENERADO AUTOMÁTICAMENTE — REQUIERE REVISIÓN Y APROBACIÓN LEGAL

Generado por el skill `review-web-legal` v1.0.1 a partir de la revisión técnico-legal del
25 de agosto de 2026 (commit `18f8f55`), siguiendo `templates/document-draft.md`. Cada
afirmación de este documento está redactada contra lo que el código de pos-papeleria
realmente hace — no es una plantilla genérica. Donde falta información se marca
`[INFORMATION_REQUIRED]`: no se completó con un valor plausible, así que **no debe
publicarse hasta llenarse y hasta que Legal lo apruebe**.

**Revisión (misma tarde del 25 de agosto)**: la estructura de retención, transferencias y
derechos se reorganizó en tablas y un procedimiento concreto, siguiendo los patrones de
`references/mexico/notice-patterns.md` — extraídos de comparar 5 avisos reales (Alegra,
Solvermedia, MyBusiness POS, Odoo, SICAR), solo como formato, nunca como contenido. Ningún
número, plazo ni dato concreto de esos ejemplos se copió aquí — donde no había un hecho
verificado de pos-papeleria, se dejó `[INFORMATION_REQUIRED]`, igual que en la versión
anterior.

Cubre a **empleados** (tabla `users`) y **proveedores** (tabla `suppliers`) — las dos
superficies internas que la auditoría del 24-25 de agosto encontró sin aviso de
privacidad propio (hallazgo `PRIV-001`). El aviso público de `/kit/privacidad` no las
cubre: está acotado por texto a "tus archivos y lo que escribes" en las herramientas
públicas.

**Pregunta abierta para Legal** (ver reporte, sección 7, pregunta 1): este borrador trata
a empleados y proveedores en un solo documento por simplicidad — Legal debe confirmar si
conviene mantenerlo así o dividirlo en dos avisos, dado que la relación jurídica con cada
uno es distinta (relación laboral vs. relación comercial).

---

# Aviso de Privacidad Interno — Empleados y Proveedores

## Responsable

**[INFORMATION_REQUIRED — razón social / nombre comercial completo]**. El sistema tiene
configurado un nombre de negocio en la variable `POS_COMPANY_NAME` de producción, pero su
valor no se expuso en este borrador por ser un dato de configuración en vivo — complétalo
aquí con la razón social exacta.

Domicilio: **[INFORMATION_REQUIRED]**
Contacto para temas de privacidad: **[INFORMATION_REQUIRED — sugerido: un correo
dedicado, ej. `privacidad@[dominio del negocio]`; no se conoce el dominio real desde el
código, así que no se completó]**

es responsable del tratamiento de los datos personales que se describen en este aviso,
conforme a la Ley Federal de Protección de Datos Personales en Posesión de los
Particulares (LFPDPPP) vigente. **[Verificar en el momento de publicar este aviso que la
cita normativa siga vigente — la LFPDPPP fue reemplazada por completo el 20 de marzo de
2025; ver `references/mexico/sources.md` del skill.]**

## A quién aplica este aviso

- **Empleados**: cualquier persona con una cuenta de usuario en el sistema POS
  (cajeros, administradores).
- **Proveedores**: personas o empresas registradas como proveedores de mercancía.

## Datos personales que recabamos

### De empleados

- Nombre completo.
- Nombre de usuario (para iniciar sesión).
- Correo electrónico (opcional — no todos los usuarios lo tienen registrado).
- Contraseña y PIN de acceso — **no se guardan en texto plano**, se almacenan como hash
  (huella criptográfica de un solo sentido).
- Rol asignado (ej. cajero, administrador) y sucursal a la que está adscrito.
- Fecha de creación y última actualización de la cuenta.
- Registro de qué usuario realiza cada operación relevante del sistema (ventas,
  recepciones de mercancía, autorizaciones) — para control interno y auditoría, no se
  comparte fuera del sistema.

**No recabamos datos sensibles** de nuestros empleados (salud, origen étnico o racial,
creencias religiosas o filosóficas, afiliación sindical, orientación sexual) — verificado
contra el esquema de la base de datos, ninguno de esos campos existe en el sistema.

### De proveedores

- Nombre o razón social.
- RFC (usado para validar que coincide con el emisor de los comprobantes fiscales que
  nos entregan).
- Nombre de contacto, teléfono y correo electrónico.
- Historial de costos y códigos de producto asociados a ese proveedor.

## Finalidades del tratamiento

- **Empleados**: autenticar el acceso al sistema, controlar qué puede hacer cada persona
  según su rol, y dejar trazabilidad de quién realizó cada operación (control interno,
  no evaluación de desempeño — **[INFORMATION_REQUIRED: confirmar con Recursos Humanos si
  existe algún uso adicional de este registro, ej. evaluación de desempeño, para
  declararlo si aplica]**).
- **Proveedores**: gestionar la relación de compra de mercancía, validar comprobantes
  fiscales que nos entregan, y tener un punto de contacto operativo.

## Transferencias — dónde viven estos datos

| Proveedor                 | Ubicación                    | Propósito                                                                                                                                                     | Estado                  |
| ------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Supabase                  | Estados Unidos (`us-east-1`) | Base de datos del sistema (almacena toda la información descrita en este aviso)                                                                               | `LEGAL_REVIEW_REQUIRED` |
| Vercel                    | Estados Unidos               | Hosting y ejecución de la aplicación                                                                                                                          | `LEGAL_REVIEW_REQUIRED` |
| API de Claude (Anthropic) | Estados Unidos               | Lectura automática de la foto de un ticket de compra, solo si un administrador activa esta función en Recepción de Mercancía — la imagen no se guarda después | `LEGAL_REVIEW_REQUIRED` |

Para Supabase y Vercel, procesan y almacenan estos datos bajo instrucciones técnicas del
sistema. `LEGAL_REVIEW_REQUIRED`: confirmar con Legal si, conforme a los términos
contractuales reales de estos proveedores, califican como encargados del tratamiento y
qué debe declararse aquí en consecuencia — esta tabla asume que sí debe mencionarse la
ubicación, pero no determina la calificación jurídica final (ver
`references/mexico/transfers.md` del skill).

Para la API de Claude, la fotografía del ticket puede incluir el nombre y RFC impresos
del proveedor. `LEGAL_REVIEW_REQUIRED`: confirmar si esta transferencia requiere
consentimiento expreso adicional al de este aviso.

**No vendemos ni compartimos estos datos** con ningún otro tercero fuera de lo descrito en
esta tabla — verificado contra el código, no hay integraciones de analytics, publicidad ni
venta de datos.

## Conservación

| Dato                                | Plazo                                                                                                                              | Qué pasa al vencer                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Cuenta de empleado (`users`)        | **[INFORMATION_REQUIRED]** — no se identificó un mecanismo técnico de purga automática                                             | **[INFORMATION_REQUIRED]** — hoy no hay eliminación automática al dar de baja a un empleado |
| Datos de proveedor (`suppliers`)    | **[INFORMATION_REQUIRED]** — mientras la relación comercial esté vigente, más el plazo que exijan obligaciones fiscales aplicables | **[INFORMATION_REQUIRED]**                                                                  |
| Registro de intentos de acceso (IP) | 7 días                                                                                                                             | Se elimina automáticamente (verificado en código, `SEGURIDAD.retencionIntentosMs`)          |

La ausencia de un mecanismo técnico de purga para `users`/`suppliers` es un hecho técnico,
no evidencia de conservación indefinida sin base legal — hallazgo `PRIV-005` del reporte,
pendiente de que Legal determine si el plazo actual (indefinido mientras la relación esté
vigente) es adecuado o si debe definirse un procedimiento de depuración tras la baja.

## Derechos de acceso, rectificación, cancelación y oposición

Para ejercer tus derechos, envía una solicitud por escrito a
**[INFORMATION_REQUIRED — correo de privacidad]** que incluya: identificación oficial,
descripción clara del dato sobre el que ejerces tu derecho, y tus datos de contacto para
dar seguimiento. Responderemos en un plazo de **[INFORMATION_REQUIRED — días hábiles,
decisión de negocio/Legal]**.

El aviso público (`/kit/privacidad`) usa "acude a tu sucursal" como mecanismo para
visitantes externos — Legal debe confirmar si el mismo mecanismo aplica a empleados y
proveedores, o si conviene uno distinto (por ejemplo, con quien administra el sistema).

## Medidas de seguridad

Las contraseñas y PIN se almacenan como hash, nunca en texto plano.
**[INFORMATION_REQUIRED]**: si existen medidas adicionales que Legal/Seguridad quiera
declarar aquí (ej. respecto a la llave de la API de Claude, que hoy se almacena sin cifrar
— hallazgo `PRIV-003` del reporte, riesgo aceptado documentado en el propio código).

## Cambios a este aviso

**[INFORMATION_REQUIRED]** — política de actualización, si el negocio ya tiene una
definida.

Última actualización: **[fecha de publicación, no la de este borrador]**
