import Link from 'next/link';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { Paginacion } from '@/components/Paginacion';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { PAGINACION } from '@/config/pos';
import { momento, tonoDiferencia } from '@/lib/formato';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
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
  const idioma = await obtenerIdioma();
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
        titulo={t(idioma, 'turnos.titulo')}
        descripcion={t(idioma, sesion.rol === 'admin' ? 'turnos.descAdmin' : 'turnos.descCajera')}
      >
        {abierto ? (
          <Link
            href={`/turnos/${abierto.id}/cerrar`}
            className="min-h-[2.5rem] border border-linea-fuerte bg-white px-4 py-2 font-medium text-tinta shadow-impresa hover:bg-papel-hondo"
          >
            {t(idioma, 'turnos.cerrarTurno')}
          </Link>
        ) : (
          <Link
            href="/turnos/abrir"
            className="min-h-[2.5rem] border border-boligrafo-hondo bg-boligrafo px-4 py-2 font-medium text-white shadow-impresa hover:bg-boligrafo-hondo"
          >
            {t(idioma, 'turnos.abrirTurno')}
          </Link>
        )}
      </EncabezadoPantalla>

      <Tabla
        encabezados={[
          t(idioma, 'turnos.colNum'),
          t(idioma, 'turnos.colCajera'),
          t(idioma, 'turnos.colAbierto'),
          t(idioma, 'turnos.colCerrado'),
          t(idioma, 'turnos.colFondo'),
          t(idioma, 'turnos.colContado'),
          t(idioma, 'turnos.colDiferencia'),
          t(idioma, 'filtros.estado'),
          '',
        ]}
      >
        {lista.length === 0 && <SinDatos columnas={9}>{t(idioma, 'turnos.sinTurnos')}</SinDatos>}
        {lista.map((tn) => {
          const diferencia = tn.difference === null ? null : (aCentavos(tn.difference) ?? 0);
          return (
            <Fila key={tn.id}>
              <Celda mono>{tn.id}</Celda>
              <Celda>{tn.cajera}</Celda>
              <Celda mono>{momento(tn.openedAt, idioma)}</Celda>
              <Celda mono>{momento(tn.closedAt, idioma)}</Celda>
              <Celda mono className="text-right">
                {formatear(aCentavos(tn.openingAmount) ?? 0)}
              </Celda>
              <Celda mono className="text-right">
                {tn.actualCash === null ? '—' : formatear(aCentavos(tn.actualCash) ?? 0)}
              </Celda>
              <Celda
                mono
                className={`text-right ${diferencia === null ? '' : tonoDiferencia(diferencia)}`}
              >
                {diferencia === null ? '—' : formatear(diferencia)}
              </Celda>
              <Celda>
                {tn.status === 'open' ? (
                  <Distintivo tono="marcador">{t(idioma, 'turnos.abierto')}</Distintivo>
                ) : (
                  <Distintivo>{t(idioma, 'turnos.cerrado')}</Distintivo>
                )}
              </Celda>
              <Celda>
                <Link href={`/turnos/${tn.id}`} className="text-boligrafo underline">
                  {t(idioma, 'turnos.ver')}
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
