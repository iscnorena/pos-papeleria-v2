import Link from 'next/link';
import { and, asc, eq, lte } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { db } from '@/db';
import { inventories, products } from '@/db/schema';
import { diaDelNegocio } from '@/lib/fechas';
import { momento } from '@/lib/formato';
import { aCentavos, formatear, formatearCantidad } from '@/lib/money';
import { totalesDe } from '@/lib/reportes';
import { requerirSesion } from '@/lib/sesion';
import { turnoAbiertoDe } from '@/lib/turnos';

// §Fase 5 — el tablero al entrar: ventas de hoy, ganancia de hoy, turno abierto, productos
// con existencia baja y accesos directos. Para la cajera, solo lo suyo — de eso se encarga
// `totalesDe`, que aplica el alcance del rol por dentro.

const EXISTENCIA_BAJA = '5.00';

export default async function Tablero() {
  const sesion = await requerirSesion();
  const hoy = diaDelNegocio();

  const [totales, turno, bajas] = await Promise.all([
    totalesDe({ desde: hoy, hasta: hoy }, sesion),
    turnoAbiertoDe(sesion.userId),
    db
      .select({
        id: products.id,
        nombre: products.name,
        codigo: products.code,
        stock: inventories.stock,
      })
      .from(inventories)
      .innerJoin(products, eq(inventories.productId, products.id))
      .where(
        and(
          eq(inventories.branchId, sesion.branchId),
          eq(products.isActive, true),
          eq(products.managesInventory, true),
          lte(inventories.stock, EXISTENCIA_BAJA),
        ),
      )
      .orderBy(asc(inventories.stock), asc(products.name))
      .limit(10),
  ]);

  return (
    <section>
      <EncabezadoPantalla titulo={`Buen día, ${sesion.nombre}`} descripcion={`Hoy es ${hoy}.`} />

      <dl className="mb-8 grid gap-px border border-linea-fuerte bg-linea-fuerte sm:grid-cols-3">
        <Cifra etiqueta="Ventas de hoy" valor={String(totales.ventas)} />
        <Cifra etiqueta="Ingreso de hoy" valor={formatear(totales.ingreso)} />
        {/* La ganancia es información de negocio: la cajera ve su ingreso, no el margen. */}
        {sesion.rol === 'admin' ? (
          <Cifra etiqueta="Ganancia de hoy" valor={formatear(totales.ganancia)} />
        ) : (
          <Cifra etiqueta="Canceladas" valor={String(totales.canceladas)} />
        )}
      </dl>

      <div className="mb-8 border border-linea-fuerte bg-white p-5 shadow-impresa">
        <h2 className="mb-2 font-mono text-micro uppercase text-grafito">Turno</h2>
        {turno ? (
          <p className="text-cuerpo text-tinta">
            Tienes el turno <span className="font-mono">#{turno.id}</span> abierto desde{' '}
            {momento(turno.openedAt)}, con un fondo de{' '}
            {formatear(aCentavos(turno.openingAmount) ?? 0)}.{' '}
            <Link href={`/turnos/${turno.id}/cerrar`} className="text-boligrafo underline">
              Cerrarlo
            </Link>
          </p>
        ) : (
          <p className="text-cuerpo text-tinta">
            No tienes turno abierto.{' '}
            <Link href="/turnos/abrir" className="text-boligrafo underline">
              Abrir uno
            </Link>{' '}
            para poder vender.
          </p>
        )}
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Acceso href="/caja">Ir a la caja</Acceso>
        <Acceso href="/historial">Historial</Acceso>
        {sesion.rol === 'admin' && <Acceso href="/reportes">Reportes</Acceso>}
      </div>

      <h2 className="mb-3 font-display text-cuerpo font-semibold text-tinta">
        Existencias bajas en tu sucursal
      </h2>
      <Tabla encabezados={['Producto', 'Código', 'Existencia']}>
        {bajas.length === 0 && (
          <SinDatos columnas={3}>Nada por debajo de {formatearCantidad(500)} piezas.</SinDatos>
        )}
        {bajas.map((p) => {
          const stock = aCentavos(p.stock) ?? 0;
          return (
            <Fila key={p.id} resaltada={stock <= 0}>
              <Celda>{p.nombre}</Celda>
              <Celda mono>{p.codigo ?? '—'}</Celda>
              <Celda mono className="text-right">
                {stock <= 0 ? (
                  <Distintivo tono="sello">Agotado</Distintivo>
                ) : (
                  formatearCantidad(stock)
                )}
              </Celda>
            </Fila>
          );
        })}
      </Tabla>
    </section>
  );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="font-mono text-micro uppercase text-grafito-claro">{etiqueta}</dt>
      <dd className="tabular mt-1 font-display text-cifra font-semibold text-tinta">{valor}</dd>
    </div>
  );
}

function Acceso({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="min-h-[2.5rem] border border-linea-fuerte bg-white px-4 py-2 font-medium text-tinta shadow-impresa hover:bg-papel-hondo"
    >
      {children}
    </Link>
  );
}
