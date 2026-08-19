import Link from 'next/link';

import { POS } from '@/config/pos';
import { idsPrivadosEntre } from '@/lib/toolSettings';
import { subHerramientasPdfListas } from '@/tools/pdf/registro';

// Índice público de "Herramientas de PDF", sin sesión — cuelga de /imprimir. Mismo
// criterio que el índice principal: pública por defecto, cada sub-herramienta desaparece
// solo si su interruptor en `tool_settings` se apagó a mano.
//
// `force-dynamic`: ver el comentario en ../page.tsx — sin esto, `revalidatePath` no
// siempre gana la carrera contra el Full Route Cache de Vercel.
export const dynamic = 'force-dynamic';

export default async function ImprimirPdfPage() {
  const listas = subHerramientasPdfListas();
  const idsPrivados = await idsPrivadosEntre(listas.map((s) => s.id));
  const disponibles = listas.filter((s) => !idsPrivados.has(s.id));

  return (
    <main className="min-h-dvh bg-papel pb-10">
      <header className="border-b border-linea-fuerte bg-white px-4 py-3">
        <h1 className="font-display text-cuerpo font-semibold text-tinta">{POS.nombreNegocio}</h1>
        <p className="text-fino text-grafito">Herramientas de PDF</p>
      </header>

      <ul className="mx-auto flex max-w-md flex-col gap-3 px-4 py-5">
        {disponibles.map((sub) => {
          const Icono = sub.icono;
          return (
            <li key={sub.id}>
              <Link
                href={sub.rutaPublica}
                className="flex items-center gap-3 border border-linea-fuerte bg-white p-4 shadow-impresa transition-colors duration-avance hover:bg-papel-hondo"
              >
                <span className="text-tinta">
                  <Icono />
                </span>
                <span>
                  <span className="block font-display text-cuerpo font-semibold text-tinta">
                    {sub.nombre}
                  </span>
                  <span className="block text-fino text-grafito">{sub.descripcion}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {disponibles.length === 0 && (
        <p className="mx-auto max-w-md px-4 text-center text-base text-grafito">
          Por el momento no hay herramientas de PDF disponibles.
        </p>
      )}
    </main>
  );
}
