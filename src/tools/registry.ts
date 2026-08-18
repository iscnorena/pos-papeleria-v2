import type { ComponentType } from 'react';

import type { Rol } from '@/db/schema';
import { IconoCalculadora, IconoEtiqueta, IconoHojas, IconoPdf, IconoRifa } from './iconos';

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
  /** Solo si la herramienta también tiene versión pública, sin sesión, colgando de /imprimir. */
  rutaPublica?: string; // '/imprimir/acomoda-impresion'
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
    rutaPublica: '/imprimir/acomoda-impresion',
    roles: ['admin', 'cajera'],
    estado: 'lista',
  },
  {
    id: 'rifas',
    nombre: 'Números de rifa',
    descripcion: 'Genera la hoja de control de una rifa: números, nombre y contacto por boleto.',
    icono: IconoRifa,
    ruta: '/herramientas/rifas',
    rutaPublica: '/imprimir/rifas',
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
    roles: ['admin', 'cajera'],
    estado: 'proxima',
  },
];

/** Las herramientas que puede ver un rol. La vitrina esconde; el servidor bloquea. */
export function herramientasDe(rol: Rol): Herramienta[] {
  return HERRAMIENTAS.filter((h) => h.roles.includes(rol));
}

export function herramientaPorId(id: string): Herramienta | undefined {
  return HERRAMIENTAS.find((h) => h.id === id);
}

/** Las herramientas con versión pública, para el índice sin sesión de /imprimir. */
export function herramientasPublicas(): Herramienta[] {
  return HERRAMIENTAS.filter((h) => h.rutaPublica && h.estado !== 'proxima');
}
