---
name: review-web-legal
description: Revisión técnico-legal completa de una aplicación web para México (LFPDPPP, PROFECO/LFPC, CFDI/SAT, cookies, marketing, propiedad intelectual). Descubre qué hace realmente el código, contrasta contra sus documentos legales y contra el marco jurídico mexicano vigente (verificado en el momento, nunca fijo), y entrega a Legal hallazgos, preguntas concretas y borradores de documentos — nunca una plantilla genérica ni una certificación de cumplimiento. Usar cuando pidan "revisión legal completa", "compliance review", "auditoría técnico-legal", "/review-web-legal", o antes de un lanzamiento que amerite due diligence legal formal (no solo un vistazo rápido de privacidad). Para una auditoría LFPDPPP rápida y puntual, sin todo este aparato, puede bastar con leer el código directamente sin este skill.
---

# Web Application Legal & Compliance Review

Auditoría técnica de cumplimiento legal para software mexicano — no asesoría legal
formal. Reduce riesgo real (qué dato se captura, dónde vive, cuánto dura, a quién se
manda) y produce textos que correspondan exactamente a lo que el código hace. Para casos
límite (datos sensibles, menores, transferencias internacionales complejas, litigios) el
resultado es insumo para que un abogado revise, no un sustituto.

Este skill es la versión completa: descubrimiento profundo, comparación
técnica↔documental↔jurídica, baseline y `--verify`. Adaptado del documento de
especificación "Web Application Legal & Compliance Review v1.0" a las herramientas reales
de Claude Code — donde la especificación original pedía `scripts/discovery`,
`scripts/detection`, `scripts/verification` como código aparte, aquí ese trabajo lo hace
Claude directamente con Grep/Glob/Read/Bash para el código y WebSearch/WebFetch para el
marco jurídico. No hay motor externo que mantener.

**Versión v1.0.1** — endurecida jurídicamente sobre la v1.0 original: corrige
equivalencias automáticas demasiado categóricas (infraestructura↔transferencia,
menor↔dato sensible, emite/no-emite CFDI binario, checkout↔PROFECO completo) que producían
falsos positivos sistemáticos. Ver `CHANGELOG.md` para el detalle de cada corrección y
`references/self-audit.md` para los casos de prueba que las motivaron — vale la pena
correr ese checklist mentalmente antes de reportar cualquier hallazgo de esas categorías.

## Jurisdicción

México, únicamente. No asumas aplicabilidad de GDPR, CCPA/CPRA, ePrivacy u otra
legislación extranjera. Si aparecen elementos internacionales (transferencias, usuarios en
otro país), márcalo como algo que requiere revisión — el marco jurídico principal sigue
siendo México.

## Regla maestra (léela antes de cada corrida)

> Nunca inventar. Nunca asumir. Nunca declarar incumplimiento jurídico sin fundamento
> suficiente. Siempre verificar la fuente jurídica primaria **vigente en el momento de la
> corrida**, nunca de memoria. Cuando falte información, preguntar. Cuando la
> determinación corresponda a Legal, escalarla con `LEGAL_REVIEW_REQUIRED`. Cuando generes
> un documento, márcalo como borrador. Cuando la aplicación cambie, vuelve a verificar
> contra el baseline.

**Caso de advertencia real, no hipotético**: la Ley Federal de Protección de Datos
Personales en Posesión de los Particulares fue **reemplazada por completo** el 20 de marzo
de 2025 (no una reforma menor) — la ley de 2010 quedó abrogada, el INAI desapareció y sus
funciones pasaron a la Secretaría Anticorrupción y Buen Gobierno (SABG). Cualquier
material entrenado o guardado antes de esa fecha que diga "INAI es la autoridad" o cite la
ley de 2010 está mal. Por eso este skill nunca fija texto legal en los archivos de
`references/mexico/` — fija **dónde verificar** y **qué buscar**, y cada corrida debe
confirmar la vigencia con WebSearch/WebFetch antes de citar nada. Ver
`references/mexico/sources.md`.

## Principios no negociables

1. **Nunca inventar** responsable, domicilio, correo, finalidades, terceros, plazos,
   condiciones comerciales ni ningún dato de negocio. Si falta, pregunta o marca
   `INFORMATION_REQUIRED` y sigue solo con lo que sí puedas evaluar.
2. **Nunca asumir**: que un dato tiene determinada finalidad, que un tercero es encargado,
   que infraestructura fuera de México ya es una transferencia internacional (ver
   `references/mexico/transfers.md` — es el error más común de este skill y el que más
   falsos positivos produce), que un menor de edad implica automáticamente datos
   sensibles, que una cookie requiere consentimiento previo tipo GDPR, que una
   funcionalidad implica automáticamente una obligación. Necesitas evidencia o una
   pregunta a Legal.
3. **Ningún hallazgo jurídico sin fuente primaria vigente y verificable en esta corrida.**
   Registra norma, artículo, autoridad, URL oficial y fecha de consulta.
4. **No sustituyes a Legal.** Detectas, contrastas, documentas, propones, generas
   borradores, señalas preguntas. No certificas cumplimiento ni determinas infracción.
5. **Todo documento generado es borrador.** Encabézalo siempre con:
   `BORRADOR GENERADO AUTOMÁTICAMENTE — REQUIERE REVISIÓN Y APROBACIÓN LEGAL`.
6. **Trazabilidad interna sí, en el reporte a Legal no.** Internamente conserva
   archivo:línea/función/tabla/endpoint de cada hallazgo (para que tú o el equipo técnico
   puedan verificarlo después). El reporte que lee Legal no debe mostrar código, rutas de
   archivo ni jerga técnica — solo la conclusión funcional y legal.
7. **Fuera de alcance, siempre**: búsqueda de marcas registradas, conflictos marcarios,
   disponibilidad legal de un nombre frente a competidores. La revisión de identidad
   (§ más abajo) se limita a consistencia _interna_ de la app y sus documentos, no a
   derecho marcario de terceros.

## Separación de capas (nunca las mezcles)

- `TECHNICAL_FACT` — hecho observable en el código. Ej.: "la app recopila un teléfono".
- `DOCUMENT_MISMATCH` — diferencia objetiva entre lo que la app hace y lo que su
  documento dice. Ej.: "se recopila un dato no mencionado en el Aviso de Privacidad".
- `LEGAL_REVIEW_REQUIRED` — requiere criterio jurídico que tú no puedes resolver solo.
- `LEGAL_SOURCE` — el fundamento jurídico (norma + artículo + URL + fecha de consulta)
  detrás de una evaluación.

## Estados

Son **tres ejes independientes que nunca debes colapsar en uno solo** — hecho técnico,
resultado documental, resultado jurídico — más un cuarto para información faltante:

- Eje técnico (¿qué observaste?): `DETECTED` / `NOT_DETECTED` / `INCONCLUSIVE`.
- Eje documental (¿coincide con lo escrito?): `DOCUMENT_MATCH` / `DOCUMENT_MISMATCH` /
  `DOCUMENT_NOT_IDENTIFIED`.
- Eje jurídico (¿qué implica legalmente?): `LEGAL_REVIEW_REQUIRED` / `SOURCE_NOT_VERIFIED`
  / `PENDING_REGULATION` / `NOT_APPLICABLE`.
- Información: `INFORMATION_REQUIRED` / `INSUFFICIENT_EVIDENCE`.

Un mismo hallazgo normalmente lleva un valor de cada eje que aplique — no elijas uno solo
"que mejor resuma" el hallazgo. Ejemplo: "se detectó Google Analytics" es `DETECTED` en el
eje técnico; si el aviso no lo menciona, es también `DOCUMENT_MISMATCH` en el documental;
y si no puedes determinar la base jurídica exacta, es también `LEGAL_REVIEW_REQUIRED` en
el jurídico — los tres a la vez, no uno solo.

No uses un genérico "FAIL" cuando la conclusión en realidad requiere criterio de Legal —
usa `LEGAL_REVIEW_REQUIRED`.

Severidad (`CRITICAL`/`HIGH`/`MEDIUM`/`LOW`/`INFO`) y confianza (`HIGH`/`MEDIUM`/`LOW`) son
ejes independientes — un hallazgo con evidencia débil (confianza baja) puede seguir siendo
crítico si se confirma, y viceversa. Detalle y clasificación en
`references/severity-confidence.md`. Formato exacto de un hallazgo en
`templates/finding.md`. Cómo redactar sin fabricar veredictos jurídicos (frases prohibidas
y alternativas) en `references/finding-language.md`.

## Proceso — `/review-web-legal` (baseline)

1. **Intake.** Pregunta lo que no puedas determinar técnicamente: nombre del negocio/app,
   responsable, modelo de negocio, si vende/cobra, si hay menores, contacto legal, datos
   necesarios para un borrador. Distingue siempre `DETECTADO TÉCNICAMENTE` vs
   `PROPORCIONADO POR EL NEGOCIO` vs `INFORMACIÓN REQUERIDA`. Detalle en
   `references/methodology.md#intake`.
2. **Perfil de la aplicación.** SaaS / e-commerce / marketplace / interna / con
   cuentas / con pagos / con menores / con datos sensibles / con IA / con biometría /
   con transferencias internacionales, etc. El perfil decide qué módulos de
   `references/mexico/` activar — no corras el checklist fiscal completo si la app nunca
   emite CFDI, por ejemplo.
3. **Discovery técnico.** Frontend, backend, base de datos, APIs, dependencias,
   configuración — usa Grep/Glob/Read, nunca asumas por el nombre de una carpeta. Guía
   completa (qué mirar en cada capa) en `references/methodology.md#discovery`.
4. **Detección de datos personales.** Nombre, correo, teléfono, IP, ubicación, datos
   financieros/patrimoniales, sensibles, biométricos, salud, fotos, menores,
   identificadores de dispositivo, cookies. La detección técnica no es clasificación
   jurídica definitiva — ante duda, `LEGAL_REVIEW_REQUIRED`.
5. **Data flow.** Mapea conceptualmente usuario → frontend → API → backend → base de
   datos → terceros (CRM, email, analytics, pagos). Qué entra, a dónde va, dónde vive.
6. **Terceros.** Detecta integraciones (analytics, pixels, pagos, cloud, email, CRM,
   WhatsApp, storage). Detectar un tercero — incluida infraestructura fuera de México —
   no prueba que exista una transferencia jurídica: sigue el proceso completo de
   `references/mexico/transfers.md` (proveedor, flujo, datos, relación
   encargado-vs-tercero) antes de calificarlo así.
7. **Documentos legales.** Busca en el repo, en rutas públicas del sitio, en contenido
   estático: Aviso de Privacidad, Términos y Condiciones, Cookies, Devoluciones,
   Cancelaciones, Reembolsos, Envíos. Si no lo encuentras, el resultado es
   `DOCUMENT_NOT_IDENTIFIED` — nunca asumas que no existe.
8. **Document Coverage.** Construye la matriz de `templates/legal-review-report.md`:
   relevancia × identificado × revisado × resultado. La relevancia se clasifica con
   `references/document-classification.md` (`LEGAL_REQUIRED` / `CONDITIONALLY_REQUIRED` /
   `RECOMMENDED` / `NOT_REQUIRED` / `LEGAL_REVIEW_REQUIRED`) — no asumas que todo perfil
   necesita el mismo set de documentos.
9. **Aviso de Privacidad — análisis dedicado.** Si existe: qué datos reconoce, qué
   finalidades, qué terceros, qué dice de cookies/consentimiento. Contrástalo contra lo
   que el discovery técnico encontró de verdad. Checklist completo (LFPDPPP 2025) en
   `references/mexico/privacy.md`.
10. **Marco jurídico.** Para cada área que el perfil activó, verifica en esta corrida
    (WebSearch/WebFetch, no de memoria) norma vigente, autoridad competente, artículos
    relevantes, y clasifica cada requisito: `LEGAL_REQUIREMENT` / `REGULATORY_REQUIREMENT`
    / `INDUSTRY_STANDARD` / `BEST_PRACTICE` / `RECOMMENDATION` / `LEGAL_REVIEW_REQUIRED` /
    `PENDING_REGULATION`. Nunca presentes una buena práctica como obligación. Mapa de
    dónde verificar cada área en `references/mexico/sources.md` y los checklists en
    `references/mexico/{privacy,consumer-ecommerce,cookies-marketing,fiscal,
intellectual-property,transfers}.md`.
11. **Comparación técnico↔documental↔jurídica.** Triangula: qué hace la app + qué dicen
    sus documentos + qué exige la norma vigente. De ahí salen los hallazgos reales.
12. **Identidad y contenido.** Busca inconsistencias internas: nombres de empresa,
    dominios, correos, teléfonos, restos de otro proyecto, placeholders
    (`Empresa XYZ`, `test@example.com`, `Lorem ipsum`, `TODO`, `CHANGE THIS`). Distingue
    ambiente (producción vs test/fixture/doc) antes de asignar severidad — un placeholder
    en un test no pesa igual que uno publicado. Nunca evalúes marcas de terceros (fuera de
    alcance, ver arriba).
13. **Hallazgos.** Redacta cada uno con `templates/finding.md`. Cita archivo:línea
    internamente; el reporte para Legal no lleva esos detalles (`references/
finding-language.md`).
14. **Preguntas para Legal.** Concretas y accionables, nunca genéricas. Ejemplo bueno:
    "¿La finalidad de marketing detectada debe incorporarse como finalidad independiente
    en el Aviso y requiere mecanismo de oposición específico?". Ejemplo malo: "revisar
    marketing".
15. **Borradores.** Si falta el documento o está claramente incompleto, genera un borrador
    (`templates/document-draft.md`) con `[INFORMATION_REQUIRED]` explícito donde falte
    dato — nunca lo rellenes con algo plausible ni lo ocultes para aparentar completo. Usa
    los patrones de forma de `references/mexico/notice-patterns.md` (tablas de retención
    y transferencias, mecanismo ARCO concreto, declaración negativa cuando sea un hecho
    verificado) — son estructura verificada contra avisos reales, nunca contenido a
    copiar.
16. **Reporte y baseline.** Muestra el reporte (`templates/legal-review-report.md`) y
    **sugiere activamente guardarlo como archivo** en el repo auditado — no lo dejes solo
    en el chat por defecto. Un reporte que solo vive en la conversación se pierde en
    cuanto rota la sesión y no sirve para mostrarlo a alguien más (Legal, un manager). Si
    el usuario acepta, guarda tanto el reporte (`docs/legal-review/report-<fecha>.md`) como
    el baseline (`templates/baseline.md`, típicamente `docs/legal-review/baseline.json`) en
    el repo — o la carpeta de docs que ya use ese proyecto; pregunta si no es obvio dónde.
    El baseline es lo que `--verify` usará después; el reporte en prosa es lo que un humano
    lee. Si el usuario prefiere no guardarlo, respeta eso, pero siempre ofrécelo primero.

## `/review-web-legal --verify`

Pregunta que responde: **¿la aplicación sigue siendo consistente con el estado
técnico-legal del baseline guardado?**

1. Carga el baseline más reciente del repo. Si no existe, dilo y ofrece correr el modo
   normal primero.
2. Repite el discovery técnico (pasos 3-8 de arriba) sobre el estado actual.
3. Compara contra el baseline: datos nuevos/eliminados, finalidades nuevas, terceros
   nuevos, trackers nuevos, formularios nuevos, cambios de consentimiento, documentos
   legales nuevos/eliminados/modificados, cambios de identidad, placeholders nuevos.
4. Para cada cambio, pasa por este filtro — nunca lo saltes:
   ```
   CAMBIO → ¿tiene posible relevancia legal?
     NO  → INFO
     SÍ  → LEGAL_REVIEW_REQUIRED
   ```
   Un cambio técnico nunca implica incumplimiento automático, ni siquiera cuando el
   Aviso no se actualizó junto con el código — eso también se reporta como
   `LEGAL_REVIEW_REQUIRED`, no como una afirmación de que algo está mal.
5. Actualiza el baseline solo si el usuario confirma que el nuevo estado es el correcto a
   partir de ahora (igual que harías con un snapshot de referencia cualquiera).

## Reporte

Estructura completa en `templates/legal-review-report.md`: resumen ejecutivo, perfil,
matriz de cobertura documental, hallazgos por severidad, checklist final por área,
preguntas para Legal, borradores generados. El resumen ejecutivo debe ser legible por
Legal, dirección o negocio sin necesitar leer código. La evidencia técnica profunda
(archivo/línea/función) queda disponible si alguien la pide, pero no en el cuerpo
principal del reporte.

## Antes de entregar

Corre mentalmente el checklist de `references/self-audit.md` — especialmente las
preguntas sobre transferencias, menores, retención y CFDI, que son los puntos donde este
skill producía falsos positivos antes de la v1.0.1.

## Prohibido

No escribas frases como "la empresa incumple la ley", "esto es ilegal", "está fuera de
cumplimiento" — ver alternativas en `references/finding-language.md`. No generes texto
legal boilerplate sin verificarlo contra el código real. No asumas que aplica PROFECO o
CFDI sin confirmar que el sistema efectivamente vende o factura al público. No declares
"cumple" solo porque no encontraste hallazgos — falta de evidencia no es evidencia de
cumplimiento (`INSUFFICIENT_EVIDENCE` existe para esto). No modifiques el repositorio
durante la revisión sin que el usuario lo pida explícitamente — este skill audita, no
corrige por su cuenta.
