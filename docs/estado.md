# Estado del proyecto

Última actualización: **13 de agosto de 2026**

Bitácora de dónde quedó el trabajo, qué falta y por qué se tomaron ciertas
decisiones. Se actualiza al cerrar cada fase. La especificación manda: ver
[`prompt.md`](prompt.md).

---

## Dónde vamos

| Fase                              | Estado                                                                    |
| --------------------------------- | ------------------------------------------------------------------------- |
| **0 — Andamiaje y despliegue**    | ✅ **Cerrada.** Los 3 criterios de aceptación verificados, sin pendientes |
| 1 — Autenticación                 | ✅ **Cerrada.** Los 5 criterios verificados con Playwright                |
| 2 — Catálogo y administración     | ✅ **Cerrada.** Los 4 criterios verificados con Playwright                |
| 3 — Turnos de caja                | ✅ **Cerrada.** Los 4 criterios verificados con Playwright                |
| 4 — Punto de venta                | ✅ **Cerrada.** Los 7 criterios verificados con Playwright                |
| 5 — Historial, reportes y tablero | ✅ **Cerrada.** Los 4 criterios verificados con Playwright                |
| 6 — Andamio de Herramientas       | ✅ **Cerrada.** Los 3 criterios verificados con Playwright                |
| 7 — AcomodaImpresion              | ⬜                                                                        |

---

## Fase 0 — detalle

Commit `b6c3d32` · rama `main` · `iscnorena/pos-papeleria-v2`

### Hecho

- Next.js 16.3 (App Router) con TypeScript estricto, más
  `noUncheckedIndexedAccess`, `noImplicitOverride` y `noFallthroughCasesInSwitch`.
- Tailwind v3 con el sistema de diseño de §4 copiado tal cual: paleta que
  **reemplaza** la de Tailwind, escalas de tipografía, sombras sin difuminado,
  espaciados `renglon` / `tecla` / `cinta`.
- Fuentes autoalojadas en `public/fonts/` con `next/font/local` y `display: swap`.
- Drizzle + postgres.js contra Supabase, con `prepare: false`.
- ESLint + Prettier, y `npm run verify` (tipos + lint + formato + build) en verde.
- `.env.example` con las 8 variables.
- Página de prueba con fondo `papel`, título en `display` y muestra de las tres
  tipografías.
- `vercel.json` fija la región `iad1`.
- Proyecto **`pos-papeleria`** creado en el team `christopher-norenas-projects` y
  enlazado en `.vercel/project.json`.

### Pendiente para cerrar la fase

1. ~~**Desplegar a producción.**~~ ✅ Hecho el 13 de agosto de 2026 desde el
   árbol local (`b7152a4`), con `npx vercel deploy --prod --yes`.
   - Producción: <https://pos-papeleria.vercel.app>
   - Despliegue: `dpl_4fS8SZzBpjor28dQqshLf5961XFS`, estado `READY`, build 7 s.
   - Responde `200` en ~0.5 s. Ambas rutas (`/` y `/_not-found`) salen estáticas.
2. ~~**Verificar la tipografía en producción.**~~ ✅ Confirmado a ojo en el
   navegador el 13 de agosto de 2026: los tres renglones de muestra salen en
   tres tipografías distintas y se ven bien. Lo comprobado por red, de apoyo:
   - Las 10 reglas `@font-face` están presentes, cada una con su `unicode-range`
     (el minificador los reescribe: `U+0000-00FF` → `U+??`, `U+0100-02BA` →
     `U+100-2BA`; son los mismos rangos).
   - Las tres familias se encadenan `latin` → `latin-ext` → fallback del sistema,
     que es lo que evita el problema descrito abajo en «decisiones».
   - Se precargan exactamente los 5 subconjuntos `latin`, ninguno de los `ext`.
   - Los `.woff2` responden `200` con `content-type: font/woff2`.

3. ~~**Crear el proyecto de Supabase** y llenar `.env.local`.~~ ✅ Proyecto
   `fwtbpdimycbjplteuviw` en **`us-east-1`**, conectado por el **transaction
   pooler** (`:6543`, `?pgbouncer=true`), que es lo que pide §1.
4. ~~**Correr `npm run db:push`.**~~ ✅ Creó `health_check` en Supabase con las
   tres columnas del esquema. Se verificó además con un `insert` + `delete` de
   prueba: la tabla acepta escrituras y quedó en 0 filas.
5. ~~**Cargar las variables en el proyecto de Vercel.**~~ ✅ Subidas por CLI
   (`vercel env add`) las tres que lee `src/env.ts` — `DATABASE_URL`,
   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` — a **Production** y **Preview**,
   las seis marcadas `Sensitive`.
   - **No** se cargaron en el entorno `Development` de Vercel: ese solo lo usa
     `vercel dev`, y aquí se trabaja con `next dev` leyendo `.env.local`.
   - `Sensitive` significa que Vercel ya no las devuelve en claro: no se pueden
     leer desde el dashboard ni con `vercel env pull`, solo sobrescribir. La
     copia buena vive en `.env.local`.
   - Las variables solo entran en despliegues **nuevos**. El de producción actual
     se hizo sin ellas, y no importa: hoy nada importa `src/db`. El primer
     despliegue de la Fase 1 ya las tendrá.

---

## Fase 1 — detalle

Commit `0d9e5ce`. Los 5 criterios de aceptación se verifican solos con
`npm run test:e2e` (`e2e/fase-1-autenticacion.spec.ts`), no a ojo.

### Cómo entrar

`admin` / `password`, PIN `1234`. También `cajera` (PIN 5678) y `maria`
(PIN 9012, Sucursal 2). Los crea `npm run db:seed`, que es idempotente.

### Decisiones de esta fase

**El PIN es único global, no por sucursal.** §5 permite las dos lecturas y manda la
global «si aún no sabes la sucursal». La pantalla de login no pregunta sucursal
porque el equipo se comparte entre turnos, que es exactamente ese caso. La
unicidad se valida al crear el usuario, en la Fase 2.

**Validar el PIN compara contra cada usuario activo.** bcrypt siembra distinto en
cada hash, así que no se puede buscar por hash. Con tres usuarios es irrelevante;
si algún día fueran cientos, habría que preguntar la sucursal en el login y
filtrar por ella.

**`experimental.authInterrupts` activado.** Es lo que habilita `forbidden()`, y sin
él una página no puede responder 403: solo `notFound()` puede fijar el estado. La
Fase 2 exige un 403 real y un 404 mentiría sobre lo ocurrido. Es experimental; si
una versión futura lo cambia, el reemplazo es un Route Handler que responda 403.

**La semilla no importa `src/db`.** Ese módulo lleva `server-only` y revienta fuera
del servidor de Next. Quitarlo debilitaría una protección real, así que la semilla
abre su propia conexión y solo comparte el esquema.

**Un usuario inexistente también paga una comparación bcrypt.** Si no, responder
«no existe» sería medible por tiempo aunque el mensaje fuera idéntico.

### Cambios de Next.js 16 que afectaron el diseño

- **`middleware` → `proxy`.** Archivo `src/proxy.ts`, export con nombre `proxy`.
  Corre siempre en runtime `nodejs`, que no se puede configurar — aquí conviene,
  porque la sesión se resuelve con el mismo `auth` del resto del servidor.
- **`cookies()`, `headers()`, `params` y `searchParams` son promesas.** El acceso
  síncrono se eliminó del todo en la 16.

---

## Fase 2 — detalle

Commit `30b9e6f`. Los 4 criterios se verifican con `npm run test:e2e`
(`e2e/fase-2-catalogo.spec.ts`), que además limpia lo que crea.

### El fallo que costó encontrar: `max: 1` en el pool

Al probar la fase, el login empezó a tardar **60 segundos** y las pantallas de
administración se colgaban. No era la base (una consulta suelta tardaba 98 ms) ni
Turbopack: era `max: 1` en `src/db/index.ts`.

En producción serverless esa cifra es la correcta — cada instancia atiende una
petición, y más conexiones solo agotarían antes el límite de Supabase. Pero en
desarrollo **un solo proceso atiende todas las peticiones**, así que cada consulta
de cada pestaña hacía fila detrás de una única conexión y una lenta congelaba la
aplicación entera, login incluido. Ahora el tamaño depende de `NODE_ENV`, y hay
`connect_timeout` para que un intento atascado falle con un error legible.

La pista que lo destapó fue el registro del servidor:
`GET /productos 200 in 64s (application-code: 63s)` y, detrás, todos los
`POST /login` clavados en 60 s.

### Cómo se aplican los cambios de esquema

`drizzle-kit push --force` **ya no es viable**: se cuelga sin mensaje cuando hay
que resolver renombrados, y el entorno bloquea tanto ese comando como cualquier
`DROP`. El camino que funciona, y que además es el que pide §1 («migraciones en
SQL legible que puedes revisar antes de aplicar»):

1. `npx drizzle-kit generate` — escribe el SQL en `drizzle/`, sin tocar la base.
2. Revisar ese SQL.
3. Aplicar **solo lo aditivo** (tablas, índices y llaves nuevas).

Queda una deuda: la base no tiene historial de migraciones, porque las primeras
tablas se crearon con `push`. Para arrancarlo limpio habría que vaciar la base de
desarrollo y correr `drizzle-kit migrate` desde cero — todo su contenido lo
regenera `npm run db:seed`, pero hace falta permiso para borrar.

### Decisiones de esta fase

**Un formulario descriptivo compartido** (`FormularioCrud`) para los cuatro CRUD:
se declara la lista de campos y él coloca cada error junto al campo que falló, que
es lo que pide el criterio 1. Cuatro formularios casi idénticos no justificaban
cuatro implementaciones.

**El ajuste de inventario fija la cantidad contada, no la suma.** Es lo que hace
falta tras un inventario físico y evita el error de aplicar dos veces el mismo
ajuste. La condición lleva siempre producto **y** sucursal.

**`src/lib/catalogo.ts` nació en esta fase aunque lo use la Fase 4.** Es la
consulta del catálogo vendible, y es la que hace verificable el criterio 4.

---

## Fase 3 — detalle

Commit `fb2dd4e`. Los 4 criterios se verifican con `npm run test:e2e`
(`e2e/fase-3-turnos.spec.ts`).

### Migraciones: ahora sí hay historial

La base de desarrollo se vació con autorización y se reconstruyó desde cero con
`drizzle-kit migrate`. El flujo de aquí en adelante, y el que pide §1:

1. `npx drizzle-kit generate` — escribe el SQL en `drizzle/`, sin tocar la base.
2. **Revisar ese SQL.** Conviene mirar que no haya `DROP` ni `TRUNCATE` reales;
   los `ON DELETE` de las llaves foráneas salen en cualquier búsqueda ingenua y
   no son borrados.
3. `npm run db:migrate`.

`drizzle-kit push` quedó descartado: se cuelga sin mensaje cuando tiene que
resolver un renombrado.

### Decisiones de esta fase

**Todo el modelo de datos restante de §7 entró en la misma migración** (`sales`,
`sale_items`, `sale_payments`, `folios`), aunque las ventas sean de la Fase 4. Así
el cálculo del corte es el definitivo desde ahora — consulta pagos reales, hoy
vacíos — y la Fase 4 no tiene que tocar el esquema.

**`sale_items.product_id` es NOT NULL a propósito.** §6 prevé permitirlo nulo
cuando las Herramientas cobren servicios sin producto, pero manda **no hacer esa
migración todavía**. Sigue anotada en la deuda.

**Nadie cierra el turno de otra persona, ni un admin.** El corte lo firma quien
contó el dinero. El admin **ve** todos los turnos (§3), pero cerrar es del dueño.

**Una cajera que pide el turno de otra recibe 404, no 403.** Para ella ese turno
sencillamente no existe; un 403 confirmaría que existe y de quién es.

**El detalle de un turno cerrado lee `shift_payments`, no recalcula.** Es la razón
de congelarlo (§7.5): cancelar hoy una venta de ayer no debe mover el corte de
ayer. Uno abierto sí se calcula en vivo.

---

## Fase 4 — detalle

Commit `d5ffd91`. Los 7 criterios se verifican con `npm run test:e2e`
(`e2e/fase-4-punto-de-venta.spec.ts`), incluidos el de concurrencia y el de
cobrar sin tocar el mouse.

### El bug que encontraron las pruebas

La cinta del ticket declaraba `width: 72mm` con la idea de que los 4mm de relleno
a cada lado sumaran 80. Pero Tailwind pone `box-sizing: border-box`, así que esos
72mm **ya incluían** el relleno: el ticket salía a 72mm de ancho en el rollo. Se
descubrió midiendo el ancho real en el navegador, no leyendo el CSS.

### Decisiones de esta fase

**Una sola función de cálculo.** `src/lib/venta.ts` es puro y lo usan el carrito
del navegador y la Server Action que guarda. Si el cliente y el servidor
calcularan por separado, tarde o temprano mostrarían totales distintos.

**Del cliente solo se cree QUÉ se vende y CUÁNTO se paga.** Precios, costos y
totales se releen de la base y se recalculan en el servidor (§10).

**El descuento de stock lleva la condición dentro del propio `UPDATE`**
(`stock >= cantidad`), no en un `SELECT` previo. Comprobar antes y actualizar
después deja hueco para que dos cajas vendan el mismo último cuaderno. Si el
`UPDATE` no devuelve filas, se aborta la transacción entera.

**F12 abre el cobro y F12 lo confirma.** Hacía falta una tecla de confirmación
para que el criterio 6 —cobrar sin mouse— fuera cierto de punta a punta:
F2 → buscar → Enter → F12 → importe → Enter → F12.

**El ticket vive fuera del grupo `(app)` y el `proxy` lo deja pasar sin sesión.**
Lo protege el token opaco de 32 bytes, no la cookie: el cliente no tiene cuenta y
tiene que poder abrirlo desde su teléfono (§6).

**«Descargar PDF» del ticket queda pendiente.** §6 lo pide con pdf-lib en el
cliente; se arma en la Fase 7, que es donde entra esa librería, para no cargarla
en cada ticket de una caja que solo quiere imprimir.

---

## Fase 5 — detalle

Commit `7696c2f`. Los 4 criterios se verifican con `npm run test:e2e`
(`e2e/fase-5-reportes.spec.ts`).

### El bug de zona horaria

`limitesDelDia` calculaba el desfase de la zona con `toLocaleString` seguido de
`new Date`. Ese truco es común y **está mal**: `new Date` interpreta la cadena en
la zona de la MÁQUINA, así que el resultado dependía de dónde corriera el código.
Daba bien en Vercel, que corre en UTC, y mal en cualquier equipo configurado en
hora de México — exactamente el escenario de quien desarrolla el sistema.

Ahora el desfase se le pregunta a `Intl` con `timeZoneName: 'longOffset'`, que
conoce la base de datos de zonas y acierta también con el horario de verano. Hay
pruebas de Vitest (`src/lib/fechas.test.ts`) que fijan el comportamiento: una
venta de las 20:30 pertenece a ese día, no al siguiente.

Lo encontró el criterio 3, que existe justo para eso.

### Decisiones de esta fase

**Historial y reportes comparten `src/lib/reportes.ts`.** El criterio 1 pide que
cuadren entre sí; la única forma de garantizarlo es que no haya dos
implementaciones que puedan divergir.

**El alcance del rol no es un filtro más.** En `condicionesDe`, la cajera queda
atada a sus ventas antes de mirar la URL: cambiar `?cajera=` a mano no la amplía.

**Cancelar lleva la condición `status = 'completed'` dentro del `UPDATE`.** Si dos
administradores cancelan la misma venta a la vez, solo uno encuentra fila y el
stock se devuelve una sola vez.

**El CSV usa punto y coma, no coma.** El Excel en español espera `;`; con comas
mete todo en una columna. Y el BOM UTF-8 es lo que evita que «María» salga
«MarÃ­a» — es el criterio 4 literal.

**La cajera no ve la ganancia en el tablero.** Ve sus ventas y su ingreso; el
margen es información de negocio (§3).

---

## Fase 6 — detalle

Commit `5384902`. Los 3 criterios se verifican con `npm run test:e2e`
(`e2e/fase-6-herramientas.spec.ts`).

La prueba del criterio 1 es literal: **escribe** una entrada nueva en
`src/tools/registry.ts`, comprueba que la herramienta aparece en la vitrina y que
su ruta responde 200, y restaura el archivo. Si hiciera falta tocar cualquier
otro archivo, fallaría.

### Decisiones de esta fase

**«Etiquetas y códigos de barras» es solo de admin.** Hacía falta al menos una
herramienta restringida para que el criterio 2 tuviera algo que probar, y esa es
la que lo justifica sola: imprimir etiquetas de precio es trabajo de catálogo, no
de caja.

**Las tarjetas `proxima` son un bloque atenuado, no un enlace deshabilitado.** Un
`<a>` con el cursor cambiado sigue siendo navegable con teclado y anunciable por
un lector de pantalla: parecería clicable a quien no ve el color.

**AcomodaImpresion se registra ya, en estado `proxima`.** Pasa a `lista` en la
Fase 7. Así la vitrina cuenta hacia dónde va la sección desde el primer día, que
es una de las dos razones por las que §6 pide las tarjetas atenuadas.

**`NEXT_PUBLIC_COBRO_HERRAMIENTAS` es la única variable `NEXT_PUBLIC_` del
sistema.** No es un secreto sino un interruptor que decide el navegador. Todo lo
demás vive solo en el servidor (§2).

### Bloqueo abierto: no hay auto-deploy

Vercel **rechazó enlazar el repo de GitHub**:

> You need to add a Login Connection to your GitHub account first. (400)

La cuenta de Vercel (`iscnorenam@gmail.com`) entra por correo, sin conexión con
GitHub. Mientras siga así, **hacer push no dispara ningún despliegue** y cada uno
hay que lanzarlo por CLI.

Para arreglarlo: `vercel.com/account/login-connections` → agregar GitHub, y luego
conectar el repo desde el dashboard del proyecto.

---

## Decisiones tomadas y desviaciones de la especificación

Cada una con su motivo, para no re-litigarlas después.

**Next.js 16.3, no 15.** §1 pide «15+». `create-next-app` instala la 16, que
cumple y está más al día.

**`tailwind.config.ts`, no `.js`.** El bloque de §4 mezcla `export default` (ESM)
con `require('@tailwindcss/forms')`, y `require` no existe dentro de un módulo
ESM: tal cual no arranca. Se cambió a `.ts` con `import forms from ...`. **Ningún
valor de la paleta ni de las escalas se tocó.**

**IBM Plex Mono va en pesos estáticos (400/500/600).** §4 pide todas las fuentes
variables, pero IBM Plex Mono no publica versión variable. Archivo (100–900) y
Atkinson Hyperlegible Next (200–800) sí son variables.

**Cada subconjunto de fuente es su propia llamada a `localFont`.** Dos
`@font-face` con la misma familia, peso y estilo y **sin `unicode-range`** no se
combinan: el último declarado gana. Como `latin-ext` arranca en U+0100 y no tiene
ni una vocal acentuada ni la eñe, la versión ingenua mandaba todo el texto en
español al fallback del sistema. Ahora cada subconjunto declara su rango y se
encadenan como dos familias en `fontFamily`.

**`src/lib/fonts.ts` está escrito literal a propósito.** Nada de constantes
compartidas, `.map()` ni helpers: `next/font/local` analiza esas llamadas
estáticamente en tiempo de compilación y descarta en silencio cualquier valor
calculado — la compilación truena con «module not found». Está comentado en el
archivo.

**`preload: false` en los tres subconjuntos `latin-ext`.** El español cabe entero
en `latin`; precargar los 10 archivos era desperdicio. Bajó a 5 precargas.

**Los paquetes `@fontsource*` viven en `devDependencies`.** Solo son el origen de
los `.woff2` copiados a `public/fonts/`; en tiempo de ejecución no se usan.

**La llave secreta se guarda como `SUPABASE_SERVICE_ROLE_KEY`, aunque Supabase ya
no la llame así.** El dashboard ahora entrega `sb_publishable_…` y `sb_secret_…`
en vez de las viejas `anon` / `service_role`. La `sb_secret_…` es la sucesora
directa de `service_role`, y §2 de la especificación fija el nombre de la
variable, así que se conserva `SUPABASE_SERVICE_ROLE_KEY` y ahí va ese valor.
`SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_JWKS_URL` también están en `.env.local`
pero **hoy no las lee nadie**; el JWKS solo serviría si la Fase 1 autenticara
contra Supabase Auth en lugar de Auth.js.

---

## Deuda anotada

- **`health_check` se borra en la Fase 1.** La tabla de `src/db/schema.ts` existe
  únicamente para probar `db:push`. Se va cuando entren `branches`, `users` y
  `login_attempts`.
- **`drizzle-kit` arrastra un aviso `moderate` de npm audit** (`@esbuild-kit/*`
  → `esbuild`). Es herramienta de desarrollo, no llega a producción, y no hay
  versión publicada que lo resuelva. Revisar al subir de versión.
- **Producción y desarrollo comparten la MISMA base de Supabase.** Hoy da igual
  porque no hay datos reales, pero en cuanto el negocio empiece a vender, correr
  `npm run test:e2e` estaría creando y borrando cosas en la base de producción.
  Antes de ese día hace falta un segundo proyecto de Supabase para desarrollo, y
  que `.env.local` apunte ahí.
- **Migración pendiente de la Fase 6:** cuando se conecte el cobro de
  herramientas habrá que permitir `product_id` nulo en `sale_items` con
  `product_name` obligatorio. **No hacerla todavía** (§6 de la especificación).
- **`npm run db:push` no corre sin terminal interactiva.** `strict: true` en
  `drizzle.config.ts` siempre pide confirmación, y sin TTY revienta con
  «Interactive prompts require a TTY terminal». Peor: cuando falla _antes_ de
  eso (por credenciales, por ejemplo) el spinner de «Pulling schema» se traga el
  error y solo deja un código de salida 1 mudo. Para correrlo sin TTY:
  `npx drizzle-kit push --force`. **Revisar siempre el SQL que imprime antes**,
  porque `--force` también auto-aprueba sentencias con pérdida de datos.

---

## Erratas encontradas en `prompt.md`

No se corrigieron en el documento: queda a criterio de si conviene tocarlo o
dejarlo como está.

- **Colisión de numeración en §7.** Hay dos series `7.1–7.x`: una en «Modelo de
  datos» (folio, inventario, turnos) y otra dentro de la Fase 7 (retícula,
  precios, defaults). §10 dice «No cambies los números de §7.1–7.3»; por contexto
  se refiere a los de **AcomodaImpresion**, y así se está interpretando.
- §3 remite a «Herramientas (§9)», pero §9 es «Semilla de datos» — Herramientas
  es la Fase 6.
- §6 remite a «§9.3» para bancos de imágenes; es **§7.6**.

---

## Cuentas y accesos

| Qué                  | Valor                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| Repo                 | `git@github.com:iscnorena/pos-papeleria-v2.git` (SSH)                 |
| Identidad de commits | `iscnorena <iscnorenam@gmail.com>`, configurada **solo en este repo** |
| Llave SSH            | `~/.ssh/id_ed25519_github`, verificada contra GitHub                  |
| Cuenta Vercel        | `iscnorenam-8534` (`iscnorenam@gmail.com`)                            |
| Team Vercel          | `christopher-norenas-projects`                                        |
| Proyecto Vercel      | `pos-papeleria` (`prj_BbMW9DIQbolMFldpGHtVzTwEMORg`)                  |
| Producción           | <https://pos-papeleria.vercel.app>                                    |
| Supabase             | proyecto `fwtbpdimycbjplteuviw`, región `us-east-1`                   |

Verificar que `iscnorenam@gmail.com` esté confirmado en
`github.com/settings/emails`, o los commits no se atribuyen al perfil.

---

## Al retomar

1. La Fase 0 no dejó pendientes. Arrancar directo con la Fase 1.
2. **Fase 1 — Autenticación**: esquema de `users`, `branches` y
   `login_attempts`; login con las dos pestañas (contraseña y PIN); límite de
   intentos; middleware; `requerirRol`; semilla mínima. Al crear esas tablas,
   **borrar `health_check`** (ver «Deuda anotada»). Hace falta `AUTH_SECRET` en
   `.env.local`: `openssl rand -base64 32`.
3. Regla de la especificación (§10): **no empezar la Fase N+1 antes de verificar
   a mano los criterios de aceptación de la Fase N.** Los de la Fase 0 ya están
   verificados los tres.
