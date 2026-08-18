import { GeneradorRifas } from '@/tools/rifas/GeneradorRifas';

// Versión pública del generador de rifas: misma herramienta que /herramientas/rifas, sin
// sesión, colgando del índice público /imprimir. A diferencia de Acomoda Impresión
// pública, aquí no hay ninguna diferencia de capacidades entre versión interna y pública
// (nada de WhatsApp, nada de precios ocultos), así que ambas rutas montan el MISMO
// componente cliente de `src/tools/rifas/`.

export default function RifasPublicoPage() {
  return (
    <main className="min-h-dvh bg-papel px-4 py-6">
      <GeneradorRifas />
    </main>
  );
}
