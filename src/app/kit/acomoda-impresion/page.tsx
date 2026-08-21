import type { Metadata } from 'next';
import { and, asc, eq, isNotNull } from 'drizzle-orm';

import { HerramientaNoDisponible } from '@/components/HerramientaNoDisponible';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { esHerramientaPublica } from '@/lib/toolSettings';
import { ImprimirPublico } from './ImprimirPublico';

// Versión pública de Acomoda Impresión (Fase 7): sin cuenta, para que cualquier cliente
// arme su PDF desde el celular y lo mande por WhatsApp a la papelería. Fuera del grupo
// (app) a propósito, igual que el ticket: sin sesión ni navegación de admin, y el `proxy`
// la deja pasar (§ ver comentario ahí). La herramienta interna, con precios, no se toca.
//
// Cuelga de /kit, que es el índice de herramientas públicas (ver ../page.tsx) — esta
// es una de las tarjetas, no la raíz. Bloquea si el admin apagó el interruptor de
// "Disponible al público" en la pantalla interna, o si ninguna sucursal tiene WhatsApp.
//
// `force-dynamic`: sin esto, Vercel puede servir esta página desde el Full Route Cache y
// `revalidatePath` (en la Server Action del interruptor) no siempre la invalida a tiempo.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Acomodar impresión' };

export default async function AcomodaImpresionPublicoPage({
  searchParams,
}: {
  searchParams: Promise<{ sucursal?: string }>;
}) {
  const publica = await esHerramientaPublica('acomoda-impresion');
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

  if (!destino?.whatsappNumber) return <HerramientaNoDisponible />;

  return <ImprimirPublico whatsappNumber={destino.whatsappNumber} />;
}
