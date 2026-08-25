# Plantilla de borrador de documento legal

Todo documento generado por este skill empieza con este encabezado, sin excepción:

```
BORRADOR GENERADO AUTOMÁTICAMENTE — REQUIERE REVISIÓN Y APROBACIÓN LEGAL

Generado a partir de la revisión técnico-legal del [fecha]. Cada afirmación de este
documento fue redactada contra el código y la información proporcionada en esa fecha —
no es una plantilla genérica. Donde falte información se marca [INFORMATION_REQUIRED]:
no se completó con un valor plausible, así que no debe publicarse hasta llenarse.
```

## Ejemplo — Aviso de Privacidad (esqueleto, adaptar según el perfil real)

```
Aviso de Privacidad

Responsable: [INFORMATION_REQUIRED — razón social / nombre del negocio]
Domicilio: [INFORMATION_REQUIRED]
Contacto para temas de privacidad: [INFORMATION_REQUIRED]

Datos personales que recabamos
[lista basada en TECHNICAL_FACT detectados en esta corrida — cada uno con su fuente
interna, no un genérico "nombre, correo, teléfono, etc."]

Finalidades del tratamiento
[cada finalidad debe corresponder a un flujo real detectado o confirmado en el intake —
si una finalidad no se pudo verificar, [INFORMATION_REQUIRED]]

Transferencias
[cada tercero detectado con transferencia real de datos personales, incluidas las de
infraestructura (hosting, APIs de terceros) si aplica — no omitir por ser "técnicas"]

Derechos de acceso, rectificación, cancelación y oposición (o el mecanismo vigente)
[mecanismo real disponible — verificado, no supuesto]

Uso de cookies y tecnologías similares
[solo lo que el discovery técnico confirmó]

Cambios a este aviso
[INFORMATION_REQUIRED — política de actualización, si el negocio ya tiene una]

Última actualización: [fecha]
```

## Reglas al llenar cualquier borrador

- Nunca completes `[INFORMATION_REQUIRED]` con un valor "razonable" para que se vea
  completo — eso rompe el principio central del skill.
- Cada oración debe poder rastrearse a un `TECHNICAL_FACT` verificado en esta corrida, a
  información `PROPORCIONADO POR EL NEGOCIO` en el intake, o a una fuente legal verificada
  — nunca a una plantilla genérica bajada de internet.
- Si el documento ya existía y solo se está actualizando, señala explícitamente qué
  cambió respecto a la versión anterior (útil para que Legal revise solo el delta).
