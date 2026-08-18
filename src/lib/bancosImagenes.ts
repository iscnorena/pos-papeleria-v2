import 'server-only';

// §7.6 — búsqueda y descarga en bancos de imágenes gratuitos, compartido entre la
// herramienta interna (con sesión) y la pública de /imprimir/acomoda-impresion (con límite por IP en vez de
// sesión). Las llaves viven SOLO aquí, en el servidor (§10).

export type ImagenDeBanco = {
  id: string;
  previewUrl: string;
  largeImageUrl: string;
  tags: string;
};

export type Proveedor = 'unsplash' | 'pexels' | 'pixabay';

export const NOMBRES: Record<Proveedor, string> = {
  unsplash: 'Unsplash',
  pexels: 'Pexels',
  pixabay: 'Pixabay',
};

const LLAVES: Record<Proveedor, () => string | undefined> = {
  unsplash: () => process.env.UNSPLASH_ACCESS_KEY,
  pexels: () => process.env.PEXELS_API_KEY,
  pixabay: () => process.env.PIXABAY_API_KEY,
};

export function llaveDe(proveedor: Proveedor): string | undefined {
  return LLAVES[proveedor]();
}

export async function buscarEnBanco(
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

/** Solo se descargan imágenes de los tres bancos, no de una URL cualquiera. */
export const ANFITRIONES_PERMITIDOS = [
  'images.unsplash.com',
  'images.pexels.com',
  'pixabay.com',
  'cdn.pixabay.com',
];
