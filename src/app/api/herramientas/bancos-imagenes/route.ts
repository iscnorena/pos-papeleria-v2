import { NextResponse } from 'next/server';
import { z } from 'zod';

import { buscarEnBanco, llaveDe, NOMBRES } from '@/lib/bancosImagenes';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { sesionActual } from '@/lib/sesion';

// §7.6 — búsqueda en bancos de imágenes.
//
// **Las llaves viven SOLO en el servidor** (§10): la petición pasa por aquí y el navegador
// recibe la lista ya normalizada. La descarga de la imagen grande también pasa por aquí,
// para evitar CORS y para no filtrar las llaves.

export async function GET(peticion: Request) {
  const idioma = await obtenerIdioma();

  // Aunque no toque la base, este endpoint gasta cuota de APIs de terceros: no se deja
  // abierto (§2).
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.json({ error: t(idioma, 'bancos.necesitasSesion') }, { status: 401 });
  }

  const esquema = z.object({
    proveedor: z.enum(['unsplash', 'pexels', 'pixabay']),
    texto: z.string().trim().min(1, t(idioma, 'bancos.escribeQueBuscar')),
    cuantos: z.coerce.number().int().min(1).max(20).default(4),
  });

  const url = new URL(peticion.url);
  const analisis = esquema.safeParse({
    proveedor: url.searchParams.get('proveedor'),
    texto: url.searchParams.get('texto'),
    cuantos: url.searchParams.get('cuantos') ?? 4,
  });

  if (!analisis.success) {
    return NextResponse.json(
      { error: analisis.error.issues[0]?.message ?? t(idioma, 'bancos.busquedaNoValida') },
      { status: 400 },
    );
  }

  const { proveedor, texto, cuantos } = analisis.data;
  const llave = llaveDe(proveedor);

  // Si falta la llave, el buscador lo dice en vez de reventar (§7.6, criterio 10).
  if (!llave) {
    return NextResponse.json(
      { error: t(idioma, 'bancos.configuraLaLlave', { proveedor: NOMBRES[proveedor] }) },
      { status: 503 },
    );
  }

  try {
    const resultados = await buscarEnBanco(proveedor, llave, texto, cuantos);
    return NextResponse.json({ resultados });
  } catch {
    return NextResponse.json(
      { error: t(idioma, 'bancos.noSePudoBuscarEn', { proveedor: NOMBRES[proveedor] }) },
      { status: 502 },
    );
  }
}
