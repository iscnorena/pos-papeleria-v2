'use client';

// Los dos botones que no se imprimen (`.acciones` desaparece en `@media print`).
// «Descargar PDF» con pdf-lib queda pendiente: se arma en la Fase 7, que es donde entra
// esa librería, y así no se carga en cada ticket de una caja que solo quiere imprimir.

export function BotonesTicket() {
  return (
    <div className="acciones">
      <button
        type="button"
        onClick={() => window.print()}
        className="min-h-[2.5rem] border border-boligrafo-hondo bg-boligrafo px-4 font-sans text-base font-medium text-white shadow-impresa"
      >
        Imprimir
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="min-h-[2.5rem] border border-linea-fuerte bg-white px-4 font-sans text-base font-medium text-tinta shadow-impresa"
      >
        Cerrar
      </button>
    </div>
  );
}
