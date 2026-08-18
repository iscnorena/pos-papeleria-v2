import { NextResponse } from 'next/server';

import { ANFITRIONES_PERMITIDOS } from '@/lib/bancosImagenes';
import { sesionActual } from '@/lib/sesion';

// §7.6 — la descarga de la imagen grande también pasa por el servidor, para evitar CORS, y
// devuelve el binario al cliente, que lo mete al lote en memoria. La imagen NUNCA se
// guarda aquí: no hay dónde (§1.1) y §10 lo prohíbe explícitamente.

export async function GET(peticion: Request) {
  const sesion = await sesionActual();
  if (!sesion) return NextResponse.json({ error: 'Necesitas iniciar sesión.' }, { status: 401 });

  const destino = new URL(peticion.url).searchParams.get('url');
  if (!destino) return NextResponse.json({ error: 'Falta la imagen.' }, { status: 400 });

  let objetivo: URL;
  try {
    objetivo = new URL(destino);
  } catch {
    return NextResponse.json({ error: 'Dirección no válida.' }, { status: 400 });
  }

  // Sin esta comprobación, este endpoint sería un proxy abierto: cualquiera podría usarlo
  // para pedirle al servidor direcciones internas y leer la respuesta.
  if (objetivo.protocol !== 'https:' || !ANFITRIONES_PERMITIDOS.includes(objetivo.hostname)) {
    return NextResponse.json({ error: 'Esa imagen no es de un banco permitido.' }, { status: 400 });
  }

  try {
    const respuesta = await fetch(objetivo.toString());
    if (!respuesta.ok) throw new Error('descarga');

    const tipo = respuesta.headers.get('content-type') ?? 'image/jpeg';
    if (!tipo.startsWith('image/')) {
      return NextResponse.json({ error: 'Eso no es una imagen.' }, { status: 400 });
    }

    return new NextResponse(await respuesta.arrayBuffer(), {
      headers: { 'content-type': tipo, 'cache-control': 'private, max-age=3600' },
    });
  } catch {
    return NextResponse.json({ error: 'No se pudo traer la imagen.' }, { status: 502 });
  }
}
