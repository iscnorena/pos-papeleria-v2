import { and, asc, eq, isNotNull } from 'drizzle-orm';

import { HerramientaNoDisponible } from '@/components/HerramientaNoDisponible';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { esHerramientaPublica } from '@/lib/toolSettings';
import { UnirPdf } from '@/tools/pdf/UnirPdf';

// Versión pública de Unir PDF: misma herramienta que /herramientas/pdf/unir, sin sesión,
// colgando de /imprimir/pdf. Mismo criterio que Rifas: el interruptor de "Disponible al
// público" bloquea del todo si está apagado; el WhatsApp es un extra, no bloquea si no
// hay sucursal con número configurado (a diferencia de Acomoda Impresión pública).

export default async function ImprimirPdfUnirPage({
  searchParams,
}: {
  searchParams: Promise<{ sucursal?: string }>;
}) {
  const publica = await esHerramientaPublica('unir');
  if (!publica) return <HerramientaNoDisponible />;

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
      <UnirPdf whatsappNumber={destino?.whatsappNumber ?? undefined} />
    </main>
  );
}
