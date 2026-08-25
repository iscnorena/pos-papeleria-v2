# Severidad, confianza y clasificación de requisitos

## Severidad

- `CRITICAL` — falta un aviso de privacidad y se están capturando datos personales; se
  guardan datos sin base legal o indefinidamente sin justificación de negocio; una
  transferencia internacional real no está declarada en ningún lado.
- `HIGH` — el aviso existe pero está incompleto (falta una sección obligatoria, no hay
  mecanismo real de ejercicio de derechos).
- `MEDIUM` — el texto legal es genérico/plantilla y no corresponde a lo que el código
  realmente hace.
- `LOW` — mejoras de claridad, redacción o descubribilidad (el documento existe pero no
  está enlazado desde ningún lado visible).
- `INFO` — cambio detectado sin relevancia legal aparente (típico de `--verify`).

## Confianza

- `HIGH` / `MEDIUM` / `LOW` — representa la calidad de la evidencia técnica/documental
  reunida, **no** certeza jurídica. Un hallazgo puede ser `CRITICAL` con confianza `LOW`
  si la evidencia es indirecta pero el riesgo, de confirmarse, sería grave — repórtalo
  así, no lo escondas ni lo infles a `HIGH` para que se vea más sólido.

Nunca mezcles severidad y confianza en un solo número. Repórtalas siempre por separado.

## Clasificación de requisitos

Cada requisito que menciones debe llevar una de estas etiquetas — nunca presentes una
buena práctica como obligación legal:

- `LEGAL_REQUIREMENT` — obligación de ley, verificada con fuente primaria vigente en esta
  corrida.
- `REGULATORY_REQUIREMENT` — obligación de un reglamento, lineamiento o disposición de
  autoridad (no la ley misma), igual verificada en esta corrida.
- `INDUSTRY_STANDARD` — práctica estándar del sector, no exigida por ley mexicana.
- `BEST_PRACTICE` — recomendación sin respaldo normativo directo.
- `RECOMMENDATION` — sugerencia del propio skill, más débil que una buena práctica de
  industria.
- `LEGAL_REVIEW_REQUIRED` — no puedes clasificarlo tú solo; necesita criterio de Legal.
- `PENDING_REGULATION` — la norma o su reglamento están anunciados o en proceso pero aún
  no vigentes/publicados — no lo trates como obligación exigible hoy.

## Estructura de un hallazgo

Ver `templates/finding.md` para el formato completo con todos los campos (ID, categoría,
perfil de aplicación, severidad, confianza, estado, título, descripción, comportamiento
detectado, documento comparado, resultado documental, clase de requisito, fuente legal,
artículo, URL oficial, fecha de verificación, vigencia, impacto, recomendación, pregunta
para Legal, esfuerzo, prioridad, evidencia técnica interna).
