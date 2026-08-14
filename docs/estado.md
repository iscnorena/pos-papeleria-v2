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
| 2 — Catálogo y administración     | ⬜                                                                        |
| 3 — Turnos de caja                | ⬜                                                                        |
| 4 — Punto de venta                | ⬜                                                                        |
| 5 — Historial, reportes y tablero | ⬜                                                                        |
| 6 — Andamio de Herramientas       | ⬜                                                                        |
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
