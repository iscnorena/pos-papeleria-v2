import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { FiltrosFecha } from '@/components/FiltrosFecha';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { diaDelNegocio } from '@/lib/fechas';
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
    desglosePorMetodo(filtros, sesion),
    totalesPorSucursal(filtros, sesion),
    totalesPorCajera(filtros, sesion),
  ]);

  // El CSV lleva las tres secciones del reporte, no solo los totales: es lo que se pega en
  // una hoja de cálculo para revisar el mes.
  const enPesos = (texto: string | null) => ((aCentavos(texto ?? '0') ?? 0) / 100).toFixed(2);
  const filasCsv: (string | number)[][] = [
    ['Resumen', 'Ventas', String(totales.ventas)],
    ['Resumen', 'Ingreso', (totales.ingreso / 100).toFixed(2)],
    ['Resumen', 'Costo', (totales.costo / 100).toFixed(2)],
    ['Resumen', 'Ganancia', (totales.ganancia / 100).toFixed(2)],
    ['Resumen', 'Canceladas', String(totales.canceladas)],
    ...porMetodo.map((m) => ['Método de pago', m.nombre, (m.total / 100).toFixed(2)]),
    ...porSucursal.map((s) => ['Sucursal', s.etiqueta, enPesos(s.ingreso)]),
    ...porCajera.map((c) => ['Cajera', c.etiqueta, enPesos(c.ingreso)]),
  ];

  return (
    <section>
      <EncabezadoPantalla
        titulo="Reportes"
        descripcion={`Del ${filtros.desde} al ${filtros.hasta}, en día natural de la Ciudad de México.`}
      >
        <BotonCsv
          nombre={`reporte-${filtros.desde}-a-${filtros.hasta}`}
          encabezados={['Sección', 'Concepto', 'Importe']}
          filas={filasCsv}
        />
      </EncabezadoPantalla>

      <FiltrosFecha sesion={sesion} valores={busqueda} />

      <dl className="mb-8 grid gap-px border border-linea-fuerte bg-linea-fuerte sm:grid-cols-5">
        <Cifra etiqueta="Ventas" valor={String(totales.ventas)} />
        <Cifra etiqueta="Ingreso" valor={formatear(totales.ingreso)} />
        <Cifra etiqueta="Costo" valor={formatear(totales.costo)} />
        <Cifra etiqueta="Ganancia" valor={formatear(totales.ganancia)} />
        <Cifra etiqueta="Canceladas" valor={String(totales.canceladas)} />
      </dl>

      <h2 className="mb-3 font-display text-cuerpo font-semibold text-tinta">Por método de pago</h2>
      <Tabla encabezados={['Método', 'Transacciones', 'Total']}>
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

      <h2 className="mb-3 mt-8 font-display text-cuerpo font-semibold text-tinta">Por sucursal</h2>
      <TablaAgrupada filas={porSucursal} vacio="Sin ventas en el rango." />

      <h2 className="mb-3 mt-8 font-display text-cuerpo font-semibold text-tinta">Por cajera</h2>
      <TablaAgrupada filas={porCajera} vacio="Sin ventas en el rango." />
    </section>
  );
}

function TablaAgrupada({
  filas,
  vacio,
}: {
  filas: {
    etiqueta: string;
    ventas: number;
    ingreso: string | null;
    costo: string | null;
    ganancia: string | null;
  }[];
  vacio: string;
}) {
  return (
    <Tabla encabezados={['', 'Ventas', 'Ingreso', 'Costo', 'Ganancia']}>
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
