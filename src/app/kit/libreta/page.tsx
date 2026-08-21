import type { Metadata } from 'next';
import { and, asc, eq, isNotNull } from 'drizzle-orm';

import { CabeceraPublica } from '@/components/CabeceraPublica';
import { HerramientaNoDisponible } from '@/components/HerramientaNoDisponible';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { esHerramientaPublica } from '@/lib/toolSettings';
import { GeneradorLibreta } from '@/tools/libreta/GeneradorLibreta';

// Versión pública de Hoja de libreta: misma herramienta que /herramientas/libreta, sin
// sesión, colgando de /kit. Mismo criterio que las demás herramientas del catálogo:
// el interruptor de "Disponible al público" bloquea del todo si está apagado; el
// WhatsApp es un extra, no bloquea si no hay sucursal con número configurado.
//
// `force-dynamic`: ver el comentario en ../page.tsx — sin esto, `revalidatePath` no
// siempre gana la carrera contra el Full Route Cache de Vercel.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Hoja de libreta' };

export default async function ImprimirLibretaPage({
  searchParams,
}: {
  searchParams: Promise<{ sucursal?: string }>;
}) {
  const publica = await esHerramientaPublica('libreta');
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
        titulo="Hoja de libreta"
        descripcion="Genera hojas con rayado o cuadrícula, con los datos del alumno."
        volver={{ href: '/kit', texto: 'Herramientas' }}
      />
      <GeneradorLibreta whatsappNumber={destino?.whatsappNumber ?? undefined} />
    </div>
  );
}
