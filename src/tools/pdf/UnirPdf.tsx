'use client';

import { useState } from 'react';

import { PDF } from '@/config/pos';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { reordenar } from '@/lib/arreglos';
import { compartirPdfPorWhatsapp } from '@/lib/compartirPorWhatsapp';
import { tamanoArchivo } from '@/lib/formato';
import { cargarPdf, unirPdfs, type ArchivoPdf } from './unir';

// Componente único, compartido por la ruta interna (/herramientas/pdf/unir, con sesión) y
// la pública (/imprimir/pdf/unir, sin sesión) — mismo patrón que GeneradorRifas: el botón
// de WhatsApp solo aparece si se recibe `whatsappNumber`.

const TEXTO_WHATSAPP = 'Hola, les mando este PDF ya unido.';

export function UnirPdf({ whatsappNumber }: { whatsappNumber?: string } = {}) {
  const [archivos, setArchivos] = useState<ArchivoPdf[]>([]);
  const [generando, setGenerando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tono: 'error' | 'neutro' } | null>(null);

  async function agregarArchivos(lista: FileList | File[]) {
    const pdfs = Array.from(lista).filter(
      (a) => a.type === 'application/pdf' || a.name.toLowerCase().endsWith('.pdf'),
    );
    if (pdfs.length === 0) return;

    const cabida = PDF.unirArchivosMaximo - archivos.length;
    if (cabida <= 0) {
      setAviso({
        texto: `Ya tienes el máximo de ${PDF.unirArchivosMaximo} archivos.`,
        tono: 'error',
      });
      return;
    }
    const recortada = pdfs.slice(0, cabida);
    if (recortada.length < pdfs.length) {
      setAviso({
        texto: `Solo se agregaron ${recortada.length}: el máximo es ${PDF.unirArchivosMaximo} archivos.`,
        tono: 'neutro',
      });
    }

    try {
      const cargados = await Promise.all(recortada.map(cargarPdf));
      setArchivos((actuales) => [...actuales, ...cargados]);
    } catch {
      setAviso({
        texto:
          'Alguno de esos archivos no es un PDF válido (o está dañado). Revisa e intenta de nuevo.',
        tono: 'error',
      });
    }
  }

  function moverArchivo(indice: number, delta: number) {
    setArchivos((actuales) => reordenar(actuales, indice, indice + delta));
  }

  function quitarArchivo(id: string) {
    setArchivos((actuales) => actuales.filter((a) => a.id !== id));
  }

  const totalPaginas = archivos.reduce((acc, a) => acc + a.paginas, 0);

  async function unirYDescargar() {
    if (archivos.length < 2) return;
    setAviso(null);
    setGenerando(true);
    try {
      const bytes = await unirPdfs(archivos);
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `unido-${Date.now()}.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      setAviso({ texto: 'No se pudo unir los PDF. Intenta de nuevo.', tono: 'error' });
    } finally {
      setGenerando(false);
    }
  }

  async function unirYEnviarPorWhatsapp() {
    if (!whatsappNumber || archivos.length < 2) return;
    setAviso(null);
    setEnviando(true);
    try {
      const bytes = await unirPdfs(archivos);
      await compartirPdfPorWhatsapp({
        archivos: [{ bytes, nombreArchivo: `unido-${Date.now()}.pdf` }],
        whatsappNumber,
        tituloCompartir: 'PDF unido',
        textoCompartir: TEXTO_WHATSAPP,
        textoRespaldo: `${TEXTO_WHATSAPP} (acabo de descargar el PDF, se los adjunto aquí).`,
      });
    } catch {
      setAviso({ texto: 'No se pudo unir los PDF. Intenta de nuevo.', tono: 'error' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-3 font-mono text-micro uppercase text-grafito">Tus PDF</h2>

        <label className="flex min-h-tecla cursor-pointer items-center justify-center border border-boligrafo-hondo bg-boligrafo px-4 text-center text-cuerpo font-medium text-white shadow-impresa">
          Agregar PDF
          <input
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) void agregarArchivos(e.target.files);
              e.target.value = '';
            }}
          />
        </label>

        {archivos.length > 0 && (
          <>
            <ul className="mt-3 flex flex-col gap-2">
              {archivos.map((archivo, indice) => (
                <li
                  key={archivo.id}
                  className="flex items-center gap-2 border border-linea-fuerte bg-white p-2"
                >
                  <span className="flex-1 truncate text-fino text-tinta">
                    {archivo.nombre}
                    <span className="block text-micro text-grafito-claro">
                      {archivo.paginas} {archivo.paginas === 1 ? 'página' : 'páginas'} ·{' '}
                      {tamanoArchivo(archivo.bytes.byteLength)}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Subir ${archivo.nombre}`}
                    disabled={indice === 0}
                    onClick={() => moverArchivo(indice, -1)}
                    className="px-2 py-1 text-base text-tinta disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Bajar ${archivo.nombre}`}
                    disabled={indice === archivos.length - 1}
                    onClick={() => moverArchivo(indice, 1)}
                    className="px-2 py-1 text-base text-tinta disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={`Quitar ${archivo.nombre}`}
                    onClick={() => quitarArchivo(archivo.id)}
                    className="px-2 py-1 text-base text-sello"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-fino text-grafito">
              {archivos.length} {archivos.length === 1 ? 'archivo' : 'archivos'}, {totalPaginas}{' '}
              {totalPaginas === 1 ? 'página' : 'páginas'} en total.
              {archivos.length === 1 && ' Agrega al menos otro PDF para poder unir.'}
            </p>
          </>
        )}
      </section>

      {aviso && <Aviso tono={aviso.tono}>{aviso.texto}</Aviso>}

      <div className={whatsappNumber ? 'grid grid-cols-2 gap-2' : ''}>
        <Boton
          tamano="tecla"
          variante={whatsappNumber ? 'secundaria' : 'primaria'}
          className="w-full"
          disabled={archivos.length < 2 || generando || enviando}
          onClick={() => void unirYDescargar()}
        >
          {generando ? 'Uniendo…' : 'Unir y descargar'}
        </Boton>
        {whatsappNumber && (
          <Boton
            tamano="tecla"
            className="w-full"
            disabled={archivos.length < 2 || generando || enviando}
            onClick={() => void unirYEnviarPorWhatsapp()}
          >
            {enviando ? 'Uniendo…' : 'Enviar por WhatsApp'}
          </Boton>
        )}
      </div>
    </div>
  );
}
