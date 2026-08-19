'use client';

import { useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { compartirPdfPorWhatsapp } from '@/lib/compartirPorWhatsapp';
import { tamanoArchivo } from '@/lib/formato';
import { cargarPdf, type ArchivoPdf } from './pdfArchivo';
import { analizarOrden, reordenarPdf, textoOrdenActual, textoOrdenInvertido } from './reordenar';

// Componente único, compartido por la ruta interna (/herramientas/pdf/reordenar, con
// sesión) y la pública (/imprimir/pdf/reordenar, sin sesión) — mismo patrón que las demás
// herramientas de PDF.
//
// Sin vista previa de páginas (pdf-lib no las puede renderizar como imagen): el campo se
// precarga con el orden actual ("1, 2, 3, ...") para que baste mover un par de números en
// vez de escribir todo desde cero, y "Invertir orden" cubre el caso más común (un
// escáner dúplex que entregó las hojas al revés).

const TEXTO_WHATSAPP = 'Hola, les mando este PDF ya reordenado.';

export function ReordenarPdf({ whatsappNumber }: { whatsappNumber?: string } = {}) {
  const [archivo, setArchivo] = useState<ArchivoPdf | null>(null);
  const [ordenTexto, setOrdenTexto] = useState('');
  const [generando, setGenerando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tono: 'error' | 'neutro' } | null>(null);

  async function cargarArchivo(lista: FileList | null) {
    const elegido = lista?.[0];
    if (!elegido) return;
    setAviso(null);
    try {
      const cargado = await cargarPdf(elegido);
      setArchivo(cargado);
      setOrdenTexto(textoOrdenActual(cargado.paginas));
    } catch {
      setAviso({
        texto: 'Ese archivo no es un PDF válido (o está dañado). Intenta con otro.',
        tono: 'error',
      });
    }
  }

  /** Valida el orden escrito contra `archivo`; si algo falla, deja el aviso puesto y
   * devuelve `null`. */
  function validarOrden(): number[] | null {
    if (!archivo) return null;
    try {
      return analizarOrden(ordenTexto, archivo.paginas);
    } catch (error) {
      setAviso({ texto: (error as Error).message, tono: 'error' });
      return null;
    }
  }

  async function reordenarYDescargar() {
    setAviso(null);
    const orden = validarOrden();
    if (!orden || !archivo) return;

    setGenerando(true);
    try {
      const bytes = await reordenarPdf(archivo.bytes, orden);
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `${archivo.nombre.replace(/\.pdf$/i, '')}-reordenado.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      setAviso({ texto: 'No se pudo reordenar el PDF. Intenta de nuevo.', tono: 'error' });
    } finally {
      setGenerando(false);
    }
  }

  async function reordenarYEnviarPorWhatsapp() {
    if (!whatsappNumber) return;
    setAviso(null);
    const orden = validarOrden();
    if (!orden || !archivo) return;

    setEnviando(true);
    try {
      const bytes = await reordenarPdf(archivo.bytes, orden);
      await compartirPdfPorWhatsapp({
        archivos: [
          { bytes, nombreArchivo: `${archivo.nombre.replace(/\.pdf$/i, '')}-reordenado.pdf` },
        ],
        whatsappNumber,
        tituloCompartir: 'PDF reordenado',
        textoCompartir: TEXTO_WHATSAPP,
        textoRespaldo: `${TEXTO_WHATSAPP} (acabo de descargar el PDF, se los adjunto aquí).`,
      });
    } catch {
      setAviso({ texto: 'No se pudo reordenar el PDF. Intenta de nuevo.', tono: 'error' });
    } finally {
      setEnviando(false);
    }
  }

  const listo = archivo !== null && ordenTexto.trim().length > 0;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-3 font-mono text-micro uppercase text-grafito">Tu PDF</h2>

        <label className="flex min-h-tecla cursor-pointer items-center justify-center border border-boligrafo-hondo bg-boligrafo px-4 text-center text-cuerpo font-medium text-white shadow-impresa">
          {archivo ? 'Cambiar PDF' : 'Agregar PDF'}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => {
              void cargarArchivo(e.target.files);
              e.target.value = '';
            }}
          />
        </label>

        {archivo && (
          <p className="mt-3 text-fino text-tinta">
            {archivo.nombre}
            <span className="block text-micro text-grafito-claro">
              {archivo.paginas} {archivo.paginas === 1 ? 'página' : 'páginas'} ·{' '}
              {tamanoArchivo(archivo.bytes.byteLength)}
            </span>
          </p>
        )}
      </section>

      {archivo && (
        <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
          <h2 className="mb-3 font-mono text-micro uppercase text-grafito">Nuevo orden</h2>
          <Campo
            etiqueta="Orden de páginas"
            ayuda="Lista las páginas en el orden que quieras, separadas por comas."
            value={ordenTexto}
            onChange={(e) => setOrdenTexto(e.target.value)}
          />
          <Boton
            variante="secundaria"
            className="mt-2"
            onClick={() => setOrdenTexto(textoOrdenInvertido(archivo.paginas))}
          >
            Invertir orden
          </Boton>
        </section>
      )}

      {aviso && <Aviso tono={aviso.tono}>{aviso.texto}</Aviso>}

      <div className={whatsappNumber ? 'grid grid-cols-2 gap-2' : ''}>
        <Boton
          tamano="tecla"
          variante={whatsappNumber ? 'secundaria' : 'primaria'}
          className="w-full"
          disabled={!listo || generando || enviando}
          onClick={() => void reordenarYDescargar()}
        >
          {generando ? 'Reordenando…' : 'Reordenar y descargar'}
        </Boton>
        {whatsappNumber && (
          <Boton
            tamano="tecla"
            className="w-full"
            disabled={!listo || generando || enviando}
            onClick={() => void reordenarYEnviarPorWhatsapp()}
          >
            {enviando ? 'Reordenando…' : 'Enviar por WhatsApp'}
          </Boton>
        )}
      </div>
    </div>
  );
}
