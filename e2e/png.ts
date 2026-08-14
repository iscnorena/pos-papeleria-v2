import { deflateSync } from 'node:zlib';

// Genera PNG de colores planos con el tamaño exacto que pida la prueba. Hace falta porque
// varios criterios de §7.8 dependen de la PROPORCIÓN de la imagen (maximizar, girar,
// ajuste proporcional), y con una imagen cuadrada de adorno no se distinguirían.

function crc32(datos: Buffer): number {
  let c = ~0;
  for (const byte of datos) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function trozo(tipo: string, datos: Buffer): Buffer {
  const longitud = Buffer.alloc(4);
  longitud.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const suma = Buffer.alloc(4);
  suma.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([longitud, cuerpo, suma]);
}

/** Un PNG RGB de `ancho` × `alto`, relleno de un color. */
export function pngDeColor(ancho: number, alto: number, color = [200, 40, 40]): Buffer {
  const firma = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; // profundidad de bits
  ihdr[9] = 2; // color verdadero (RGB)

  // Cada fila lleva delante un byte de filtro; 0 es «sin filtro».
  const fila = Buffer.concat([
    Buffer.from([0]),
    Buffer.from(Array.from({ length: ancho }, () => color).flat()),
  ]);
  const crudo = Buffer.concat(Array.from({ length: alto }, () => fila));

  return Buffer.concat([
    firma,
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(crudo)),
    trozo('IEND', Buffer.alloc(0)),
  ]);
}

/** Lo que espera `setInputFiles` de Playwright. */
export function archivoPng(nombre: string, ancho: number, alto: number, color?: number[]) {
  return { name: nombre, mimeType: 'image/png', buffer: pngDeColor(ancho, alto, color) };
}
