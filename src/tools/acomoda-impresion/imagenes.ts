// Manejo de imágenes en el navegador. Nada de esto sube al servidor (§6, §10).
//
// §7.8 criterio 12: con 30 imágenes de 4MB la vista previa tiene que seguir respondiendo.
// De ahí la miniatura: en pantalla se dibuja una versión pequeña, y los bytes ORIGINALES
// solo se tocan al generar el PDF.

export { reordenar } from '@/lib/arreglos';

export type ImagenDelLote = {
  id: string;
  nombre: string;
  aspecto: number;
  /** Miniatura en `data:` para pintar en pantalla. */
  miniatura: string;
  /** El archivo original, intacto, para incrustarlo en el PDF. */
  archivo: Blob;
  tipo: string;
};

const LADO_MINIATURA = 400;

let contador = 0;
const siguienteId = () => `img-${Date.now()}-${contador++}`;

/**
 * Lee un archivo y devuelve su entrada del lote, con la miniatura ya generada.
 *
 * `createImageBitmap` decodifica fuera del hilo principal, que es lo que evita que la
 * página se congele al soltar treinta fotos de golpe.
 */
export async function cargarImagen(archivo: Blob, nombre: string): Promise<ImagenDelLote> {
  const bitmap = await createImageBitmap(archivo);

  const escala = Math.min(1, LADO_MINIATURA / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.max(1, Math.round(bitmap.width * escala));
  const alto = Math.max(1, Math.round(bitmap.height * escala));

  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  lienzo.getContext('2d')?.drawImage(bitmap, 0, 0, ancho, alto);

  const entrada: ImagenDelLote = {
    id: siguienteId(),
    nombre,
    aspecto: bitmap.width / bitmap.height,
    miniatura: lienzo.toDataURL('image/jpeg', 0.7),
    archivo,
    tipo: archivo.type || 'image/jpeg',
  };

  bitmap.close();
  return entrada;
}
