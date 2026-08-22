import Link from 'next/link';
import { and, asc, eq, lte } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { db } from '@/db';
import { inventories, products } from '@/db/schema';
import { diaDelNegocio } from '@/lib/fechas';
import { momento } from '@/lib/formato';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
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
  const idioma = await obtenerIdioma();
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
      <EncabezadoPantalla
        titulo={t(idioma, 'dashboard.buenDia', { nombre: sesion.nombre })}
        descripcion={t(idioma, 'dashboard.hoyEs', { fecha: hoy })}
      />

      <dl className="mb-8 grid gap-px border border-linea-fuerte bg-linea-fuerte sm:grid-cols-3">
        <Cifra etiqueta={t(idioma, 'dashboard.ventasHoy')} valor={String(totales.ventas)} />
        <Cifra etiqueta={t(idioma, 'dashboard.ingresoHoy')} valor={formatear(totales.ingreso)} />
        {/* La ganancia es información de negocio: la cajera ve su ingreso, no el margen. */}
        {sesion.rol === 'admin' ? (
          <Cifra
            etiqueta={t(idioma, 'dashboard.gananciaHoy')}
            valor={formatear(totales.ganancia)}
          />
        ) : (
          <Cifra etiqueta={t(idioma, 'filtros.canceladas')} valor={String(totales.canceladas)} />
        )}
      </dl>

      <div className="mb-8 border border-linea-fuerte bg-white p-5 shadow-impresa">
        <h2 className="mb-2 font-mono text-micro uppercase text-grafito">
          {t(idioma, 'dashboard.turno')}
        </h2>
        {turno ? (
          <p className="text-cuerpo text-tinta">
            {t(idioma, 'dashboard.turnoAbierto', {
              id: turno.id,
              fecha: momento(turno.openedAt, idioma),
              fondo: formatear(aCentavos(turno.openingAmount) ?? 0),
            })}{' '}
            <Link href={`/turnos/${turno.id}/cerrar`} className="text-boligrafo underline">
              {t(idioma, 'dashboard.cerrarlo')}
            </Link>
          </p>
        ) : (
          <p className="text-cuerpo text-tinta">
            {t(idioma, 'dashboard.sinTurno')}{' '}
            <Link href="/turnos/abrir" className="text-boligrafo underline">
              {t(idioma, 'dashboard.abrirUno')}
            </Link>{' '}
            {t(idioma, 'dashboard.paraVender')}
          </p>
        )}
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Acceso href="/caja">{t(idioma, 'dashboard.irCaja')}</Acceso>
        <Acceso href="/historial">{t(idioma, 'nav.historial')}</Acceso>
        {sesion.rol === 'admin' && <Acceso href="/reportes">{t(idioma, 'nav.reportes')}</Acceso>}
      </div>

      <h2 className="mb-3 font-display text-cuerpo font-semibold text-tinta">
        {t(idioma, 'dashboard.existenciasBajas')}
      </h2>
      <Tabla
        encabezados={[
          t(idioma, 'dashboard.colProducto'),
          t(idioma, 'dashboard.colCodigo'),
          t(idioma, 'dashboard.colExistencia'),
        ]}
      >
        {bajas.length === 0 && (
          <SinDatos columnas={3}>
            {t(idioma, 'dashboard.nadaPorDebajo', { n: formatearCantidad(500) })}
          </SinDatos>
        )}
        {bajas.map((p) => {
          const stock = aCentavos(p.stock) ?? 0;
          return (
            <Fila key={p.id} resaltada={stock <= 0}>
              <Celda>{p.nombre}</Celda>
              <Celda mono>{p.codigo ?? '—'}</Celda>
              <Celda mono className="text-right">
                {stock <= 0 ? (
                  <Distintivo tono="sello">{t(idioma, 'dashboard.agotado')}</Distintivo>
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
