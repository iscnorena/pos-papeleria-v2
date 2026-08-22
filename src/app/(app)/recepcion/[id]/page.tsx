import { notFound } from 'next/navigation';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { Distintivo } from '@/components/ui/Distintivo';
import { db } from '@/db';
import {
  goodsReceiptItems,
  goodsReceipts,
  productCategories,
  productSuppliers,
  products,
  suppliers,
  users,
  type OrigenRecepcion,
} from '@/db/schema';
import { costoVarioSignificativamente } from '@/lib/costeo';
import { momento } from '@/lib/formato';
import { obtenerIdioma, t, type ClaveI18n } from '@/lib/i18n/servidor';
import { aCentavos, formatear } from '@/lib/money';
import { requerirSesion } from '@/lib/sesion';
import { AccionesRecepcion } from './AccionesRecepcion';
import { ResolverLineas, type LineaRecepcion } from './ResolverLineas';

const ESTADO_TONO = { draft: 'marcador', authorized: 'visto', discarded: 'sello' } as const;
const ESTADO_TEXTO: Record<'draft' | 'authorized' | 'discarded', ClaveI18n> = {
  draft: 'recepcion.borrador',
  authorized: 'recepcion.autorizada',
  discarded: 'recepcion.descartada',
};
const ORIGEN_TEXTO: Record<OrigenRecepcion, ClaveI18n> = {
  xml: 'recepcion.origenImportadaXml',
  manual: 'recepcion.origenCapturaManual',
  texto: 'recepcion.origenPegadaTexto',
  foto: 'recepcion.origenFotoLeidaClaude',
};

export default async function PantallaDetalleRecepcion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sesion = await requerirSesion();
  const idioma = await obtenerIdioma();
  const { id: idTexto } = await params;
  const id = Number(idTexto);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const creador = alias(users, 'creador');
  const autorizador = alias(users, 'autorizador');

  const [recepcion] = await db
    .select({
      id: goodsReceipts.id,
      source: goodsReceipts.source,
      status: goodsReceipts.status,
      supplierId: goodsReceipts.supplierId,
      supplierName: suppliers.name,
      cfdiUuid: goodsReceipts.cfdiUuid,
      cfdiSeries: goodsReceipts.cfdiSeries,
      cfdiFolio: goodsReceipts.cfdiFolio,
      cfdiIssuedAt: goodsReceipts.cfdiIssuedAt,
      referenceNote: goodsReceipts.referenceNote,
      subtotal: goodsReceipts.subtotal,
      tax: goodsReceipts.tax,
      total: goodsReceipts.total,
      createdAt: goodsReceipts.createdAt,
      createdByName: creador.name,
      authorizedAt: goodsReceipts.authorizedAt,
      authorizedByName: autorizador.name,
      discardedAt: goodsReceipts.discardedAt,
      discardReason: goodsReceipts.discardReason,
    })
    .from(goodsReceipts)
    .innerJoin(suppliers, eq(goodsReceipts.supplierId, suppliers.id))
    .innerJoin(creador, eq(goodsReceipts.createdByUserId, creador.id))
    .leftJoin(autorizador, eq(goodsReceipts.authorizedByUserId, autorizador.id))
    .where(eq(goodsReceipts.id, id))
    .limit(1);
  if (!recepcion) notFound();

  const filasLineas = await db
    .select({
      id: goodsReceiptItems.id,
      description: goodsReceiptItems.description,
      supplierCode: goodsReceiptItems.supplierCode,
      quantity: goodsReceiptItems.quantity,
      unitCost: goodsReceiptItems.unitCost,
      lineTotal: goodsReceiptItems.lineTotal,
      productId: goodsReceiptItems.productId,
      productName: products.name,
      productCode: products.code,
    })
    .from(goodsReceiptItems)
    .leftJoin(products, eq(goodsReceiptItems.productId, products.id))
    .where(eq(goodsReceiptItems.receiptId, id))
    .orderBy(asc(goodsReceiptItems.id));

  const codigos = filasLineas.map((l) => l.supplierCode).filter((c): c is string => c !== null);
  const costosPrevios =
    codigos.length > 0
      ? await db
          .select({
            supplierCode: productSuppliers.supplierCode,
            lastCost: productSuppliers.lastCost,
          })
          .from(productSuppliers)
          .where(
            and(
              eq(productSuppliers.supplierId, recepcion.supplierId),
              inArray(productSuppliers.supplierCode, codigos),
            ),
          )
      : [];
  const mapaCostosPrevios = new Map(
    costosPrevios.map((c) => [c.supplierCode, aCentavos(c.lastCost) ?? 0]),
  );

  const lineas: LineaRecepcion[] = filasLineas.map((l) => {
    const costoAnterior = l.supplierCode ? (mapaCostosPrevios.get(l.supplierCode) ?? null) : null;
    return {
      id: l.id,
      description: l.description,
      supplierCode: l.supplierCode,
      quantity: l.quantity,
      unitCost: l.unitCost,
      lineTotal: l.lineTotal,
      productId: l.productId,
      productName: l.productName,
      productCode: l.productCode,
      alertaVariacion: costoVarioSignificativamente(aCentavos(l.unitCost) ?? 0, costoAnterior),
    };
  });

  const categorias =
    recepcion.status === 'draft'
      ? await db
          .select({ id: productCategories.id, name: productCategories.name })
          .from(productCategories)
          .where(eq(productCategories.isActive, true))
      : [];

  return (
    <section>
      <EncabezadoPantalla
        titulo={t(idioma, 'recepcion.tituloDetalle', { id: recepcion.id })}
        descripcion={`${recepcion.supplierName} · ${t(idioma, ORIGEN_TEXTO[recepcion.source])}`}
      >
        <span data-testid="estado-recepcion">
          <Distintivo tono={ESTADO_TONO[recepcion.status]}>
            {t(idioma, ESTADO_TEXTO[recepcion.status])}
          </Distintivo>
        </span>
      </EncabezadoPantalla>

      <dl className="mb-6 grid gap-px border border-linea-fuerte bg-linea-fuerte sm:grid-cols-4">
        <Dato
          etiqueta={t(idioma, 'recepcion.folio')}
          valor={
            recepcion.cfdiFolio
              ? `${recepcion.cfdiSeries ?? ''}-${recepcion.cfdiFolio}`
              : (recepcion.referenceNote ?? '—')
          }
        />
        <Dato etiqueta={t(idioma, 'recepcion.uuid')} valor={recepcion.cfdiUuid ?? '—'} mono />
        <Dato
          etiqueta={t(idioma, 'recepcion.fechaFactura')}
          valor={recepcion.cfdiIssuedAt ? momento(recepcion.cfdiIssuedAt, idioma) : '—'}
        />
        <Dato
          etiqueta={t(idioma, 'recepcion.creadaPor')}
          valor={`${recepcion.createdByName} · ${momento(recepcion.createdAt, idioma)}`}
        />
        <Dato
          etiqueta={t(idioma, 'caja.subtotal')}
          valor={formatear(aCentavos(recepcion.subtotal) ?? 0)}
        />
        <Dato
          etiqueta={t(idioma, 'caja.impuesto')}
          valor={formatear(aCentavos(recepcion.tax) ?? 0)}
        />
        <Dato
          etiqueta={t(idioma, 'caja.total')}
          valor={formatear(aCentavos(recepcion.total) ?? 0)}
        />
        <Dato
          etiqueta={
            recepcion.status === 'authorized'
              ? t(idioma, 'recepcion.autorizadaPor')
              : recepcion.status === 'discarded'
                ? t(idioma, 'recepcion.descartada')
                : t(idioma, 'filtros.estado')
          }
          valor={
            recepcion.status === 'authorized' && recepcion.authorizedByName
              ? `${recepcion.authorizedByName} · ${momento(recepcion.authorizedAt, idioma)}`
              : recepcion.status === 'discarded'
                ? `${momento(recepcion.discardedAt, idioma)}${recepcion.discardReason ? ` — ${recepcion.discardReason}` : ''}`
                : t(idioma, 'recepcion.pendienteRevision')
          }
        />
      </dl>

      {recepcion.status === 'draft' ? (
        <>
          <ResolverLineas receiptId={recepcion.id} lineas={lineas} categorias={categorias} />
          <div className="mt-6">
            <AccionesRecepcion receiptId={recepcion.id} esAdmin={sesion.rol === 'admin'} />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {lineas.map((l) => (
            <div
              key={l.id}
              className="flex flex-wrap items-center gap-3 border border-linea-fuerte bg-white p-3"
            >
              <span className="flex-1 text-base text-tinta">{l.description}</span>
              <span className="text-fino text-grafito">
                {l.productName ?? '—'} {l.productCode && `(${l.productCode})`}
              </span>
              <span className="tabular font-mono text-base text-tinta">
                {formatear(aCentavos(l.lineTotal) ?? 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Dato({
  etiqueta,
  valor,
  mono = false,
}: {
  etiqueta: string;
  valor: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="font-mono text-micro uppercase text-grafito-claro">{etiqueta}</dt>
      <dd className={`mt-1 text-cuerpo text-tinta ${mono ? 'tabular font-mono text-fino' : ''}`}>
        {valor}
      </dd>
    </div>
  );
}
