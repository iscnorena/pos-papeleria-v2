import Link from 'next/link';
import { and, desc, eq, gte, ilike, lte } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Boton } from '@/components/ui/Boton';
import { Distintivo } from '@/components/ui/Distintivo';
import { db } from '@/db';
import { goodsReceipts, suppliers } from '@/db/schema';
import { momento } from '@/lib/formato';
import { aCentavos, formatear } from '@/lib/money';
import { requerirSesion } from '@/lib/sesion';

type Busqueda = {
  proveedor?: string;
  estado?: string;
  folio?: string;
  desde?: string;
  hasta?: string;
};

const ESTADO_TONO = {
  draft: 'marcador',
  authorized: 'visto',
  discarded: 'sello',
} as const;

const ESTADO_TEXTO = {
  draft: 'Borrador',
  authorized: 'Autorizada',
  discarded: 'Descartada',
} as const;

export default async function PantallaRecepcion({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const sesion = await requerirSesion();
  const busqueda = await searchParams;
  const proveedorId = Number(busqueda.proveedor);

  const condiciones = [
    ...(Number.isInteger(proveedorId) && proveedorId > 0
      ? [eq(goodsReceipts.supplierId, proveedorId)]
      : []),
    ...(busqueda.estado === 'draft' ||
    busqueda.estado === 'authorized' ||
    busqueda.estado === 'discarded'
      ? [eq(goodsReceipts.status, busqueda.estado)]
      : []),
    ...(busqueda.folio ? [ilike(goodsReceipts.cfdiFolio, `%${busqueda.folio}%`)] : []),
    ...(busqueda.desde
      ? [gte(goodsReceipts.createdAt, new Date(`${busqueda.desde}T00:00:00`))]
      : []),
    ...(busqueda.hasta
      ? [lte(goodsReceipts.createdAt, new Date(`${busqueda.hasta}T23:59:59`))]
      : []),
  ];

  const [lista, listaProveedores] = await Promise.all([
    db
      .select({
        id: goodsReceipts.id,
        source: goodsReceipts.source,
        status: goodsReceipts.status,
        supplierName: suppliers.name,
        cfdiFolio: goodsReceipts.cfdiFolio,
        total: goodsReceipts.total,
        createdAt: goodsReceipts.createdAt,
      })
      .from(goodsReceipts)
      .innerJoin(suppliers, eq(goodsReceipts.supplierId, suppliers.id))
      .where(condiciones.length > 0 ? and(...condiciones) : undefined)
      .orderBy(desc(goodsReceipts.createdAt))
      .limit(200),
    db.select().from(suppliers).where(eq(suppliers.isActive, true)),
  ]);

  return (
    <section>
      <EncabezadoPantalla
        titulo="Recepción de Mercancía"
        descripcion="Compras a proveedor: importadas por XML o capturadas a mano."
      >
        <Link href="/recepcion/nueva">
          <Boton>Nueva recepción</Boton>
        </Link>
      </EncabezadoPantalla>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="proveedor" className="text-fino font-medium text-tinta">
            Proveedor
          </label>
          <select
            id="proveedor"
            name="proveedor"
            defaultValue={busqueda.proveedor ?? ''}
            className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
          >
            <option value="">Todos</option>
            {listaProveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="estado" className="text-fino font-medium text-tinta">
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={busqueda.estado ?? ''}
            className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
          >
            <option value="">Todos</option>
            <option value="draft">Borrador</option>
            <option value="authorized">Autorizada</option>
            <option value="discarded">Descartada</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="folio" className="text-fino font-medium text-tinta">
            Folio
          </label>
          <input
            id="folio"
            name="folio"
            defaultValue={busqueda.folio ?? ''}
            className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="desde" className="text-fino font-medium text-tinta">
            Desde
          </label>
          <input
            id="desde"
            name="desde"
            type="date"
            defaultValue={busqueda.desde ?? ''}
            className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="hasta" className="text-fino font-medium text-tinta">
            Hasta
          </label>
          <input
            id="hasta"
            name="hasta"
            type="date"
            defaultValue={busqueda.hasta ?? ''}
            className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
          />
        </div>

        <button
          type="submit"
          className="min-h-[2.5rem] border border-boligrafo-hondo bg-boligrafo px-4 font-medium text-white shadow-impresa hover:bg-boligrafo-hondo"
        >
          Filtrar
        </button>
      </form>

      <Tabla encabezados={['#', 'Origen', 'Proveedor', 'Folio', 'Total', 'Fecha', 'Estado', '']}>
        {lista.length === 0 && (
          <SinDatos columnas={8}>No hay recepciones con esos filtros.</SinDatos>
        )}
        {lista.map((r) => (
          <Fila key={r.id}>
            <Celda mono>{r.id}</Celda>
            <Celda>{r.source === 'xml' ? 'XML' : 'Manual'}</Celda>
            <Celda>{r.supplierName}</Celda>
            <Celda mono>{r.cfdiFolio ?? '—'}</Celda>
            <Celda mono className="text-right">
              {formatear(aCentavos(r.total) ?? 0)}
            </Celda>
            <Celda mono>{momento(r.createdAt)}</Celda>
            <Celda>
              <Distintivo tono={ESTADO_TONO[r.status]}>{ESTADO_TEXTO[r.status]}</Distintivo>
            </Celda>
            <Celda>
              <Link href={`/recepcion/${r.id}`} className="text-boligrafo underline">
                Ver
              </Link>
            </Celda>
          </Fila>
        ))}
      </Tabla>

      {sesion.rol === 'cajera' && (
        <p className="mt-4 text-fino text-grafito">
          Puedes crear e importar recepciones. Solo un administrador puede autorizarlas.
        </p>
      )}
    </section>
  );
}
