import type { Metadata } from 'next';
import { and, asc, eq, isNotNull } from 'drizzle-orm';

import { CabeceraPublica } from '@/components/CabeceraPublica';
import { HerramientaNoDisponible } from '@/components/HerramientaNoDisponible';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { esHerramientaPublica } from '@/lib/toolSettings';
import { nombreSubDe, descripcionSubDe } from '@/tools/pdf/registro';
import { UnirPdf } from '@/tools/pdf/UnirPdf';

// Versión pública de Unir PDF: misma herramienta que /herramientas/pdf/unir, sin sesión,
// colgando de /kit/pdf. Mismo criterio que Rifas: el interruptor de "Disponible al
// público" bloquea del todo si está apagado; el WhatsApp es un extra, no bloquea si no
// hay sucursal con número configurado (a diferencia de Acomoda Impresión pública).
//
// `force-dynamic`: ver el comentario en ../../page.tsx — sin esto, `revalidatePath` no
// siempre gana la carrera contra el Full Route Cache de Vercel.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Unir PDF' };

export default async function ImprimirPdfUnirPage({
  searchParams,
}: {
  searchParams: Promise<{ sucursal?: string }>;
}) {
  const publica = await esHerramientaPublica('unir');
  if (!publica) return <HerramientaNoDisponible />;

  const idioma = await obtenerIdioma();
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
        titulo={nombreSubDe('unir', idioma)}
        descripcion={descripcionSubDe('unir', idioma)}
        volver={{ href: '/kit/pdf', texto: t(idioma, 'herramientas.nombrePdf') }}
      />
      <UnirPdf whatsappNumber={destino?.whatsappNumber ?? undefined} />
    </div>
  );
}
