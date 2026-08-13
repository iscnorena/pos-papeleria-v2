import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

// Paleta y escalas de docs/prompt.md §4. `colors` REEMPLAZA la paleta de Tailwind
// en vez de extenderla: si un color no está aquí, no se usa.
const config: Config = {
    content: ['./src/**/*.{ts,tsx}'],
    theme: {
        colors: {
            transparent: 'transparent',
            current: 'currentColor',
            white: '#FFFFFF',
            papel: { DEFAULT: '#FAF9F4', hondo: '#F1EFE7' }, // fondo de página; zonas rehundidas
            tinta: { DEFAULT: '#17212F', claro: '#243347', tenue: '#3A4A61' }, // texto principal, cromo oscuro
            grafito: { DEFAULT: '#5A6472', claro: '#8A93A1' }, // texto secundario y terciario
            linea: { DEFAULT: '#E2DFD5', fuerte: '#CFCAB9' }, // filetes; bordes de campo
            boligrafo: { DEFAULT: '#2647D6', hondo: '#1A34A8', tenue: '#EAEDFB' }, // acción primaria, enlaces, foco
            marcador: { DEFAULT: '#FFE24D', hondo: '#F0CB16', tenue: '#FFF6D1' }, // resaltador: SOLO el total y el ítem activo
            sello: { DEFAULT: '#BE3A2E', hondo: '#9A2C22', tenue: '#FBEDEB' }, // destructivo, cancelada, sin stock
            visto: { DEFAULT: '#1C7A52', hondo: '#13583A', tenue: '#E8F4EE' }, // completada, pagado, en stock
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
            borderRadius: { DEFAULT: '2px', sm: '1px', md: '3px', lg: '4px' },
            boxShadow: {
                impresa: '0 1px 0 0 #E2DFD5, 0 2px 0 0 rgba(23, 33, 47, 0.04)',
                alzada: '2px 3px 0 0 rgba(23, 33, 47, 0.10)',
                cinta: '3px 4px 0 0 rgba(23, 33, 47, 0.07)',
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
