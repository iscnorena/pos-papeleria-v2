import Link from 'next/link';

// Mensaje compartido por las rutas públicas de /kit cuando una herramienta no está
// prendida (el interruptor de `tool_settings` en off) o le falta algún requisito (ej.
// Acomoda Impresión sin ninguna sucursal con WhatsApp cargado).
//
// Sin min-h-dvh/bg-papel propios: vive dentro del <main flex-1> de
// src/app/kit/layout.tsx, que ya los provee.

export function HerramientaNoDisponible() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="max-w-xs text-cuerpo text-grafito">
        Esta herramienta no está disponible por el momento.
      </p>
      <Link
        href="/kit"
        className="font-mono text-micro uppercase text-boligrafo hover:text-boligrafo-hondo"
      >
        Volver a herramientas
      </Link>
    </div>
  );
}
