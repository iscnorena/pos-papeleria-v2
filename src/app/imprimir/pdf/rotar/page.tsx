import type { Metadata } from 'next';
import { and, asc, eq, isNotNull } from 'drizzle-orm';

import { CabeceraPublica } from '@/components/CabeceraPublica';
import { HerramientaNoDisponible } from '@/components/HerramientaNoDisponible';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { esHerramientaPublica } from '@/lib/toolSettings';
import { RotarPdf } from '@/tools/pdf/RotarPdf';

// Versión pública de Rotar páginas: misma herramienta que /herramientas/pdf/rotar, sin
// sesión, colgando de /imprimir/pdf. Mismo criterio que las demás herramientas de PDF: el
// interruptor de "Disponible al público" bloquea del todo si está apagado; el WhatsApp es
// un extra, no bloquea si no hay sucursal con número configurado.
//
// `force-dynamic`: ver el comentario en ../../page.tsx — sin esto, `revalidatePath` no
// siempre gana la carrera contra el Full Route Cache de Vercel.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Rotar páginas' };

export default async function ImprimirPdfRotarPage({
  searchParams,
}: {
  searchParams: Promise<{ sucursal?: string }>;
}) {
  const publica = await esHerramientaPublica('rotar');
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
    <div className="mx-auto w-full max-w-md px-4 py-6">
      <CabeceraPublica
        titulo="Rotar páginas"
        descripcion="Gira las páginas de un PDF, todas o solo algunas."
        volver={{ href: '/imprimir/pdf', texto: 'Herramientas de PDF' }}
      />
      <RotarPdf whatsappNumber={destino?.whatsappNumber ?? undefined} />
    </div>
  );
}
