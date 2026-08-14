import Link from 'next/link';

// Página de `forbidden()`: responde 403 de verdad, no un 404 que mentiría sobre lo ocurrido.

export default function Prohibido() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-md border border-linea-fuerte bg-white p-6 text-center shadow-impresa">
        <p className="font-mono text-micro uppercase text-sello">Error 403</p>
        <h1 className="mt-2 font-display text-titulo font-semibold text-tinta">
          No tienes permiso para ver esto
        </h1>
        <p className="mt-2 text-base text-grafito">
          Esta pantalla es solo para administración. Si crees que es un error, pídele acceso a quien
          administra el sistema.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block border border-linea-fuerte bg-white px-4 py-2 text-base font-medium text-tinta shadow-impresa hover:bg-papel-hondo"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
