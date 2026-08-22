'use client';

import { useState } from 'react';

import { PDF } from '@/config/pos';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { compartirPdfPorWhatsapp } from '@/lib/compartirPorWhatsapp';
import { tamanoArchivo } from '@/lib/formato';
import { useIdioma } from '@/lib/i18n/cliente';
import { analizarRangos, dividirPdf, textoUnaPorPagina } from './dividir';
import { cargarPdf, type ArchivoPdf } from './pdfArchivo';

// Componente único, compartido por la ruta interna (/herramientas/pdf/dividir, con
// sesión) y la pública (/kit/pdf/dividir, sin sesión) — mismo patrón que UnirPdf: el
// botón de WhatsApp solo aparece si se recibe `whatsappNumber`.

function nombreBase(nombre: string): string {
  return nombre.replace(/\.pdf$/i, '');
}

/** Descarga varios archivos en secuencia, con una pausa corta entre cada uno: varias
 * descargas disparadas de golpe se topan con el bloqueo de pop-ups de algunos navegadores. */
async function descargarVarios(archivos: { bytes: Uint8Array; nombreArchivo: string }[]) {
  for (const { bytes, nombreArchivo } of archivos) {
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.click();
    URL.revokeObjectURL(url);
    if (archivos.length > 1) await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

export function DividirPdf({ whatsappNumber }: { whatsappNumber?: string } = {}) {
  const { t } = useIdioma();
  const [archivo, setArchivo] = useState<ArchivoPdf | null>(null);
  const [rangosTexto, setRangosTexto] = useState('');
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
      setRangosTexto('');
    } catch {
      setAviso({
        texto: t('pdf.archivoInvalido'),
        tono: 'error',
      });
    }
  }

  /** Valida los rangos escritos contra `archivo`; si algo falla, deja el aviso puesto y
   * devuelve `null` — quien llama simplemente no continúa. */
  function validarRangos() {
    if (!archivo) return null;
    try {
      const rangos = analizarRangos(rangosTexto, archivo.paginas);
      if (rangos.length > PDF.dividirPartesMaximo) {
        setAviso({
          texto: t('pdf.demasiadasPartes', { max: PDF.dividirPartesMaximo }),
          tono: 'error',
        });
        return null;
      }
      return rangos;
    } catch (error) {
      setAviso({ texto: (error as Error).message, tono: 'error' });
      return null;
    }
  }

  async function dividirYDescargar() {
    setAviso(null);
    const rangos = validarRangos();
    if (!rangos || !archivo) return;

    setGenerando(true);
    try {
      const partes = await dividirPdf(archivo.bytes, rangos);
      const base = nombreBase(archivo.nombre);
      await descargarVarios(
        partes.map((bytes, i) => ({ bytes, nombreArchivo: `${base}-parte-${i + 1}.pdf` })),
      );
    } catch {
      setAviso({ texto: t('pdf.noSePudoDividir'), tono: 'error' });
    } finally {
      setGenerando(false);
    }
  }

  async function dividirYEnviarPorWhatsapp() {
    if (!whatsappNumber) return;
    setAviso(null);
    const rangos = validarRangos();
    if (!rangos || !archivo) return;

    setEnviando(true);
    try {
      const partes = await dividirPdf(archivo.bytes, rangos);
      const base = nombreBase(archivo.nombre);
      await compartirPdfPorWhatsapp({
        archivos: partes.map((bytes, i) => ({
          bytes,
          nombreArchivo: `${base}-parte-${i + 1}.pdf`,
        })),
        whatsappNumber,
        tituloCompartir: t('pdf.whatsappTituloDividido'),
        textoCompartir: t('pdf.whatsappTextoDividido'),
        textoRespaldo: t('pdf.whatsappRespaldo', { texto: t('pdf.whatsappTextoDividido') }),
      });
    } catch {
      setAviso({ texto: t('pdf.noSePudoDividir'), tono: 'error' });
    } finally {
      setEnviando(false);
    }
  }

  const listo = archivo !== null && rangosTexto.trim().length > 0;

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
            {t('pdf.comoDividirlo')}
          </h2>
          <Campo
            etiqueta={t('pdf.rangosDePaginas')}
            placeholder={t('pdf.ejemploRangos')}
            ayuda={t('pdf.unArchivoPorRango', {
              n: archivo.paginas,
              palabra: archivo.paginas === 1 ? t('pdf.pagina') : t('pdf.paginas'),
            })}
            value={rangosTexto}
            onChange={(e) => setRangosTexto(e.target.value)}
          />
          <Boton
            variante="secundaria"
            className="mt-2"
            onClick={() => setRangosTexto(textoUnaPorPagina(archivo.paginas))}
          >
            {t('pdf.unaPaginaPorArchivo')}
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
          onClick={() => void dividirYDescargar()}
        >
          {generando ? t('pdf.dividiendo') : t('pdf.dividirYDescargar')}
        </Boton>
        {whatsappNumber && (
          <Boton
            tamano="tecla"
            className="w-full"
            disabled={!listo || generando || enviando}
            onClick={() => void dividirYEnviarPorWhatsapp()}
          >
            {enviando ? t('pdf.dividiendo') : t('pdf.enviarPorWhatsapp')}
          </Boton>
        )}
      </div>
    </div>
  );
}
