import { asc, eq } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { NuevaRecepcion } from './NuevaRecepcion';

export default async function PantallaNuevaRecepcion() {
  const listaProveedores = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(eq(suppliers.isActive, true))
    .orderBy(asc(suppliers.name));

  return (
    <section className="max-w-2xl">
      <EncabezadoPantalla
        titulo="Nueva recepción"
        descripcion="Importa el XML de la factura o captura las líneas a mano. Nada se aplica al inventario hasta autorizar."
      />
      <NuevaRecepcion proveedores={listaProveedores} />
    </section>
  );
}
