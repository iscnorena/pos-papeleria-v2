import Link from 'next/link';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { FiltrosFecha } from '@/components/FiltrosFecha';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { diaDelNegocio } from '@/lib/fechas';
import { momento } from '@/lib/formato';
import { aCentavos, formatear } from '@/lib/money';
import { totalesDe, ventasDe, type Filtros } from '@/lib/reportes';
import { requerirSesion } from '@/lib/sesion';

type Busqueda = {
  desde?: string;
  hasta?: string;
  sucursal?: string;
  cajera?: string;
  estado?: string;
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
  const busqueda = await searchParams;
  const filtros = filtrosDe(busqueda);

  const [ventas, totales] = await Promise.all([
    ventasDe(filtros, sesion),
    totalesDe(filtros, sesion),
  ]);

  return (
    <section>
      <EncabezadoPantalla
        titulo="Historial de ventas"
        descripcion={sesion.rol === 'admin' ? 'Todas las ventas del negocio.' : 'Tus ventas.'}
      />

      <FiltrosFecha sesion={sesion} valores={busqueda} conEstado />

      <dl className="mb-6 grid gap-px border border-linea-fuerte bg-linea-fuerte sm:grid-cols-4">
        <Resumen etiqueta="Ventas" valor={String(totales.ventas)} />
        <Resumen etiqueta="Ingreso" valor={formatear(totales.ingreso)} />
        <Resumen etiqueta="Ganancia" valor={formatear(totales.ganancia)} />
        <Resumen etiqueta="Canceladas" valor={String(totales.canceladas)} />
      </dl>

      <Tabla encabezados={['Folio', 'Fecha', 'Cajera', 'Sucursal', 'Total', 'Estado', '']}>
        {ventas.length === 0 && <SinDatos columnas={7}>No hay ventas en ese rango.</SinDatos>}
        {ventas.map((v) => {
          const cancelada = v.status === 'cancelled';
          return (
            <Fila key={v.id}>
              {/* Una venta cancelada se ve tachada, no desaparece (§7.6). */}
              <Celda mono className={cancelada ? 'line-through' : ''}>
                {v.folio}
              </Celda>
              <Celda mono>{momento(v.createdAt)}</Celda>
              <Celda>{v.cajera}</Celda>
              <Celda>{v.sucursal}</Celda>
              <Celda mono className={`text-right ${cancelada ? 'line-through' : ''}`}>
                {formatear(aCentavos(v.total) ?? 0)}
              </Celda>
              <Celda>
                {cancelada ? (
                  <Distintivo tono="sello">Cancelada</Distintivo>
                ) : (
                  <Distintivo tono="visto">Completada</Distintivo>
                )}
              </Celda>
              <Celda>
                <Link href={`/historial/${v.id}`} className="text-boligrafo underline">
                  Ver
                </Link>
              </Celda>
            </Fila>
          );
        })}
      </Tabla>
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
