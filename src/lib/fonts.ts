import localFont from 'next/font/local';

// Fuentes autoalojadas (docs/prompt.md §4): woff2, subconjuntos latin y latin-ext,
// `display: swap`. Nada de Google Fonts por CDN.
//
// Archivo, Atkinson Hyperlegible Next, Bricolage Grotesque y Plus IBM Plex Sans son
// variables o casi (ver pesos abajo). IBM Plex Mono no publica versión variable, así
// que van tres pesos estáticos.
//
// DOS COSAS QUE PARECEN REPETICIÓN INNECESARIA Y NO LO SON:
//
// 1. Cada subconjunto es su propia llamada a `localFont`. Dos `@font-face` con la
//    misma familia, peso y estilo y SIN `unicode-range` no se combinan: el último
//    declarado gana y el otro archivo no se usa nunca. Como `latin-ext` (U+0100 en
//    adelante) no contiene ni una vocal acentuada ni la eñe, dejarlo ganar rompía
//    todo el texto en español. Cada uno declara su `unicode-range` y se encadenan
//    como dos familias en `fontFamily` (ver tailwind.config.ts).
//
// 2. Todo va escrito literal: nada de constantes compartidas, `.map()` ni helpers.
//    `next/font/local` lee estas llamadas en tiempo de compilación con análisis
//    estático; cualquier valor calculado se descarta en silencio y la compilación
//    falla con «module not found». Si vas a tocar este archivo, mantenlo literal.
//
// Solo los subconjuntos `latin` se precargan. El español cabe entero en `latin`, así
// que `latin-ext` lleva `preload: false` y se descarga solo si aparece un glifo que
// lo necesite, en vez de competir por ancho de banda en cada carga.
//
// TEMA CLÁSICO/MODERNO: `display`/`sans` tienen DOS familias cada uno (una por tema —
// ver src/app/globals.css) y por eso NO usan los nombres semánticos
// `--fuente-display-latin`/`--fuente-sans-latin` directamente aquí: cada fuente física
// declara su PROPIO nombre de variable (`--font-archivo-latin`, `--font-bricolage-latin`,
// etc.), y es `globals.css` quien decide, según `[data-theme]`, a cuál de las dos alias
// el nombre semántico que sí consume `tailwind.config.ts`. `mono` es el mismo en los dos
// temas (las cifras deben leerse igual sin importar el tema), así que mantiene el nombre
// semántico directo, sin indirección.

// display · Archivo (variable, 100–900) — tema clásico
const displayArchivoLatin = localFont({
  src: '../../public/fonts/archivo-latin-wght-normal.woff2',
  weight: '100 900',
  style: 'normal',
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
  variable: '--font-archivo-latin',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

const displayArchivoLatinExt = localFont({
  src: '../../public/fonts/archivo-latin-ext-wght-normal.woff2',
  weight: '100 900',
  style: 'normal',
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
  variable: '--font-archivo-ext',
  display: 'swap',
  preload: false,
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

// display · Bricolage Grotesque (variable, 200–800) — tema moderno
const displayBricolageLatin = localFont({
  src: '../../public/fonts/bricolage-grotesque-latin-wght-normal.woff2',
  weight: '200 800',
  style: 'normal',
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
  variable: '--font-bricolage-latin',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

const displayBricolageLatinExt = localFont({
  src: '../../public/fonts/bricolage-grotesque-latin-ext-wght-normal.woff2',
  weight: '200 800',
  style: 'normal',
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
  variable: '--font-bricolage-ext',
  display: 'swap',
  preload: false,
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

// sans · Atkinson Hyperlegible Next (variable, 200–800) — tema clásico
const sansAtkinsonLatin = localFont({
  src: '../../public/fonts/atkinson-latin-wght-normal.woff2',
  weight: '200 800',
  style: 'normal',
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
  variable: '--font-atkinson-latin',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

const sansAtkinsonLatinExt = localFont({
  src: '../../public/fonts/atkinson-latin-ext-wght-normal.woff2',
  weight: '200 800',
  style: 'normal',
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
  variable: '--font-atkinson-ext',
  display: 'swap',
  preload: false,
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

// sans · IBM Plex Sans (estático: 400 / 500 / 600) — tema moderno
const sansPlexSansLatin = localFont({
  src: [
    {
      path: '../../public/fonts/ibm-plex-sans-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ibm-plex-sans-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ibm-plex-sans-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
  variable: '--font-plex-sans-latin',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

const sansPlexSansLatinExt = localFont({
  src: [
    {
      path: '../../public/fonts/ibm-plex-sans-latin-ext-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ibm-plex-sans-latin-ext-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ibm-plex-sans-latin-ext-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
  variable: '--font-plex-sans-ext',
  display: 'swap',
  preload: false,
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

// mono · IBM Plex Mono (estático: 400 / 500 / 600)
const monoLatin = localFont({
  src: [
    {
      path: '../../public/fonts/ibm-plex-mono-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ibm-plex-mono-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ibm-plex-mono-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
  variable: '--fuente-mono-latin',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'monospace'],
});

const monoLatinExt = localFont({
  src: [
    {
      path: '../../public/fonts/ibm-plex-mono-latin-ext-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ibm-plex-mono-latin-ext-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ibm-plex-mono-latin-ext-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
  variable: '--fuente-mono-ext',
  display: 'swap',
  preload: false,
  fallback: ['ui-monospace', 'SFMono-Regular', 'monospace'],
});

/** Todas las variables CSS de fuente, para colgarlas del <html>. Los dos temas cargan
 *  las 5 familias siempre (nunca solo la activa): el cambio de tema es un simple alias
 *  de variable en `globals.css`, instantáneo, sin esperar red a mitad de sesión. */
export const claseFuentes = [
  displayArchivoLatin.variable,
  displayArchivoLatinExt.variable,
  displayBricolageLatin.variable,
  displayBricolageLatinExt.variable,
  sansAtkinsonLatin.variable,
  sansAtkinsonLatinExt.variable,
  sansPlexSansLatin.variable,
  sansPlexSansLatinExt.variable,
  monoLatin.variable,
  monoLatinExt.variable,
].join(' ');
