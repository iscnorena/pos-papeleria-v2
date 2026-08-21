import { asc, eq } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { requerirSesion } from '@/lib/sesion';
import { estadoIntegracionClaude } from '../acciones';
import { NuevaRecepcion } from './NuevaRecepcion';

export default async function PantallaNuevaRecepcion() {
  const sesion = await requerirSesion();
  const [listaProveedores, { activa: claudeActiva }] = await Promise.all([
    db
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.isActive, true))
      .orderBy(asc(suppliers.name)),
    estadoIntegracionClaude(),
  ]);

  return (
    <section className="max-w-2xl">
      <EncabezadoPantalla
        titulo="Nueva recepción"
        descripcion="Importa el XML de la factura, captura las líneas a mano, o pega/sube un ticket. Nada se aplica al inventario hasta autorizar."
      />
      <NuevaRecepcion
        proveedores={listaProveedores}
        claudeActiva={claudeActiva}
        esAdmin={sesion.rol === 'admin'}
      />
    </section>
  );
}
