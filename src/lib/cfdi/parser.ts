import { XMLParser, XMLValidator } from 'fast-xml-parser';

import { aCentavos, aCentesimas } from '@/lib/money';

import type { ComprobanteCfdi, ConceptoCfdi } from './tipos';

// Parseo genérico de un CFDI 4.0 de tipo Ingreso. NO sabe nada de proveedores específicos
// (eso vive en ./proveedores/*.ts) — agregar un proveedor nuevo en el futuro es agregar un
// extractor de addenda ahí, sin tocar este archivo.

export type ResultadoParseoCfdi =
  { ok: true; comprobante: ComprobanteCfdi; crudo: unknown } | { ok: false; error: string };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
  parseAttributeValue: false,
  isArray: (nombre) => nombre === 'Concepto' || nombre === 'Traslado' || nombre === 'Impuesto',
});

/** Normaliza a arreglo: fast-xml-parser solo produce arreglo si `isArray` lo marcó o si hay
 *  más de un elemento; con exactamente un hijo puede devolver el objeto suelto. */
function comoArreglo<T>(valor: T | T[] | undefined): T[] {
  if (valor === undefined) return [];
  return Array.isArray(valor) ? valor : [valor];
}

function texto(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  const s = String(valor).trim();
  return s === '' ? null : s;
}

export function parsearCfdi(xmlTexto: string): ResultadoParseoCfdi {
  const validacion = XMLValidator.validate(xmlTexto);
  if (validacion !== true) {
    return { ok: false, error: 'El archivo no es un XML válido.' };
  }

  let crudo: unknown;
  try {
    crudo = parser.parse(xmlTexto);
  } catch {
    return { ok: false, error: 'El archivo no es un XML válido.' };
  }

  const doc = crudo as Record<string, unknown>;
  const comprobanteNodo = doc.Comprobante as Record<string, unknown> | undefined;
  if (!comprobanteNodo || typeof comprobanteNodo !== 'object') {
    return { ok: false, error: 'El archivo no es un CFDI (falta el nodo Comprobante).' };
  }

  const version = texto(comprobanteNodo.Version);
  if (version !== '4.0') {
    return { ok: false, error: 'Solo se aceptan CFDI versión 4.0.' };
  }

  const tipoComprobante = texto(comprobanteNodo.TipoDeComprobante);
  if (tipoComprobante !== 'I') {
    return { ok: false, error: 'El comprobante no es de tipo Ingreso.' };
  }

  const emisorNodo = comprobanteNodo.Emisor as Record<string, unknown> | undefined;
  const rfcEmisor = texto(emisorNodo?.Rfc);
  const nombreEmisor = texto(emisorNodo?.Nombre);
  if (!emisorNodo || !rfcEmisor || !nombreEmisor) {
    return { ok: false, error: 'El CFDI no trae los datos del emisor (RFC/Nombre).' };
  }

  const complementoNodo = comprobanteNodo.Complemento as Record<string, unknown> | undefined;
  const timbreNodo = complementoNodo?.TimbreFiscalDigital as Record<string, unknown> | undefined;
  const uuid = texto(timbreNodo?.UUID);
  const fechaTimbradoTexto = texto(timbreNodo?.FechaTimbrado);
  if (!uuid || !fechaTimbradoTexto) {
    return { ok: false, error: 'Falta el Timbre Fiscal Digital (UUID) del comprobante.' };
  }

  const conceptosNodo = comprobanteNodo.Conceptos as Record<string, unknown> | undefined;
  const conceptosCrudos = comoArreglo(conceptosNodo?.Concepto as unknown);
  if (conceptosCrudos.length === 0) {
    return { ok: false, error: 'El CFDI no trae ningún concepto (línea de producto).' };
  }

  const fechaEmisionTexto = texto(comprobanteNodo.Fecha);
  if (!fechaEmisionTexto) {
    return { ok: false, error: 'El CFDI no trae fecha de emisión.' };
  }

  const subtotal = aCentavos(texto(comprobanteNodo.SubTotal));
  const total = aCentavos(texto(comprobanteNodo.Total));
  if (subtotal === null || total === null) {
    return { ok: false, error: 'El CFDI trae montos totales inválidos.' };
  }

  const conceptos: ConceptoCfdi[] = [];
  for (const c of conceptosCrudos) {
    const concepto = c as Record<string, unknown>;
    const cantidad = aCentesimas(texto(concepto.Cantidad));
    const valorUnitario = aCentavos(texto(concepto.ValorUnitario));
    const importe = aCentavos(texto(concepto.Importe));
    const descripcion = texto(concepto.Descripcion);
    const claveProdServ = texto(concepto.ClaveProdServ);
    const claveUnidad = texto(concepto.ClaveUnidad);
    if (
      cantidad === null ||
      valorUnitario === null ||
      importe === null ||
      !descripcion ||
      !claveProdServ ||
      !claveUnidad
    ) {
      return { ok: false, error: 'Una línea del CFDI trae datos incompletos o inválidos.' };
    }

    const impuestosNodo = concepto.Impuestos as Record<string, unknown> | undefined;
    const trasladosNodo = impuestosNodo?.Traslados as Record<string, unknown> | undefined;
    const traslados = comoArreglo(trasladosNodo?.Traslado as unknown);
    const primerTraslado = traslados[0] as Record<string, unknown> | undefined;
    const tasaIva = primerTraslado ? Number(texto(primerTraslado.TasaOCuota) ?? '0') : 0;
    const importeIva = primerTraslado ? (aCentavos(texto(primerTraslado.Importe)) ?? 0) : 0;

    conceptos.push({
      noIdentificacion: texto(concepto.NoIdentificacion),
      claveProdServ,
      descripcion,
      cantidad,
      claveUnidad,
      unidad: texto(concepto.Unidad),
      valorUnitario,
      importe,
      tasaIva: Number.isFinite(tasaIva) ? tasaIva : 0,
      importeIva,
    });
  }

  const comprobante: ComprobanteCfdi = {
    serie: texto(comprobanteNodo.Serie),
    folio: texto(comprobanteNodo.Folio),
    fechaEmision: new Date(fechaEmisionTexto),
    subtotal,
    total,
    moneda: texto(comprobanteNodo.Moneda) ?? 'MXN',
    tipoComprobante,
    emisor: { rfc: rfcEmisor, nombre: nombreEmisor },
    uuid,
    fechaTimbrado: new Date(fechaTimbradoTexto),
    conceptos,
  };

  return { ok: true, comprobante, crudo };
}
