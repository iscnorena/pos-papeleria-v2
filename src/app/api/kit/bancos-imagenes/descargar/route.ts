import { NextResponse } from 'next/server';

import { ANFITRIONES_PERMITIDOS } from '@/lib/bancosImagenes';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { anotarIntento, intentosRecientes, ipDelCliente } from '@/lib/limiteIntentos';

// Versión pública de la descarga-proxy de imágenes, para /kit. Mismo límite por IP
// que la búsqueda (comparten el mismo `kind`, es un solo presupuesto por visitante).

const KIND = 'busqueda_imagenes_publica';
const MAX_INTENTOS = 8;
const VENTANA_MINUTOS = 10;

export async function GET(peticion: Request) {
  const idioma = await obtenerIdioma();
  const ip = await ipDelCliente();
  if ((await intentosRecientes(ip, KIND, VENTANA_MINUTOS)) >= MAX_INTENTOS) {
    return NextResponse.json({ error: t(idioma, 'bancos.demasiadasDescargas') }, { status: 429 });
  }

  const destino = new URL(peticion.url).searchParams.get('url');
  if (!destino)
    return NextResponse.json({ error: t(idioma, 'bancos.faltaLaImagen') }, { status: 400 });

  let objetivo: URL;
  try {
    objetivo = new URL(destino);
  } catch {
    return NextResponse.json({ error: t(idioma, 'bancos.direccionNoValida') }, { status: 400 });
  }

  if (objetivo.protocol !== 'https:' || !ANFITRIONES_PERMITIDOS.includes(objetivo.hostname)) {
    return NextResponse.json({ error: t(idioma, 'bancos.bancoNoPermitido') }, { status: 400 });
  }

  await anotarIntento(ip, KIND);

  try {
    const respuesta = await fetch(objetivo.toString());
    if (!respuesta.ok) throw new Error('descarga');

    const tipo = respuesta.headers.get('content-type') ?? 'image/jpeg';
    if (!tipo.startsWith('image/')) {
      return NextResponse.json({ error: t(idioma, 'bancos.noEsUnaImagen') }, { status: 400 });
    }

    return new NextResponse(await respuesta.arrayBuffer(), {
      headers: { 'content-type': tipo, 'cache-control': 'private, max-age=3600' },
    });
  } catch {
    return NextResponse.json({ error: t(idioma, 'bancos.noSePudoTraerImagen') }, { status: 502 });
  }
}
