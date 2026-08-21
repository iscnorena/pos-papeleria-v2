import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

// Paleta y escalas de docs/prompt.md §4. `colors` REEMPLAZA la paleta de Tailwind
// en vez de extenderla: si un color no está aquí, no se usa.
//
// TEMA CLÁSICO/MODERNO: cada color resuelve a `rgb(var(--color-x) / <alpha-value>)` en
// vez de un hex literal — los valores reales viven en `src/app/globals.css`, dos
// bloques `:root[data-theme=...]`, y `<alpha-value>` es lo que le permite a Tailwind
// seguir soportando modificadores de opacidad (`bg-tinta/40`, ya usado en Modal.tsx)
// aunque el color en sí sea una variable. Los NOMBRES de acá (`papel`, `tinta`, etc.)
// no cambian — solo lo que apuntan — así que ningún componente necesita tocarse.
const color = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
    content: ['./src/**/*.{ts,tsx}'],
    theme: {
        colors: {
            transparent: 'transparent',
            current: 'currentColor',
            white: '#FFFFFF',
            papel: { DEFAULT: color('--color-papel'), hondo: color('--color-papel-hondo') }, // fondo de página; zonas rehundidas
            tinta: {
                DEFAULT: color('--color-tinta'),
                claro: color('--color-tinta-claro'),
                tenue: color('--color-tinta-tenue'),
            }, // texto principal, cromo oscuro
            grafito: { DEFAULT: color('--color-grafito'), claro: color('--color-grafito-claro') }, // texto secundario y terciario
            linea: { DEFAULT: color('--color-linea'), fuerte: color('--color-linea-fuerte') }, // filetes; bordes de campo
            boligrafo: {
                DEFAULT: color('--color-boligrafo'),
                hondo: color('--color-boligrafo-hondo'),
                tenue: color('--color-boligrafo-tenue'),
            }, // acción primaria, enlaces, foco
            marcador: {
                DEFAULT: color('--color-marcador'),
                hondo: color('--color-marcador-hondo'),
                tenue: color('--color-marcador-tenue'),
            }, // resaltador: SOLO el total y el ítem activo
            sello: {
                DEFAULT: color('--color-sello'),
                hondo: color('--color-sello-hondo'),
                tenue: color('--color-sello-tenue'),
            }, // destructivo, cancelada, sin stock
            visto: {
                DEFAULT: color('--color-visto'),
                hondo: color('--color-visto-hondo'),
                tenue: color('--color-visto-tenue'),
            }, // completada, pagado, en stock
            // Área de "papel simulado" de VistaPrevia.tsx/VistaPreviaPublica.tsx: representa a
            // escala la hoja física que se va a imprimir, así que se queda fija en los dos
            // temas — nunca `var()`, igual que el PDF que simula.
            vistaprevia: { fondo: '#F5F5F5', borde: '#E0E0E0', guia: '#808080' },
        },
        // Cada fuente son DOS familias encadenadas: el subconjunto `latin` primero y
        // `latin-ext` después. Ver el comentario largo en src/lib/fonts.ts.
        fontFamily: {
            display: [
                'var(--fuente-display-latin)',
                'var(--fuente-display-ext)',
                'ui-sans-serif',
                'system-ui',
                'sans-serif',
            ],
            sans: ['var(--fuente-sans-latin)', 'var(--fuente-sans-ext)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            mono: ['var(--fuente-mono-latin)', 'var(--fuente-mono-ext)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        },
        extend: {
            fontSize: {
                micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
                fino: ['0.75rem', { lineHeight: '1.125rem' }],
                base: ['0.875rem', { lineHeight: '1.375rem' }],
                cuerpo: ['1rem', { lineHeight: '1.5rem' }],
                titulo: ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
                cifra: ['2rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
                total: ['2.75rem', { lineHeight: '3rem', letterSpacing: '-0.02em' }],
            },
            // Radios y sombras completos (no solo el color) cambian por tema: el clásico es
            // anguloso con sombra dura sin difuminar ("papel apilado"); el moderno usa radios
            // generosos y sombra suave difuminada ("tarjeta flotante"). Valores reales en
            // src/app/globals.css, dos bloques :root[data-theme=...].
            borderRadius: {
                DEFAULT: 'var(--radio-default)',
                sm: 'var(--radio-sm)',
                md: 'var(--radio-md)',
                lg: 'var(--radio-lg)',
            },
            boxShadow: {
                impresa: 'var(--sombra-impresa)',
                alzada: 'var(--sombra-alzada)',
                cinta: 'var(--sombra-cinta)',
                none: 'none',
            },
            spacing: {
                renglon: '2.75rem', // 44px: altura de fila del libro rayado
                tecla: '3.5rem', // 56px: alto mínimo de tecla del teclado numérico
                cinta: '25rem', // 400px: ancho de la cinta del ticket
            },
            zIndex: { cajon: '40', capa: '50', aviso: '60' },
            transitionDuration: { avance: '120ms' },
        },
    },
    plugins: [forms],
};

export default config;
