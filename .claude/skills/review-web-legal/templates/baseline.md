# Baseline — formato y convención de guardado

El baseline es el estado técnico-legal capturado en la última corrida de
`/review-web-legal`. `--verify` lo carga y compara contra el estado actual.

## Dónde guardarlo

Dentro del repo auditado, normalmente `docs/legal-review/baseline.json` — o la carpeta de
documentación que ese proyecto ya use por convención (revisa si existe `docs/` con otros
documentos de estado antes de crear una carpeta nueva). Si no es obvio, pregunta antes de
decidir por tu cuenta.

## Formato sugerido (JSON)

```json
{
  "fecha": "2026-08-25",
  "commit": "0977937",
  "perfil_aplicacion": ["interna-con-sesion", "seccion-publica-sin-cuenta"],
  "datos_personales_detectados": [
    { "dato": "nombre", "tabla_o_flujo": "users", "sensible": false },
    { "dato": "rfc", "tabla_o_flujo": "suppliers", "sensible": false }
  ],
  "terceros_detectados": [
    {
      "nombre": "API de Claude / Anthropic",
      "flujo": "recepcion-por-foto",
      "transferencia_declarada": false
    }
  ],
  "documentos_identificados": [
    {
      "documento": "aviso-de-privacidad-publico",
      "ruta": "/kit/privacidad",
      "resultado": "DOCUMENT_MATCH"
    },
    {
      "documento": "aviso-de-privacidad-interno",
      "ruta": null,
      "resultado": "DOCUMENT_NOT_IDENTIFIED"
    }
  ],
  "hallazgos_abiertos": [{ "id": "PRIV-001", "severidad": "CRITICAL", "titulo": "..." }]
}
```

Adapta las claves al proyecto real — esto es una guía de forma, no un esquema rígido que
deba copiarse literal si el proyecto ya tiene su propia convención de estado (por ejemplo,
si el proyecto guarda estado en memoria de Claude Code en vez de en el repo, usa ese
mecanismo en su lugar y dilo explícitamente en el reporte).

## Qué compara `--verify`

- Datos nuevos o eliminados de `datos_personales_detectados`.
- Terceros nuevos o eliminados de `terceros_detectados`, y cambios en
  `transferencia_declarada`.
- Documentos que cambiaron de `resultado` (p. ej. un aviso que existía y desapareció, o
  uno que no existía y ahora sí).
- Hallazgos de `hallazgos_abiertos` que siguen abiertos, se cerraron, o si apareció uno
  nuevo del mismo tipo.

Cada diferencia pasa por el filtro de `SKILL.md#review-web-legal---verify` antes de
reportarse — nunca se reporta un cambio como incumplimiento automático.

## Actualizar el baseline

Solo cuando el usuario confirme que el estado nuevo es el correcto de aquí en adelante.
No lo sobrescribas silenciosamente solo porque corriste `--verify` — el archivo es un
punto de referencia, no un log que se actualiza solo.
