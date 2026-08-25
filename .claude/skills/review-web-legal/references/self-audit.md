# Auto-revisión y casos de prueba conceptuales

**Nuevo en v1.0.1.** Antes de entregar un reporte, y especialmente después de modificar
este skill, corre estos dos ejercicios mentalmente contra lo que estás a punto de
reportar.

## Criterios de calidad — pregúntate esto antes de reportar cualquier hallazgo

- **¿Puede inventar datos de empresa?** Si un dato de negocio no está confirmado (por
  código o por el intake), ¿lo marcaste `INFORMATION_REQUIRED` en vez de completarlo?
- **¿Puede emitir una conclusión sin fuente primaria vigente?** ¿Cada `LEGAL_REQUIREMENT`
  tiene fecha de verificación de esta corrida, no de memoria?
- **¿Puede confundir infraestructura extranjera con transferencia?** ¿Seguiste el proceso
  de `references/mexico/transfers.md` en vez de la equivalencia automática?
- **¿Puede clasificar automáticamente a un menor como dato sensible?** ¿Separaste el eje
  persona (adulto/menor) del eje dato (personal/sensible)?
- **¿Puede confundir ausencia de cron con ausencia de política de conservación?** ¿Lo
  reportaste como `INCONCLUSIVE`/`LEGAL_REVIEW_REQUIRED` en vez de "se guarda para
  siempre"?
- **¿Puede confundir existencia de funcionalidad fiscal con obligación fiscal?**
  ¿Distinguiste emisión propia / generación delegada / solo consumo?
- **¿Activa reglas de comercio electrónico al consumidor para un caso B2B?** ¿Confirmaste
  la relación proveedor-consumidor antes de activar el módulo?
- **¿Importa el modelo GDPR de cookies por reflejo?** ¿Verificaste qué exige realmente el
  marco mexicano antes de recomendar un banner estilo UE como obligación?
- **¿Expone archivo/línea en el reporte para Legal?** Revisa que el cuerpo principal no
  tenga rutas, líneas ni nombres de función (`references/finding-language.md`).
- **¿El baseline/verify puede detectar los cambios relevantes?** Si estás en modo
  `--verify`, ¿comparaste contra el baseline real, no contra tu memoria de la corrida
  anterior?
- **¿Puede inventar información faltante en un borrador?** Revisa que cada
  `[INFORMATION_REQUIRED]` siga sin rellenar con un valor plausible.

## Casos de prueba conceptuales

Úsalos como guía de razonamiento, no como script automatizado — para cada uno, confirma
que el skill (tal como está escrito hoy) produciría el resultado esperado.

**A — SaaS simple (nombre + email).** Resultado esperado: privacidad relevante,
`LEGAL_REQUIRED` para Aviso de Privacidad.

**B — SaaS + Analytics de terceros.** Resultado esperado: tercero detectado
(`TECHNICAL_FACT`), evaluado contra `references/mexico/cookies-marketing.md`, sin asumir
banner GDPR obligatorio.

**C — SaaS + Stripe.** Resultado esperado: proveedor de pago detectado, flujo financiero
identificado, evaluado como tercero/encargado según `transfers.md` si Stripe procesa fuera
de México.

**D — Infraestructura en EUA (hosting/base de datos).** Resultado esperado: **NO** se
marca automáticamente como transferencia internacional — pasa por el proceso de
`transfers.md` y normalmente termina en `LEGAL_REVIEW_REQUIRED`, no en una afirmación
categórica.

**E — Aplicación con menores.** Resultado esperado: **NO** se clasifica automáticamente al
menor como dato sensible. Se evalúan por separado qué datos concretos se capturan y si son
sensibles por naturaleza, y el consentimiento se reporta como `LEGAL_REVIEW_REQUIRED`
("debe validarse la aplicación de las reglas de representación..."), no como "debe ser del
tutor" categórico.

**F — Datos sensibles (salud, biometría).** Resultado esperado: activa el checklist de
datos sensibles de `privacy.md` con severidad alta si no hay consentimiento expreso
identificable.

**G — E-commerce B2C directo.** Resultado esperado: activa el módulo de consumidor
completo (`consumer-ecommerce.md`).

**H — SaaS B2B interno (contraparte es otra empresa).** Resultado esperado: **NO** activa
automáticamente todas las reglas de e-commerce al consumidor — se verifica primero si hay
algún componente B2C mezclado.

**I — Placeholder en un test/fixture.** Resultado esperado: severidad baja, ambiente
distinguido explícitamente como test, no tratado igual que producción.

**J — Placeholder en producción (UI o documento legal público).** Resultado esperado:
hallazgo de consistencia con severidad más alta que el caso I, mismo tipo de placeholder.

**K — Documento no encontrado en el repo.** Resultado esperado: "no se identificó el
documento en las fuentes revisadas" (`DOCUMENT_NOT_IDENTIFIED`), nunca "el documento no
existe".

**L — Dato nuevo detectado después del baseline.** Resultado esperado: `--verify` lo
reporta como cambio, pasa por el filtro `¿tiene posible relevancia legal?` antes de
clasificarlo.

**M — Código cambió pero el documento legal no, y el cambio parece relevante.** Resultado
esperado: `LEGAL_REVIEW_REQUIRED`, nunca una afirmación de incumplimiento automático.

**N — Falta información de la empresa (responsable, domicilio) para un borrador.**
Resultado esperado: `[INFORMATION_REQUIRED]` explícito en el borrador, nunca un valor
inventado aunque sea plausible.

**O — Fuente jurídica que no se pudo verificar en esta corrida.** Resultado esperado:
`SOURCE_NOT_VERIFIED`, sin emitir conclusión jurídica definitiva basada en esa fuente.

**P — Sistema que factura a través de un tercero sin timbrar directamente (generación
delegada).** Resultado esperado: **NO** se clasifica como "solo importa/sin obligación" ni
como emisión propia plena — se identifica como generación delegada
(`references/mexico/fiscal.md`), con obligaciones de datos fiscales del emisor pero
`LEGAL_REVIEW_REQUIRED` para la relación contractual con el delegado.

**Q — Marketplace donde terceros venden a través de la plataforma.** Resultado esperado:
**NO** se trata igual que un e-commerce directo — se identifica la necesidad de deslindar
quién es el vendedor real vs. la plataforma (`consumer-ecommerce.md`).
