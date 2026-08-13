# POS Papelería

Punto de venta para papelería. Next.js sobre Vercel, Supabase Postgres.

La especificación completa —reglas de negocio, modelo de datos, sistema de diseño y
las 8 fases— vive en **[`docs/prompt.md`](docs/prompt.md)**. Ese documento manda: si
este README lo contradice, gana el documento.

**Estado: Fase 0 (andamiaje) terminada.** Siguiente: Fase 1, autenticación.

## Arranque

```bash
npm install
cp .env.example .env.local   # y llena los valores
npm run db:push              # crea el esquema en Supabase
npm run dev
```

## Comandos

| Comando                              | Qué hace                                                         |
| ------------------------------------ | ---------------------------------------------------------------- |
| `npm run dev`                        | Servidor de desarrollo                                           |
| `npm run build`                      | Compilación de producción                                        |
| `npm run verify`                     | Tipos + lint + formato + build. **Correr antes de cada commit.** |
| `npm run typecheck`                  | Solo TypeScript                                                  |
| `npm run lint` / `lint:fix`          | ESLint                                                           |
| `npm run format` / `format:check`    | Prettier                                                         |
| `npm run db:push`                    | Empuja el esquema a Supabase (desarrollo)                        |
| `npm run db:generate` / `db:migrate` | Migraciones SQL revisables (producción)                          |
| `npm run db:studio`                  | Explorador de la base de datos                                   |

## Cómo está armado

```
docs/prompt.md          la especificación — léela antes de tocar nada
src/app/                App Router: layout, globals.css, páginas
src/db/                 Drizzle: schema.ts (tablas) e index.ts (conexión)
src/lib/fonts.ts        fuentes autoalojadas — lee el comentario antes de editarlo
src/env.ts              variables de entorno, validadas al leerse
public/fonts/           woff2 copiados de @fontsource (ver "Fuentes")
tailwind.config.ts      sistema de diseño de §4 — la paleta se REEMPLAZA, no se extiende
```

## Cosas que muerden

**La paleta reemplaza a la de Tailwind.** No existen `bg-blue-500` ni `text-gray-700`:
solo los colores de §4 (`papel`, `tinta`, `grafito`, `linea`, `boligrafo`, `marcador`,
`sello`, `visto`). Si necesitas un color que no está, la respuesta casi siempre es que
estás usando el componente equivocado.

**El dinero se calcula en centavos enteros**, nunca con flotantes (§2). La conversión
ocurre en exactamente dos fronteras: al leer de la base y al escribir a la base.

**`DATABASE_URL` debe ser la cadena del pooler** (puerto 6543), no la directa. El
cliente ya va con `prepare: false`, obligatorio con PgBouncer en modo transacción.

**`src/lib/fonts.ts` se ve repetitivo a propósito.** Hay dos razones —
`unicode-range` por subconjunto y el análisis estático de `next/font`— explicadas en
el comentario del propio archivo. Lee eso antes de "limpiarlo".

## Fuentes

Autoalojadas en `public/fonts/`, copiadas desde los paquetes `@fontsource*` que están
en `devDependencies`. Los paquetes solo son el origen: en tiempo de ejecución no se
usan. Para actualizarlas, sube la versión del paquete y vuelve a copiar el `.woff2`
correspondiente desde `node_modules/@fontsource*/files/`.

- **display** · Archivo (variable 100–900) — títulos y cifras
- **sans** · Atkinson Hyperlegible Next (variable 200–800) — cuerpo e interfaz
- **mono** · IBM Plex Mono (400/500/600) — folios, códigos, cantidades, tickets

## Despliegue

Vercel, región `iad1` fijada en `vercel.json`. Debe coincidir con la región del
proyecto de Supabase o cada consulta paga un viaje de ida y vuelta de más.

Las variables de `.env.example` van cargadas en el proyecto de Vercel.
`SUPABASE_SERVICE_ROLE_KEY` y las llaves de bancos de imágenes **nunca** llevan
prefijo `NEXT_PUBLIC_`.
