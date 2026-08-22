import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { FiltrosFecha } from '@/components/FiltrosFecha';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { diaDelNegocio } from '@/lib/fechas';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { aCentavos, formatear } from '@/lib/money';
import {
  desglosePorMetodo,
  totalesDe,
  totalesPorCajera,
  totalesPorSucursal,
  type Filtros,
} from '@/lib/reportes';
import { requerirSesion } from '@/lib/sesion';
import { BotonCsv } from './BotonCsv';

type Busqueda = { desde?: string; hasta?: string; sucursal?: string; cajera?: string };

export default async function PantallaReportes({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  // El layout de `(admin)` ya exige el rol; esto es para tener la sesión a mano.
  const sesion = await requerirSesion();
  const idioma = await obtenerIdioma();
  const busqueda = await searchParams;

  const hoy = diaDelNegocio();
  const sucursal = Number(busqueda.sucursal);
  const cajera = Number(busqueda.cajera);

  const filtros: Filtros = {
    desde: busqueda.desde || hoy,
    hasta: busqueda.hasta || hoy,
    ...(Number.isInteger(sucursal) && sucursal > 0 ? { branchId: sucursal } : {}),
    ...(Number.isInteger(cajera) && cajera > 0 ? { userId: cajera } : {}),
  };

  const [totales, porMetodo, porSucursal, porCajera] = await Promise.all([
    totalesDe(filtros, sesion),
    desglosePorMetodo(filtros, sesion, idioma),
    totalesPorSucursal(filtros, sesion),
    totalesPorCajera(filtros, sesion),
  ]);

  // El CSV lleva las tres secciones del reporte, no solo los totales: es lo que se pega en
  // una hoja de cálculo para revisar el mes. Separador `;` y BOM: ver comentario en
  // BotonCsv.tsx — es para Excel en México/español, no cambia con el idioma de la interfaz.
  const enPesos = (texto: string | null) => ((aCentavos(texto ?? '0') ?? 0) / 100).toFixed(2);
  const csvResumen = t(idioma, 'reportes.csvResumen');
  const csvMetodoPago = t(idioma, 'reportes.csvMetodoPago');
  const csvSucursal = t(idioma, 'filtros.sucursal');
  const csvCajera = t(idioma, 'filtros.cajera');
  const filasCsv: (string | number)[][] = [
    [csvResumen, t(idioma, 'turnos.ventas'), String(totales.ventas)],
    [csvResumen, t(idioma, 'turnos.ingreso'), (totales.ingreso / 100).toFixed(2)],
    [csvResumen, t(idioma, 'reportes.costo'), (totales.costo / 100).toFixed(2)],
    [csvResumen, t(idioma, 'turnos.ganancia'), (totales.ganancia / 100).toFixed(2)],
    [csvResumen, t(idioma, 'filtros.canceladas'), String(totales.canceladas)],
    ...porMetodo.map((m) => [csvMetodoPago, m.nombre, (m.total / 100).toFixed(2)]),
    ...porSucursal.map((s) => [csvSucursal, s.etiqueta, enPesos(s.ingreso)]),
    ...porCajera.map((c) => [csvCajera, c.etiqueta, enPesos(c.ingreso)]),
  ];

  return (
    <section>
      <EncabezadoPantalla
        titulo={t(idioma, 'reportes.titulo')}
        descripcion={t(idioma, 'reportes.descripcion', {
          desde: filtros.desde ?? hoy,
          hasta: filtros.hasta ?? hoy,
        })}
      >
        <BotonCsv
          nombre={`reporte-${filtros.desde}-a-${filtros.hasta}`}
          encabezados={[
            t(idioma, 'reportes.csvSeccion'),
            t(idioma, 'reportes.csvConcepto'),
            t(idioma, 'caja.importe'),
          ]}
          filas={filasCsv}
        />
      </EncabezadoPantalla>

      <FiltrosFecha sesion={sesion} valores={busqueda} />

      <dl className="mb-8 grid gap-px border border-linea-fuerte bg-linea-fuerte sm:grid-cols-5">
        <Cifra etiqueta={t(idioma, 'turnos.ventas')} valor={String(totales.ventas)} />
        <Cifra etiqueta={t(idioma, 'turnos.ingreso')} valor={formatear(totales.ingreso)} />
        <Cifra etiqueta={t(idioma, 'reportes.costo')} valor={formatear(totales.costo)} />
        <Cifra etiqueta={t(idioma, 'turnos.ganancia')} valor={formatear(totales.ganancia)} />
        <Cifra etiqueta={t(idioma, 'filtros.canceladas')} valor={String(totales.canceladas)} />
      </dl>

      <h2 className="mb-3 font-display text-cuerpo font-semibold text-tinta">
        {t(idioma, 'reportes.porMetodoPago')}
      </h2>
      <Tabla
        encabezados={[
          t(idioma, 'turnos.colMetodo'),
          t(idioma, 'turnos.colTransacciones'),
          t(idioma, 'turnos.colTotal'),
        ]}
      >
        {porMetodo.map((m) => (
          <Fila key={m.metodo}>
            <Celda>{m.nombre}</Celda>
            <Celda mono className="text-right">
              {m.transacciones}
            </Celda>
            <Celda mono className="text-right">
              {formatear(m.total)}
            </Celda>
          </Fila>
        ))}
      </Tabla>

      <h2 className="mb-3 mt-8 font-display text-cuerpo font-semibold text-tinta">
        {t(idioma, 'reportes.porSucursal')}
      </h2>
      <TablaAgrupada
        filas={porSucursal}
        vacio={t(idioma, 'reportes.sinVentasRango')}
        idioma={idioma}
      />

      <h2 className="mb-3 mt-8 font-display text-cuerpo font-semibold text-tinta">
        {t(idioma, 'reportes.porCajera')}
      </h2>
      <TablaAgrupada
        filas={porCajera}
        vacio={t(idioma, 'reportes.sinVentasRango')}
        idioma={idioma}
      />
    </section>
  );
}

function TablaAgrupada({
  filas,
  vacio,
  idioma,
}: {
  filas: {
    etiqueta: string;
    ventas: number;
    ingreso: string | null;
    costo: string | null;
    ganancia: string | null;
  }[];
  vacio: string;
  idioma: Awaited<ReturnType<typeof obtenerIdioma>>;
}) {
  return (
    <Tabla
      encabezados={[
        '',
        t(idioma, 'turnos.ventas'),
        t(idioma, 'turnos.ingreso'),
        t(idioma, 'reportes.costo'),
        t(idioma, 'turnos.ganancia'),
      ]}
    >
      {filas.length === 0 && <SinDatos columnas={5}>{vacio}</SinDatos>}
      {filas.map((f) => (
        <Fila key={f.etiqueta}>
          <Celda>{f.etiqueta}</Celda>
          <Celda mono className="text-right">
            {f.ventas}
          </Celda>
          <Celda mono className="text-right">
            {formatear(aCentavos(f.ingreso ?? '0') ?? 0)}
          </Celda>
          <Celda mono className="text-right">
            {formatear(aCentavos(f.costo ?? '0') ?? 0)}
          </Celda>
          <Celda mono className="text-right">
            {formatear(aCentavos(f.ganancia ?? '0') ?? 0)}
          </Celda>
        </Fila>
      ))}
    </Tabla>
  );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="font-mono text-micro uppercase text-grafito-claro">{etiqueta}</dt>
      <dd className="tabular mt-1 font-mono text-cuerpo text-tinta">{valor}</dd>
    </div>
  );
}
