BORRADOR GENERADO AUTOMÁTICAMENTE — REQUIERE REVISIÓN Y APROBACIÓN LEGAL

Generado por el skill `review-web-legal` v1.0.1 a partir de la revisión técnico-legal del
25 de agosto de 2026 (commit `18f8f55`), siguiendo `templates/document-draft.md`. Cada
afirmación de este documento está redactada contra lo que el código de pos-papeleria
realmente hace — no es una plantilla genérica. Donde falta información se marca
`[INFORMATION_REQUIRED]`: no se completó con un valor plausible, así que **no debe
publicarse hasta llenarse y hasta que Legal lo apruebe**.

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
Contacto para temas de privacidad: **[INFORMATION_REQUIRED]**

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

## Transferencias y dónde viven estos datos

- La base de datos del sistema es operada por **Supabase**, y la aplicación corre en
  **Vercel** — ambos con infraestructura fuera de México (Estados Unidos). Procesan y
  almacenan estos datos bajo instrucciones técnicas del sistema. `LEGAL_REVIEW_REQUIRED`:
  confirmar con Legal si, conforme a los términos contractuales reales de estos
  proveedores, califican como encargados del tratamiento y qué debe declararse aquí en
  consecuencia — este borrador asume que sí debe mencionarse la ubicación, pero no
  determina la calificación jurídica final.
- Si un administrador activa la función de "carga de recepción por foto", la fotografía
  del ticket de compra (que puede incluir el nombre y RFC impresos del proveedor) se
  envía a la **API de Claude (Anthropic, Estados Unidos)** para lectura automática. La
  imagen no se guarda después de procesarse. `LEGAL_REVIEW_REQUIRED`: confirmar si esta
  transferencia requiere consentimiento expreso adicional al de este aviso.
- No compartimos estos datos con ningún otro tercero fuera de lo aquí descrito.

## Conservación

Mientras la cuenta del empleado esté activa o la relación con el proveedor esté vigente,
más el tiempo adicional que exijan obligaciones legales aplicables (por ejemplo,
fiscales, sobre los datos de proveedores). **No se identificó un mecanismo técnico
automático de eliminación** al dar de baja a un empleado o proveedor —
**\[INFORMATION_REQUIRED]**: definir y documentar aquí el plazo y procedimiento real tras
la baja (hallazgo `PRIV-005` del reporte).

## Derechos de acceso, rectificación, cancelación y oposición

**[INFORMATION_REQUIRED]** — el aviso público (`/kit/privacidad`) usa "acude a tu
sucursal" como mecanismo para visitantes externos; para empleados y proveedores define
aquí el procedimiento real (¿la misma vía, o un contacto distinto — por ejemplo, con quien
administra el sistema?).

## Medidas de seguridad

Las contraseñas y PIN se almacenan como hash, nunca en texto plano. **[INFORMATION\_
REQUIRED]**: si existen medidas adicionales que Legal/Seguridad quiera declarar aquí (ej.
respecto a la llave de la API de Claude, que hoy se almacena sin cifrar — hallazgo
`PRIV-003` del reporte, riesgo aceptado documentado en el propio código).

## Cambios a este aviso

**[INFORMATION_REQUIRED]** — política de actualización, si el negocio ya tiene una
definida.

Última actualización: **[fecha de publicación, no la de este borrador]**
