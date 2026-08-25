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

**Llenado el 25 de agosto (misma noche)** con lo que ya se puede verificar sin inventar
nada nuevo — dos campos, marcados abajo con su nivel de confianza. Todo lo demás sigue
`[INFORMATION_REQUIRED]` porque genuinamente no hay ninguna fuente (código, intake,
seed) de la que sacarlo sin adivinar.

---

# Aviso de Privacidad Interno — Empleados y Proveedores

## Responsable

**Papelería Gabbana** _(confianza media — no dato firme)_. Es el valor configurado en
`POS_COMPANY_NAME` en `.env.local` de desarrollo; el valor real de producción está oculto
en Vercel (marcado "Sensitive", no legible desde aquí) pero casi seguro es el mismo dato,
ya que el propio negocio es una papelería y coincide con el nombre de otro proyecto
("papeleria-gabbana") en la misma cuenta de Vercel. **Confirma que coincide con la
producción antes de publicar** — y sigue faltando la razón social completa (si es persona
física con actividad empresarial o una S.A. de C.V. constituida) y si "Papelería Gabbana"
es también el nombre legal o solo el comercial.

Domicilio: **[INFORMATION_REQUIRED]** — no hay ninguna dirección de negocio en el código
ni en el seed; las direcciones que sí existen (`branches.address`) son de cada sucursal en
la base de datos real de producción, a la que este borrador no tuvo acceso.

Contacto para temas de privacidad: **[INFORMATION_REQUIRED]** — no hay ningún correo
configurado en el sistema (verificado por grep en `.env.example` y `src/config`). Lo
único que sí existe como canal real es el WhatsApp por sucursal (`branches.whatsappNumber`)
que ya usa el aviso público — ver la sección de Derechos abajo, donde se propone
reutilizarlo en vez de esperar a que se cree un correo nuevo.

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

**Propuesta, no decisión final**: en vez de esperar a que se cree un correo de privacidad
nuevo, reutilizar el mismo mecanismo que ya usa el aviso público (`/kit/privacidad`) —
"acude a tu sucursal" — porque es un canal que ya existe, ya está en producción, y
empleados y proveedores de por sí interactúan con la sucursal en persona. Redacción
sugerida:

> Para ejercer tus derechos, acude directamente a tu sucursal, o contáctanos por WhatsApp
> al número de la sucursal correspondiente. Solicítalo por escrito e incluye tu
> identificación oficial y una descripción clara del dato sobre el que ejerces tu derecho.
> Responderemos en un plazo de **[INFORMATION_REQUIRED — días hábiles, decisión de
> negocio/Legal — no se copió el "20 días hábiles" que usa SICAR.mx de referencia, ver
> `references/mexico/notice-patterns.md` patrón 4]**.

`LEGAL_REVIEW_REQUIRED`: confirmar si "acude a tu sucursal" es un mecanismo suficiente
para empleados y proveedores (con quienes hay una relación más profunda que con un
visitante anónimo del sitio público) o si Legal prefiere un canal dedicado y más formal —
por ejemplo, con quien administra el sistema en vez de con la sucursal.

## Medidas de seguridad

Las contraseñas y PIN se almacenan como hash, nunca en texto plano.
**[INFORMATION_REQUIRED]**: si existen medidas adicionales que Legal/Seguridad quiera
declarar aquí (ej. respecto a la llave de la API de Claude, que hoy se almacena sin cifrar
— hallazgo `PRIV-003` del reporte, riesgo aceptado documentado en el propio código).

## Cambios a este aviso

**[INFORMATION_REQUIRED]** — política de actualización, si el negocio ya tiene una
definida.

Última actualización: **[fecha de publicación, no la de este borrador]**
