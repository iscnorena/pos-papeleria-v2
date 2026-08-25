# Plantilla de reporte — Web Application Legal & Compliance Review

Fecha de la corrida: [fecha]
Aplicación revisada: [nombre]
Commit/estado revisado: [hash o referencia, para trazabilidad interna]

> Esta es una revisión técnico-legal automatizada, no asesoría legal formal. Los
> hallazgos son insumo para que el equipo Legal decida — no sustituyen su criterio ni
> certifican cumplimiento.

## 1. Resumen ejecutivo

[Un párrafo: qué tan expuesto está el sistema, la severidad más alta encontrada, y si hay
algo urgente antes de lanzar o seguir operando. Sin jerga técnica.]

## 2. Perfil de la aplicación

[SaaS / e-commerce / marketplace / interna / con pagos / con menores / con datos
sensibles / con transferencias internacionales / etc. — y por qué se determinó así.]

## 3. Marco jurídico verificado en esta corrida

| Área                        | ¿Aplica? | Por qué | Autoridad / norma vigente (fecha de verificación) |
| --------------------------- | -------- | ------- | ------------------------------------------------- |
| LFPDPPP                     |          |         |                                                   |
| PROFECO / LFPC (e-commerce) |          |         |                                                   |
| CFDI / SAT                  |          |         |                                                   |
| Cookies / marketing         |          |         |                                                   |
| Propiedad intelectual       |          |         |                                                   |

## 4. Cobertura documental

| Documento                                 | Relevancia para este perfil | Identificado | Revisado | Resultado |
| ----------------------------------------- | --------------------------- | ------------ | -------- | --------- |
| Aviso de Privacidad (integral)            |                             |              |          |           |
| Aviso de Privacidad (simplificado)        |                             |              |          |           |
| Términos y Condiciones                    |                             |              |          |           |
| Política de Cookies                       |                             |              |          |           |
| Devoluciones / Cancelaciones / Reembolsos |                             |              |          |           |
| Envíos                                    |                             |              |          |           |

## 5. Hallazgos

### Crítico

[uno por hallazgo, usando la estructura de `templates/finding.md` sin el bloque interno]

### Alto

[...]

### Medio

[...]

### Bajo

[...]

## 6. Checklist final por área

| Alcance                                             | Estado       |
| --------------------------------------------------- | ------------ |
| LFPDPPP — aviso(s)                                  | ✅ / ⚠️ / ❌ |
| LFPDPPP — transferencias declaradas                 |              |
| LFPDPPP — mecanismo de derechos (ARCO o el vigente) |              |
| LFPDPPP — retención/purga                           |              |
| LFPDPPP — datos sensibles/menores                   |              |
| PROFECO/LFPC                                        |              |
| CFDI/SAT                                            |              |
| Cookies/rastreo                                     |              |
| Términos y condiciones                              |              |
| Propiedad intelectual                               |              |

## 7. Preguntas para Legal

[lista concreta y accionable, ver `references/finding-language.md`]

## 8. Borradores generados

[lista de documentos generados en esta corrida, cada uno con su propio archivo, todos
encabezados con "BORRADOR GENERADO AUTOMÁTICAMENTE — REQUIERE REVISIÓN Y APROBACIÓN
LEGAL"]

## 9. Información pendiente

[todo lo marcado `INFORMATION_REQUIRED` o `INSUFFICIENT_EVIDENCE` durante esta corrida]

---

_Evidencia técnica detallada (archivo:línea, endpoints, tablas) disponible aparte si se
requiere — no incluida aquí a propósito._
