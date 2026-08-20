// Tipos del resultado de parsear un CFDI 4.0 (docs/modulo-recepcion-mercancia-xml.md).
// Dinero en centavos, cantidades en centésimas — misma convención que el resto del
// sistema (§2 de src/lib/money.ts). `tasaIva` es una fracción (0.16), no centavos.

export type ConceptoCfdi = {
  /** NoIdentificacion: código interno del producto en el proveedor. Null si no viene. */
  noIdentificacion: string | null;
  /** ClaveProdServ: clasificación fiscal SAT. Informativo, nunca para matching. */
  claveProdServ: string;
  descripcion: string;
  /** Centésimas. */
  cantidad: number;
  claveUnidad: string;
  unidad: string | null;
  /** Centavos, antes de impuesto. */
  valorUnitario: number;
  /** Centavos. */
  importe: number;
  /** Fracción (0.16 = 16%). 0 si el concepto no trae IVA trasladado. */
  tasaIva: number;
  /** Centavos. */
  importeIva: number;
};

export type ComprobanteCfdi = {
  serie: string | null;
  folio: string | null;
  fechaEmision: Date;
  /** Centavos. */
  subtotal: number;
  /** Centavos. */
  total: number;
  moneda: string;
  tipoComprobante: string;
  emisor: { rfc: string; nombre: string };
  uuid: string;
  fechaTimbrado: Date;
  conceptos: ConceptoCfdi[];
};

export type AddendaTony = {
  tipoDoctoElectronico: string | null;
  almacen: string | null;
  condicion: string | null;
  /** TR: número de transacción interno de Tony. */
  transaccion: string | null;
};
