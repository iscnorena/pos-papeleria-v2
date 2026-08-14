import { NextResponse } from 'next/server';
import { z } from 'zod';

import { sesionActual } from '@/lib/sesion';

// §7.6 — búsqueda en bancos de imágenes.
//
// **Las llaves viven SOLO en el servidor** (§10): la petición pasa por aquí y el navegador
// recibe la lista ya normalizada. La descarga de la imagen grande también pasa por aquí,
// para evitar CORS y para no filtrar las llaves.

export type ImagenDeBanco = {
  id: string;
  previewUrl: string;
  largeImageUrl: string;
  tags: string;
};

type Proveedor = 'unsplash' | 'pexels' | 'pixabay';

const NOMBRES: Record<Proveedor, string> = {
  unsplash: 'Unsplash',
  pexels: 'Pexels',
  pixabay: 'Pixabay',
};

const LLAVES: Record<Proveedor, () => string | undefined> = {
  unsplash: () => process.env.UNSPLASH_ACCESS_KEY,
  pexels: () => process.env.PEXELS_API_KEY,
  pixabay: () => process.env.PIXABAY_API_KEY,
};

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
  const llave = LLAVES[proveedor]();

  // Si falta la llave, el buscador lo dice en vez de reventar (§7.6, criterio 10).
  if (!llave) {
    return NextResponse.json(
      { error: `Configura la API Key de ${NOMBRES[proveedor]} para buscar.` },
      { status: 503 },
    );
  }

  try {
    const resultados = await buscar(proveedor, llave, texto, cuantos);
    return NextResponse.json({ resultados });
  } catch {
    return NextResponse.json(
      { error: `No se pudo buscar en ${NOMBRES[proveedor]}. Inténtalo de nuevo.` },
      { status: 502 },
    );
  }
}

async function buscar(
  proveedor: Proveedor,
  llave: string,
  texto: string,
  cuantos: number,
): Promise<ImagenDeBanco[]> {
  if (proveedor === 'unsplash') {
    const respuesta = await fetch(
      `https://api.unsplash.com/search/photos?client_id=${encodeURIComponent(llave)}&query=${encodeURIComponent(texto)}&per_page=${cuantos}`,
    );
    if (!respuesta.ok) throw new Error('unsplash');
    const datos = (await respuesta.json()) as {
      results?: {
        id: string;
        urls?: { small?: string; regular?: string };
        alt_description?: string;
      }[];
    };
    return (datos.results ?? []).map((r) => ({
      id: String(r.id),
      previewUrl: r.urls?.small ?? '',
      largeImageUrl: r.urls?.regular ?? '',
      tags: r.alt_description ?? '',
    }));
  }

  if (proveedor === 'pexels') {
    const respuesta = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(texto)}&per_page=${cuantos}`,
      { headers: { Authorization: llave } },
    );
    if (!respuesta.ok) throw new Error('pexels');
    const datos = (await respuesta.json()) as {
      photos?: { id: number; src?: { medium?: string; large?: string }; alt?: string }[];
    };
    return (datos.photos ?? []).map((p) => ({
      id: String(p.id),
      previewUrl: p.src?.medium ?? '',
      largeImageUrl: p.src?.large ?? '',
      tags: p.alt ?? '',
    }));
  }

  const respuesta = await fetch(
    `https://pixabay.com/api/?key=${encodeURIComponent(llave)}&q=${encodeURIComponent(texto)}&per_page=${cuantos}&image_type=photo`,
  );
  if (!respuesta.ok) throw new Error('pixabay');
  const datos = (await respuesta.json()) as {
    hits?: { id: number; previewURL?: string; largeImageURL?: string; tags?: string }[];
  };
  return (datos.hits ?? []).map((h) => ({
    id: String(h.id),
    previewUrl: h.previewURL ?? '',
    largeImageUrl: h.largeImageURL ?? '',
    tags: h.tags ?? '',
  }));
}
