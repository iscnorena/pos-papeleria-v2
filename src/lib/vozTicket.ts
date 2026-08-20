import { mejoresCoincidencias, type CandidatoSimilitud } from './similitudTexto';

// Precarga de Ticket por Voz (docs/modulo-venta-por-voz.md). Extracción por reglas, no LLM
// (decisión del usuario: cero proveedor externo nuevo, cero API key). Módulo puro — no toca
// el DOM ni `SpeechRecognition`, así que se prueba con Vitest igual que `src/lib/venta.ts`.

const PALABRAS_NUMERO: Record<string, number> = {
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  dieciséis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
};

export type ItemVozExtraido = {
  /** `null` cuando el habla no incluyó cantidad — nunca se asume 1 por default (caso borde
   *  explícito de la spec: "4 libretas" grabado solo como "libretas" debe pedirse a mano,
   *  no perderse en un valor inventado). */
  cantidad: number | null;
  /** Texto restante tras quitar cantidad y la palabra "marca", listo para emparejar contra
   *  el catálogo. */
  descripcion: string;
};

function normalizarEspacios(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}

function parsearItem(textoOriginal: string): ItemVozExtraido | null {
  let resto = textoOriginal.trim();
  if (resto === '') return null;

  let cantidad: number | null = null;

  const conDigito = /^(\d+)\s+(.*)$/.exec(resto);
  if (conDigito) {
    const [, digitos, resta] = conDigito;
    cantidad = Number(digitos);
    resto = resta ?? '';
  } else {
    const primeraPalabra = resto.split(' ')[0] ?? '';
    const numero = PALABRAS_NUMERO[primeraPalabra];
    if (numero !== undefined) {
      cantidad = numero;
      resto = resto.slice(primeraPalabra.length).trim();
    }
  }

  // "marca" es ruido para el matching por similitud: "borrador marca Dixon" empareja mejor
  // contra el catálogo como "borrador Dixon".
  resto = normalizarEspacios(resto.replace(/\bmarca\b/g, ' '));
  if (resto === '') return null;

  return { cantidad, descripcion: resto };
}

/**
 * Interpreta la transcripción completa del dictado en una lista de items. El patrón más
 * común del dictado es repetir "lleva" por cada producto ("lleva un borrador…, lleva un
 * lapicero…"); si aparece más de una vez se usa como separador principal. Si el cajero dijo
 * "lleva" una sola vez seguido de una lista con comas y "y", se cae a ese separador —
 * ambas formas de hablar son igual de naturales y deben funcionar igual.
 *
 * Es un parser por reglas, no un LLM: frases que no sigan ninguno de estos dos patrones
 * pueden no separarse bien. Es la fragilidad que ya anticipa la spec a cambio de no
 * depender de ningún proveedor externo.
 */
export function extraerItemsDeVoz(transcripcion: string): ItemVozExtraido[] {
  const texto = normalizarEspacios(transcripcion.toLowerCase());
  if (texto === '') return [];

  const porLleva = texto
    .split(/\bllev[ae]\b/)
    .map((s) => s.trim())
    .filter((s) => s !== '');
  const segmentosBase = porLleva.length > 1 ? porLleva : [texto.replace(/^llev[ae]\s*/, '')];

  const items: ItemVozExtraido[] = [];
  for (const segmento of segmentosBase) {
    const partes = segmento
      .split(/,| y /)
      .map((p) => p.trim())
      .filter((p) => p !== '');
    for (const parte of partes) {
      const item = parsearItem(parte);
      if (item) items.push(item);
    }
  }
  return items;
}

export type EstadoItemVoz = 'resuelta' | 'ambigua' | 'no_reconocida';

export type ItemVozResuelto<T> = {
  cantidad: number | null;
  descripcion: string;
  estado: EstadoItemVoz;
  candidatos: CandidatoSimilitud<T>[];
};

/**
 * Extrae y empareja de un tirón: cada item dictado se busca contra `catalogo` por
 * similitud. `resuelta` solo cuando hay un candidato claramente por encima de los demás
 * (nunca se autocompleta con baja confianza — §"Nunca autocompletar el cobro" de la spec);
 * de lo contrario `ambigua` (uno o más candidatos posibles, a elegir a mano) o
 * `no_reconocida` (ninguno).
 */
export function resolverItemsDeVoz<T>(
  transcripcion: string,
  catalogo: T[],
  clave: (item: T) => string,
  opciones: { umbralResuelta?: number; umbralAmbigua?: number; candidatosMaximos?: number } = {},
): ItemVozResuelto<T>[] {
  const { umbralResuelta = 0.5, umbralAmbigua = 0.2, candidatosMaximos = 4 } = opciones;

  return extraerItemsDeVoz(transcripcion).map((item) => {
    const candidatos = mejoresCoincidencias(item.descripcion, catalogo, clave, {
      limite: candidatosMaximos,
      umbral: umbralAmbigua,
    });

    const [mejor, segundo] = candidatos;
    const clara =
      mejor !== undefined &&
      mejor.similitud >= umbralResuelta &&
      (segundo === undefined || mejor.similitud - segundo.similitud >= 0.15);

    const estado: EstadoItemVoz =
      candidatos.length === 0 ? 'no_reconocida' : clara ? 'resuelta' : 'ambigua';

    return { cantidad: item.cantidad, descripcion: item.descripcion, estado, candidatos };
  });
}
