import Link from 'next/link';
import { and, count, desc, eq, gte, ilike, lte } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { Paginacion } from '@/components/Paginacion';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Boton } from '@/components/ui/Boton';
import { Distintivo } from '@/components/ui/Distintivo';
import { PAGINACION } from '@/config/pos';
import { db } from '@/db';
import { goodsReceipts, suppliers, type OrigenRecepcion } from '@/db/schema';
import { momento } from '@/lib/formato';
import { obtenerIdioma, t, type ClaveI18n } from '@/lib/i18n/servidor';
import { aCentavos, formatear } from '@/lib/money';
import { offsetDePagina, paginaDeBusqueda } from '@/lib/paginacion';
import { requerirSesion } from '@/lib/sesion';

type Busqueda = {
  proveedor?: string;
  estado?: string;
  folio?: string;
  desde?: string;
  hasta?: string;
  pagina?: string;
};

const ESTADO_TONO = {
  draft: 'marcador',
  authorized: 'visto',
  discarded: 'sello',
} as const;

const ETIQUETA_ORIGEN: Record<OrigenRecepcion, ClaveI18n> = {
  xml: 'recepcion.origenXml',
  manual: 'recepcion.origenManual',
  texto: 'recepcion.origenTexto',
  foto: 'recepcion.origenFotoClaude',
};

const ESTADO_TEXTO: Record<'draft' | 'authorized' | 'discarded', ClaveI18n> = {
  draft: 'recepcion.borrador',
  authorized: 'recepcion.autorizada',
  discarded: 'recepcion.descartada',
};

export default async function PantallaRecepcion({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const sesion = await requerirSesion();
  const idioma = await obtenerIdioma();
  const busqueda = await searchParams;
  const proveedorId = Number(busqueda.proveedor);
  const pagina = paginaDeBusqueda(busqueda.pagina);

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

  const dondeFiltra = condiciones.length > 0 ? and(...condiciones) : undefined;

  const [lista, filasTotal, listaProveedores] = await Promise.all([
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
      .where(dondeFiltra)
      .orderBy(desc(goodsReceipts.createdAt))
      .limit(PAGINACION.porPagina)
      .offset(offsetDePagina(pagina)),
    db
      .select({ total: count() })
      .from(goodsReceipts)
      .innerJoin(suppliers, eq(goodsReceipts.supplierId, suppliers.id))
      .where(dondeFiltra),
    db.select().from(suppliers).where(eq(suppliers.isActive, true)),
  ]);
  const total = filasTotal[0]?.total ?? 0;

  return (
    <section>
      <EncabezadoPantalla
        titulo={t(idioma, 'recepcion.titulo')}
        descripcion={t(idioma, 'recepcion.descripcion')}
      >
        <Link href="/recepcion/nueva">
          <Boton>{t(idioma, 'recepcion.nuevaRecepcion')}</Boton>
        </Link>
      </EncabezadoPantalla>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="proveedor" className="text-fino font-medium text-tinta">
            {t(idioma, 'recepcion.proveedor')}
          </label>
          <select
            id="proveedor"
            name="proveedor"
            defaultValue={busqueda.proveedor ?? ''}
            className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
          >
            <option value="">{t(idioma, 'filtros.todos')}</option>
            {listaProveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="estado" className="text-fino font-medium text-tinta">
            {t(idioma, 'filtros.estado')}
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={busqueda.estado ?? ''}
            className="min-h-[2.5rem] border border-linea-fuerte bg-white px-3 text-base text-tinta"
          >
            <option value="">{t(idioma, 'filtros.todos')}</option>
            <option value="draft">{t(idioma, 'recepcion.borrador')}</option>
            <option value="authorized">{t(idioma, 'recepcion.autorizada')}</option>
            <option value="discarded">{t(idioma, 'recepcion.descartada')}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="folio" className="text-fino font-medium text-tinta">
            {t(idioma, 'recepcion.folio')}
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
            {t(idioma, 'filtros.desde')}
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
            {t(idioma, 'filtros.hasta')}
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
          {t(idioma, 'filtros.filtrar')}
        </button>
      </form>

      <Tabla
        encabezados={[
          '#',
          t(idioma, 'recepcion.colOrigen'),
          t(idioma, 'recepcion.proveedor'),
          t(idioma, 'recepcion.folio'),
          t(idioma, 'caja.total'),
          t(idioma, 'recepcion.colFecha'),
          t(idioma, 'filtros.estado'),
          '',
        ]}
      >
        {lista.length === 0 && (
          <SinDatos columnas={8}>{t(idioma, 'recepcion.sinRecepciones')}</SinDatos>
        )}
        {lista.map((r) => (
          <Fila key={r.id}>
            <Celda mono>{r.id}</Celda>
            <Celda>{t(idioma, ETIQUETA_ORIGEN[r.source])}</Celda>
            <Celda>{r.supplierName}</Celda>
            <Celda mono>{r.cfdiFolio ?? '—'}</Celda>
            <Celda mono className="text-right">
              {formatear(aCentavos(r.total) ?? 0)}
            </Celda>
            <Celda mono>{momento(r.createdAt, idioma)}</Celda>
            <Celda>
              <Distintivo tono={ESTADO_TONO[r.status]}>
                {t(idioma, ESTADO_TEXTO[r.status])}
              </Distintivo>
            </Celda>
            <Celda>
              <Link href={`/recepcion/${r.id}`} className="text-boligrafo underline">
                {t(idioma, 'recepcion.ver')}
              </Link>
            </Celda>
          </Fila>
        ))}
      </Tabla>
      <Paginacion
        ruta="/recepcion"
        parametros={busqueda}
        pagina={pagina}
        totalFilas={total}
        porPagina={PAGINACION.porPagina}
      />

      {sesion.rol === 'cajera' && (
        <p className="mt-4 text-fino text-grafito">{t(idioma, 'recepcion.notaCajera')}</p>
      )}
    </section>
  );
}
