'use client';

import { useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { compartirPdfPorWhatsapp } from '@/lib/compartirPorWhatsapp';
import { tamanoArchivo } from '@/lib/formato';
import { cargarPdf, type ArchivoPdf } from './pdfArchivo';
import { paginasARotar, rotarPdf, type AnguloRotacion } from './rotar';

// Componente único, compartido por la ruta interna (/herramientas/pdf/rotar, con sesión)
// y la pública (/imprimir/pdf/rotar, sin sesión) — mismo patrón que UnirPdf/DividirPdf.
//
// Sin vista previa: pdf-lib no sabe renderizar una página como imagen (eso es trabajo de
// pdf.js, que no está en el proyecto). El giro se acumula en pantalla como un solo número
// (0/90/180/270) y se aplica de una vez al descargar, no en cada clic.

const TEXTO_WHATSAPP = 'Hola, les mando este PDF ya girado.';

function normalizar(angulo: number): number {
  return ((angulo % 360) + 360) % 360;
}

function etiquetaGiro(angulo: number): string {
  if (angulo === 0) return 'Sin girar todavía';
  if (angulo === 90) return 'Se va a girar 90° a la derecha';
  if (angulo === 180) return 'Se va a girar 180°';
  return 'Se va a girar 90° a la izquierda'; // 270
}

export function RotarPdf({ whatsappNumber }: { whatsappNumber?: string } = {}) {
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
        texto: 'Ese archivo no es un PDF válido (o está dañado). Intenta con otro.',
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
      setAviso({ texto: 'Elige hacia dónde girar antes de continuar.', tono: 'error' });
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
      setAviso({ texto: 'No se pudo girar el PDF. Intenta de nuevo.', tono: 'error' });
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
        tituloCompartir: 'PDF girado',
        textoCompartir: TEXTO_WHATSAPP,
        textoRespaldo: `${TEXTO_WHATSAPP} (acabo de descargar el PDF, se los adjunto aquí).`,
      });
    } catch {
      setAviso({ texto: 'No se pudo girar el PDF. Intenta de nuevo.', tono: 'error' });
    } finally {
      setEnviando(false);
    }
  }

  const listo = archivo !== null && anguloTotal !== 0;

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
          <h2 className="mb-3 font-mono text-micro uppercase text-grafito">Hacia dónde</h2>
          <div className="grid grid-cols-3 gap-2">
            <Boton variante="secundaria" onClick={() => girar(-90)}>
              ↺ Izquierda
            </Boton>
            <Boton variante="secundaria" onClick={() => girar(180)}>
              180°
            </Boton>
            <Boton variante="secundaria" onClick={() => girar(90)}>
              Derecha ↻
            </Boton>
          </div>
          <p className="mt-2 text-fino text-grafito">{etiquetaGiro(anguloTotal)}</p>

          <div className="mt-3">
            <Campo
              etiqueta="Páginas (opcional)"
              placeholder="Ej. 1-3, 5"
              ayuda={`Vacío = las ${archivo.paginas} páginas.`}
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
          {generando ? 'Girando…' : 'Girar y descargar'}
        </Boton>
        {whatsappNumber && (
          <Boton
            tamano="tecla"
            className="w-full"
            disabled={!listo || generando || enviando}
            onClick={() => void rotarYEnviarPorWhatsapp()}
          >
            {enviando ? 'Girando…' : 'Enviar por WhatsApp'}
          </Boton>
        )}
      </div>
    </div>
  );
}
