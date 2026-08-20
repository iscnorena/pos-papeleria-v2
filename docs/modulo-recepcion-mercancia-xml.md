# Prompt: Módulo de Recepción de Mercancía vía Factura Digital (CFDI XML)

## Contexto

Tengo un sistema de punto de venta (POS) ya desarrollado. Actualmente la
recepción de mercancía se hace escaneando el código de barras de cada
producto uno por uno. Quiero agregar una **segunda vía de entrada** a ese
mismo módulo de Recepción de Mercancía: importar directamente el **XML de
un CFDI 4.0** (factura electrónica mexicana) del proveedor, para no tener
que pistolear producto por producto cuando ya existe la factura digital.

**Idea central, no negociable**: importar el XML NO debe aplicar nada al
inventario de inmediato. Debe generar una **pre-carga (borrador/staging)**
con todas las líneas de la factura interpretadas, que un usuario revise
línea por línea, corrija si hace falta, y **autorice explícitamente**. Solo
al autorizar esa pre-carga se genera el movimiento real de inventario. Es
el mismo principio de control que ya existe al escanear manualmente
(el usuario ve y confirma lo que está recibiendo), aplicado ahora a datos
que vienen precargados por el XML en lugar de tecleados/escaneados uno a
uno.

El proveedor principal es **Super Papelerías Tony** y siempre entrega la
factura en el mismo formato/estructura de XML (CFDI 4.0 con Addenda propia
de Tony). Cada compra viene acompañada de dos archivos: el **XML** (CFDI
timbrado) y un **PDF** (representación impresa de ese mismo XML).

**Antes de proponer o escribir código**, explora el repositorio actual
(estructura de carpetas, lenguaje/framework, ORM, modelo de datos existente
de productos/proveedores/inventario, convenciones de nombres) y adapta todo
lo que sigue a ese stack real. No asumas un framework específico.

## Decisión ya tomada: usar el XML, no el PDF

El XML es la fuente de verdad para la importación. Es un CFDI estandarizado
por el SAT, siempre trae la misma estructura de tags, incluye UUID único,
totales e impuestos ya desglosados por concepto, y un código interno del
proveedor por producto. El PDF solo se conserva como **adjunto de respaldo
visual** (para mostrarlo al usuario o adjuntarlo al registro de compra), no
se parsea para extraer datos.

## Estructura del XML de referencia (Tony)

Namespace `cfdi` versión 4.0, con complemento `tfd:TimbreFiscalDigital` y
una `cfdi:Addenda` propietaria de Tony (`bovadd:BOVEDAFISCAL`). Campos clave
a mapear:

**Encabezado (`cfdi:Comprobante`)**

- `Serie` + `Folio` → folio de la factura (ej. `333-132595`)
- `Fecha` → fecha de emisión
- `SubTotal`, `Total`, `Moneda`
- `FormaPago`, `MetodoPago`, `CondicionesDePago`
- `TipoDeComprobante` (debe ser `I` = Ingreso)

**Emisor (`cfdi:Emisor`)**

- `Rfc`, `Nombre` → validar que el RFC corresponda al proveedor configurado
  como "Tony" en el catálogo de proveedores; si no coincide, alertar antes
  de importar.

**Timbre fiscal (`tfd:TimbreFiscalDigital`)**

- `UUID` → identificador único del CFDI. **Debe ser la clave de
  deduplicación**: si ya existe una recepción con ese UUID, rechazar la
  importación con un mensaje claro ("esta factura ya fue importada el
  [fecha] en la recepción #[folio interno]").
- `FechaTimbrado`

**Conceptos (`cfdi:Concepto`, uno por línea de producto)**

- `NoIdentificacion` → código interno del producto en Tony (ej.
  `07980376`). Úsalo como clave de emparejamiento contra el catálogo local
  (campo tipo `codigo_proveedor` / `sku_proveedor` por producto+proveedor).
- `ClaveProdServ` → clave SAT de producto/servicio (no es el SKU, es
  clasificación fiscal — no usar para matching de catálogo).
- `Descripcion` → nombre del producto tal como lo factura Tony.
- `Cantidad`, `ClaveUnidad`, `Unidad`
- `ValorUnitario` → costo unitario antes de impuestos.
- `Importe` → cantidad × valor unitario.
- `cfdi:Impuestos > cfdi:Traslados > cfdi:Traslado` → `TasaOCuota` (ej.
  0.16) e `Importe` del IVA por línea.

**Addenda propietaria de Tony (`bovadd:BOVEDAFISCAL`)** — opcional pero útil:

- `TipoDoctoElectronico` (ej. "FACTURA MAYOREO")
- `almacen`, `condicion` (ej. "CONTADO")
- `TR` → número de transacción interno de Tony, útil como referencia
  adicional de conciliación.

## Decisión de modelo de costo: por proveedor + consolidado en catálogo

Cada producto se puede comprar a más de un proveedor (Tony y otros) a
costos distintos. Se necesitan **dos niveles de costo**, no uno solo:

1. **Costo por producto-proveedor** (tabla `producto_proveedor` o
   equivalente: `producto_id`, `proveedor_id`, `codigo_proveedor` —el
   `NoIdentificacion` en el caso de Tony—, `ultimo_costo`,
   `fecha_ultimo_costo`, histórico opcional de costos anteriores). Cada vez
   que se autoriza una recepción, se actualiza (o inserta si es la primera
   vez) el renglón correspondiente a ese producto+proveedor. Esto es lo que
   permite comparar: "Tony me lo vende en $40.09, el proveedor B en $38".

2. **Costo consolidado en el catálogo** (`costo_actual` en la tabla de
   productos): es el único costo que usa el resto del sistema (cálculo de
   margen, precio de venta sugerido, reportes). Se recalcula
   automáticamente al autorizar cada recepción, con esta regla por
   defecto: **el costo actual = el costo de la compra autorizada más
   reciente, sin importar de qué proveedor venga**. Si el producto tiene un
   proveedor marcado como "preferido", esa regla puede sustituirse por
   "usar el costo del proveedor preferido cuando exista"; dejar esto como
   una regla configurable/aislada (una función, no lógica repetida en
   varios lugares) para poder cambiarla sin tocar el resto del flujo.

Esto reemplaza la pregunta abierta anterior sobre "reemplazar costo vs.
promedio ponderado": no se promedia entre proveedores — se guarda el costo
real de cada uno por separado, y el catálogo refleja el más reciente (o el
del proveedor preferido). Si el POS ya maneja costeo promedio ponderado
dentro de un mismo proveedor (para compras repetidas al mismo proveedor a
distintos precios en el tiempo), definir esa lógica dentro del nivel 1
(`producto_proveedor`), no en el consolidado.

## Requerimientos funcionales

1. **Importar XML → pre-carga (estado "borrador" / "pendiente de
   autorización")**: el usuario sube el archivo `.xml` (y opcionalmente el
   `.pdf` como adjunto) desde el módulo de Recepción de Mercancía, como
   alternativa al flujo de escaneo manual existente. El sistema parsea el
   CFDI y crea un registro de recepción en estado **pendiente**, con una
   pantalla de revisión que muestra: proveedor, folio, fecha, UUID, y la
   lista completa de líneas (producto emparejado o no, cantidad, costo
   unitario, IVA, total). Cada línea debe ser **editable** (cantidad,
   producto vinculado, costo) antes de autorizar. Nada se descuenta/suma al
   inventario en este paso — es solo una interpretación de la factura
   esperando revisión humana.

   La pre-carga debe poder quedar **guardada y retomarse después** (por si
   quien revisa el catálogo/precios no es quien sube el XML), y debe ser
   posible **descartarla** sin dejar rastro en inventario si la factura no
   procede.

2. **Emparejamiento de productos**:
   - Buscar cada línea por la clave **(proveedor, `NoIdentificacion`)**
     contra `producto_proveedor`. Este par es la clave real de matching —
     el mismo código puede repetirse entre proveedores distintos sin
     confundirse, porque el proveedor forma parte de la clave.
   - Si hay match (el par proveedor+código ya fue vinculado antes): mostrar
     el producto local encontrado, el costo previo registrado para **ese
     mismo proveedor** vs. el nuevo costo de la factura (alertar si hay
     variación significativa), y de paso el costo que tiene registrado con
     otros proveedores si los hay, para poder comparar en el momento.
   - Si NO hay match (primera vez que se ve ese código de ese proveedor):
     marcar la línea como "producto nuevo / sin vincular" y ofrecer:
     - **Sugerencias automáticas de productos candidatos**, buscando en el
       catálogo por similitud de texto contra la `Descripcion` de la
       factura (ej. búsqueda difusa/trigramas o el mecanismo de búsqueda
       de texto que ya tenga el POS), mostradas como lista corta para que
       el usuario elija en un clic en vez de buscar a ciegas.
     - (a) confirmar una de las sugerencias, (b) buscar y vincular
       manualmente otro producto existente, o (c) crear un producto nuevo
       con los datos de la factura.
     - Una vez resuelto, guardar el par (proveedor, `NoIdentificacion`) en
       `producto_proveedor` para que la próxima factura de ese proveedor
       con ese mismo código haga match automático, sin volver a pedir
       resolución manual.
   - No debe poder autorizarse la recepción con líneas sin resolver.

3. **Validaciones — algunas bloquean la carga del XML, otras solo bloquean
   la autorización**:
   - Al momento de subir el XML (bloquean la creación misma de la
     pre-carga): estructura XML inválida / no es CFDI 4.0 / RFC emisor no
     corresponde a ningún proveedor configurado; UUID ya importado antes
     (rechazo duro — no se crea una pre-carga duplicada).
   - Al momento de autorizar (bloquean el botón de autorizar, pero la
     pre-carga puede seguir editándose): hay líneas sin producto vinculado;
     la suma de líneas + impuestos no cuadra con el `Total` del
     comprobante fuera de una tolerancia mínima de redondeo.

4. **Al autorizar la pre-carga** (único momento en que se toca inventario):
   - Crear/actualizar el registro de "Recepción de Mercancía" con estado
     **autorizada**: proveedor, folio fiscal, UUID, fecha, subtotal,
     impuestos, total, archivo XML original y PDF adjunto (guardados o
     referenciados), usuario autorizador y fecha/hora de autorización.
   - Por cada línea: incrementar el stock del producto vinculado; actualizar
     el costo en `producto_proveedor` para ese proveedor específico; y
     recalcular el `costo_actual` consolidado del producto según la regla
     descrita en "Decisión de modelo de costo" (última compra o proveedor
     preferido).
   - Registrar el movimiento de inventario con referencia a esta recepción
     (para trazabilidad/kardex), igual que si hubiera sido capturado por
     escaneo manual.

5. **Consulta posterior**: poder ver el historial de recepciones tanto
   pendientes (pre-cargas sin autorizar) como autorizadas, filtrando por
   proveedor/fecha/folio/estado, con acceso al XML y PDF originales, al
   detalle de líneas, y a quién autorizó cada una.

## Casos borde a cubrir explícitamente

- Factura con productos duplicados en distintas líneas (mismo
  `NoIdentificacion` dos veces).
- Reimportar el mismo archivo por error (debe bloquear por UUID).
- XML de una serie/folio distinto al esperado pero mismo RFC emisor (válido,
  no rechazar solo por eso).
- Producto cuyo costo bajó o subió más de X% respecto al histórico
  (advertencia, no bloqueo).
- Usuario descarta una pre-carga (no la autoriza): no debe dejar ningún
  movimiento de inventario aplicado, y el UUID debe liberarse para poder
  volver a intentar la importación si fue un error de captura (o quedar
  bloqueado si el descarte fue porque la factura no corresponde — a
  definir según se prefiera).
- Dos personas intentan autorizar la misma pre-carga a la vez: solo una
  autorización debe prevalecer.

## Entregable esperado

1. Diseño del modelo de datos necesario (tablas/entidades nuevas o campos a
   agregar a las existentes), coherente con lo que ya existe en el
   proyecto.
2. Lógica de parseo del CFDI (idealmente aislada en un módulo/servicio
   reutilizable, no acoplada a la UI, por si en el futuro se agregan otros
   proveedores con su propio mapeo).
3. Flujo de UI: subir archivo → previsualizar/resolver productos sin match
   → confirmar → ver recepción creada.
4. Manejo de errores descrito arriba con mensajes claros para el usuario.
5. Pantalla o sección (puede ser dentro de la ficha del producto) para ver
   el comparativo de costo por proveedor de un producto dado.

Antes de implementar, revisa si el catálogo de productos ya tiene algún
campo o relación de costo/proveedor existente que debiera reutilizarse o
migrarse en lugar de crear una tabla `producto_proveedor` nueva desde cero.
