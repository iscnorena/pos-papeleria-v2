import type { AddendaTony } from '../tipos';

// Addenda propietaria de Super Papelerías Tony (`bovadd:BOVEDAFISCAL`), opcional pero útil
// como referencia adicional de conciliación (docs/modulo-recepcion-mercancia-xml.md). Se
// extrae del árbol crudo que devuelve `parsearCfdi` — no vuelve a parsear el XML.
//
// Agregar un proveedor nuevo con addenda propia = un archivo más aquí (ej. `otro.ts`), sin
// tocar el parser genérico de `../parser.ts`.

function texto(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  const s = String(valor).trim();
  return s === '' ? null : s;
}

export function extraerAddendaTony(crudo: unknown): AddendaTony | null {
  const doc = crudo as Record<string, unknown>;
  const comprobante = doc.Comprobante as Record<string, unknown> | undefined;
  const addenda = comprobante?.Addenda as Record<string, unknown> | undefined;
  const boveda = addenda?.BOVEDAFISCAL as Record<string, unknown> | undefined;
  if (!boveda) return null;

  return {
    tipoDoctoElectronico: texto(boveda.TipoDoctoElectronico),
    almacen: texto(boveda.almacen),
    condicion: texto(boveda.condicion),
    transaccion: texto(boveda.TR),
  };
}
