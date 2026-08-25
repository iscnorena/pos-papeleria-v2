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
- **Modalidades del aviso de privacidad.** La distinción tradicional es integral (relación
  más profunda — empleados, clientes con cuenta) vs. simplificado (público en general,
  secciones mínimas) — pero no la des por sentada como regla fija. **Verifica en esta
  corrida contra la norma vigente** (`references/mexico/sources.md`) qué modalidades
  reconoce actualmente la ley, cuándo corresponde cada una, y cómo debe ponerse a
  disposición el aviso para datos obtenidos por medios electrónicos específicamente — la
  norma puede exigir un mecanismo de acceso particular (banner, liga visible, aviso en el
  propio formulario) que no se resuelve solo con "el aviso existe en algún lado del
  sitio". No asumas mecánicamente "simplificado = público" / "integral = interno": son la
  heurística de partida, no la conclusión — confírmalo contra el texto vigente antes de
  reportarlo como hallazgo. Lo que sí puedes verificar técnicamente sin ambigüedad: si un
  aviso simplificado público cubre expresamente a empleados/proveedores o no — si no los
  cubre, es un hueco real independientemente de cómo se llame cada modalidad.
- **Principios rectores** (verificar en la ley vigente cuáles son exactamente y su
  redacción actual): licitud, consentimiento, información, calidad, finalidad, lealtad,
  proporcionalidad, responsabilidad.
- **Derechos de acceso, rectificación, cancelación y oposición** (tradicionalmente
  "ARCO" — confirma si la ley vigente sigue usando esa sigla o la reformuló). Debe existir
  un mecanismo _real_ para ejercerlos, no solo mencionarse en el texto. Un simple "acude a
  tu sucursal" puede bastar para un negocio pequeño sin plataforma de autoservicio, pero
  igual debe existir un punto de contacto verificable.
- **Transferencias de datos.** **No trates "infraestructura fuera de México" como
  sinónimo automático de "transferencia internacional"** — esa equivalencia produce falsos
  positivos en casi cualquier app moderna. Sigue el proceso completo de
  `references/mexico/transfers.md` (identificar proveedor, flujo, datos, entidad
  receptora, relación aparente encargado-vs-tercero) antes de calificar algo como
  transferencia declarable. La conclusión por defecto cuando no puedas verificar la
  relación contractual real es `LEGAL_REVIEW_REQUIRED`, no una afirmación categórica.
- **Medidas de seguridad y plazos de retención/purga.** Separa el hecho técnico de la
  conclusión jurídica:
  - `TECHNICAL_FACT` / `INCONCLUSIVE` — "no se identificó un mecanismo técnico visible de
    eliminación automática (cron, `ON DELETE`, TTL, columna de expiración) para este
    dato". Esto por sí solo **no** significa que el dato se conserve indefinidamente sin
    base legal — antes de concluir eso, revisa si hay soft delete, procesos manuales de
    depuración, políticas de archivado, backups con su propio ciclo de vida, u
    obligaciones contractuales/fiscales de conservación que justifiquen guardarlo (ej. un
    CFDI importado con obligación fiscal de conservación de varios años).
  - Conclusión jurídica correcta cuando el mecanismo técnico no aparece: "debe
    determinarse si el periodo de conservación y las prácticas de eliminación aplicables a
    este dato son adecuados" → `LEGAL_REVIEW_REQUIRED`, no "se guarda para siempre sin
    base legal" como hecho consumado.
  - Si el aviso promete un plazo de retención concreto (ej. "borramos tu IP a los 7 días")
    y el código no lo respalda, **eso sí** es un `DOCUMENT_MISMATCH` verificable
    directamente — la promesa incumplida es un hecho comparable, la ausencia de promesa no
    lo es.
- **Datos sensibles** (salud, biométricos, origen étnico/racial, opiniones políticas,
  convicciones religiosas/filosóficas, afiliación sindical, orientación sexual) requieren
  consentimiento expreso y por escrito, nunca tácito. Verifica si el sistema los captura
  antes de asumir que este punto no aplica. **La sensibilidad del dato depende de su
  naturaleza, no de la edad de quien lo proporciona** — ver el punto de menores abajo, son
  dos ejes distintos que no deben mezclarse.
- **Menores de edad — modelo correcto.** Separa siempre dos ejes independientes:
  ```
  PERSONA               DATO
  ├── adulto             ├── personal (no sensible)
  └── menor              └── sensible
  ```
  Una persona menor de edad puede proporcionar datos personales que **no** son sensibles
  (ej. su nombre en un formulario de contacto supervisado) — eso no activa por sí solo el
  régimen de datos sensibles. No clasifiques automáticamente "hay menores" como "hay datos
  sensibles": son preguntas distintas que debes verificar por separado (¿participan
  menores? ¿qué datos concretos se capturan? ¿son sensibles por su naturaleza?).
  Cuando la app pueda tratar datos de menores, verifica técnicamente: mecanismos de
  verificación de edad, mecanismos de representación (cuenta de tutor, aprobación de
  adulto), qué datos concretos se tratan y con qué finalidad. **No afirmes
  automáticamente** "el consentimiento debe ser del tutor" como conclusión cerrada — en su
  lugar, reporta: "debe validarse la aplicación de las reglas de representación y
  consentimiento correspondientes conforme al marco jurídico vigente" (`LEGAL_REVIEW_
REQUIRED`), ya que la regla exacta depende del texto vigente y del tipo de dato
  involucrado.

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
