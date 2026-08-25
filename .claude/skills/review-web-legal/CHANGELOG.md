# Changelog — review-web-legal

## v1.0.1 (adición 2) — 2026-08-25, misma noche

Agregado "Política de Seguridad de la Información" como tipo de documento evaluable en
`references/document-classification.md`, la matriz de `templates/legal-review-report.md`,
y la lista de documentos a buscar en `SKILL.md` paso 7 y `references/methodology.md`. No
estaba contemplado hasta ahora. Nunca `LEGAL_REQUIRED` por defecto, pero `RECOMMENDED`
cuando el discovery encuentre un hallazgo de seguridad abierto (ej. una credencial sin
cifrar). Motivado por revisar la suite legal completa de SICAR.mx (patrón 6 de
`references/mexico/notice-patterns.md`): declarar técnicamente qué medidas de seguridad SÍ
existen y, cuando sea cierto, qué NO se hace (ej. "no almacenamos datos de tarjeta").

## v1.0.1 (adición) — 2026-08-25, misma tarde

Se agregó `references/mexico/notice-patterns.md`, a partir de comparar 5 avisos de
privacidad/términos reales publicados (Alegra-CO, Solvermedia-ES, MyBusiness POS-MX,
Odoo-BE, SICAR-MX) durante una sesión de trabajo sobre pos-papeleria. Captura patrones de
**forma** (tabla de retención por dato, tabla de transferencias con proveedor/ubicación/
propósito, correo dedicado de privacidad, mecanismo ARCO concreto con plazo de respuesta,
declaración negativa proactiva cuando sea un hecho verificado) — nunca contenido ni citas
legales de esos ejemplos, que son de otras jurisdicciones o de otro negocio.
`templates/document-draft.md` y `references/mexico/privacy.md` actualizados para usarlos.
También quedó documentado un caso real que confirma el riesgo de `sources.md`: dos de los
cinco avisos revisados citaban marcos legales obsoletos (LFPDPPP 2010, LOPD española de
1999); uno (SICAR.mx) ya citaba correctamente a la Secretaría Anticorrupción y Buen
Gobierno.

## v1.0.1 — 2026-08-25

Endurecimiento jurídico sobre la v1.0, a partir de una revisión dirigida por el usuario.
No se rehizo la arquitectura — se corrigieron afirmaciones jurídicas demasiado categóricas
y se agregó lo que faltaba. Ver `references/self-audit.md` para los casos de prueba que
motivaron cada corrección.

### Correcciones jurídicas

- **Transferencias internacionales** (`references/mexico/privacy.md`,
  `references/methodology.md`, nuevo `references/mexico/transfers.md`): eliminada la
  equivalencia automática "infraestructura fuera de México = transferencia
  internacional". Ahora exige distinguir infraestructura / proveedor / persona encargada /
  responsable / tercero / comunicación / remisión / transferencia, y por defecto concluye
  `LEGAL_REVIEW_REQUIRED` cuando la relación contractual no es verificable desde el
  código.
- **Menores de edad** (`references/mexico/privacy.md`): eliminada la equivalencia
  "menor = dato sensible". Ahora separa explícitamente el eje persona (adulto/menor) del
  eje dato (personal/sensible), y cambia la afirmación categórica "el consentimiento debe
  ser del tutor" por `LEGAL_REVIEW_REQUIRED` con la redacción sugerida por el usuario.
- **Aviso de privacidad — modalidades** (`references/mexico/privacy.md`): la distinción
  integral/simplificado ya no se presenta como regla fija ("simplificado=público,
  integral=interno") sino como heurística de partida que debe confirmarse contra la norma
  vigente en cada corrida, incluyendo el mecanismo de acceso al aviso para datos obtenidos
  electrónicamente.
- **Retención y conservación** (`references/mexico/privacy.md`): eliminada la lectura
  "no encontré cron de purga = datos conservados indefinidamente sin base legal". Ahora
  separa el hecho técnico (`INCONCLUSIVE` si no hay mecanismo visible) de la conclusión
  jurídica (`LEGAL_REVIEW_REQUIRED`), y agrega qué más investigar antes de concluir
  (soft delete, backups, archivado, obligaciones contractuales/fiscales de conservación).
- **CFDI/SAT** (`references/mexico/fiscal.md`): agregado un tercer escenario,
  "generación delegada" (el sistema no timbra directamente pero dispara la emisión a
  través de un tercero) — antes solo se distinguía emite/no emite, lo que trataba mal los
  casos de facturación delegada a una pasarela de pago o SaaS de facturación.
- **PROFECO/LFPC** (`references/mexico/consumer-ecommerce.md`): agregada tabla de
  escenarios (e-commerce directo / marketplace / publicidad sin venta directa / SaaS B2B /
  punto de venta interno) — antes el criterio binario "hay checkout ⇒ aplica todo" no
  distinguía marketplace (obligaciones adicionales de deslinde) ni B2B (generalmente no
  aplica el capítulo de consumidor).

### Correcciones metodológicas

- Reforzada la separación de tres ejes independientes (hecho técnico / resultado
  documental / resultado jurídico) explícitamente en `SKILL.md`.
- `templates/finding.md`: agregado el campo "Última reforma relevante" al bloque de fuente
  legal, separado del campo genérico de vigencia.

### Nuevas capacidades

- `references/mexico/transfers.md` — guía dedicada para no confundir infraestructura con
  transferencia jurídica.
- `references/document-classification.md` — clasificación de documentos esperados
  (`LEGAL_REQUIRED` / `CONDITIONALLY_REQUIRED` / `RECOMMENDED` / `NOT_REQUIRED` /
  `LEGAL_REVIEW_REQUIRED`) en vez de asumir que todo perfil necesita el mismo set de
  documentos. `templates/legal-review-report.md` actualizado para usarla en la matriz de
  cobertura documental.
- `references/self-audit.md` — checklist de calidad + 17 casos de prueba conceptuales
  (A–Q) para correr mentalmente antes de reportar y después de cualquier cambio futuro al
  skill.

### Qué se mantuvo sin cambios (ya estaba bien)

Nunca inventar/nunca asumir como principios rectores, `INFORMATION_REQUIRED`,
trazabilidad técnica interna sin exponerla a Legal, Identity & Content Consistency,
diferenciación de ambientes, exclusión explícita de búsqueda de marcas, baseline +
`--verify`, generación de borradores con placeholders explícitos, prohibición de lenguaje
categórico ("es ilegal", "incumple").

### Riesgos pendientes (requieren revisión jurídica humana, no técnica)

- Los checklists de `references/mexico/*.md` siguen siendo guías de qué verificar, no
  texto legal — cada corrida real debe reconfirmar artículos y vigencia con
  WebSearch/WebFetch; este changelog no sustituye esa verificación.
- La distinción encargado-vs-tercero en `transfers.md` es un modelo conceptual para guiar
  el discovery técnico, no una calificación jurídica cerrada — la calificación final
  siempre depende de Legal revisando el contrato real con cada proveedor.
- No se ejecutaron pruebas automatizadas (el skill es instruccional, no código) — los
  casos A–Q de `self-audit.md` se razonaron contra el texto actualizado, no se corrieron
  contra una aplicación real distinta de pos-papeleria.

Estado final: `READY_FOR_REAL_PROJECT_TEST`. No implica corrección jurídica garantizada —
la última palabra sobre cuestiones jurídicas corresponde al equipo Legal.
