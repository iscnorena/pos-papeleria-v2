'use client';

import { useState } from 'react';

import { RIFAS } from '@/config/pos';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { compartirPdfPorWhatsapp } from '@/lib/compartirPorWhatsapp';
import {
  COLOR_FONDO_DEFECTO,
  TICKETS_POR_PAGINA_MAXIMO,
  TICKETS_POR_PAGINA_MINIMO,
  porPaginaValido,
  totalPaginas,
  type RaffleConfig,
} from './layout';
import { generarPdfRifas } from './pdf';
import { VistaPreviaCanvas } from './VistaPreviaCanvas';

// Componente único, compartido por la ruta interna (/herramientas/rifas, con sesión) y la
// pública (/imprimir/rifas, sin sesión). La única diferencia entre las dos es el botón de
// WhatsApp: solo aparece si se recibe `whatsappNumber` (la ruta pública lo resuelve por
// sucursal; la interna no lo pasa, porque el personal ya está en la papelería).

const TEXTO_WHATSAPP = 'cree este documento en generador de loterias me gustaria imprimir';

const CONFIG_INICIAL: RaffleConfig = {
  quantity: 100,
  startNumber: 1,
  ticketsPorPagina: TICKETS_POR_PAGINA_MINIMO,
  eventName: '',
  prize: '',
  date: '',
  cost: '',
  organizer: '',
  phone: '',
  backgroundColor: COLOR_FONDO_DEFECTO,
};

function leerComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result as string);
    lector.onerror = () => reject(new Error('No se pudo leer el archivo'));
    lector.readAsDataURL(archivo);
  });
}

function cargarImagenHtml(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => resolve(imagen);
    imagen.onerror = () => reject(new Error('No se pudo leer la imagen'));
    imagen.src = src;
  });
}

/** El tipo real del archivo (no el contenido del data URL) decide si hace falta
 * convertir: pdf-lib solo puede incrustar PNG o JPEG. Sirve tanto para el logo como para
 * la foto del premio: misma normalización, dos campos distintos de RaffleConfig. */
async function normalizarImagen(archivo: File): Promise<string> {
  const dataUrl = await leerComoDataUrl(archivo);
  if (archivo.type === 'image/png' || archivo.type === 'image/jpeg') return dataUrl;

  const imagen = await cargarImagenHtml(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = imagen.naturalWidth;
  canvas.height = imagen.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo convertir la imagen');
  ctx.drawImage(imagen, 0, 0);
  return canvas.toDataURL('image/png');
}

export function GeneradorRifas({ whatsappNumber }: { whatsappNumber?: string } = {}) {
  const [config, setConfig] = useState<RaffleConfig>(CONFIG_INICIAL);
  const [pagina, setPagina] = useState(0);
  const [generando, setGenerando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progreso, setProgreso] = useState<{ actual: number; total: number } | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; tono: 'error' | 'neutro' } | null>(null);

  // El valor EFECTIVO (acotado a [MINIMO, MAXIMO]) es el que se usa para calcular
  // páginas y para la vista previa — el campo de texto puede tener momentáneamente
  // cualquier cosa mientras el usuario teclea, sin pelearse con cada tecla.
  const porPaginaEfectivo = porPaginaValido(config.ticketsPorPagina);
  const paginasTotales = totalPaginas(config.quantity, config.ticketsPorPagina);

  function actualizar<K extends keyof RaffleConfig>(campo: K, valor: RaffleConfig[K]) {
    setConfig((actual) => {
      const nueva = { ...actual, [campo]: valor };
      if (campo === 'quantity' || campo === 'ticketsPorPagina') {
        setPagina((p) => Math.min(p, totalPaginas(nueva.quantity, nueva.ticketsPorPagina) - 1));
      }
      return nueva;
    });
  }

  async function manejarLogo(archivo: File | undefined) {
    if (!archivo) return;
    try {
      const dataUrl = await normalizarImagen(archivo);
      actualizar('raffleImage', dataUrl);
    } catch {
      setAviso({ texto: 'No se pudo cargar el logotipo. Intenta con otra imagen.', tono: 'error' });
    }
  }

  async function manejarImagenPremio(archivo: File | undefined) {
    if (!archivo) return;
    try {
      const dataUrl = await normalizarImagen(archivo);
      actualizar('prizeImage', dataUrl);
    } catch {
      setAviso({
        texto: 'No se pudo cargar la foto del premio. Intenta con otra imagen.',
        tono: 'error',
      });
    }
  }

  /** Comparte `true` si config está en rango; si no, deja el aviso puesto y devuelve `false`. */
  function validar(): boolean {
    if (config.quantity < 1 || config.quantity > RIFAS.cantidadMaxima) {
      setAviso({
        texto: `La cantidad de boletos debe estar entre 1 y ${RIFAS.cantidadMaxima}.`,
        tono: 'error',
      });
      return false;
    }
    if (
      config.ticketsPorPagina < TICKETS_POR_PAGINA_MINIMO ||
      config.ticketsPorPagina > TICKETS_POR_PAGINA_MAXIMO
    ) {
      setAviso({
        texto: `Los boletos por página deben estar entre ${TICKETS_POR_PAGINA_MINIMO} y ${TICKETS_POR_PAGINA_MAXIMO}.`,
        tono: 'error',
      });
      return false;
    }
    return true;
  }

  async function descargarPdf() {
    setAviso(null);
    if (!validar()) return;

    setGenerando(true);
    setProgreso(null);
    try {
      const resultado = await generarPdfRifas(config, (actual, total) =>
        setProgreso({ actual, total }),
      );

      const blob = new Blob([resultado.bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `rifa-${Date.now()}.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);

      if (resultado.camposSaneados.length > 0) {
        setAviso({
          texto: `Se quitaron caracteres no compatibles (probablemente emoji) en: ${resultado.camposSaneados.join(', ')}.`,
          tono: 'neutro',
        });
      }
    } catch {
      setAviso({ texto: 'No se pudo generar el PDF. Intenta de nuevo.', tono: 'error' });
    } finally {
      setGenerando(false);
      setProgreso(null);
    }
  }

  async function enviarPorWhatsapp() {
    if (!whatsappNumber) return;
    setAviso(null);
    if (!validar()) return;

    setEnviando(true);
    setProgreso(null);
    try {
      const resultado = await generarPdfRifas(config, (actual, total) =>
        setProgreso({ actual, total }),
      );
      await compartirPdfPorWhatsapp({
        bytes: resultado.bytes,
        nombreArchivo: `rifa-${Date.now()}.pdf`,
        whatsappNumber,
        tituloCompartir: 'Rifa',
        textoCompartir: TEXTO_WHATSAPP,
        textoRespaldo: `${TEXTO_WHATSAPP} (acabo de descargar el PDF, se los adjunto aquí).`,
      });

      if (resultado.camposSaneados.length > 0) {
        setAviso({
          texto: `Se quitaron caracteres no compatibles (probablemente emoji) en: ${resultado.camposSaneados.join(', ')}.`,
          tono: 'neutro',
        });
      }
    } catch {
      setAviso({ texto: 'No se pudo generar el PDF. Intenta de nuevo.', tono: 'error' });
    } finally {
      setEnviando(false);
      setProgreso(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-3 font-mono text-micro uppercase text-grafito">Boletos</h2>
        <div className="grid grid-cols-2 gap-2">
          <Campo
            etiqueta="Cantidad de boletos"
            type="number"
            min={1}
            max={RIFAS.cantidadMaxima}
            value={config.quantity}
            onChange={(e) => actualizar('quantity', Number(e.target.value) || 0)}
          />
          <Campo
            etiqueta="Boletos por página"
            type="number"
            min={TICKETS_POR_PAGINA_MINIMO}
            max={TICKETS_POR_PAGINA_MAXIMO}
            value={config.ticketsPorPagina}
            onChange={(e) => actualizar('ticketsPorPagina', Number(e.target.value) || 0)}
            ayuda={`Entre ${TICKETS_POR_PAGINA_MINIMO} y ${TICKETS_POR_PAGINA_MAXIMO}.`}
          />
        </div>
        <p className="mt-2 text-fino text-grafito">
          Salen {paginasTotales} {paginasTotales === 1 ? 'página' : 'páginas'}, de{' '}
          {porPaginaEfectivo} {porPaginaEfectivo === 1 ? 'boleto' : 'boletos'} cada una.
        </p>
      </section>

      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-3 font-mono text-micro uppercase text-grafito">Datos de la rifa</h2>
        <div className="flex flex-col gap-2">
          <Campo
            etiqueta="Nombre del evento"
            value={config.eventName}
            onChange={(e) => actualizar('eventName', e.target.value)}
          />
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Campo
              etiqueta="Premio"
              value={config.prize}
              onChange={(e) => actualizar('prize', e.target.value)}
            />
            <label className="flex min-h-tecla cursor-pointer items-center justify-center border border-linea-fuerte bg-white px-3 text-center text-base text-tinta shadow-impresa">
              {config.prizeImage ? 'Cambiar foto' : 'Foto (opcional)'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  void manejarImagenPremio(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Campo
              etiqueta="Fecha"
              placeholder="Ej. 24 de diciembre"
              value={config.date}
              onChange={(e) => actualizar('date', e.target.value)}
            />
            <Campo
              etiqueta="Costo por boleto"
              placeholder="Ej. 50"
              value={config.cost}
              onChange={(e) => actualizar('cost', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Campo
              etiqueta="Organizador"
              value={config.organizer}
              onChange={(e) => actualizar('organizer', e.target.value)}
            />
            <Campo
              etiqueta="Teléfono"
              value={config.phone}
              onChange={(e) => actualizar('phone', e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-3 font-mono text-micro uppercase text-grafito">Estilo</h2>
        <div className="grid grid-cols-2 items-end gap-2">
          <Campo
            etiqueta="Color de fondo"
            type="color"
            value={config.backgroundColor ?? COLOR_FONDO_DEFECTO}
            onChange={(e) => actualizar('backgroundColor', e.target.value)}
            className="h-10 p-1"
          />
          <label className="flex min-h-tecla cursor-pointer items-center justify-center border border-linea-fuerte bg-white px-3 text-center text-base text-tinta shadow-impresa">
            {config.raffleImage ? 'Cambiar logotipo' : 'Agregar logotipo'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                void manejarLogo(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </section>

      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-3 font-mono text-micro uppercase text-grafito">Vista previa</h2>
        <VistaPreviaCanvas config={config} pagina={pagina} />
        {paginasTotales > 1 && (
          <div className="mt-2 flex items-center justify-between">
            <Boton
              variante="secundaria"
              disabled={pagina === 0}
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
            >
              Anterior
            </Boton>
            <span className="text-fino text-grafito">
              Página {pagina + 1} de {paginasTotales}
            </span>
            <Boton
              variante="secundaria"
              disabled={pagina >= paginasTotales - 1}
              onClick={() => setPagina((p) => Math.min(paginasTotales - 1, p + 1))}
            >
              Siguiente
            </Boton>
          </div>
        )}
      </section>

      {aviso && <Aviso tono={aviso.tono}>{aviso.texto}</Aviso>}

      <div className={whatsappNumber ? 'grid grid-cols-2 gap-2' : ''}>
        <Boton
          tamano="tecla"
          variante={whatsappNumber ? 'secundaria' : 'primaria'}
          className="w-full"
          disabled={generando || enviando}
          onClick={() => void descargarPdf()}
        >
          {generando
            ? progreso
              ? `Generando… (${progreso.actual}/${progreso.total})`
              : 'Generando…'
            : 'Descargar PDF'}
        </Boton>
        {whatsappNumber && (
          <Boton
            tamano="tecla"
            className="w-full"
            disabled={generando || enviando}
            onClick={() => void enviarPorWhatsapp()}
          >
            {enviando
              ? progreso
                ? `Enviando… (${progreso.actual}/${progreso.total})`
                : 'Enviando…'
              : 'Enviar por WhatsApp'}
          </Boton>
        )}
      </div>
    </div>
  );
}
