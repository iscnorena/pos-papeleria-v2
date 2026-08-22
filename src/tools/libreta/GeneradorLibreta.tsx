'use client';

import { useState } from 'react';

import { LIBRETA } from '@/config/pos';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Selector } from '@/components/ui/Selector';
import { useIdioma } from '@/lib/i18n/cliente';
import { compartirPdfPorWhatsapp } from '@/lib/compartirPorWhatsapp';
import { estilosHoja, opcionesPosicionTexto, type HojaLibretaConfig } from './layout';
import { generarHojaLibreta } from './pdf';
import { VistaPreviaCanvas } from './VistaPreviaCanvas';

// Componente único, compartido por la ruta interna (/herramientas/libreta, con sesión) y
// la pública (/kit/libreta, sin sesión) — mismo criterio que GeneradorRifas: el
// botón de WhatsApp solo aparece si se recibe `whatsappNumber`.

const CONFIG_INICIAL: HojaLibretaConfig = {
  nombre: '',
  nombrePosicion: 'izquierda',
  maestro: '',
  maestroPosicion: 'izquierda',
  materia: '',
  materiaPosicion: 'izquierda',
  fecha: '',
  fechaPosicion: 'izquierda',
  gradoGrupo: '',
  gradoGrupoPosicion: 'izquierda',
  estilo: 'raya',
  cantidad: 1,
  numerarPaginas: false,
};

export function GeneradorLibreta({ whatsappNumber }: { whatsappNumber?: string } = {}) {
  const { idioma, t } = useIdioma();
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
        texto: t('libreta.errorCantidadHojasRango', { max: LIBRETA.hojasMaximo }),
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
      const resultado = await generarHojaLibreta(config, idioma, (actual, total) =>
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
          texto: t('comun.avisoCaracteresQuitados', {
            campos: resultado.camposSaneados.join(', '),
          }),
          tono: 'neutro',
        });
      }
    } catch {
      setAviso({ texto: t('comun.noSePudoGenerarPdf'), tono: 'error' });
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
      const resultado = await generarHojaLibreta(config, idioma, (actual, total) =>
        setProgreso({ actual, total }),
      );
      const textoWhatsapp = t('libreta.textoWhatsapp');
      await compartirPdfPorWhatsapp({
        archivos: [{ bytes: resultado.bytes, nombreArchivo: `libreta-${Date.now()}.pdf` }],
        whatsappNumber,
        tituloCompartir: t('libreta.tituloCompartirHoja'),
        textoCompartir: textoWhatsapp,
        textoRespaldo: t('comun.textoRespaldoWhatsapp', { texto: textoWhatsapp }),
      });

      if (resultado.camposSaneados.length > 0) {
        setAviso({
          texto: t('comun.avisoCaracteresQuitados', {
            campos: resultado.camposSaneados.join(', '),
          }),
          tono: 'neutro',
        });
      }
    } catch {
      setAviso({ texto: t('comun.noSePudoGenerarPdf'), tono: 'error' });
    } finally {
      setEnviando(false);
      setProgreso(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-3 font-mono text-micro uppercase text-grafito">
          {t('libreta.datosDelAlumno')}
        </h2>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_8rem] items-end gap-2">
            <Campo
              etiqueta={t('libreta.nombreDelAlumno')}
              value={config.nombre}
              onChange={(e) => actualizar('nombre', e.target.value)}
            />
            <Selector
              etiqueta={t('libreta.posicionDelNombreDelAlumno')}
              opciones={opcionesPosicionTexto(idioma)}
              value={config.nombrePosicion}
              onChange={(e) =>
                actualizar('nombrePosicion', e.target.value as HojaLibretaConfig['nombrePosicion'])
              }
            />
          </div>
          <div className="grid grid-cols-[1fr_8rem] items-end gap-2">
            <Campo
              etiqueta={t('libreta.nombreDelMaestro')}
              value={config.maestro}
              onChange={(e) => actualizar('maestro', e.target.value)}
            />
            <Selector
              etiqueta={t('libreta.posicionDelNombreDelMaestro')}
              opciones={opcionesPosicionTexto(idioma)}
              value={config.maestroPosicion}
              onChange={(e) =>
                actualizar(
                  'maestroPosicion',
                  e.target.value as HojaLibretaConfig['maestroPosicion'],
                )
              }
            />
          </div>
          <div className="grid grid-cols-[1fr_8rem] items-end gap-2">
            <Campo
              etiqueta={t('libreta.materia')}
              value={config.materia}
              onChange={(e) => actualizar('materia', e.target.value)}
            />
            <Selector
              etiqueta={t('libreta.posicionDeLaMateria')}
              opciones={opcionesPosicionTexto(idioma)}
              value={config.materiaPosicion}
              onChange={(e) =>
                actualizar(
                  'materiaPosicion',
                  e.target.value as HojaLibretaConfig['materiaPosicion'],
                )
              }
            />
          </div>
          <div className="grid grid-cols-[1fr_8rem] items-end gap-2">
            <Campo
              etiqueta={t('comun.fecha')}
              placeholder={t('libreta.fechaPlaceholder')}
              value={config.fecha}
              onChange={(e) => actualizar('fecha', e.target.value)}
            />
            <Selector
              etiqueta={t('libreta.posicionDeLaFecha')}
              opciones={opcionesPosicionTexto(idioma)}
              value={config.fechaPosicion}
              onChange={(e) =>
                actualizar('fechaPosicion', e.target.value as HojaLibretaConfig['fechaPosicion'])
              }
            />
          </div>
          <div className="grid grid-cols-[1fr_8rem] items-end gap-2">
            <Campo
              etiqueta={t('libreta.gradoYGrupo')}
              placeholder={t('libreta.gradoGrupoPlaceholder')}
              value={config.gradoGrupo}
              onChange={(e) => actualizar('gradoGrupo', e.target.value)}
            />
            <Selector
              etiqueta={t('libreta.posicionDelGradoYGrupo')}
              opciones={opcionesPosicionTexto(idioma)}
              value={config.gradoGrupoPosicion}
              onChange={(e) =>
                actualizar(
                  'gradoGrupoPosicion',
                  e.target.value as HojaLibretaConfig['gradoGrupoPosicion'],
                )
              }
            />
          </div>
        </div>
        <p className="mt-2 text-fino text-grafito">{t('libreta.ayudaCamposEncabezado')}</p>
      </section>

      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-3 font-mono text-micro uppercase text-grafito">{t('libreta.rayado')}</h2>
        <Selector
          etiqueta={t('comun.estilo')}
          opciones={estilosHoja(idioma).map((e) => ({ valor: e.valor, texto: e.texto }))}
          value={config.estilo}
          onChange={(e) => actualizar('estilo', e.target.value as HojaLibretaConfig['estilo'])}
        />
      </section>

      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-3 font-mono text-micro uppercase text-grafito">{t('caja.cantidad')}</h2>
        <Campo
          etiqueta={t('libreta.cuantasHojas')}
          type="number"
          min={1}
          max={LIBRETA.hojasMaximo}
          value={config.cantidad}
          onChange={(e) => actualizar('cantidad', Number(e.target.value) || 0)}
          ayuda={t('libreta.ayudaCantidadHojas', { max: LIBRETA.hojasMaximo })}
        />
        {config.cantidad > 1 && (
          <label className="mt-2 flex items-center gap-2 text-base text-tinta">
            <input
              type="checkbox"
              checked={config.numerarPaginas}
              onChange={(e) => actualizar('numerarPaginas', e.target.checked)}
              className="h-4 w-4"
            />
            {t('libreta.numerarPaginas')}
          </label>
        )}
      </section>

      <section className="border border-linea-fuerte bg-white p-3 shadow-impresa">
        <h2 className="mb-3 font-mono text-micro uppercase text-grafito">
          {t('comun.vistaPrevia')}
        </h2>
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
              ? t('comun.generandoConProgreso', { actual: progreso.actual, total: progreso.total })
              : t('comun.generando')
            : t('libreta.generarYDescargar')}
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
                ? t('comun.enviandoConProgreso', { actual: progreso.actual, total: progreso.total })
                : t('comun.enviando')
              : t('comun.enviarPorWhatsapp')}
          </Boton>
        )}
      </div>
    </div>
  );
}
