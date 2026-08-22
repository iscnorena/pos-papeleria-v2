import type { ComponentType } from 'react';

import type { Rol } from '@/db/schema';
import { t, type ClaveI18n, type Idioma } from '@/lib/i18n/nucleo';
import {
  IconoCalculadora,
  IconoEtiqueta,
  IconoHojas,
  IconoLibreta,
  IconoPdf,
  IconoRifa,
} from './iconos';

// §Fase 6 — registro extensible. Una herramienta se declara AQUÍ y en ningún otro sitio:
// la vitrina, la navegación y el control de acceso salen de este arreglo.
//
// Es el criterio 1 de la fase: agregar una entrada tiene que bastar.

export type EstadoHerramienta = 'lista' | 'beta' | 'proxima';

export type Herramienta = {
  id: string; // 'acomoda-impresion'
  nombre: string; // 'Acomodar impresión'
  descripcion: string; // una línea, la que se lee en la tarjeta
  icono: ComponentType; // SVG a trazo, no emoji
  ruta: string; // '/herramientas/acomoda-impresion'
  /** Solo si la herramienta también tiene versión pública, sin sesión, colgando de /kit. */
  rutaPublica?: string; // '/kit/acomoda-impresion'
  roles: Rol[]; // ['admin', 'cajera']
  estado: EstadoHerramienta;
};

export const HERRAMIENTAS: Herramienta[] = [
  {
    id: 'acomoda-impresion',
    nombre: 'Acomodar impresión',
    descripcion: 'Acomoda varias imágenes en hojas, arma el PDF y calcula cuánto cobrar.',
    icono: IconoHojas,
    ruta: '/herramientas/acomoda-impresion',
    rutaPublica: '/kit/acomoda-impresion',
    roles: ['admin', 'cajera'],
    estado: 'lista',
  },
  {
    id: 'rifas',
    nombre: 'Números de rifa',
    descripcion: 'Genera la hoja de control de una rifa: números, nombre y contacto por boleto.',
    icono: IconoRifa,
    ruta: '/herramientas/rifas',
    rutaPublica: '/kit/rifas',
    roles: ['admin', 'cajera'],
    estado: 'lista',
  },
  {
    id: 'libreta',
    nombre: 'Hoja de libreta',
    descripcion: 'Genera hojas con rayado o cuadrícula, con los datos del alumno.',
    icono: IconoLibreta,
    ruta: '/herramientas/libreta',
    rutaPublica: '/kit/libreta',
    roles: ['admin', 'cajera'],
    estado: 'lista',
  },
  {
    id: 'etiquetas',
    nombre: 'Etiquetas y códigos de barras',
    descripcion: 'Hojas de etiquetas de precio para el catálogo.',
    icono: IconoEtiqueta,
    ruta: '/herramientas/etiquetas',
    // Solo administración: imprimir etiquetas de precio es trabajo de catálogo, no de caja.
    roles: ['admin'],
    estado: 'proxima',
  },
  {
    id: 'cotizador',
    nombre: 'Cotizador de trabajos',
    descripcion: 'Copias, engargolados y enmicados, con el precio armado al momento.',
    icono: IconoCalculadora,
    ruta: '/herramientas/cotizador',
    roles: ['admin', 'cajera'],
    estado: 'proxima',
  },
  {
    id: 'pdf',
    nombre: 'Herramientas de PDF',
    descripcion: 'Unir, dividir y convertir lo que trae el cliente en la USB.',
    icono: IconoPdf,
    ruta: '/herramientas/pdf',
    rutaPublica: '/kit/pdf',
    roles: ['admin', 'cajera'],
    estado: 'lista',
  },
];

/** Las herramientas que puede ver un rol. La vitrina esconde; el servidor bloquea. */
export function herramientasDe(rol: Rol): Herramienta[] {
  return HERRAMIENTAS.filter((h) => h.roles.includes(rol));
}

export function herramientaPorId(id: string): Herramienta | undefined {
  return HERRAMIENTAS.find((h) => h.id === id);
}

/**
 * Herramientas que PODRÍAN aparecer en el índice sin sesión de /kit: tienen
 * `rutaPublica` y no están en `proxima`. No es la lista final — cada una además necesita
 * `is_public = true` en `tool_settings` (ver `src/lib/toolSettings.ts`), que el admin
 * prende o apaga desde un interruptor en su propia pantalla de /herramientas.
 */
export function herramientasConVersionPublica(): Herramienta[] {
  return HERRAMIENTAS.filter((h) => h.rutaPublica && h.estado !== 'proxima');
}

// `nombre`/`descripcion` arriba se quedan en español a propósito (son el dato "de
// verdad", código interno de identidad de la herramienta) — lo que sí cambia con el
// idioma es lo que se MUESTRA, vía estos dos mapas + helpers. Si un id no tiene clave
// (no debería pasar, cada entrada de HERRAMIENTAS trae la suya), cae al texto en español
// del registro como red de seguridad, en vez de tronar.
const CLAVE_NOMBRE: Record<string, ClaveI18n> = {
  'acomoda-impresion': 'herramientas.nombreAcomodaImpresion',
  rifas: 'herramientas.nombreRifas',
  libreta: 'herramientas.nombreLibreta',
  etiquetas: 'herramientas.nombreEtiquetas',
  cotizador: 'herramientas.nombreCotizador',
  pdf: 'herramientas.nombrePdf',
};

const CLAVE_DESCRIPCION: Record<string, ClaveI18n> = {
  'acomoda-impresion': 'herramientas.descAcomodaImpresion',
  rifas: 'herramientas.descRifas',
  libreta: 'herramientas.descLibreta',
  etiquetas: 'herramientas.descEtiquetas',
  cotizador: 'herramientas.descCotizador',
  pdf: 'herramientas.descPdf',
};

export function nombreDe(id: string, idioma: Idioma): string {
  const clave = CLAVE_NOMBRE[id];
  return clave ? t(idioma, clave) : (herramientaPorId(id)?.nombre ?? id);
}

export function descripcionDe(id: string, idioma: Idioma): string {
  const clave = CLAVE_DESCRIPCION[id];
  return clave ? t(idioma, clave) : (herramientaPorId(id)?.descripcion ?? '');
}
