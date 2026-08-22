'use client';

import { useState } from 'react';

import { PDF } from '@/config/pos';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { reordenar } from '@/lib/arreglos';
import { compartirPdfPorWhatsapp } from '@/lib/compartirPorWhatsapp';
import { tamanoArchivo } from '@/lib/formato';
import { useIdioma } from '@/lib/i18n/cliente';
import { cargarPdf, unirPdfs, type ArchivoPdf } from './unir';

// Componente único, compartido por la ruta interna (/herramientas/pdf/unir, con sesión) y
// la pública (/kit/pdf/unir, sin sesión) — mismo patrón que GeneradorRifas: el botón
// de WhatsApp solo aparece si se recibe `whatsappNumber`.

export function UnirPdf({ whatsappNumber }: { whatsappNumber?: string } = {}) {
  const { t } = useIdioma();
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
        texto: t('pdf.maximoDeArchivos', { max: PDF.unirArchivosMaximo }),
        tono: 'error',
      });
      return;
    }
    const recortada = pdfs.slice(0, cabida);
    if (recortada.length < pdfs.length) {
      setAviso({
        texto: t('pdf.soloSeAgregaron', { n: recortada.length, max: PDF.unirArchivosMaximo }),
        tono: 'neutro',
      });
    }

    try {
      const cargados = await Promise.all(recortada.map(cargarPdf));
      setArchivos((actuales) => [...actuales, ...cargados]);
    } catch {
      setAviso({
        texto: t('pdf.archivosInvalidos'),
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
      setAviso({ texto: t('pdf.noSePudoUnir'), tono: 'error' });
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
        tituloCompartir: t('pdf.whatsappTituloUnido'),
        textoCompartir: t('pdf.whatsappTextoUnido'),
        textoRespaldo: t('pdf.whatsappRespaldo', { texto: t('pdf.whatsappTextoUnido') }),
      });
    } catch {
      setAviso({ texto: t('pdf.noSePudoUnir'), tono: 'error' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-1 font-mono text-micro uppercase text-grafito">{t('pdf.tusPdf')}</h2>
        <p className="mb-3 text-fino text-grafito">{t('pdf.seProcesaPlural')}</p>

        <label className="flex min-h-tecla cursor-pointer items-center justify-center border border-boligrafo-hondo bg-boligrafo px-4 text-center text-cuerpo font-medium text-white shadow-impresa">
          {t('pdf.agregarPdf')}
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
                      {archivo.paginas} {archivo.paginas === 1 ? t('pdf.pagina') : t('pdf.paginas')}{' '}
                      · {tamanoArchivo(archivo.bytes.byteLength)}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={t('pdf.subirArchivo', { nombre: archivo.nombre })}
                    disabled={indice === 0}
                    onClick={() => moverArchivo(indice, -1)}
                    className="px-2 py-1 text-base text-tinta disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={t('pdf.bajarArchivo', { nombre: archivo.nombre })}
                    disabled={indice === archivos.length - 1}
                    onClick={() => moverArchivo(indice, 1)}
                    className="px-2 py-1 text-base text-tinta disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={t('pdf.quitarArchivo', { nombre: archivo.nombre })}
                    onClick={() => quitarArchivo(archivo.id)}
                    className="px-2 py-1 text-base text-sello"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-fino text-grafito">
              {t('pdf.totalEnArchivos', {
                n: archivos.length,
                palabraArchivo: archivos.length === 1 ? t('pdf.archivo') : t('pdf.archivos'),
                total: totalPaginas,
                palabraPagina: totalPaginas === 1 ? t('pdf.pagina') : t('pdf.paginas'),
              })}
              {archivos.length === 1 && ` ${t('pdf.agregaOtroPdf')}`}
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
          {generando ? t('pdf.uniendo') : t('pdf.unirYDescargar')}
        </Boton>
        {whatsappNumber && (
          <Boton
            tamano="tecla"
            className="w-full"
            disabled={archivos.length < 2 || generando || enviando}
            onClick={() => void unirYEnviarPorWhatsapp()}
          >
            {enviando ? t('pdf.uniendo') : t('pdf.enviarPorWhatsapp')}
          </Boton>
        )}
      </div>
    </div>
  );
}
