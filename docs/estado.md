# Estado del proyecto

Última actualización: **13 de agosto de 2026**

Bitácora de dónde quedó el trabajo, qué falta y por qué se tomaron ciertas
decisiones. Se actualiza al cerrar cada fase. La especificación manda: ver
[`prompt.md`](prompt.md).

---

## Dónde vamos

| Fase                              | Estado                                                                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0 — Andamiaje y despliegue**    | 🟡 Código terminado y verificado en local; **los 3 criterios de aceptación siguen sin verificar** (los tres dependen del despliegue y de Supabase) |
| 1 — Autenticación                 | ⬜ Sin empezar                                                                                                                                     |
| 2 — Catálogo y administración     | ⬜                                                                                                                                                 |
| 3 — Turnos de caja                | ⬜                                                                                                                                                 |
| 4 — Punto de venta                | ⬜                                                                                                                                                 |
| 5 — Historial, reportes y tablero | ⬜                                                                                                                                                 |
| 6 — Andamio de Herramientas       | ⬜                                                                                                                                                 |
| 7 — AcomodaImpresion              | ⬜                                                                                                                                                 |

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

1. **Desplegar a producción.** El proyecto ya está enlazado; solo falta empujar:
   ```bash
   npx vercel deploy --prod --yes
   ```
2. **Verificar la tipografía en el despliegue de producción**, no solo en local.
   El criterio de §8 es que se vea la fuente correcta y no la sustituta del
   sistema: abrir la página desplegada y confirmar que los tres renglones de
   muestra salen en tres tipografías distintas.
3. **Crear el proyecto de Supabase** y llenar `.env.local` con `DATABASE_URL`
   (cadena del **pooler**, puerto 6543 — la directa se agota en serverless),
   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. Región **`us-east-1`** para que
   empate con `iad1`.
4. **Correr `npm run db:push`** y confirmar que crea la tabla en Supabase. Ese es
   el último criterio de aceptación de la Fase 0.
5. **Cargar esas mismas variables en el proyecto de Vercel** (Settings →
   Environment Variables), o el despliegue no podrá hablar con la base cuando
   empiece la Fase 1.

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
| Supabase             | ⬜ Sin crear                                                          |

Verificar que `iscnorenam@gmail.com` esté confirmado en
`github.com/settings/emails`, o los commits no se atribuyen al perfil.

---

## Al retomar

1. Cerrar los 5 pendientes de la Fase 0 de arriba.
2. Recién entonces, **Fase 1 — Autenticación**: esquema de `users`, `branches` y
   `login_attempts`; login con las dos pestañas (contraseña y PIN); límite de
   intentos; middleware; `requerirRol`; semilla mínima.
3. Regla de la especificación (§10): **no empezar la Fase N+1 antes de verificar
   a mano los criterios de aceptación de la Fase N.**
