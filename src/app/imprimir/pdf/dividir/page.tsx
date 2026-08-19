import { and, asc, eq, isNotNull } from 'drizzle-orm';

import { HerramientaNoDisponible } from '@/components/HerramientaNoDisponible';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { esHerramientaPublica } from '@/lib/toolSettings';
import { DividirPdf } from '@/tools/pdf/DividirPdf';

// Versión pública de Dividir PDF: misma herramienta que /herramientas/pdf/dividir, sin
// sesión, colgando de /imprimir/pdf. Mismo criterio que Unir PDF: el interruptor de
// "Disponible al público" bloquea del todo si está apagado; el WhatsApp es un extra, no
// bloquea si no hay sucursal con número configurado.
//
// `force-dynamic`: ver el comentario en ../../page.tsx — sin esto, `revalidatePath` no
// siempre gana la carrera contra el Full Route Cache de Vercel.
export const dynamic = 'force-dynamic';

export default async function ImprimirPdfDividirPage({
  searchParams,
}: {
  searchParams: Promise<{ sucursal?: string }>;
}) {
  const publica = await esHerramientaPublica('dividir');
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
      <DividirPdf whatsappNumber={destino?.whatsappNumber ?? undefined} />
    </main>
  );
}
