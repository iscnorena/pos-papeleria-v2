import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { formatear, aCentavos } from '@/lib/money';
import { requerirSesion } from '@/lib/sesion';
import { turnoAbiertoDe } from '@/lib/turnos';

// §7.5 — sin turno abierto NO se puede vender: la pantalla del punto de venta redirige a
// abrir turno. Ese guardia es de la Fase 3; el punto de venta en sí llega en la Fase 4 y
// se monta debajo de esta misma comprobación.

export default async function PantallaCaja() {
  const sesion = await requerirSesion();
  const turno = await turnoAbiertoDe(sesion.userId);

  if (!turno) redirect('/turnos/abrir');

  return (
    <section>
      <EncabezadoPantalla
        titulo="Caja"
        descripcion={`Turno #${turno.id} abierto, con un fondo de ${formatear(aCentavos(turno.openingAmount) ?? 0)}.`}
      />
      <div className="border border-linea-fuerte bg-white p-6 shadow-impresa">
        <p className="text-cuerpo text-tinta">
          El punto de venta llega en la Fase 4. Por ahora, esta pantalla solo comprueba lo que pide
          §7.5: que haya un turno abierto antes de poder vender.
        </p>
        <Link href={`/turnos/${turno.id}`} className="mt-4 inline-block text-boligrafo underline">
          Ver el turno
        </Link>
      </div>
    </section>
  );
}
