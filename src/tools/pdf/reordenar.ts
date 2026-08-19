import { PDFDocument } from 'pdf-lib';

// Todo ocurre en el navegador con pdf-lib, igual que el resto de las herramientas de
// impresión del proyecto: el PDF del cliente nunca sube a ningún servidor.

/**
 * "3, 1, 2" → [3, 1, 2]. A diferencia de los rangos de Dividir/Rotar, aquí cada página
 * tiene que aparecer EXACTAMENTE una vez: es el nuevo orden completo, no un subconjunto.
 */
export function analizarOrden(texto: string, totalPaginas: number): number[] {
  const partes = texto
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (partes.length !== totalPaginas) {
    throw new Error(
      `Tienes que listar las ${totalPaginas} páginas, ni una de más ni de menos (van ${partes.length}).`,
    );
  }

  const numeros = partes.map((parte) => {
    const numero = Number(parte);
    if (!Number.isInteger(numero) || numero < 1 || numero > totalPaginas) {
      throw new Error(`"${parte}" no es una página válida (debe ser de 1 a ${totalPaginas}).`);
    }
    return numero;
  });

  if (new Set(numeros).size !== numeros.length) {
    throw new Error('Cada página debe aparecer una sola vez.');
  }

  return numeros;
}

/** El orden actual, tal cual: "1, 2, 3, ...". Útil para precargar el campo y que el
 * usuario solo mueva las que quiere, en vez de escribir todo desde cero. */
export function textoOrdenActual(totalPaginas: number): string {
  return Array.from({ length: totalPaginas }, (_, i) => i + 1).join(', ');
}

/** El orden invertido: "N, N-1, ..., 1" — el caso más común (un escáner dúplex que
 * entregó las hojas al revés). */
export function textoOrdenInvertido(totalPaginas: number): string {
  return Array.from({ length: totalPaginas }, (_, i) => totalPaginas - i).join(', ');
}

/** Reordena las páginas de un PDF según `orden` (números de página 1-indexados). */
export async function reordenarPdf(bytes: Uint8Array, orden: number[]): Promise<Uint8Array> {
  const documento = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const nuevo = await PDFDocument.create();

  const indices = orden.map((n) => n - 1);
  const paginas = await nuevo.copyPages(documento, indices);
  for (const pagina of paginas) nuevo.addPage(pagina);

  return nuevo.save();
}
