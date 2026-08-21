import type { Metadata } from 'next';
import { asc, eq } from 'drizzle-orm';

import { CabeceraPublica } from '@/components/CabeceraPublica';
import { POS, SEGURIDAD } from '@/config/pos';
import { db } from '@/db';
import { branches } from '@/db/schema';

// Aviso de privacidad simplificado (LFPDPPP) de la sección pública /imprimir. Redactado
// contra lo que el código realmente hace, no contra una plantilla genérica — ver la
// auditoría que lo motivó: ningún archivo ni texto que el visitante suba o escriba en
// estas herramientas llega al servidor (todo se procesa en el navegador con `pdf-lib`);
// lo único que sí se guarda es la IP de quien usa "Buscar gratis" en Acomoda Impresión,
// solo para limitar abusos, y se purga sola (`SEGURIDAD.retencionIntentosMs`, ver
// `src/lib/limiteIntentos.ts`).

export const metadata: Metadata = { title: 'Aviso de privacidad' };

// Sin esto, Next puede servir esta página desde el Full Route Cache con la lista de
// sucursales congelada del build (ver el mismo comentario en `src/app/imprimir/page.tsx`):
// si se edita dirección/teléfono en /sucursales, esta página debe reflejarlo sin esperar
// un redeploy.
export const dynamic = 'force-dynamic';

export default async function PantallaAvisoPrivacidad() {
  const sucursales = await db
    .select({ name: branches.name, address: branches.address, phone: branches.phone })
    .from(branches)
    .where(eq(branches.isActive, true))
    .orderBy(asc(branches.name));

  const retencionDias = Math.round(SEGURIDAD.retencionIntentosMs / (24 * 60 * 60 * 1000));

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      <CabeceraPublica
        titulo="Aviso de privacidad"
        volver={{ href: '/imprimir', texto: 'Herramientas' }}
      />

      <div className="flex flex-col gap-4 text-fino text-tinta">
        <p>
          <strong>{POS.nombreNegocio}</strong> es el responsable del tratamiento de los datos
          personales que se describen en este aviso, conforme a la Ley Federal de Protección de
          Datos Personales en Posesión de los Particulares (LFPDPPP).
        </p>

        <section>
          <h2 className="mb-1 font-mono text-micro uppercase text-grafito">
            Tus archivos y lo que escribes
          </h2>
          <p>
            Los PDF que subes a Dividir, Unir, Rotar, Numerar y Reordenar; las fotos que subes en
            Acomodar impresión; y el texto y las imágenes que capturas en Hoja de libreta y
            Generador de Rifas se procesan por completo dentro de tu propio navegador. Ninguno de
            esos archivos ni datos se envía a nuestros servidores ni se guarda en ningún lado —
            cuando cierras o recargas la página, desaparecen.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-mono text-micro uppercase text-grafito">
            Lo único que sí registramos
          </h2>
          <p>
            Al usar &quot;Buscar gratis&quot; en Acomodar impresión (búsqueda de fotos de bancos de
            imágenes), registramos tu dirección IP únicamente para limitar cuántas búsquedas puedes
            hacer en poco tiempo y evitar abusos del servicio. Esa IP se borra automáticamente a los{' '}
            {retencionDias} días; no se usa para ningún otro fin.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-mono text-micro uppercase text-grafito">Transferencias</h2>
          <p>
            Esa misma búsqueda manda tu término de búsqueda (no tu IP ni ningún otro dato tuyo) a
            los bancos de imágenes Unsplash, Pexels o Pixabay para traerte resultados. No
            compartimos tus archivos, tu IP ni ningún otro dato personal con nadie más.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-mono text-micro uppercase text-grafito">
            Ejercer tus derechos (acceso, rectificación, cancelación u oposición)
          </h2>
          <p>Puedes acudir directamente a cualquiera de nuestras sucursales:</p>
          <ul className="mt-2 flex flex-col gap-2">
            {sucursales.map((s) => (
              <li key={s.name} className="border border-linea-fuerte bg-white p-2">
                <p className="font-medium text-tinta">{s.name}</p>
                {s.address && <p className="text-grafito">{s.address}</p>}
                {s.phone && <p className="text-grafito">{s.phone}</p>}
              </li>
            ))}
          </ul>
        </section>

        <p className="text-micro text-grafito-claro">
          Este aviso puede actualizarse; los cambios aplican desde que se publican en esta misma
          página.
        </p>
      </div>
    </div>
  );
}
