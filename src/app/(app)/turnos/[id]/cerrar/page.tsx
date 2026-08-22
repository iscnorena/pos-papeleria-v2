import { notFound, redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { db } from '@/db';
import { cashRegisterShifts } from '@/db/schema';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { aCentavos } from '@/lib/money';
import { requerirSesion } from '@/lib/sesion';
import { calcularCorte } from '@/lib/turnos';
import { FormularioCierre } from './FormularioCierre';

export default async function PantallaCierre({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirSesion();
  const idioma = await obtenerIdioma();
  const { id } = await params;
  const turnoId = Number(id);
  if (!Number.isInteger(turnoId)) notFound();

  const [turno] = await db
    .select()
    .from(cashRegisterShifts)
    .where(eq(cashRegisterShifts.id, turnoId))
    .limit(1);

  if (!turno) notFound();
  // El corte lo firma quien contó el dinero: nadie cierra el turno de otra persona.
  if (turno.userId !== sesion.userId) notFound();
  if (turno.status === 'closed') redirect(`/turnos/${turno.id}`);

  const fondo = aCentavos(turno.openingAmount) ?? 0;
  const corte = await calcularCorte(turno.id, fondo);

  return (
    <section className="max-w-lg">
      <EncabezadoPantalla
        titulo={t(idioma, 'turnos.cerrarTituloConId', { id: turno.id })}
        descripcion={t(idioma, 'turnos.cerrarDescripcion')}
      />
      <FormularioCierre
        shiftId={turno.id}
        fondoDeCaja={corte.fondoDeCaja}
        efectivoDeVentas={corte.efectivoDeVentas}
        efectivoEsperado={corte.efectivoEsperado}
      />
    </section>
  );
}
