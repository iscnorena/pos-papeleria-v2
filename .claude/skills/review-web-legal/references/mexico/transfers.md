# Transferencias internacionales — cómo NO confundirlas con infraestructura

**Corrección de v1.0.1**: la versión anterior de este skill trataba "infraestructura fuera
de México" como sinónimo automático de "transferencia internacional de datos personales".
Eso es jurídicamente impreciso y genera falsos positivos sistemáticos — casi cualquier app
moderna usa hosting fuera de México, así que esa regla marcaba "transferencia
internacional" en prácticamente todas las revisiones sin distinguir nada. Ya no.

## El error a evitar

```
Infraestructura fuera de México
        ↓ (NO es una equivalencia automática)
"Existe una transferencia internacional"
```

## El modelo correcto — conceptos que no debes mezclar

- **Infraestructura** — dónde corre físicamente el servicio (región de un proveedor
  cloud). Un hecho técnico, no una calificación jurídica por sí sola.
- **Proveedor** — la empresa que opera esa infraestructura o servicio.
- **Persona encargada del tratamiento** — un tercero que trata datos personales _por
  cuenta y bajo instrucciones_ del responsable (típicamente regulado por contrato). Un
  proveedor de hosting que solo almacena bytes sin acceso funcional a los datos suele caer
  aquí, pero es una determinación que requiere ver el contrato/términos de servicio, no
  solo la ubicación del datacenter.
- **Responsable** — quien decide los fines y medios del tratamiento (normalmente el propio
  negocio dueño de la app).
- **Tercero** — alguien fuera de la relación responsable↔encargado que recibe datos con
  fines propios (ej. un proveedor de analytics que usa los datos para su propio negocio).
- **Comunicación / remisión de datos** — mover datos a un encargado bajo instrucciones del
  responsable, para que el encargado los trate _por cuenta del responsable_. Distinto de
  una transferencia a un tercero independiente.
- **Transferencia** — específicamente, remisión de datos personales a un tercero
  (nacional o internacional) que los tratará con fines propios o distintos de los del
  responsable original — la categoría que dispara las obligaciones de declarar la
  transferencia en el aviso de privacidad.

No todo lo anterior implica lo mismo jurídicamente, y la diferencia entre "encargado" y
"tercero" suele ser la que decide si algo es una transferencia declarable o simplemente un
proveedor de servicios operando bajo instrucciones.

## Proceso obligatorio cuando detectes infraestructura o procesamiento fuera de México

1. **Identifica el proveedor** concreto (Vercel, Supabase, AWS, la API de un modelo de
   IA, etc.) — no lo generalices como "la nube".
2. **Identifica el flujo**: qué endpoint/función envía qué a ese proveedor.
3. **Identifica los datos** específicos que ese proveedor recibe — no asumas que recibe
   "todos los datos" solo porque aloja la base de datos completa.
4. **Identifica la entidad receptora** cuando sea posible (¿es el mismo proveedor de
   infraestructura, o un tercero distinto al que ese proveedor reenvía datos?).
5. **Determina técnicamente la relación aparente**: ¿el proveedor solo almacena/procesa
   bajo instrucciones del sistema (patrón típico de encargado), o usa los datos con fines
   propios (patrón típico de tercero independiente — ej. un proveedor de analytics que
   agrega los datos a su propio modelo)?
6. **Contrasta contra la normativa vigente** verificada en esta corrida
   (`references/mexico/sources.md`) — qué exige la ley para cada caso.
7. **Si la clasificación jurídica no puede determinarse solo con evidencia técnica**
   (que es lo normal — la relación contractual real rara vez está en el código), el
   resultado es `LEGAL_REVIEW_REQUIRED`, nunca una afirmación categórica de que "existe
   una transferencia internacional".

## Cómo reportarlo correctamente

Mal (lo que hacía v1.0):

> Se detectó infraestructura en EUA (Supabase, Vercel) → transferencia internacional no
> declarada.

Bien (v1.0.1):

> Se detectó que \[proveedor] procesa/almacena \[dato específico] fuera de México, en el
> flujo \[flujo específico]. No se pudo determinar técnicamente si \[proveedor] actúa como
> encargado del tratamiento bajo instrucciones del responsable o si además usa los datos
> con fines propios. `LEGAL_REVIEW_REQUIRED`: confirmar la naturaleza de la relación
> contractual con \[proveedor] y si corresponde declararla como transferencia en el aviso
> de privacidad.

## Casos que sí suelen ser transferencias más claras (aun así, verifica, no asumas)

- Un proveedor de IA de terceros que procesa contenido con datos personales y cuyos
  términos de servicio permiten usar esos datos para entrenar sus propios modelos —
  evidencia más fuerte de tratamiento con fines propios, más cerca de "tercero" que de
  "encargado". Sigue siendo `LEGAL_REVIEW_REQUIRED` para la calificación final, pero con
  mayor confianza de que hay algo que declarar.
- Un servicio de analytics/publicidad de terceros que recibe identificadores de usuario
  para sus propios fines de negocio (no solo para operar el sitio del responsable).

## Casos que normalmente NO ameritan la etiqueta "transferencia internacional" sin más análisis

- Un proveedor de hosting/base de datos que solo almacena y sirve datos bajo instrucciones
  técnicas del sistema, sin usarlos para fines propios — candidato típico a "encargado",
  no a "tercero". Sigue siendo `LEGAL_REVIEW_REQUIRED` si quieres una calificación
  jurídica firme, pero no reportes esto con la misma severidad que un tercero con fines
  propios sin verificar primero cuál de los dos patrones aplica.
