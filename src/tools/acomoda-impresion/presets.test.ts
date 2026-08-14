import { describe, expect, it } from 'vitest';

import { CONFIG_POR_DEFECTO, type Config } from './layout-engine';
import { aPreset, desdePreset } from './presets';

// §7.5 — el formato del archivo es el de la app de escritorio y no se puede cambiar: los
// presets que el negocio ya tiene guardados deben seguir cargando.

const PRESET_DE_ESCRITORIO = {
  PresetName: 'Sin nombre',
  Rows: 1,
  Columns: 1,
  MarginTop: 0.0,
  MarginBottom: 0.0,
  MarginLeft: 0.0,
  MarginRight: 0.0,
  Spacing: 0.1,
  PaperSize: 'Carta',
  Orientation: 'Horizontal',
  Dpi: 300,
  ShowCutGuides: true,
  RotateImages: false,
  MaximizeImages: true,
  UseCustomImageSize: false,
  CustomImageWidthCm: 5.0,
  CustomImageHeightCm: 5.0,
};

describe('formato de archivo', () => {
  it('exporta exactamente las 17 claves del original, con sus nombres', () => {
    const preset = aPreset(CONFIG_POR_DEFECTO, 'Sin nombre');
    expect(Object.keys(preset).sort()).toEqual(Object.keys(PRESET_DE_ESCRITORIO).sort());
    expect(preset).toEqual(PRESET_DE_ESCRITORIO);
  });

  it('carga un archivo exportado por la app de escritorio', () => {
    // Criterio 8 de §7.8, segunda mitad.
    const { config, nombre } = desdePreset(PRESET_DE_ESCRITORIO);
    expect(nombre).toBe('Sin nombre');
    expect(config).toEqual(CONFIG_POR_DEFECTO);
  });

  it('ida y vuelta no pierde nada', () => {
    const original: Config = {
      ...CONFIG_POR_DEFECTO,
      filas: 3,
      columnas: 3,
      papel: 'Oficio',
      orientacion: 'Vertical',
      margenIzq: 0.25,
      margenDer: 0.35,
      margenSup: 0.45,
      margenInf: 0.55,
      espaciado: 0.2,
      dpi: 600,
      mostrarGuias: false,
      rotar: true,
      maximizar: false,
      usarTamanoFijo: true,
      anchoFijoCm: 7.5,
      altoFijoCm: 10.25,
    };

    expect(desdePreset(aPreset(original, 'Mi preset')).config).toEqual(original);
    expect(desdePreset(aPreset(original, 'Mi preset')).nombre).toBe('Mi preset');
  });
});

describe('tolerancia con archivos incompletos', () => {
  it('lo que falta cae en su valor por defecto en vez de romper', () => {
    const { config } = desdePreset({ Rows: 2, Columns: 3 });
    expect(config.filas).toBe(2);
    expect(config.columnas).toBe(3);
    expect(config.espaciado).toBe(CONFIG_POR_DEFECTO.espaciado);
    expect(config.papel).toBe(CONFIG_POR_DEFECTO.papel);
  });

  it('un papel u orientación desconocidos caen en el valor por defecto', () => {
    const { config } = desdePreset({ PaperSize: 'Tabloide', Orientation: 'Diagonal' });
    expect(config.papel).toBe('Carta');
    expect(config.orientacion).toBe('Horizontal');
  });

  it('cero filas se acota a una: dividir entre cero rompería la retícula', () => {
    expect(desdePreset({ Rows: 0, Columns: -3 }).config.filas).toBe(1);
    expect(desdePreset({ Rows: 0, Columns: -3 }).config.columnas).toBe(1);
  });

  it('un archivo vacío o basura da la configuración por defecto', () => {
    expect(desdePreset({}).config).toEqual(CONFIG_POR_DEFECTO);
    expect(desdePreset(null).config).toEqual(CONFIG_POR_DEFECTO);
    expect(desdePreset('no soy un preset').config).toEqual(CONFIG_POR_DEFECTO);
  });
});
