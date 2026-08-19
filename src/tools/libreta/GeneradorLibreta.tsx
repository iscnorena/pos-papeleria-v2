'use client';

import { useState } from 'react';

import { LIBRETA } from '@/config/pos';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Selector } from '@/components/ui/Selector';
import { compartirPdfPorWhatsapp } from '@/lib/compartirPorWhatsapp';
import { ESTILOS_HOJA, type HojaLibretaConfig } from './layout';
import { generarHojaLibreta } from './pdf';
import { VistaPreviaCanvas } from './VistaPreviaCanvas';

// Componente único, compartido por la ruta interna (/herramientas/libreta, con sesión) y
// la pública (/imprimir/libreta, sin sesión) — mismo criterio que GeneradorRifas: el
// botón de WhatsApp solo aparece si se recibe `whatsappNumber`.

const TEXTO_WHATSAPP = 'Hola, les mando esta hoja para imprimir 🖨️';

const CONFIG_INICIAL: HojaLibretaConfig = {
  nombre: '',
  materia: '',
  fecha: '',
  gradoGrupo: '',
  estilo: 'raya',
  cantidad: 1,
  numerarPaginas: false,
};

export function GeneradorLibreta({ whatsappNumber }: { whatsappNumber?: string } = {}) {
  const [config, setConfig] = useState<HojaLibretaConfig>(CONFIG_INICIAL);
  const [generando, setGenerando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progreso, setProgreso] = useState<{ actual: number; total: number } | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; tono: 'error' | 'neutro' } | null>(null);

  function actualizar<K extends keyof HojaLibretaConfig>(campo: K, valor: HojaLibretaConfig[K]) {
    setConfig((actual) => ({ ...actual, [campo]: valor }));
  }

  /** Comparte `true` si config está en rango; si no, deja el aviso puesto y devuelve `false`. */
  function validar(): boolean {
    if (config.cantidad < 1 || config.cantidad > LIBRETA.hojasMaximo) {
      setAviso({
        texto: `La cantidad de hojas debe estar entre 1 y ${LIBRETA.hojasMaximo}.`,
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
      const resultado = await generarHojaLibreta(config, (actual, total) =>
        setProgreso({ actual, total }),
      );

      const blob = new Blob([resultado.bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `libreta-${Date.now()}.pdf`;
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
      const resultado = await generarHojaLibreta(config, (actual, total) =>
        setProgreso({ actual, total }),
      );
      await compartirPdfPorWhatsapp({
        archivos: [{ bytes: resultado.bytes, nombreArchivo: `libreta-${Date.now()}.pdf` }],
        whatsappNumber,
        tituloCompartir: 'Hoja de libreta',
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
        <h2 className="mb-3 font-mono text-micro uppercase text-grafito">Datos del alumno</h2>
        <div className="grid grid-cols-2 gap-2">
          <Campo
            etiqueta="Nombre del alumno"
            value={config.nombre}
            onChange={(e) => actualizar('nombre', e.target.value)}
          />
          <Campo
            etiqueta="Materia"
            value={config.materia}
            onChange={(e) => actualizar('materia', e.target.value)}
          />
          <Campo
            etiqueta="Fecha"
            placeholder="Ej. 24 de agosto"
            value={config.fecha}
            onChange={(e) => actualizar('fecha', e.target.value)}
          />
          <Campo
            etiqueta="Grado y grupo"
            placeholder="Ej. 3° B"
            value={config.gradoGrupo}
            onChange={(e) => actualizar('gradoGrupo', e.target.value)}
          />
        </div>
        <p className="mt-2 text-fino text-grafito">
          Cada dato aparece solo si lo llenas. Si dejas todo en blanco, la hoja sale sin encabezado.
        </p>
      </section>

      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-3 font-mono text-micro uppercase text-grafito">Rayado</h2>
        <Selector
          etiqueta="Estilo"
          opciones={ESTILOS_HOJA.map((e) => ({ valor: e.valor, texto: e.texto }))}
          value={config.estilo}
          onChange={(e) => actualizar('estilo', e.target.value as HojaLibretaConfig['estilo'])}
        />
      </section>

      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-3 font-mono text-micro uppercase text-grafito">Cantidad</h2>
        <Campo
          etiqueta="¿Cuántas hojas?"
          type="number"
          min={1}
          max={LIBRETA.hojasMaximo}
          value={config.cantidad}
          onChange={(e) => actualizar('cantidad', Number(e.target.value) || 0)}
          ayuda={`Entre 1 y ${LIBRETA.hojasMaximo}. Se repite la misma hoja esa cantidad de veces.`}
        />
        {config.cantidad > 1 && (
          <label className="mt-2 flex items-center gap-2 text-base text-tinta">
            <input
              type="checkbox"
              checked={config.numerarPaginas}
              onChange={(e) => actualizar('numerarPaginas', e.target.checked)}
              className="h-4 w-4"
            />
            Numerar páginas
          </label>
        )}
      </section>

      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-3 font-mono text-micro uppercase text-grafito">Vista previa</h2>
        <VistaPreviaCanvas config={config} />
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
            : 'Generar y descargar'}
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
