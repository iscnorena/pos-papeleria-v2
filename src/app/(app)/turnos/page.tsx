import Link from 'next/link';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { Paginacion } from '@/components/Paginacion';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { PAGINACION } from '@/config/pos';
import { momento, tonoDiferencia } from '@/lib/formato';
import { aCentavos, formatear } from '@/lib/money';
import { offsetDePagina, paginaDeBusqueda } from '@/lib/paginacion';
import { requerirSesion } from '@/lib/sesion';
import { contarTurnosVisibles, turnoAbiertoDe, turnosVisibles } from '@/lib/turnos';

export default async function PantallaTurnos({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const sesion = await requerirSesion();
  const { pagina: paginaTexto } = await searchParams;
  const pagina = paginaDeBusqueda(paginaTexto);

  const [lista, total, abierto] = await Promise.all([
    turnosVisibles(sesion, { limite: PAGINACION.porPagina, offset: offsetDePagina(pagina) }),
    contarTurnosVisibles(sesion),
    turnoAbiertoDe(sesion.userId),
  ]);

  return (
    <section>
      <EncabezadoPantalla
        titulo="Turnos de caja"
        descripcion={
          sesion.rol === 'admin'
            ? 'Todos los turnos del negocio.'
            : 'Tus turnos. Cada quien ve los suyos.'
        }
      >
        {abierto ? (
          <Link
            href={`/turnos/${abierto.id}/cerrar`}
            className="min-h-[2.5rem] border border-linea-fuerte bg-white px-4 py-2 font-medium text-tinta shadow-impresa hover:bg-papel-hondo"
          >
            Cerrar turno
          </Link>
        ) : (
          <Link
            href="/turnos/abrir"
            className="min-h-[2.5rem] border border-boligrafo-hondo bg-boligrafo px-4 py-2 font-medium text-white shadow-impresa hover:bg-boligrafo-hondo"
          >
            Abrir turno
          </Link>
        )}
      </EncabezadoPantalla>

      <Tabla
        encabezados={[
          '#',
          'Cajera',
          'Abierto',
          'Cerrado',
          'Fondo',
          'Contado',
          'Diferencia',
          'Estado',
          '',
        ]}
      >
        {lista.length === 0 && <SinDatos columnas={9}>Todavía no hay turnos.</SinDatos>}
        {lista.map((t) => {
          const diferencia = t.difference === null ? null : (aCentavos(t.difference) ?? 0);
          return (
            <Fila key={t.id}>
              <Celda mono>{t.id}</Celda>
              <Celda>{t.cajera}</Celda>
              <Celda mono>{momento(t.openedAt)}</Celda>
              <Celda mono>{momento(t.closedAt)}</Celda>
              <Celda mono className="text-right">
                {formatear(aCentavos(t.openingAmount) ?? 0)}
              </Celda>
              <Celda mono className="text-right">
                {t.actualCash === null ? '—' : formatear(aCentavos(t.actualCash) ?? 0)}
              </Celda>
              <Celda
                mono
                className={`text-right ${diferencia === null ? '' : tonoDiferencia(diferencia)}`}
              >
                {diferencia === null ? '—' : formatear(diferencia)}
              </Celda>
              <Celda>
                {t.status === 'open' ? (
                  <Distintivo tono="marcador">Abierto</Distintivo>
                ) : (
                  <Distintivo>Cerrado</Distintivo>
                )}
              </Celda>
              <Celda>
                <Link href={`/turnos/${t.id}`} className="text-boligrafo underline">
                  Ver
                </Link>
              </Celda>
            </Fila>
          );
        })}
      </Tabla>
      <Paginacion
        ruta="/turnos"
        pagina={pagina}
        totalFilas={total}
        porPagina={PAGINACION.porPagina}
      />
    </section>
  );
}
