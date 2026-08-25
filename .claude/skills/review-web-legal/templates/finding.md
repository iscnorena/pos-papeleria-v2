# Plantilla de hallazgo

Copia esta estructura por cada hallazgo. Los campos marcados "interno" no van en el cuerpo
principal del reporte para Legal (`templates/legal-review-report.md`) — quedan como
evidencia disponible si alguien la pide.

```
ID: [correlativo corto, ej. PRIV-001]
Categoría: [privacidad | consumidor | fiscal | cookies | propiedad-intelectual |
  identidad-contenido | otro]
Subcategoría: [ej. "aviso de privacidad — transferencias"]
Perfil de aplicación afectado: [ej. "e-commerce", "interno con empleados"]
Severidad: [CRITICAL | HIGH | MEDIUM | LOW | INFO]
Confianza: [HIGH | MEDIUM | LOW]
Estado: [DETECTED | DOCUMENT_MISMATCH | LEGAL_REVIEW_REQUIRED | DOCUMENT_NOT_IDENTIFIED |
  PENDING_REGULATION | NOT_APPLICABLE | INSUFFICIENT_EVIDENCE]

Título: [una línea, sin jerga técnica]

Descripción: [qué se encontró, en lenguaje que Legal pueda leer sin contexto de código]

Comportamiento detectado: [TECHNICAL_FACT — qué hace realmente la aplicación]

Documento comparado: [cuál documento se contrastó, si aplica]
Resultado documental: [DOCUMENT_MATCH | DOCUMENT_MISMATCH | DOCUMENT_NOT_IDENTIFIED]

Clase de requisito: [LEGAL_REQUIREMENT | REGULATORY_REQUIREMENT | INDUSTRY_STANDARD |
  BEST_PRACTICE | RECOMMENDATION | LEGAL_REVIEW_REQUIRED | PENDING_REGULATION]
Fuente legal: [norma]
Artículo: [si aplica]
Autoridad: [autoridad competente vigente]
URL oficial: [enlace verificado en esta corrida]
Fecha de verificación: [fecha de esta corrida, no de memoria]
Estado de vigencia: [vigente | reformada recientemente | pendiente de reglamento | no
  verificado]
Última reforma relevante: [fecha y qué cambió, si aplica — ej. "reemplazada por completo
  el 20/mar/2025"; deja "no identificada en esta corrida" si no pudiste confirmarlo]

Impacto: [qué pasa si no se atiende]
Recomendación: [acción propuesta, marcada como sugerencia, no como instrucción legal]
Pregunta para Legal: [concreta y accionable — ver references/finding-language.md]

Esfuerzo: [estimado, si aplica: bajo | medio | alto]
Prioridad: [sugerida, separada de severidad]

--- interno, no incluir en el reporte a Legal ---
Evidencia técnica interna: [archivo:línea, función, endpoint, tabla, o "confirmado por
  el usuario en el intake"]
```
