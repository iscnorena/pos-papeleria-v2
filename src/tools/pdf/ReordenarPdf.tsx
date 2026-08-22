'use client';

import { useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { compartirPdfPorWhatsapp } from '@/lib/compartirPorWhatsapp';
import { tamanoArchivo } from '@/lib/formato';
import { useIdioma } from '@/lib/i18n/cliente';
import { cargarPdf, type ArchivoPdf } from './pdfArchivo';
import { analizarOrden, reordenarPdf, textoOrdenActual, textoOrdenInvertido } from './reordenar';

// Componente único, compartido por la ruta interna (/herramientas/pdf/reordenar, con
// sesión) y la pública (/kit/pdf/reordenar, sin sesión) — mismo patrón que las demás
// herramientas de PDF.
//
// Sin vista previa de páginas (pdf-lib no las puede renderizar como imagen): el campo se
// precarga con el orden actual ("1, 2, 3, ...") para que baste mover un par de números en
// vez de escribir todo desde cero, y "Invertir orden" cubre el caso más común (un
// escáner dúplex que entregó las hojas al revés).

export function ReordenarPdf({ whatsappNumber }: { whatsappNumber?: string } = {}) {
  const { t } = useIdioma();
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
        texto: t('pdf.archivoInvalido'),
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
      setAviso({ texto: t('pdf.noSePudoReordenar'), tono: 'error' });
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
        tituloCompartir: t('pdf.whatsappTituloReordenado'),
        textoCompartir: t('pdf.whatsappTextoReordenado'),
        textoRespaldo: t('pdf.whatsappRespaldo', { texto: t('pdf.whatsappTextoReordenado') }),
      });
    } catch {
      setAviso({ texto: t('pdf.noSePudoReordenar'), tono: 'error' });
    } finally {
      setEnviando(false);
    }
  }

  const listo = archivo !== null && ordenTexto.trim().length > 0;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-1 font-mono text-micro uppercase text-grafito">{t('pdf.tuPdf')}</h2>
        <p className="mb-3 text-fino text-grafito">{t('pdf.seProcesaSingular')}</p>

        <label className="flex min-h-tecla cursor-pointer items-center justify-center border border-boligrafo-hondo bg-boligrafo px-4 text-center text-cuerpo font-medium text-white shadow-impresa">
          {archivo ? t('pdf.cambiarPdf') : t('pdf.agregarPdf')}
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
              {archivo.paginas} {archivo.paginas === 1 ? t('pdf.pagina') : t('pdf.paginas')} ·{' '}
              {tamanoArchivo(archivo.bytes.byteLength)}
            </span>
          </p>
        )}
      </section>

      {archivo && (
        <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
          <h2 className="mb-3 font-mono text-micro uppercase text-grafito">
            {t('pdf.nuevoOrden')}
          </h2>
          <Campo
            etiqueta={t('pdf.ordenDePaginas')}
            ayuda={t('pdf.listaPaginasAyuda')}
            value={ordenTexto}
            onChange={(e) => setOrdenTexto(e.target.value)}
          />
          <Boton
            variante="secundaria"
            className="mt-2"
            onClick={() => setOrdenTexto(textoOrdenInvertido(archivo.paginas))}
          >
            {t('pdf.invertirOrden')}
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
          {generando ? t('pdf.reordenando') : t('pdf.reordenarYDescargar')}
        </Boton>
        {whatsappNumber && (
          <Boton
            tamano="tecla"
            className="w-full"
            disabled={!listo || generando || enviando}
            onClick={() => void reordenarYEnviarPorWhatsapp()}
          >
            {enviando ? t('pdf.reordenando') : t('pdf.enviarPorWhatsapp')}
          </Boton>
        )}
      </div>
    </div>
  );
}
