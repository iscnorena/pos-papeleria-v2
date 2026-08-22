import type { ComponentType } from 'react';

import { t, type ClaveI18n, type Idioma } from '@/lib/i18n/nucleo';
import {
  IconoDividirPdf,
  IconoNumerarPdf,
  IconoPdf,
  IconoReordenarPdf,
  IconoRotarPdf,
  IconoUnirPdf,
} from '../iconos';

// Sub-registro de "Herramientas de PDF" (id 'pdf' en src/tools/registry.ts), mismo
// espíritu que ese archivo pero un nivel más abajo: cada entrada es una pantalla propia
// en /herramientas/pdf/<id> (y, si `tieneVersionPublica`, en /kit/pdf/<id>).
//
// Vamos agregándolas una por una, como el resto del registro. "Convertir PDF" y
// "Comprimir PDF" quedaron anotadas, pero no arrancan hasta que se decida el alcance:
// pdf-lib no soporta PDF cifrados (no hay "Desbloquear PDF" por ahora) y no trae una
// función lista para recomprimir imágenes incrustadas — cualquiera de las dos necesitaría
// traer otra librería (ej. pdf.js) antes de poder construirse.

export type EstadoSubHerramienta = 'lista' | 'proxima';

export type SubHerramientaPdf = {
  id: string; // 'unir' — también es el id que usa `tool_settings` para el interruptor público
  nombre: string;
  descripcion: string;
  icono: ComponentType;
  ruta: string; // '/herramientas/pdf/unir'
  rutaPublica: string; // '/kit/pdf/unir'
  estado: EstadoSubHerramienta;
};

export const HERRAMIENTAS_PDF: SubHerramientaPdf[] = [
  {
    id: 'unir',
    nombre: 'Unir PDF',
    descripcion: 'Junta varios PDF en uno solo, en el orden que quieras.',
    icono: IconoUnirPdf,
    ruta: '/herramientas/pdf/unir',
    rutaPublica: '/kit/pdf/unir',
    estado: 'lista',
  },
  {
    id: 'dividir',
    nombre: 'Dividir PDF',
    descripcion: 'Separa un PDF en archivos más chicos, por rango de páginas.',
    icono: IconoDividirPdf,
    ruta: '/herramientas/pdf/dividir',
    rutaPublica: '/kit/pdf/dividir',
    estado: 'lista',
  },
  {
    id: 'rotar',
    nombre: 'Rotar páginas',
    descripcion: 'Gira las páginas de un PDF, todas o solo algunas.',
    icono: IconoRotarPdf,
    ruta: '/herramientas/pdf/rotar',
    rutaPublica: '/kit/pdf/rotar',
    estado: 'lista',
  },
  {
    id: 'reordenar',
    nombre: 'Reordenar páginas',
    descripcion: 'Cambia el orden de las páginas de un PDF.',
    icono: IconoReordenarPdf,
    ruta: '/herramientas/pdf/reordenar',
    rutaPublica: '/kit/pdf/reordenar',
    estado: 'lista',
  },
  {
    id: 'numerar',
    nombre: 'Numerar páginas',
    descripcion: 'Agrega el número de página, centrado abajo, en cada hoja.',
    icono: IconoNumerarPdf,
    ruta: '/herramientas/pdf/numerar',
    rutaPublica: '/kit/pdf/numerar',
    estado: 'lista',
  },
  {
    id: 'convertir',
    nombre: 'Convertir PDF',
    descripcion: 'De imágenes a PDF, o de PDF a imágenes.',
    icono: IconoPdf,
    ruta: '/herramientas/pdf/convertir',
    rutaPublica: '/kit/pdf/convertir',
    estado: 'proxima',
  },
  {
    id: 'comprimir',
    nombre: 'Comprimir PDF',
    descripcion: 'Reduce el tamaño del archivo.',
    icono: IconoPdf,
    ruta: '/herramientas/pdf/comprimir',
    rutaPublica: '/kit/pdf/comprimir',
    estado: 'proxima',
  },
];

export function subHerramientaPdfPorId(id: string): SubHerramientaPdf | undefined {
  return HERRAMIENTAS_PDF.find((h) => h.id === id);
}

/** Candidatas a versión pública: listas (no `proxima`). La lista final la decide
 * `tool_settings`, igual que `herramientasConVersionPublica` en el registro principal. */
export function subHerramientasPdfListas(): SubHerramientaPdf[] {
  return HERRAMIENTAS_PDF.filter((h) => h.estado !== 'proxima');
}

// Mismo criterio que src/tools/registry.ts: `nombre`/`descripcion` del arreglo se quedan
// en español (dato interno), lo que se muestra sale de estos mapas + helpers.
const CLAVE_NOMBRE: Record<string, ClaveI18n> = {
  unir: 'pdf.nombreUnir',
  dividir: 'pdf.nombreDividir',
  rotar: 'pdf.nombreRotar',
  reordenar: 'pdf.nombreReordenar',
  numerar: 'pdf.nombreNumerar',
  convertir: 'pdf.nombreConvertir',
  comprimir: 'pdf.nombreComprimir',
};

const CLAVE_DESCRIPCION: Record<string, ClaveI18n> = {
  unir: 'pdf.descUnir',
  dividir: 'pdf.descDividir',
  rotar: 'pdf.descRotar',
  reordenar: 'pdf.descReordenar',
  numerar: 'pdf.descNumerar',
  convertir: 'pdf.descConvertir',
  comprimir: 'pdf.descComprimir',
};

export function nombreSubDe(id: string, idioma: Idioma): string {
  const clave = CLAVE_NOMBRE[id];
  return clave ? t(idioma, clave) : (subHerramientaPdfPorId(id)?.nombre ?? id);
}

export function descripcionSubDe(id: string, idioma: Idioma): string {
  const clave = CLAVE_DESCRIPCION[id];
  return clave ? t(idioma, clave) : (subHerramientaPdfPorId(id)?.descripcion ?? '');
}
