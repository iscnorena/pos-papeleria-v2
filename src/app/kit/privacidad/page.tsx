import type { Metadata } from 'next';
import { asc, eq } from 'drizzle-orm';

import { CabeceraPublica } from '@/components/CabeceraPublica';
import { POS, SEGURIDAD } from '@/config/pos';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';

// Aviso de privacidad simplificado (LFPDPPP) de la sección pública /kit. Redactado
// contra lo que el código realmente hace, no contra una plantilla genérica — ver la
// auditoría que lo motivó: ningún archivo ni texto que el visitante suba o escriba en
// estas herramientas llega al servidor (todo se procesa en el navegador con `pdf-lib`);
// lo único que sí se guarda es la IP de quien usa "Buscar gratis" en Acomoda Impresión,
// solo para limitar abusos, y se purga sola (`SEGURIDAD.retencionIntentosMs`, ver
// `src/lib/limiteIntentos.ts`).

export const metadata: Metadata = { title: 'Aviso de privacidad' };

// Sin esto, Next puede servir esta página desde el Full Route Cache con la lista de
// sucursales congelada del build (ver el mismo comentario en `src/app/kit/page.tsx`):
// si se edita dirección/teléfono en /sucursales, esta página debe reflejarlo sin esperar
// un redeploy.
export const dynamic = 'force-dynamic';

export default async function PantallaAvisoPrivacidad() {
  const idioma = await obtenerIdioma();
  const sucursales = await db
    .select({ name: branches.name, address: branches.address, phone: branches.phone })
    .from(branches)
    .where(eq(branches.isActive, true))
    .orderBy(asc(branches.name));

  const retencionDias = Math.round(SEGURIDAD.retencionIntentosMs / (24 * 60 * 60 * 1000));

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      <CabeceraPublica
        titulo={t(idioma, 'privacidad.titulo')}
        volver={{ href: '/kit', texto: t(idioma, 'nav.herramientas') }}
      />

      <div className="flex flex-col gap-4 text-fino text-tinta">
        <p>
          <strong>{POS.nombreNegocio}</strong> {t(idioma, 'privacidad.esResponsable')}
        </p>

        <section>
          <h2 className="mb-1 font-mono text-micro uppercase text-grafito">
            {t(idioma, 'privacidad.seccionArchivos')}
          </h2>
          <p>{t(idioma, 'privacidad.textoArchivos')}</p>
        </section>

        <section>
          <h2 className="mb-1 font-mono text-micro uppercase text-grafito">
            {t(idioma, 'privacidad.seccionRegistramos')}
          </h2>
          <p>{t(idioma, 'privacidad.textoRegistramos', { dias: retencionDias })}</p>
        </section>

        <section>
          <h2 className="mb-1 font-mono text-micro uppercase text-grafito">
            {t(idioma, 'privacidad.seccionTransferencias')}
          </h2>
          <p>{t(idioma, 'privacidad.textoTransferencias')}</p>
        </section>

        <section>
          <h2 className="mb-1 font-mono text-micro uppercase text-grafito">
            {t(idioma, 'privacidad.seccionDerechos')}
          </h2>
          <p>{t(idioma, 'privacidad.acudeSucursales')}</p>
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

        <p className="text-micro text-grafito-claro">{t(idioma, 'privacidad.notaActualizacion')}</p>
      </div>
    </div>
  );
}
