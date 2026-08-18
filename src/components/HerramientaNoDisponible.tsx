// Mensaje compartido por las rutas públicas de /imprimir cuando una herramienta no está
// prendida (el interruptor de `tool_settings` en off) o le falta algún requisito (ej.
// Acomoda Impresión sin ninguna sucursal con WhatsApp cargado).

export function HerramientaNoDisponible() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-papel p-6 text-center">
      <p className="max-w-xs text-cuerpo text-grafito">
        Esta herramienta no está disponible por el momento.
      </p>
    </main>
  );
}
