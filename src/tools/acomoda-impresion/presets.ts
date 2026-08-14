import { CONFIG_POR_DEFECTO, type Config, type Orientacion, type Papel } from './layout-engine';

// §7.5 — presets. El formato del archivo `.json` es EXACTAMENTE el de la app de escritorio,
// con sus nombres en inglés y su capitalización, para que los presets que ya existen en el
// negocio sigan sirviendo. Por eso este módulo traduce en las dos direcciones en vez de
// guardar la configuración tal cual.

export type PresetArchivo = {
  PresetName: string;
  Rows: number;
  Columns: number;
  MarginTop: number;
  MarginBottom: number;
  MarginLeft: number;
  MarginRight: number;
  Spacing: number;
  PaperSize: string;
  Orientation: string;
  Dpi: number;
  ShowCutGuides: boolean;
  RotateImages: boolean;
  MaximizeImages: boolean;
  UseCustomImageSize: boolean;
  CustomImageWidthCm: number;
  CustomImageHeightCm: number;
};

export function aPreset(config: Config, nombre: string): PresetArchivo {
  return {
    PresetName: nombre,
    Rows: config.filas,
    Columns: config.columnas,
    MarginTop: config.margenSup,
    MarginBottom: config.margenInf,
    MarginLeft: config.margenIzq,
    MarginRight: config.margenDer,
    Spacing: config.espaciado,
    PaperSize: config.papel,
    Orientation: config.orientacion,
    Dpi: config.dpi,
    ShowCutGuides: config.mostrarGuias,
    RotateImages: config.rotar,
    MaximizeImages: config.maximizar,
    UseCustomImageSize: config.usarTamanoFijo,
    CustomImageWidthCm: config.anchoFijoCm,
    CustomImageHeightCm: config.altoFijoCm,
  };
}

const PAPELES_VALIDOS: Papel[] = ['Carta', 'Oficio', 'A4'];
const ORIENTACIONES_VALIDAS: Orientacion[] = ['Vertical', 'Horizontal'];

function numero(valor: unknown, porDefecto: number): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : porDefecto;
}

function booleano(valor: unknown, porDefecto: boolean): boolean {
  return typeof valor === 'boolean' ? valor : porDefecto;
}

/**
 * Lee un preset. Cada campo que falte o venga mal cae en su valor por defecto en vez de
 * romper: un archivo hecho por otra versión de la app de escritorio tiene que cargar igual,
 * aunque le falte algo.
 */
export function desdePreset(crudo: unknown): { config: Config; nombre: string } {
  const p = (crudo ?? {}) as Partial<PresetArchivo>;

  const papel = PAPELES_VALIDOS.includes(p.PaperSize as Papel)
    ? (p.PaperSize as Papel)
    : CONFIG_POR_DEFECTO.papel;

  const orientacion = ORIENTACIONES_VALIDAS.includes(p.Orientation as Orientacion)
    ? (p.Orientation as Orientacion)
    : CONFIG_POR_DEFECTO.orientacion;

  return {
    nombre: typeof p.PresetName === 'string' && p.PresetName ? p.PresetName : 'Sin nombre',
    config: {
      // Filas y columnas se acotan: un preset con 0 filas dividiría entre cero.
      filas: Math.max(1, Math.round(numero(p.Rows, CONFIG_POR_DEFECTO.filas))),
      columnas: Math.max(1, Math.round(numero(p.Columns, CONFIG_POR_DEFECTO.columnas))),
      papel,
      orientacion,
      margenSup: numero(p.MarginTop, CONFIG_POR_DEFECTO.margenSup),
      margenInf: numero(p.MarginBottom, CONFIG_POR_DEFECTO.margenInf),
      margenIzq: numero(p.MarginLeft, CONFIG_POR_DEFECTO.margenIzq),
      margenDer: numero(p.MarginRight, CONFIG_POR_DEFECTO.margenDer),
      espaciado: numero(p.Spacing, CONFIG_POR_DEFECTO.espaciado),
      dpi: numero(p.Dpi, CONFIG_POR_DEFECTO.dpi),
      mostrarGuias: booleano(p.ShowCutGuides, CONFIG_POR_DEFECTO.mostrarGuias),
      rotar: booleano(p.RotateImages, CONFIG_POR_DEFECTO.rotar),
      maximizar: booleano(p.MaximizeImages, CONFIG_POR_DEFECTO.maximizar),
      usarTamanoFijo: booleano(p.UseCustomImageSize, CONFIG_POR_DEFECTO.usarTamanoFijo),
      anchoFijoCm: numero(p.CustomImageWidthCm, CONFIG_POR_DEFECTO.anchoFijoCm),
      altoFijoCm: numero(p.CustomImageHeightCm, CONFIG_POR_DEFECTO.altoFijoCm),
    },
  };
}

// ── Almacenamiento local ───────────────────────────────────────────────────────────
// Los presets y los precios son de ESTE equipo, no del negocio (§7.2), así que viven en
// `localStorage` y no en la base.

const CLAVE_PRESETS = 'acomoda-impresion.presets';

export function leerPresets(): Record<string, PresetArchivo> {
  if (typeof window === 'undefined') return {};
  try {
    const crudo = window.localStorage.getItem(CLAVE_PRESETS);
    return crudo ? (JSON.parse(crudo) as Record<string, PresetArchivo>) : {};
  } catch {
    // Un `localStorage` corrupto no debe tumbar la herramienta.
    return {};
  }
}

export function guardarPreset(nombre: string, config: Config): void {
  const presets = leerPresets();
  presets[nombre] = aPreset(config, nombre);
  window.localStorage.setItem(CLAVE_PRESETS, JSON.stringify(presets));
}

export function borrarPreset(nombre: string): void {
  const presets = leerPresets();
  delete presets[nombre];
  window.localStorage.setItem(CLAVE_PRESETS, JSON.stringify(presets));
}
