import { and, asc, eq, isNotNull } from 'drizzle-orm';

import { POS } from '@/config/pos';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { ImprimirPublico } from './ImprimirPublico';

// Versión pública de Acomoda Impresión (Fase 7): sin cuenta, para que cualquier cliente
// arme su PDF desde el celular y lo mande por WhatsApp a la papelería. Fuera del grupo
// (app) a propósito, igual que el ticket: sin sesión ni navegación de admin, y el `proxy`
// la deja pasar (§ ver comentario ahí). La herramienta interna, con precios, no se toca.

export default async function ImprimirPage({
  searchParams,
}: {
  searchParams: Promise<{ sucursal?: string }>;
}) {
  const { sucursal } = await searchParams;
  const idSucursal = Number(sucursal);

  const condiciones = [eq(branches.isActive, true), isNotNull(branches.whatsappNumber)];
  if (Number.isInteger(idSucursal)) condiciones.push(eq(branches.id, idSucursal));

  const [destino] = await db
    .select({ whatsappNumber: branches.whatsappNumber })
    .from(branches)
    .where(and(...condiciones))
    .orderBy(asc(branches.id))
    .limit(1);

  if (!destino?.whatsappNumber) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-papel p-6 text-center">
        <p className="max-w-xs text-cuerpo text-grafito">
          Esta herramienta no está disponible por el momento.
        </p>
      </main>
    );
  }

  return (
    <ImprimirPublico nombreNegocio={POS.nombreNegocio} whatsappNumber={destino.whatsappNumber} />
  );
}
