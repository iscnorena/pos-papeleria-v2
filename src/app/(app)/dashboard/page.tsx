import { requerirSesion } from '@/lib/sesion';

// Tablero mínimo de la Fase 1: confirma quién entró y por qué puerta. El tablero de verdad
// (ventas de hoy, ganancia, turno abierto, existencias bajas) llega en la Fase 5.

export default async function Tablero() {
  const sesion = await requerirSesion();

  return (
    <section>
      <h1 className="font-display text-titulo font-semibold text-tinta">
        Buen día, {sesion.nombre}
      </h1>
      <p className="mt-2 text-cuerpo text-grafito">
        La sesión quedó abierta. Las pantallas de caja, catálogo y reportes llegan en las siguientes
        fases.
      </p>

      <dl className="mt-8 grid gap-px border border-linea-fuerte bg-linea-fuerte sm:grid-cols-3">
        <Dato etiqueta="Usuario" valor={sesion.nombre} />
        <Dato etiqueta="Rol" valor={sesion.rol} />
        <Dato etiqueta="Sucursal" valor={`#${sesion.branchId}`} />
      </dl>
    </section>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="font-mono text-micro uppercase text-grafito-claro">{etiqueta}</dt>
      <dd className="mt-1 text-cuerpo text-tinta">{valor}</dd>
    </div>
  );
}
