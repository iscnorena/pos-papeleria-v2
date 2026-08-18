import { NextResponse } from 'next/server';
import { z } from 'zod';

import { buscarEnBanco, llaveDe, NOMBRES } from '@/lib/bancosImagenes';
import { anotarIntento, intentosRecientes, ipDelCliente } from '@/lib/limiteIntentos';

// Versión pública (sin sesión) de la búsqueda en bancos de imágenes, para /imprimir. En vez
// de exigir sesión de empleado, limita por IP — igual que el PIN del login — para no dejar
// que cualquiera vacíe la cuota de Unsplash/Pexels/Pixabay de la papelería.

const KIND = 'busqueda_imagenes_publica';
const MAX_INTENTOS = 8;
const VENTANA_MINUTOS = 10;

const esquema = z.object({
  proveedor: z.enum(['unsplash', 'pexels', 'pixabay']),
  texto: z.string().trim().min(1, 'Escribe qué buscar.'),
  cuantos: z.coerce.number().int().min(1).max(20).default(4),
});

export async function GET(peticion: Request) {
  const ip = await ipDelCliente();
  if ((await intentosRecientes(ip, KIND, VENTANA_MINUTOS)) >= MAX_INTENTOS) {
    return NextResponse.json(
      { error: 'Demasiadas búsquedas, espera unos minutos.' },
      { status: 429 },
    );
  }

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

  if (!llave) {
    return NextResponse.json(
      { error: `Configura la API Key de ${NOMBRES[proveedor]} para buscar.` },
      { status: 503 },
    );
  }

  // Se anota ANTES de gastar la cuota del proveedor: el límite tiene que frenar el gasto,
  // no solo contarlo después.
  await anotarIntento(ip, KIND);

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
