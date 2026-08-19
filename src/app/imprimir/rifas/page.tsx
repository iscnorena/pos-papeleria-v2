import { and, asc, eq, isNotNull } from 'drizzle-orm';

import { HerramientaNoDisponible } from '@/components/HerramientaNoDisponible';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { esHerramientaPublica } from '@/lib/toolSettings';
import { GeneradorRifas } from '@/tools/rifas/GeneradorRifas';

// Versión pública del generador de rifas: misma herramienta que /herramientas/rifas, sin
// sesión, colgando del índice público /imprimir. A diferencia de Acomoda Impresión
// pública, aquí no hay diferencia de CAPACIDADES entre versión interna y pública (mismo
// componente GeneradorRifas en las dos) — la única diferencia es que esta ruta, al
// resolver una sucursal con WhatsApp, le pasa el número para que aparezca el botón
// "Enviar por WhatsApp" junto al de "Descargar PDF". Si no hay ninguna sucursal con
// WhatsApp configurado, la página igual funciona: solo queda la descarga directa (a
// diferencia de /imprimir/acomoda-impresion, que SOLO tiene WhatsApp y por eso sí bloquea
// del todo sin número). Lo que SÍ bloquea del todo es el interruptor de "Disponible al
// público" — si el admin lo apagó, ni la URL directa sirve.
//
// `force-dynamic`: sin esto, Vercel puede servir esta página desde el Full Route Cache y
// `revalidatePath` (en la Server Action del interruptor) no siempre la invalida a tiempo.
export const dynamic = 'force-dynamic';

export default async function RifasPublicoPage({
  searchParams,
}: {
  searchParams: Promise<{ sucursal?: string }>;
}) {
  const publica = await esHerramientaPublica('rifas');
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
      <GeneradorRifas whatsappNumber={destino?.whatsappNumber ?? undefined} />
    </main>
  );
}
