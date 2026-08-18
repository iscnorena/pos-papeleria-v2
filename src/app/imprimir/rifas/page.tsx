import { and, asc, eq, isNotNull } from 'drizzle-orm';

import { db } from '@/db';
import { branches } from '@/db/schema';
import { GeneradorRifas } from '@/tools/rifas/GeneradorRifas';

// Versión pública del generador de rifas: misma herramienta que /herramientas/rifas, sin
// sesión, colgando del índice público /imprimir. A diferencia de Acomoda Impresión
// pública, aquí no hay diferencia de CAPACIDADES entre versión interna y pública (mismo
// componente GeneradorRifas en las dos) — la única diferencia es que esta ruta, al
// resolver una sucursal con WhatsApp, le pasa el número para que aparezca el botón
// "Enviar por WhatsApp" junto al de "Descargar PDF". Si no hay ninguna sucursal con
// WhatsApp configurado, la página igual funciona: solo queda la descarga directa (a
// diferencia de /imprimir/acomoda-impresion, que SOLO tiene WhatsApp y por eso si bloquea
// del todo sin número).

export default async function RifasPublicoPage({
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

  return (
    <main className="min-h-dvh bg-papel px-4 py-6">
      <GeneradorRifas whatsappNumber={destino?.whatsappNumber ?? undefined} />
    </main>
  );
}
