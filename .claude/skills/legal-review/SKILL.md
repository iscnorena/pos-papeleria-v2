---
name: legal-review
description: Audita el cumplimiento legal de una aplicación web para el mercado mexicano (LFPDPPP, PROFECO si hay comercio electrónico, CFDI/SAT si factura, cookies, términos de uso) leyendo el flujo real de datos en el código en vez de partir de una plantilla genérica. Usar cuando piden "revisar legales", "auditoría de privacidad", "cumplimiento LFPDPPP", "aviso de privacidad", "términos y condiciones", o antes de lanzar a producción una función pública que toca datos personales.
---

# Legal Review — aplicaciones web en México

Auditoría técnica de cumplimiento legal para software mexicano, no asesoría legal formal.
El objetivo es reducir riesgo real (qué dato se captura, dónde vive, cuánto dura, a quién se
manda) y producir textos legales que correspondan exactamente a lo que el código hace — nunca
una plantilla genérica bajada de internet. Para casos límite (datos sensibles, menores de
edad, transferencias internacionales complejas, litigios) el resultado de este skill es
insumo para que un abogado revise, no un sustituto.

## Alcance legal a cubrir (evaluar cuál aplica, justificar el que no)

1. **LFPDPPP** (Ley Federal de Protección de Datos Personales en Posesión de los
   Particulares) — aplica casi siempre que se capture cualquier dato personal (nombre,
   teléfono, correo, IP, ubicación, archivos subidos con metadatos, etc.), incluso de
   visitantes anónimos sin cuenta.
   - Aviso de privacidad integral (interno, para quien tiene una relación más profunda,
     ej. empleados/clientes registrados) y simplificado (público, secciones mínimas:
     responsable, qué se recaba, para qué, transferencias, cómo ejercer derechos) — arts.
     15-19 de la ley.
   - Principios rectores: licitud, consentimiento, información, calidad, finalidad,
     lealtad, proporcionalidad, responsabilidad.
   - Derechos ARCO (Acceso, Rectificación, Cancelación, Oposición) — debe existir un
     mecanismo real para ejercerlos, no solo mencionarlo.
   - Transferencias de datos: si la infraestructura vive fuera de México (Supabase, Vercel,
     AWS us-east-1, etc. suelen ser EUA) eso es una transferencia internacional y debe
     declararse.
   - Medidas de seguridad razonables y plazos de conservación/purga — si algo se guarda
     "para siempre" sin razón de negocio, es un hallazgo.
   - Datos sensibles (salud, biométricos, origen étnico, menores) requieren consentimiento
     expreso y por escrito, nunca tácito.

2. **PROFECO / Ley Federal de Protección al Consumidor** — aplica si hay venta, cobro o
   publicidad de precios al público en general (no solo B2B interno).
   - Precios visibles con impuestos incluidos, sin letras chiquitas engañosas.
   - Política de cancelación/reembolso si se cobra en línea.
   - Publicidad no engañosa (comparativos, "gratis", descuentos).

3. **CFDI / SAT** — solo si el sistema EMITE comprobantes fiscales al público (no si solo
   los importa/procesa de proveedores, que es un caso distinto sin esta obligación).
   - Requisitos de datos fiscales del emisor, régimen, uso de CFDI, etc.

4. **Cookies y rastreo** — solo si hay analytics, pixeles publicitarios o cookies no
   esenciales. Una cookie de sesión de autenticación propia normalmente es "estrictamente
   necesaria" y no requiere aviso de cookies aparte, pero sí debe mencionarse en el aviso
   de privacidad.

5. **Términos y condiciones de uso** — reglas de uso del sitio, límites de responsabilidad,
   propiedad intelectual sobre contenido que el usuario sube o genera.

6. **Menores de edad** — si el público puede incluir menores sin supervisión, el
   consentimiento para datos sensibles debe ser del tutor, no del menor.

7. **Accesibilidad** — no es obligación legal dura en México en la mayoría de los casos,
   pero vale mencionarla como buena práctica si el negocio lo pide o si hay riesgo
   reputacional.

## Proceso

1. **Mapear superficies públicas**: rutas sin sesión/autenticación (buscar exclusiones de
   auth en middleware/proxy), formularios, endpoints de upload, APIs públicas, webhooks.
2. **Rastrear cada dato personal**: para cada superficie, qué entra, si toca el servidor o
   se queda en el cliente, si se persiste en base de datos, cuánto tiempo vive, y a qué
   terceros se manda (proveedores de imágenes, WhatsApp, analytics, procesadores de pago).
3. **Contrastar contra el checklist** de la sección anterior — marcar explícitamente qué
   aplica, qué no aplica y por qué (ej. "no emite CFDI, solo importa de proveedores").
4. **Clasificar hallazgos por severidad**:
   - **Crítico** — falta aviso de privacidad y se están capturando datos personales; se
     guardan datos sin base legal o indefinidamente sin justificación.
   - **Alto** — aviso incompleto (falta una sección obligatoria, no hay mecanismo ARCO
     real).
   - **Medio** — el texto legal es genérico/plantilla y no corresponde a lo que el código
     realmente hace.
   - **Bajo** — mejoras de claridad, redacción, o descubribilidad (ej. el aviso existe pero
     no está enlazado desde ningún lado visible).
5. **Si el usuario pide aplicar los cambios**, implementar siguiendo el patrón que ya use
   el repo si existe uno (página de aviso de privacidad, disclaimers puntuales junto a los
   formularios/uploads que tocan, lógica de purga con retención configurable). Redactar
   cada oración contra el código real, citando archivo:línea al verificarlo.
6. **Nunca copiar un aviso de privacidad genérico de internet** — cada afirmación
   ("guardamos tu IP por 7 días", "no guardamos tu archivo") debe ser verificable leyendo
   el código en ese momento, no asumida.

## Salida

Reporte en markdown con:
- Resumen ejecutivo (1 párrafo): qué tan expuesto está el sistema y la severidad más alta
  encontrada.
- Tabla de superficies de datos: ruta/endpoint → qué se captura → dónde vive (servidor,
  base de datos, tercero) → retención.
- Hallazgos por severidad, con archivo:línea cuando aplique.
- Checklist final de qué ya cumple vs qué falta, sección por sección del alcance legal de
  arriba.

## No hacer

- No generar texto legal boilerplate sin verificar que corresponde a lo que el código hace.
- No asumir que aplica PROFECO o CFDI sin confirmar que el sistema efectivamente vende o
  factura al público.
- No presentar esto como asesoría legal certificada — para datos sensibles, menores de
  edad, o transferencias internacionales complejas, señalar explícitamente que un abogado
  debe validar antes de publicar.
