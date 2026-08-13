// Fase 0: página en blanco con el fondo `papel` y un título en `display`.
// Sirve de prueba visual de que las fuentes autoalojadas cargaron (§4) y de que
// el despliegue de producción responde.

const MUESTRAS = [
  { clase: 'font-display', nombre: 'display · Archivo', muestra: 'Cobrar · Turno · Ñandú' },
  {
    clase: 'font-sans',
    nombre: 'sans · Atkinson Hyperlegible Next',
    muestra: 'Cobrar · Turno · Ñandú',
  },
  { clase: 'font-mono', nombre: 'mono · IBM Plex Mono', muestra: 'BR1-20260813-0007' },
] as const;

export default function Página() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-micro uppercase text-grafito-claro">Fase 0 · andamiaje</p>

      <h1 className="mt-2 font-display text-titulo font-semibold text-tinta">POS Papelería</h1>

      <p className="mt-3 text-cuerpo text-grafito">
        El andamiaje quedó en pie. Si esta página se ve en papel color hueso y los tres renglones de
        abajo salen en tres tipografías distintas, las fuentes cargaron bien.
      </p>

      <section className="mt-10 border border-linea-fuerte bg-white p-5 shadow-impresa">
        <h2 className="font-mono text-micro uppercase text-grafito">Prueba de tipografía</h2>
        <dl className="mt-4 divide-y divide-linea">
          {MUESTRAS.map(({ clase, nombre, muestra }) => (
            <div
              key={nombre}
              className="flex min-h-renglon flex-wrap items-baseline justify-between gap-x-6 py-2"
            >
              <dt className="text-fino text-grafito">{nombre}</dt>
              <dd className={`${clase} text-cuerpo text-tinta`}>{muestra}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-10 border-t border-linea pt-4 text-fino text-grafito-claro">
        Siguiente: Fase 1 — autenticación. Ver <span className="font-mono">docs/prompt.md</span>.
      </p>
    </main>
  );
}
