import Link from 'next/link';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { FiltrosFecha } from '@/components/FiltrosFecha';
import { Paginacion } from '@/components/Paginacion';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { PAGINACION } from '@/config/pos';
import { diaDelNegocio } from '@/lib/fechas';
import { momento } from '@/lib/formato';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { aCentavos, formatear } from '@/lib/money';
import { offsetDePagina, paginaDeBusqueda } from '@/lib/paginacion';
import { contarVentas, totalesDe, ventasDe, type Filtros } from '@/lib/reportes';
import { requerirSesion } from '@/lib/sesion';

type Busqueda = {
  desde?: string;
  hasta?: string;
  sucursal?: string;
  cajera?: string;
  estado?: string;
  pagina?: string;
};

function filtrosDe(busqueda: Busqueda): Filtros {
  const sucursal = Number(busqueda.sucursal);
  const cajera = Number(busqueda.cajera);
  return {
    // Por defecto, el día de hoy en la zona del negocio: es lo que se mira al cerrar caja.
    desde: busqueda.desde || diaDelNegocio(),
    hasta: busqueda.hasta || diaDelNegocio(),
    ...(Number.isInteger(sucursal) && sucursal > 0 ? { branchId: sucursal } : {}),
    ...(Number.isInteger(cajera) && cajera > 0 ? { userId: cajera } : {}),
    ...(busqueda.estado === 'completed' || busqueda.estado === 'cancelled'
      ? { status: busqueda.estado }
      : {}),
  };
}

export default async function PantallaHistorial({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const sesion = await requerirSesion();
  const idioma = await obtenerIdioma();
  const busqueda = await searchParams;
  const filtros = filtrosDe(busqueda);
  const pagina = paginaDeBusqueda(busqueda.pagina);

  const [ventas, total, totales] = await Promise.all([
    ventasDe(filtros, sesion, { limite: PAGINACION.porPagina, offset: offsetDePagina(pagina) }),
    contarVentas(filtros, sesion),
    totalesDe(filtros, sesion),
  ]);

  return (
    <section>
      <EncabezadoPantalla
        titulo={t(idioma, 'historial.titulo')}
        descripcion={
          sesion.rol === 'admin'
            ? t(idioma, 'historial.descAdmin')
            : t(idioma, 'historial.descCajera')
        }
      />

      <FiltrosFecha sesion={sesion} valores={busqueda} conEstado />

      <dl className="mb-6 grid gap-px border border-linea-fuerte bg-linea-fuerte sm:grid-cols-4">
        <Resumen etiqueta={t(idioma, 'turnos.ventas')} valor={String(totales.ventas)} />
        <Resumen etiqueta={t(idioma, 'turnos.ingreso')} valor={formatear(totales.ingreso)} />
        <Resumen etiqueta={t(idioma, 'turnos.ganancia')} valor={formatear(totales.ganancia)} />
        <Resumen etiqueta={t(idioma, 'filtros.canceladas')} valor={String(totales.canceladas)} />
      </dl>

      <Tabla
        encabezados={[
          t(idioma, 'turnos.colFolio'),
          t(idioma, 'historial.colFecha'),
          t(idioma, 'turnos.colCajera'),
          t(idioma, 'filtros.sucursal'),
          t(idioma, 'turnos.colTotal'),
          t(idioma, 'filtros.estado'),
          '',
        ]}
      >
        {ventas.length === 0 && (
          <SinDatos columnas={7}>{t(idioma, 'historial.sinVentasRango')}</SinDatos>
        )}
        {ventas.map((v) => {
          const cancelada = v.status === 'cancelled';
          return (
            <Fila key={v.id}>
              {/* Una venta cancelada se ve tachada, no desaparece (§7.6). */}
              <Celda mono className={cancelada ? 'line-through' : ''}>
                {v.folio}
              </Celda>
              <Celda mono>{momento(v.createdAt, idioma)}</Celda>
              <Celda>{v.cajera}</Celda>
              <Celda>{v.sucursal}</Celda>
              <Celda mono className={`text-right ${cancelada ? 'line-through' : ''}`}>
                {formatear(aCentavos(v.total) ?? 0)}
              </Celda>
              <Celda>
                {cancelada ? (
                  <Distintivo tono="sello">{t(idioma, 'turnos.cancelada')}</Distintivo>
                ) : (
                  <Distintivo tono="visto">{t(idioma, 'turnos.completada')}</Distintivo>
                )}
              </Celda>
              <Celda>
                <Link href={`/historial/${v.id}`} className="text-boligrafo underline">
                  {t(idioma, 'turnos.ver')}
                </Link>
              </Celda>
            </Fila>
          );
        })}
      </Tabla>
      <Paginacion
        ruta="/historial"
        parametros={busqueda}
        pagina={pagina}
        totalFilas={total}
        porPagina={PAGINACION.porPagina}
      />
    </section>
  );
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="font-mono text-micro uppercase text-grafito-claro">{etiqueta}</dt>
      <dd className="tabular mt-1 font-mono text-cuerpo text-tinta">{valor}</dd>
    </div>
  );
}
