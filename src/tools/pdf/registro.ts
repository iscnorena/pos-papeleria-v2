import type { ComponentType } from 'react';

import { IconoDividirPdf, IconoPdf, IconoUnirPdf } from '../iconos';

// Sub-registro de "Herramientas de PDF" (id 'pdf' en src/tools/registry.ts), mismo
// espíritu que ese archivo pero un nivel más abajo: cada entrada es una pantalla propia
// en /herramientas/pdf/<id> (y, si `tieneVersionPublica`, en /imprimir/pdf/<id>).
//
// Vamos agregándolas una por una, como el resto del registro — "Unir PDF" y "Dividir PDF"
// ya están. "Convertir PDF" y "Comprimir PDF" quedaron anotadas, pero no arrancan hasta
// que se decida el alcance: pdf-lib no soporta PDF cifrados (no hay "Desbloquear PDF" por
// ahora) y no trae una función lista para recomprimir imágenes incrustadas — cualquiera de
// las dos necesitaría traer otra librería (ej. pdf.js) antes de poder construirse.

export type EstadoSubHerramienta = 'lista' | 'proxima';

export type SubHerramientaPdf = {
  id: string; // 'unir' — también es el id que usa `tool_settings` para el interruptor público
  nombre: string;
  descripcion: string;
  icono: ComponentType;
  ruta: string; // '/herramientas/pdf/unir'
  rutaPublica: string; // '/imprimir/pdf/unir'
  estado: EstadoSubHerramienta;
};

export const HERRAMIENTAS_PDF: SubHerramientaPdf[] = [
  {
    id: 'unir',
    nombre: 'Unir PDF',
    descripcion: 'Junta varios PDF en uno solo, en el orden que quieras.',
    icono: IconoUnirPdf,
    ruta: '/herramientas/pdf/unir',
    rutaPublica: '/imprimir/pdf/unir',
    estado: 'lista',
  },
  {
    id: 'dividir',
    nombre: 'Dividir PDF',
    descripcion: 'Separa un PDF en archivos más chicos, por rango de páginas.',
    icono: IconoDividirPdf,
    ruta: '/herramientas/pdf/dividir',
    rutaPublica: '/imprimir/pdf/dividir',
    estado: 'lista',
  },
  {
    id: 'convertir',
    nombre: 'Convertir PDF',
    descripcion: 'De imágenes a PDF, o de PDF a imágenes.',
    icono: IconoPdf,
    ruta: '/herramientas/pdf/convertir',
    rutaPublica: '/imprimir/pdf/convertir',
    estado: 'proxima',
  },
  {
    id: 'comprimir',
    nombre: 'Comprimir PDF',
    descripcion: 'Reduce el tamaño del archivo.',
    icono: IconoPdf,
    ruta: '/herramientas/pdf/comprimir',
    rutaPublica: '/imprimir/pdf/comprimir',
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
