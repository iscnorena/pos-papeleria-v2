import { redirect } from 'next/navigation';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { requerirSesion } from '@/lib/sesion';
import { turnoAbiertoDe } from '@/lib/turnos';
import { FormularioApertura } from './FormularioApertura';

export default async function PantallaApertura() {
  const sesion = await requerirSesion();

  // Con un turno ya abierto no hay nada que abrir: se manda al listado, donde está el suyo.
  if (await turnoAbiertoDe(sesion.userId)) redirect('/turnos');

  return (
    <section className="max-w-md">
      <EncabezadoPantalla
        titulo="Abrir turno"
        descripcion="Cuenta el dinero con el que empiezas y anótalo. De ahí sale el efectivo esperado al cerrar."
      />
      <div className="border border-linea-fuerte bg-white p-5 shadow-impresa">
        <FormularioApertura />
      </div>
    </section>
  );
}
