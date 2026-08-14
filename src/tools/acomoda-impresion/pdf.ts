import { PDFDocument, rgb, degrees } from 'pdf-lib';

import {
  celdasDePagina,
  tamanoPagina,
  totalPaginas,
  type Config,
  type Imagen,
} from './layout-engine';

// §6 y §7.1 — el PDF se arma EN EL NAVEGADOR con pdf-lib, incrustando las imágenes
// originales. Las imágenes nunca suben al servidor.
//
// Este módulo consume `celdasDePagina`, el mismo arreglo que pinta la vista previa. Es la
// regla que §10 marca en mayúsculas: no duplicar la lógica de retícula. Aquí solo se
// traduce de coordenadas de pantalla (origen arriba-izquierda) a las del PDF (abajo-izquierda).

export type ImagenParaPdf = Imagen & {
  /** Los bytes del archivo ORIGINAL, no de la miniatura. */
  bytes: Uint8Array;
  tipo: string;
};

const GRIS_CELDA_VACIA = rgb(0xf5 / 255, 0xf5 / 255, 0xf5 / 255);
const GRIS_BORDE_VACIO = rgb(0xe0 / 255, 0xe0 / 255, 0xe0 / 255);
const GRIS_GUIA = rgb(0.5, 0.5, 0.5);

export async function generarPdf(config: Config, imagenes: ImagenParaPdf[]): Promise<Uint8Array> {
  const documento = await PDFDocument.create();
  const { ancho: anchoPagina, alto: altoPagina } = tamanoPagina(config);

  // Cada imagen se incrusta UNA vez aunque aparezca en varias celdas: incrustarla por celda
  // multiplicaría el tamaño del archivo.
  const incrustadas = new Map<string, Awaited<ReturnType<typeof documento.embedJpg>>>();
  for (const imagen of imagenes) {
    const esPng = imagen.tipo.includes('png');
    incrustadas.set(
      imagen.id,
      esPng ? await documento.embedPng(imagen.bytes) : await documento.embedJpg(imagen.bytes),
    );
  }

  const paginas = totalPaginas(config, imagenes.length);

  for (let numero = 0; numero < paginas; numero++) {
    const pagina = documento.addPage([anchoPagina, altoPagina]);
    const celdas = celdasDePagina(config, imagenes, numero);

    for (const { celda, imagen, imagenId, rotada } of celdas) {
      // El PDF cuenta la Y desde abajo; la retícula, desde arriba.
      const yPdf = (rect: { y: number; alto: number }) => altoPagina - rect.y - rect.alto;

      if (!imagen || !imagenId) {
        // Celda sobrante: fondo #F5F5F5 y borde #E0E0E0 (§7.1).
        pagina.drawRectangle({
          x: celda.x,
          y: yPdf(celda),
          width: celda.ancho,
          height: celda.alto,
          color: GRIS_CELDA_VACIA,
          borderColor: GRIS_BORDE_VACIO,
          borderWidth: 0.5,
        });
        continue;
      }

      const incrustada = incrustadas.get(imagenId);
      if (incrustada) {
        if (rotada) {
          // Giro de 90° sobre el centro de la imagen. pdf-lib rota alrededor del origen del
          // dibujo, así que el origen se recoloca para que el centro no se mueva.
          const cx = imagen.x + imagen.ancho / 2;
          const cy = yPdf(imagen) + imagen.alto / 2;
          pagina.drawImage(incrustada, {
            x: cx + imagen.alto / 2,
            y: cy - imagen.ancho / 2,
            width: imagen.ancho,
            height: imagen.alto,
            rotate: degrees(90),
          });
        } else {
          pagina.drawImage(incrustada, {
            x: imagen.x,
            y: yPdf(imagen),
            width: imagen.ancho,
            height: imagen.alto,
          });
        }
      }

      if (config.mostrarGuias) {
        // Guía de corte: borde punteado de LA CELDA, no de la imagen. Grosor 0.5 en el PDF
        // (en pantalla es 1). El patrón de guiones es `4 2`, como el original.
        pagina.drawRectangle({
          x: celda.x,
          y: yPdf(celda),
          width: celda.ancho,
          height: celda.alto,
          borderColor: GRIS_GUIA,
          borderWidth: 0.5,
          borderDashArray: [4, 2],
        });
      }
    }

    // Las guías de las celdas vacías también se dibujan, para poder cortar la hoja entera.
    if (config.mostrarGuias) {
      for (const { celda, imagen } of celdas) {
        if (imagen) continue;
        pagina.drawRectangle({
          x: celda.x,
          y: altoPagina - celda.y - celda.alto,
          width: celda.ancho,
          height: celda.alto,
          borderColor: GRIS_GUIA,
          borderWidth: 0.5,
          borderDashArray: [4, 2],
        });
      }
    }
  }

  return documento.save();
}
