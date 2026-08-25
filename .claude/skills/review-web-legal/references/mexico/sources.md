# Fuentes jurídicas primarias — México

Este archivo **no fija texto legal**. Fija dónde verificarlo. Antes de citar cualquier
artículo, autoridad o vigencia en un hallazgo, confírmalo con WebSearch/WebFetch en la
corrida actual y registra la fecha de consulta. Las leyes mexicanas se reforman con
frecuencia y, como muestra el caso de abajo, a veces se reemplazan por completo.

## Caso de advertencia — verificado el 25 de agosto de 2026

La Ley Federal de Protección de Datos Personales en Posesión de los Particulares (la ley
"clásica" de 2010, la que la mayoría del contenido de entrenamiento y de internet todavía
describe) fue **abrogada y reemplazada por una ley nueva del mismo nombre**, publicada en
el Diario Oficial de la Federación el 20 de marzo de 2025, vigente desde el 21 de marzo de 2025. Como parte de la misma reforma constitucional ("Simplificación Orgánica", DOF 20 de
diciembre de 2024), el **INAI desapareció** y sus funciones de protección de datos
personales pasaron a la **Secretaría Anticorrupción y Buen Gobierno (SABG)**; el acceso a
la información pública quedó en un organismo nuevo, "Transparencia para el Pueblo". Al 25
de agosto de 2026 hay reportes de que la SABG inició un proceso para actualizar aún más la
ley y su reglamento sigue pendiente en algunas fuentes — trátalo como `PENDING_REGULATION`
hasta confirmarlo de nuevo en cada corrida.

**Por qué importa para este skill**: si citas "INAI" como autoridad o la ley de 2010 como
vigente, el hallazgo está mal aunque la estructura del análisis sea correcta. Vuelve a
verificar esto en cada corrida — no asumas que seguirá igual solo porque lo dice este
archivo.

## Puntos de partida oficiales (verificar vigencia en cada corrida)

### Protección de datos personales

- Cámara de Diputados, LeyesBiblio (texto vigente de leyes federales):
  `https://www.diputados.gob.mx/LeyesBiblio/` — buscar "Ley Federal de Protección de
  Datos Personales en Posesión de los Particulares".
- Secretaría Anticorrupción y Buen Gobierno, sección de datos personales:
  `https://anticorrupcionybg.gob.mx/datospersonales/` y
  `https://www.gob.mx/buengobierno/documentos/proteccion-de-datos-personales-nuevo`
  — confirmar que sigue siendo la autoridad competente antes de citarla.
- Diario Oficial de la Federación (para confirmar la fecha exacta de la última reforma):
  `https://www.dof.gob.mx/`

### Consumidor y comercio electrónico

- Ley Federal de Protección al Consumidor, texto de PROFECO:
  `https://www.profeco.gob.mx/juridico/pdf/l_lfpc_ultimo_camdip.pdf` (verificar que sigue
  siendo la versión vigente en LeyesBiblio).
- REPEP (Registro Público para Evitar Publicidad), sitio oficial:
  `https://repep.profeco.gob.mx/`
- PROFECO, sitio general: `https://www.gob.mx/profeco`

### Fiscal / CFDI

- SAT, sitio oficial: `https://www.sat.gob.mx/`
- Código Fiscal de la Federación (art. 29 y 29-A regulan los requisitos del CFDI) en
  LeyesBiblio de la Cámara de Diputados.
- Anexo 20 (guía de llenado de CFDI) publicado por el SAT — buscar la versión vigente en
  `sat.gob.mx`, no reusar un PDF viejo guardado en otro sitio sin confirmar versión.

### Propiedad intelectual

- Ley Federal del Derecho de Autor, LeyesBiblio de la Cámara de Diputados.
- IMPI (propiedad industrial, marcas — recuerda: **fuera de alcance** buscar conflictos
  marcarios, solo referencia si Legal lo pide): `https://www.gob.mx/impi`

## Cómo verificar en cada corrida

1. Busca el nombre exacto de la ley/reglamento + "texto vigente" + año actual.
2. Confirma la fecha de la última reforma o si fue reemplazada por completo (como pasó en
   2025 con la de datos personales) — no asumas que la versión que conocías sigue siendo
   la correcta.
3. Confirma la autoridad competente actual, no la que recuerdes.
4. Registra en el hallazgo: norma, artículo, autoridad, URL oficial, fecha de consulta de
   esta corrida.
5. Si no puedes verificar algo con una fuente primaria en esta corrida, repórtalo como
   `SOURCE_NOT_VERIFIED`, nunca como si lo hubieras confirmado.
