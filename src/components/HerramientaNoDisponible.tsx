import Link from 'next/link';

import { obtenerIdioma, t } from '@/lib/i18n/servidor';

// Mensaje compartido por las rutas públicas de /kit cuando una herramienta no está
// prendida (el interruptor de `tool_settings` en off) o le falta algún requisito (ej.
// Acomoda Impresión sin ninguna sucursal con WhatsApp cargado).
//
// Sin min-h-dvh/bg-papel propios: vive dentro del <main flex-1> de
// src/app/kit/layout.tsx, que ya los provee.

export async function HerramientaNoDisponible() {
  const idioma = await obtenerIdioma();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="max-w-xs text-cuerpo text-grafito">
        {t(idioma, 'herramientaNoDisponible.mensaje')}
      </p>
      <Link
        href="/kit"
        className="font-mono text-micro uppercase text-boligrafo hover:text-boligrafo-hondo"
      >
        {t(idioma, 'herramientaNoDisponible.volver')}
      </Link>
    </div>
  );
}
