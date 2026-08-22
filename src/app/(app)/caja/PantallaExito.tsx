'use client';

import Link from 'next/link';

import { Boton } from '@/components/ui/Boton';
import { useIdioma } from '@/lib/i18n/cliente';
import { formatear } from '@/lib/money';
import type { VentaRegistrada } from './acciones';

// Tras cobrar: el folio, el cambio a devolver EN GRANDE y los dos botones. El cambio es lo
// único que la cajera necesita leer en ese segundo, así que va en el escalón `total`.

export function PantallaExito({
  venta,
  onNuevaVenta,
}: {
  venta: VentaRegistrada;
  onNuevaVenta: () => void;
}) {
  const { t } = useIdioma();
  return (
    <section className="mx-auto max-w-md border border-linea-fuerte bg-white p-6 text-center shadow-impresa">
      <p className="font-mono text-micro uppercase text-visto">{t('caja.ventaCobrada')}</p>
      <p className="mt-1 font-mono text-cuerpo text-tinta">{venta.folio}</p>

      <p className="mt-6 text-cuerpo text-grafito">{t('caja.cambioADevolver')}</p>
      <p className="tabular font-display text-total font-semibold text-tinta">
        {formatear(venta.cambio)}
      </p>

      <p className="mt-2 text-fino text-grafito-claro">
        {t('caja.totalCobrado', { monto: formatear(venta.total) })}
      </p>

      <div className="mt-8 flex flex-col gap-2">
        {/* El foco arranca aquí: así se encadena una venta tras otra sin tocar el mouse. */}
        <Boton tamano="tecla" onClick={onNuevaVenta} autoFocus>
          {t('caja.nuevaVenta')}
        </Boton>
        <Link
          href={`/ticket/${venta.token}`}
          target="_blank"
          className="inline-flex min-h-tecla items-center justify-center border border-linea-fuerte bg-white px-4 text-cuerpo font-medium text-tinta shadow-impresa hover:bg-papel-hondo"
        >
          {t('caja.imprimirTicket')}
        </Link>
      </div>
    </section>
  );
}
