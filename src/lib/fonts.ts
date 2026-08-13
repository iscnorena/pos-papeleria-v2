import localFont from 'next/font/local';

// Fuentes autoalojadas (docs/prompt.md §4): woff2, subconjuntos latin y latin-ext,
// `display: swap`. Nada de Google Fonts por CDN.
//
// Archivo y Atkinson Hyperlegible Next son variables (un archivo cubre todo el eje
// wght). IBM Plex Mono no publica versión variable, así que van tres pesos estáticos.
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

// display · Archivo (variable, 100–900)
const displayLatin = localFont({
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
  variable: '--fuente-display-latin',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

const displayLatinExt = localFont({
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
  variable: '--fuente-display-ext',
  display: 'swap',
  preload: false,
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

// sans · Atkinson Hyperlegible Next (variable, 200–800)
const sansLatin = localFont({
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
  variable: '--fuente-sans-latin',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

const sansLatinExt = localFont({
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
  variable: '--fuente-sans-ext',
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

/** Todas las variables CSS de fuente, para colgarlas del <html>. */
export const claseFuentes = [
  displayLatin.variable,
  displayLatinExt.variable,
  sansLatin.variable,
  sansLatinExt.variable,
  monoLatin.variable,
  monoLatinExt.variable,
].join(' ');
