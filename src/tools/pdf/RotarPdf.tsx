'use client';

import { useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { compartirPdfPorWhatsapp } from '@/lib/compartirPorWhatsapp';
import { tamanoArchivo } from '@/lib/formato';
import { useIdioma } from '@/lib/i18n/cliente';
import type { ClaveI18n } from '@/lib/i18n/nucleo';
import { cargarPdf, type ArchivoPdf } from './pdfArchivo';
import { paginasARotar, rotarPdf, type AnguloRotacion } from './rotar';

// Componente único, compartido por la ruta interna (/herramientas/pdf/rotar, con sesión)
// y la pública (/kit/pdf/rotar, sin sesión) — mismo patrón que UnirPdf/DividirPdf.
//
// Sin vista previa: pdf-lib no sabe renderizar una página como imagen (eso es trabajo de
// pdf.js, que no está en el proyecto). El giro se acumula en pantalla como un solo número
// (0/90/180/270) y se aplica de una vez al descargar, no en cada clic.

function normalizar(angulo: number): number {
  return ((angulo % 360) + 360) % 360;
}

function claveEtiquetaGiro(angulo: number): ClaveI18n {
  if (angulo === 0) return 'pdf.sinGirarTodavia';
  if (angulo === 90) return 'pdf.girar90Derecha';
  if (angulo === 180) return 'pdf.girar180';
  return 'pdf.girar90Izquierda'; // 270
}

export function RotarPdf({ whatsappNumber }: { whatsappNumber?: string } = {}) {
  const { t } = useIdioma();
  const [archivo, setArchivo] = useState<ArchivoPdf | null>(null);
  const [anguloTotal, setAnguloTotal] = useState(0);
  const [rangoTexto, setRangoTexto] = useState('');
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
      setAnguloTotal(0);
      setRangoTexto('');
    } catch {
      setAviso({
        texto: t('pdf.archivoInvalido'),
        tono: 'error',
      });
    }
  }

  function girar(delta: number) {
    setAnguloTotal((actual) => normalizar(actual + delta));
  }

  /** Valida el rango escrito contra `archivo` y el ángulo acumulado; si algo falla, deja
   * el aviso puesto y devuelve `null`. */
  function validar(): { indices: Set<number> | null } | null {
    if (!archivo) return null;
    if (anguloTotal === 0) {
      setAviso({ texto: t('pdf.elegeHaciaDonde'), tono: 'error' });
      return null;
    }
    try {
      return { indices: paginasARotar(rangoTexto, archivo.paginas) };
    } catch (error) {
      setAviso({ texto: (error as Error).message, tono: 'error' });
      return null;
    }
  }

  async function rotarYDescargar() {
    setAviso(null);
    const validado = validar();
    if (!validado || !archivo) return;

    setGenerando(true);
    try {
      const bytes = await rotarPdf(archivo.bytes, anguloTotal as AnguloRotacion, validado.indices);
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `${archivo.nombre.replace(/\.pdf$/i, '')}-girado.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      setAviso({ texto: t('pdf.noSePudoGirar'), tono: 'error' });
    } finally {
      setGenerando(false);
    }
  }

  async function rotarYEnviarPorWhatsapp() {
    if (!whatsappNumber) return;
    setAviso(null);
    const validado = validar();
    if (!validado || !archivo) return;

    setEnviando(true);
    try {
      const bytes = await rotarPdf(archivo.bytes, anguloTotal as AnguloRotacion, validado.indices);
      await compartirPdfPorWhatsapp({
        archivos: [{ bytes, nombreArchivo: `${archivo.nombre.replace(/\.pdf$/i, '')}-girado.pdf` }],
        whatsappNumber,
        tituloCompartir: t('pdf.whatsappTituloGirado'),
        textoCompartir: t('pdf.whatsappTextoGirado'),
        textoRespaldo: t('pdf.whatsappRespaldo', { texto: t('pdf.whatsappTextoGirado') }),
      });
    } catch {
      setAviso({ texto: t('pdf.noSePudoGirar'), tono: 'error' });
    } finally {
      setEnviando(false);
    }
  }

  const listo = archivo !== null && anguloTotal !== 0;

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
            {t('pdf.haciaDonde')}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <Boton variante="secundaria" onClick={() => girar(-90)}>
              {t('pdf.girarIzquierda')}
            </Boton>
            <Boton variante="secundaria" onClick={() => girar(180)}>
              180°
            </Boton>
            <Boton variante="secundaria" onClick={() => girar(90)}>
              {t('pdf.girarDerecha')}
            </Boton>
          </div>
          <p className="mt-2 text-fino text-grafito">{t(claveEtiquetaGiro(anguloTotal))}</p>

          <div className="mt-3">
            <Campo
              etiqueta={t('pdf.paginasOpcional')}
              placeholder={t('pdf.ejemploPaginasRango')}
              ayuda={t('pdf.vacioSonLasNPaginas', { n: archivo.paginas })}
              value={rangoTexto}
              onChange={(e) => setRangoTexto(e.target.value)}
            />
          </div>
        </section>
      )}

      {aviso && <Aviso tono={aviso.tono}>{aviso.texto}</Aviso>}

      <div className={whatsappNumber ? 'grid grid-cols-2 gap-2' : ''}>
        <Boton
          tamano="tecla"
          variante={whatsappNumber ? 'secundaria' : 'primaria'}
          className="w-full"
          disabled={!listo || generando || enviando}
          onClick={() => void rotarYDescargar()}
        >
          {generando ? t('pdf.girando') : t('pdf.girarYDescargar')}
        </Boton>
        {whatsappNumber && (
          <Boton
            tamano="tecla"
            className="w-full"
            disabled={!listo || generando || enviando}
            onClick={() => void rotarYEnviarPorWhatsapp()}
          >
            {enviando ? t('pdf.girando') : t('pdf.enviarPorWhatsapp')}
          </Boton>
        )}
      </div>
    </div>
  );
}
