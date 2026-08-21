'use client';

import { useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Selector } from '@/components/ui/Selector';
import { compartirPdfPorWhatsapp } from '@/lib/compartirPorWhatsapp';
import { tamanoArchivo } from '@/lib/formato';
import { inicioValido, numerarPdf, type PosicionNumero } from './numerar';
import { cargarPdf, type ArchivoPdf } from './pdfArchivo';

// Componente único, compartido por la ruta interna (/herramientas/pdf/numerar, con
// sesión) y la pública (/kit/pdf/numerar, sin sesión) — mismo patrón que las demás
// herramientas de PDF. El número siempre va abajo; lo único elegible es la posición
// horizontal (izquierda/centro/derecha) — sin selector de "arriba", que nadie pidió.

const OPCIONES_POSICION: { valor: PosicionNumero; texto: string }[] = [
  { valor: 'izquierda', texto: 'Abajo a la izquierda' },
  { valor: 'centro', texto: 'Abajo al centro' },
  { valor: 'derecha', texto: 'Abajo a la derecha' },
];

const TEXTO_WHATSAPP = 'Hola, les mando este PDF ya numerado.';

export function NumerarPdf({ whatsappNumber }: { whatsappNumber?: string } = {}) {
  const [archivo, setArchivo] = useState<ArchivoPdf | null>(null);
  const [inicioEn, setInicioEn] = useState(1);
  const [posicion, setPosicion] = useState<PosicionNumero>('centro');
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
      setInicioEn(1);
      setPosicion('centro');
    } catch {
      setAviso({
        texto: 'Ese archivo no es un PDF válido (o está dañado). Intenta con otro.',
        tono: 'error',
      });
    }
  }

  async function numerarYDescargar() {
    if (!archivo) return;
    setAviso(null);
    setGenerando(true);
    try {
      const bytes = await numerarPdf(archivo.bytes, inicioValido(inicioEn), posicion);
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `${archivo.nombre.replace(/\.pdf$/i, '')}-numerado.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      setAviso({ texto: 'No se pudo numerar el PDF. Intenta de nuevo.', tono: 'error' });
    } finally {
      setGenerando(false);
    }
  }

  async function numerarYEnviarPorWhatsapp() {
    if (!whatsappNumber || !archivo) return;
    setAviso(null);
    setEnviando(true);
    try {
      const bytes = await numerarPdf(archivo.bytes, inicioValido(inicioEn), posicion);
      await compartirPdfPorWhatsapp({
        archivos: [
          { bytes, nombreArchivo: `${archivo.nombre.replace(/\.pdf$/i, '')}-numerado.pdf` },
        ],
        whatsappNumber,
        tituloCompartir: 'PDF numerado',
        textoCompartir: TEXTO_WHATSAPP,
        textoRespaldo: `${TEXTO_WHATSAPP} (acabo de descargar el PDF, se los adjunto aquí).`,
      });
    } catch {
      setAviso({ texto: 'No se pudo numerar el PDF. Intenta de nuevo.', tono: 'error' });
    } finally {
      setEnviando(false);
    }
  }

  const listo = archivo !== null;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-1 font-mono text-micro uppercase text-grafito">Tu PDF</h2>
        <p className="mb-3 text-fino text-grafito">
          Se procesa aquí mismo, en tu navegador: nunca sube a nuestros servidores.
        </p>

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
          <h2 className="mb-3 font-mono text-micro uppercase text-grafito">Numeración</h2>
          <div className="grid grid-cols-2 gap-2">
            <Campo
              etiqueta="Empezar en"
              type="number"
              min={1}
              value={inicioEn}
              onChange={(e) => setInicioEn(Number(e.target.value) || 1)}
            />
            <Selector
              etiqueta="Posición"
              opciones={OPCIONES_POSICION.map((o) => ({ valor: o.valor, texto: o.texto }))}
              value={posicion}
              onChange={(e) => setPosicion(e.target.value as PosicionNumero)}
            />
          </div>
          <p className="mt-2 text-fino text-grafito">
            La última hoja quedará con el {inicioValido(inicioEn) + archivo.paginas - 1}.
          </p>
        </section>
      )}

      {aviso && <Aviso tono={aviso.tono}>{aviso.texto}</Aviso>}

      <div className={whatsappNumber ? 'grid grid-cols-2 gap-2' : ''}>
        <Boton
          tamano="tecla"
          variante={whatsappNumber ? 'secundaria' : 'primaria'}
          className="w-full"
          disabled={!listo || generando || enviando}
          onClick={() => void numerarYDescargar()}
        >
          {generando ? 'Numerando…' : 'Numerar y descargar'}
        </Boton>
        {whatsappNumber && (
          <Boton
            tamano="tecla"
            className="w-full"
            disabled={!listo || generando || enviando}
            onClick={() => void numerarYEnviarPorWhatsapp()}
          >
            {enviando ? 'Numerando…' : 'Enviar por WhatsApp'}
          </Boton>
        )}
      </div>
    </div>
  );
}
