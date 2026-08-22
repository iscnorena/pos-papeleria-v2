import type { Metadata } from 'next';
import { and, asc, eq, isNotNull } from 'drizzle-orm';

import { CabeceraPublica } from '@/components/CabeceraPublica';
import { HerramientaNoDisponible } from '@/components/HerramientaNoDisponible';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { esHerramientaPublica } from '@/lib/toolSettings';
import { GeneradorRifas } from '@/tools/rifas/GeneradorRifas';

// Versión pública del generador de rifas: misma herramienta que /herramientas/rifas, sin
// sesión, colgando del índice público /kit. A diferencia de Acomoda Impresión
// pública, aquí no hay diferencia de CAPACIDADES entre versión interna y pública (mismo
// componente GeneradorRifas en las dos) — la única diferencia es que esta ruta, al
// resolver una sucursal con WhatsApp, le pasa el número para que aparezca el botón
// "Enviar por WhatsApp" junto al de "Descargar PDF". Si no hay ninguna sucursal con
// WhatsApp configurado, la página igual funciona: solo queda la descarga directa (a
// diferencia de /kit/acomoda-impresion, que SOLO tiene WhatsApp y por eso sí bloquea
// del todo sin número). Lo que SÍ bloquea del todo es el interruptor de "Disponible al
// público" — si el admin lo apagó, ni la URL directa sirve.
//
// `force-dynamic`: sin esto, Vercel puede servir esta página desde el Full Route Cache y
// `revalidatePath` (en la Server Action del interruptor) no siempre la invalida a tiempo.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Números de rifa' };

export default async function RifasPublicoPage({
  searchParams,
}: {
  searchParams: Promise<{ sucursal?: string }>;
}) {
  const publica = await esHerramientaPublica('rifas');
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
        titulo={t(idioma, 'herramientas.nombreRifas')}
        descripcion={t(idioma, 'herramientas.descRifas')}
        volver={{ href: '/kit', texto: t(idioma, 'nav.herramientas') }}
      />
      <GeneradorRifas whatsappNumber={destino?.whatsappNumber ?? undefined} />
    </div>
  );
}
