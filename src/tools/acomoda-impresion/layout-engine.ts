// §7.1 de la Fase 7 — EL punto crítico del port.
//
// Un solo módulo puro que, dada la configuración y la lista de imágenes, devuelve para una
// página los rectángulos ya calculados. La vista previa en pantalla y el PDF consumen ESTE
// MISMO arreglo, cambiando solo la escala. Si el cálculo se duplicara, la vista previa y el
// PDF se desincronizarían y el cliente pagaría por hojas distintas a las que vio (§10).
//
// UNIDADES: el original trabaja en 1/96 de pulgada, y el píxel CSS es exactamente lo mismo,
// así que las fórmulas se copian tal cual:
//
//     px = pulgadas × 96
//     px = cm × (96 / 2.54)

export const PX_POR_PULGADA = 96;
export const PX_POR_CM = 96 / 2.54;

export const pulgadasAPx = (pulgadas: number) => pulgadas * PX_POR_PULGADA;
export const cmAPx = (cm: number) => cm * PX_POR_CM;

export type Papel = 'Carta' | 'Oficio' | 'A4';
export type Orientacion = 'Vertical' | 'Horizontal';

/** Tamaños en PULGADAS, como el original. A4 es la mejora sugerida por §7.1. */
export const PAPELES: Record<Papel, { ancho: number; alto: number }> = {
  Carta: { ancho: 8.5, alto: 11.0 },
  Oficio: { ancho: 8.5, alto: 13.0 },
  A4: { ancho: 21.0 / 2.54, alto: 29.7 / 2.54 },
};

export type Config = {
  filas: number;
  columnas: number;
  papel: Papel;
  orientacion: Orientacion;
  /** Márgenes y espaciado en PULGADAS. */
  margenIzq: number;
  margenDer: number;
  margenSup: number;
  margenInf: number;
  espaciado: number;
  dpi: number;
  mostrarGuias: boolean;
  rotar: boolean;
  maximizar: boolean;
  usarTamanoFijo: boolean;
  /** Tamaño fijo en CENTÍMETROS, como lo pide el original. */
  anchoFijoCm: number;
  altoFijoCm: number;
};

export type Imagen = {
  id: string;
  /** Proporción ancho/alto de la imagen original. */
  aspecto: number;
};

export type Rect = { x: number; y: number; ancho: number; alto: number };

export type Celda = {
  celda: Rect;
  imagen: Rect | null;
  imagenId: string | null;
  rotada: boolean;
  /** `object-fit: fill` cuando es true; `contain` cuando es false. */
  deformar: boolean;
};

/** §7.3 — valores por defecto, copiados del original. */
export const CONFIG_POR_DEFECTO: Config = {
  filas: 1,
  columnas: 1,
  papel: 'Carta',
  orientacion: 'Horizontal',
  margenIzq: 0,
  margenDer: 0,
  margenSup: 0,
  margenInf: 0,
  espaciado: 0.1,
  dpi: 300,
  mostrarGuias: true,
  rotar: false,
  maximizar: true,
  usarTamanoFijo: false,
  anchoFijoCm: 5.0,
  altoFijoCm: 5.0,
};

/** Tamaño de la página en px, ya con la orientación aplicada. */
export function tamanoPagina(config: Config): { ancho: number; alto: number } {
  const { ancho, alto } = PAPELES[config.papel];
  // Horizontal intercambia ancho y alto (§7.1).
  const [a, b] = config.orientacion === 'Horizontal' ? [alto, ancho] : [ancho, alto];
  return { ancho: pulgadasAPx(a), alto: pulgadasAPx(b) };
}

export const celdasPorPagina = (config: Config) => config.filas * config.columnas;

export function totalPaginas(config: Config, totalImagenes: number): number {
  const porPagina = celdasPorPagina(config);
  if (porPagina <= 0) return 1;
  return Math.max(1, Math.ceil(totalImagenes / porPagina));
}

/**
 * Si al cambiar de layout la página actual queda fuera de rango, se ajusta a la última
 * válida (§7.1). Las páginas van desde 0.
 */
export function paginaValida(config: Config, totalImagenes: number, pagina: number): number {
  return Math.min(Math.max(0, pagina), totalPaginas(config, totalImagenes) - 1);
}

/**
 * Coloca la imagen dentro de su celda. Los tres modos se evalúan en ESTE orden de
 * prioridad (§7.1), que no es negociable:
 *
 *   1. `usarTamanoFijo` → tamaño fijo en cm, centrado y deformado.
 *   2. `maximizar`      → llena la celda entera, deformado. Es el default.
 *   3. ninguno          → ajuste proporcional centrado.
 *
 * Que los modos 1 y 2 deformen la imagen NO es un error: es el comportamiento del original
 * (`Stretch.Fill`) y el negocio lo usa así (§7.1).
 */
function colocarImagen(
  config: Config,
  celda: Rect,
  aspectoImagen: number,
): { rect: Rect; deformar: boolean } {
  if (config.usarTamanoFijo) {
    const ancho = cmAPx(config.anchoFijoCm);
    const alto = cmAPx(config.altoFijoCm);
    return {
      rect: {
        x: celda.x + (celda.ancho - ancho) / 2,
        y: celda.y + (celda.alto - alto) / 2,
        ancho,
        alto,
      },
      deformar: true,
    };
  }

  if (config.maximizar) {
    return { rect: { ...celda }, deformar: true };
  }

  // Ajuste proporcional centrado. Al girar, el aspecto usado en la fórmula se invierte.
  const aspecto = config.rotar ? 1 / aspectoImagen : aspectoImagen;
  const aspectoCelda = celda.ancho / celda.alto;

  let ancho: number;
  let alto: number;
  if (aspecto > aspectoCelda) {
    ancho = celda.ancho;
    alto = celda.ancho / aspecto;
  } else {
    alto = celda.alto;
    ancho = celda.alto * aspecto;
  }

  return {
    rect: {
      x: celda.x + (celda.ancho - ancho) / 2,
      y: celda.y + (celda.alto - alto) / 2,
      ancho,
      alto,
    },
    deformar: false,
  };
}

/**
 * Las celdas de una página, con la imagen que va en cada una ya colocada.
 *
 * Las celdas se generan POR FILAS (fila 0 completa, luego fila 1…): ese orden decide en qué
 * celda cae cada imagen (§7.1). Las sobrantes de la última hoja vuelven con `imagen: null`,
 * y quien dibuja las pinta vacías.
 */
export function celdasDePagina(config: Config, imagenes: Imagen[], pagina: number): Celda[] {
  const { ancho: anchoPagina, alto: altoPagina } = tamanoPagina(config);
  const { filas, columnas, espaciado } = config;

  const espaciadoPx = pulgadasAPx(espaciado);
  const anchoDisponible =
    anchoPagina -
    pulgadasAPx(config.margenIzq) -
    pulgadasAPx(config.margenDer) -
    espaciadoPx * (columnas - 1);
  const altoDisponible =
    altoPagina -
    pulgadasAPx(config.margenSup) -
    pulgadasAPx(config.margenInf) -
    espaciadoPx * (filas - 1);

  const anchoCelda = anchoDisponible / columnas;
  const altoCelda = altoDisponible / filas;

  const porPagina = celdasPorPagina(config);
  const indiceInicial = pagina * porPagina;

  const celdas: Celda[] = [];
  for (let fila = 0; fila < filas; fila++) {
    for (let columna = 0; columna < columnas; columna++) {
      const rectCelda: Rect = {
        x: pulgadasAPx(config.margenIzq) + columna * (anchoCelda + espaciadoPx),
        y: pulgadasAPx(config.margenSup) + fila * (altoCelda + espaciadoPx),
        ancho: anchoCelda,
        alto: altoCelda,
      };

      const imagen = imagenes[indiceInicial + fila * columnas + columna];

      if (!imagen) {
        celdas.push({
          celda: rectCelda,
          imagen: null,
          imagenId: null,
          rotada: false,
          deformar: false,
        });
        continue;
      }

      const colocada = colocarImagen(config, rectCelda, imagen.aspecto);
      celdas.push({
        celda: rectCelda,
        imagen: colocada.rect,
        imagenId: imagen.id,
        rotada: config.rotar,
        deformar: colocada.deformar,
      });
    }
  }

  return celdas;
}

/**
 * §7.7 — el original no valida que el tamaño fijo quepa en la celda: con 20cm en una celda
 * de 5cm la imagen se desborda en silencio. Aquí se avisa.
 */
export function tamanoFijoDesborda(config: Config): boolean {
  if (!config.usarTamanoFijo) return false;
  const celdas = celdasDePagina(config, [{ id: 'medida', aspecto: 1 }], 0);
  const celda = celdas[0]?.celda;
  if (!celda) return false;
  return (
    cmAPx(config.anchoFijoCm) > celda.ancho + 0.01 || cmAPx(config.altoFijoCm) > celda.alto + 0.01
  );
}
