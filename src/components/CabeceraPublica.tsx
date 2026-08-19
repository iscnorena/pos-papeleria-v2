import Link from 'next/link';

// Título de pantalla para las páginas de /imprimir (sin sesión). El nombre del negocio
// ya vive en la franja de arriba (src/app/imprimir/layout.tsx); esto es el título de
// CADA herramienta, con su link de regreso al índice del que cuelga.

export function CabeceraPublica({
  titulo,
  descripcion,
  volver,
}: {
  titulo: string;
  descripcion?: string;
  volver?: { href: string; texto: string };
}) {
  return (
    <div className="mb-5 border-b border-linea-fuerte pb-3">
      {volver && (
        <Link
          href={volver.href}
          className="mb-2 inline-block font-mono text-micro uppercase text-grafito hover:text-tinta"
        >
          ← {volver.texto}
        </Link>
      )}
      <h1 className="font-display text-titulo font-semibold text-tinta">{titulo}</h1>
      {descripcion && <p className="mt-1 text-fino text-grafito">{descripcion}</p>}
    </div>
  );
}
