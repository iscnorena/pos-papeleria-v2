# Aprendizajes y buenas prácticas

Notas de lo que costó caro (en tiempo, o en un incidente real) construir este
proyecto, para no repetirlo en el siguiente. No es un tutorial genérico: cada
punto viene de algo que pasó aquí, con fecha y contexto cuando importa.

---

## Infraestructura

**Separar la base de datos de desarrollo de la de producción desde el día
1, no "cuando el negocio empiece a vender".** Este proyecto compartió una
sola base de Supabase entre dev y prod durante toda su construcción, con la
deuda anotada desde temprano ("antes de ese día hace falta un segundo
proyecto..."). El 2026-08-20, correr la suite de e2e varias veces seguidas
agotó el pool de conexiones (Supavisor) y produjo timeouts reales
(`FUNCTION_INVOCATION_TIMEOUT`, 504) en producción durante ~20 minutos. La
deuda no se cobró "cuando el negocio empezara a vender" — se cobró en cuanto
hubo suficiente superficie de prueba (varias features nuevas + e2e más
pesado) para saturar el pool compartido. Crear el segundo proyecto cuesta 2
minutos; migrar bajo presión con producción caída cuesta mucho más.

**Postgres.js + serverless: `prepare: false` es obligatorio con
PgBouncer/Supavisor**, o las consultas fallan de forma intermitente (no
siempre, lo que las hace difíciles de diagnosticar). El tamaño del pool
**no puede ser el mismo en los dos entornos**: `max: 1` en producción
(cada invocación serverless es una petición, más conexiones solo agotan
antes el límite) vs. un pool más grande en desarrollo (un solo proceso
atiende todas las pestañas; con `max: 1` ahí, una consulta lenta congela
la aplicación entera, login incluido — así se descubrió, ver Fase 2 en
`docs/estado.md`).

**El cliente de Postgres es perezoso: construirlo no exige una conexión
que funcione.** `next build` nunca llega a conectarse de verdad aunque las
variables de entorno apunten a un host inventado — solo hace falta que
`DATABASE_URL` (y las demás que lee `src/env.ts`) **existan**, no que sean
reales. Esto es lo que permite un CI de "verificación rápida" (tipos, lint,
build) sin ninguna base de datos real detrás — ver `.github/workflows/ci.yml`.

**Una conexión de Postgres puede quedar "zombi" cuando Vercel mata una
función serverless por exceder su tiempo límite.** El `SIGKILL` es
abrupto: el proceso no alcanza a cerrar su conexión, y esta queda del lado
de Postgres marcada `active` / `ClientRead` — sin nadie que vaya a leer
más datos — ocupando un lugar en el pool. Supabase/Supavisor la termina
reciclando solo, pero puede tardar varios minutos, y mientras tanto reduce
la capacidad real del pool. Si aparecen timeouts intermitentes después de
un pico de carga ya resuelto, vale la pena mirar `pg_stat_activity`
(`wait_event = 'ClientRead'`, `state = 'active'`, duración alta) antes de
asumir que el problema sigue activo.

---

## Testing (e2e)

**Nunca correr una suite de e2e pesada contra una base de datos que
también use producción.** Obvio en retrospectiva; costó un incidente real
aprenderlo aquí (ver arriba). Con bases separadas, correr la suite completo
las veces que haga falta es gratis.

**Un cambio transversal (ej. "agregar paginación a todas las pantallas
administrativas") rompe suposiciones de e2e existentes que nadie escribió
pensando en ese cambio.** Un test que crea un producto y espera verlo en la
tabla por defecto asumía implícitamente "la tabla siempre muestra todo".
Agregar paginación invalida esa suposición en cualquier pantalla que la
tenga. La corrección no es solo escribir tests nuevos para la feature nueva
— es _barrer_ la suite existente buscando quién dependía del comportamiento
viejo.

**Una base de datos compartida "de toda la vida" esconde huecos en la
semilla.** El botón "Enviar por WhatsApp" dependía de que alguna sucursal
tuviera `whatsappNumber` configurado — algo que la semilla nunca hacía. En
la base vieja, alguien (una prueba anterior, o configuración manual) ya lo
había puesto, y ese valor llevaba tanto tiempo ahí que nadie lo notaba como
dependencia. Migrar a una base 100% fresca lo destapó de inmediato: 4
pruebas fallaron a la vez, todas por la misma causa raíz. **Una base de
pruebas nueva es la mejor auditoría gratuita de qué tan completa es
realmente la semilla.**

**Antes de investigar un fallo de e2e "raro", sospechar de la reejecución
de `beforeAll`/`afterAll` por worker.** Playwright puede recuperarse de un
test fallido con un worker nuevo (dependiendo de la configuración), y eso
vuelve a correr `beforeAll` — incluyendo cualquier limpieza que borre datos
que otro test de la misma corrida todavía necesita. Un test que depende de
lo que creó un test anterior en el mismo archivo es fráil ante esto.

---

## Patrones de React / Next.js que costó descubrir aquí

**Un grid CSS de 2 columnas (`grid-cols-[1fr_Xrem]`) con contenido +
paginación necesita un contenedor que agrupe.** Agregar un componente
nuevo (ej. `<Paginacion>`) como tercer hijo directo de un grid de 2
columnas que ya tenía exactamente 2 hijos (tabla | formulario lateral) NO
lo agrega "debajo de la tabla": el grid lo coloca en la fila 1, columna 2
— robándole su lugar al segundo hijo original, que entonces cae a una fila
nueva. Cualquier vez que se agregue un elemento a un grid de columnas
fijas, hay que envolver el contenido relacionado en un `<div>` para que el
grid siga viendo el número de hijos que espera.

**Detectar una API que solo existe en el navegador (`SpeechRecognition`,
`window.matchMedia`, etc.) con `typeof window !== 'undefined'` directo en
el render causa un error de hidratación.** El servidor siempre ve `null`
(nunca hay `window` ahí); el cliente, después de hidratar, vería el valor
real — React compara ambos renders y los marca como distintos. La forma
correcta es `useSyncExternalStore(suscripción, getSnapshotCliente,
getSnapshotServidor)`, con `getSnapshotServidor` devolviendo siempre el
valor "vacío" que el servidor también usaría. Un `useEffect` +
`setState()` "parece" arreglarlo (el servidor y el primer render del
cliente coinciden), pero el linter de React (`react-hooks/set-state-in-effect`)
lo señala con razón: dispara un render en cascada evitable.
`useSyncExternalStore` no tiene ese problema porque no es un efecto — es
una lectura síncrona con snapshot explícito por entorno.

---

## Decisiones de alcance en features con IA

**Preguntar explícitamente antes de introducir un proveedor de pago nuevo
(LLM, STT/TTS en la nube, etc.), incluso cuando "la opción obvia" técnicamente
sea la mejor.** En la funcionalidad de dictado de voz, la opción con mejor
relación calidad/esfuerzo para la extracción de texto (LLM barato tipo
Claude Haiku) implicaba dar de alta una cuenta y un API key nuevos. Se
preguntó, y el usuario prefirió cero proveedores nuevos a cambio de aceptar
un parser por reglas más frágil. **La decisión de aceptar esa fragilidad a
cambio de simplicidad es del usuario, no una que se deba asumir por default**
— aunque el propio documento de especificación ya recomendara el LLM.

**Cuando el usuario elige "sin proveedor externo", documentar la
fragilidad aceptada directamente en el código, no solo en la conversación.**
`src/lib/vozTicket.ts` explica en un comentario qué patrones de habla
reconoce el parser por reglas y cuáles no — para que la próxima persona
(o la próxima sesión) entienda que es una limitación de diseño conocida,
no un bug pendiente.

---

## Operación

**Verificar producción con una petición real después de cada deploy, no
asumir que "si compiló, funciona".** `curl` a un puñado de rutas clave
(ver `.github/workflows/smoke-prod.yml`) cuesta segundos y hubiera
detectado el incidente de conexiones agotadas mucho antes de que un
usuario real lo reportara.

**Los deploys manuales (`vercel deploy --prod`, sin integración
GitHub↔Vercel) significan que "push a main" y "ya está en producción" son
dos eventos distintos.** Un smoke test automático disparado por push
correría _antes_ del deploy real y no probaría nada útil — por eso el
workflow de smoke test es manual (`workflow_dispatch`), para dispararlo
justo después del deploy, no en el push.

---

## Skills de Claude Code que valen la pena para este tipo de proyecto

(Next.js + Postgres + Drizzle, una sola persona, con producción real)

- **`code-review`** — antes de cerrar una feature grande (Recepción de
  Mercancía, paginación), un pase de revisión del diff completo atrapa
  cosas que un desarrollo iterativo por partes no ve juntas.
- **`security-review`** — obligatorio antes de exponer una ruta pública
  nueva o una Server Action que toque dinero/inventario.
- **`run`** — para levantar el dev server y probar la UI de verdad en
  vez de asumir que "si typecheck pasa, se ve bien" (el bug del grid de
  paginación no lo hubiera atrapado ni el build ni los tests unitarios).
- **`fewer-permission-prompts`** — en sesiones largas como esta, reduce
  la fricción de aprobar el mismo tipo de comando de solo lectura una y
  otra vez.
- **`init`** — para arrancar el `CLAUDE.md`/`AGENTS.md` de un proyecto
  nuevo con las convenciones ya declaradas desde el primer commit, en vez
  de que se infieran sobre la marcha.
