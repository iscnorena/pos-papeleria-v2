# Evidencia y trazabilidad interna

Todo hallazgo basado en discovery técnico debe poder remontarse:

```
Hallazgo → regla aplicada → fuente jurídica → documento comparado → evidencia técnica
  → archivo / línea / función / endpoint / tabla / flujo
```

Guarda esa cadena en tus notas de trabajo o en el campo `Evidencia técnica interna` de
`templates/finding.md`. Sirve para que tú, el equipo técnico o una corrida futura de
`--verify` puedan confirmar el hallazgo sin repetir todo el discovery desde cero.

**Esto es interno.** El reporte que lee Legal (`templates/legal-review-report.md`) no debe
mostrar rutas de archivo, líneas, nombres de funciones, stack traces ni jerga técnica. Ver
`references/finding-language.md` para cómo traducir un `TECHNICAL_FACT` con evidencia de
código a una frase que Legal pueda leer sin contexto técnico.

## Calidad de evidencia mínima aceptable

- Un `TECHNICAL_FACT` necesita al menos un punto de observación directo (archivo+línea,
  respuesta real de un endpoint, fila de esquema de base de datos) — no una suposición
  sobre "probablemente hace X".
- Un `DOCUMENT_MISMATCH` necesita el texto o ausencia de texto del documento comparado,
  no un recuerdo de qué "suelen decir" estos documentos.
- Un `LEGAL_SOURCE` necesita norma + artículo + autoridad + URL oficial + fecha de
  consulta **de esta corrida**. Si no pudiste verificarlo en esta corrida, es
  `SOURCE_NOT_VERIFIED`, no una cita de memoria.

Cuando la evidencia sea débil pero el riesgo aparente sea alto, no subas la severidad para
compensar — baja la confianza y dilo explícitamente. Severidad y confianza son ejes
separados (`references/severity-confidence.md`).
