import { NextResponse } from 'next/server';
import { z } from 'zod';

import { buscarEnBanco, llaveDe, NOMBRES } from '@/lib/bancosImagenes';
import { sesionActual } from '@/lib/sesion';

// §7.6 — búsqueda en bancos de imágenes.
//
// **Las llaves viven SOLO en el servidor** (§10): la petición pasa por aquí y el navegador
// recibe la lista ya normalizada. La descarga de la imagen grande también pasa por aquí,
// para evitar CORS y para no filtrar las llaves.

const esquema = z.object({
  proveedor: z.enum(['unsplash', 'pexels', 'pixabay']),
  texto: z.string().trim().min(1, 'Escribe qué buscar.'),
  cuantos: z.coerce.number().int().min(1).max(20).default(4),
});

export async function GET(peticion: Request) {
  // Aunque no toque la base, este endpoint gasta cuota de APIs de terceros: no se deja
  // abierto (§2).
  const sesion = await sesionActual();
  if (!sesion) return NextResponse.json({ error: 'Necesitas iniciar sesión.' }, { status: 401 });

  const url = new URL(peticion.url);
  const analisis = esquema.safeParse({
    proveedor: url.searchParams.get('proveedor'),
    texto: url.searchParams.get('texto'),
    cuantos: url.searchParams.get('cuantos') ?? 4,
  });

  if (!analisis.success) {
    return NextResponse.json(
      { error: analisis.error.issues[0]?.message ?? 'Búsqueda no válida.' },
      { status: 400 },
    );
  }

  const { proveedor, texto, cuantos } = analisis.data;
  const llave = llaveDe(proveedor);

  // Si falta la llave, el buscador lo dice en vez de reventar (§7.6, criterio 10).
  if (!llave) {
    return NextResponse.json(
      { error: `Configura la API Key de ${NOMBRES[proveedor]} para buscar.` },
      { status: 503 },
    );
  }

  try {
    const resultados = await buscarEnBanco(proveedor, llave, texto, cuantos);
    return NextResponse.json({ resultados });
  } catch {
    return NextResponse.json(
      { error: `No se pudo buscar en ${NOMBRES[proveedor]}. Inténtalo de nuevo.` },
      { status: 502 },
    );
  }
}
