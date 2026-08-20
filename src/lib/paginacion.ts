import { PAGINACION } from '@/config/pos';

// Paginación por GET en los listados administrativos: la página queda en la URL (se puede
// recargar, compartir, volver atrás), igual que los demás filtros del sistema
// (`FiltrosFecha`, búsqueda de inventario, etc.). Módulo puro, sin tocar la base.

/** Número de página desde un query param de texto. Nunca menor a 1, nunca fraccionario. */
export function paginaDeBusqueda(valor: string | undefined): number {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function offsetDePagina(pagina: number, porPagina: number = PAGINACION.porPagina): number {
  return (pagina - 1) * porPagina;
}

/** Al menos 1: una lista vacía sigue siendo "página 1 de 1", no "de 0". */
export function totalDePaginas(
  totalFilas: number,
  porPagina: number = PAGINACION.porPagina,
): number {
  return Math.max(1, Math.ceil(totalFilas / porPagina));
}
