# LFPDPPP — checklist de protección de datos personales

Verifica primero contra `references/mexico/sources.md` que sigues citando la ley y
autoridad correctas antes de usar este checklist — está descrito en términos de qué
verificar, no de texto legal fijo.

Aplica casi siempre que se capture cualquier dato personal (nombre, teléfono, correo, IP,
ubicación, archivos subidos con metadatos, etc.), incluso de visitantes anónimos sin
cuenta. Aplica a "particulares" (empresas privadas) — si la app es de un ente público,
el régimen es otro (ley general de sujetos obligados), fuera del foco típico de este
skill.

## Qué verificar

- **Responsable identificado.** ¿La app declara quién es el responsable del tratamiento
  (nombre/razón social, domicilio, contacto)? Dato de negocio, no técnico —
  `PROPORCIONADO POR EL NEGOCIO` o `INFORMACIÓN REQUERIDA`.
- **Aviso de privacidad integral vs simplificado.** El integral es para quien tiene una
  relación más profunda (empleados, clientes con cuenta); el simplificado es para el
  público en general con las secciones mínimas (responsable, qué se recaba, para qué,
  transferencias, cómo ejercer derechos). Verifica si la app distingue estos dos públicos
  y si cada uno tiene el aviso que le corresponde — un aviso simplificado público no cubre
  automáticamente a los empleados o proveedores con quienes el sistema interactúa
  internamente.
- **Principios rectores** (verificar en la ley vigente cuáles son exactamente y su
  redacción actual): licitud, consentimiento, información, calidad, finalidad, lealtad,
  proporcionalidad, responsabilidad.
- **Derechos de acceso, rectificación, cancelación y oposición** (tradicionalmente
  "ARCO" — confirma si la ley vigente sigue usando esa sigla o la reformuló). Debe existir
  un mecanismo _real_ para ejercerlos, no solo mencionarse en el texto. Un simple "acude a
  tu sucursal" puede bastar para un negocio pequeño sin plataforma de autoservicio, pero
  igual debe existir un punto de contacto verificable.
- **Transferencias de datos.** Si la infraestructura vive fuera de México (Supabase,
  Vercel, AWS en EUA, cualquier API de terceros fuera de México — incluida una API de IA)
  eso es una transferencia internacional y debe declararse, exista o no consentimiento
  explícito de por medio para cada caso.
- **Medidas de seguridad y plazos de retención/purga.** Si algo se guarda "para siempre"
  sin razón de negocio identificable, es un hallazgo. Verifica si hay lógica de purga
  real en el código (cron, `ON DELETE`, columna de expiración) o si es solo una promesa en
  el texto sin respaldo técnico — eso sería `DOCUMENT_MISMATCH`.
- **Datos sensibles** (salud, biométricos, origen étnico/racial, opiniones políticas,
  convicciones religiosas/filosóficas, afiliación sindical, orientación sexual) requieren
  consentimiento expreso y por escrito, nunca tácito. Verifica si el sistema los captura
  antes de asumir que este punto no aplica.
- **Menores de edad.** Si el público puede incluir menores sin supervisión, el
  consentimiento para datos sensibles debe ser del tutor, no del menor.

## Señales de que el aviso existente no corresponde a la realidad técnica

- El aviso menciona datos que el código no captura (sobre-declaración, riesgo menor pero
  sigue siendo `DOCUMENT_MISMATCH`).
- El código captura datos que el aviso no menciona (bajo-declaración, más grave).
- El aviso menciona un mecanismo de derechos que no existe en ningún flujo verificable.
- El aviso no menciona un tercero al que el código sí envía datos.
- El aviso es una plantilla genérica reconocible (lenguaje que no corresponde a lo que la
  app específicamente hace) — clasifícalo `MEDIUM` salvo que además falte información
  material, en cuyo caso puede subir.

## Qué NO asumir

- Que toda cookie requiere consentimiento previo tipo banner estilo GDPR — el marco
  mexicano no es igual al europeo; verifica qué exige realmente la ley vigente para
  cookies antes de recomendar un banner de estilo europeo por reflejo
  (`references/mexico/cookies-marketing.md`).
- Que un checkbox de "acepto los términos" es jurídicamente suficiente como consentimiento
  para datos sensibles — eso requiere `LEGAL_REVIEW_REQUIRED`, no una conclusión tuya.
- Que porque el código no guarda un archivo (p. ej. una foto procesada por una API externa
  y descartada), no hay nada que declarar — la transferencia en sí ya es relevante aunque
  no haya retención.
