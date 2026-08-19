// Compartido por las herramientas públicas que arman uno o más PDF en el navegador y los
// mandan por WhatsApp a la papelería (Acomoda Impresión pública, Rifas pública, Unir y
// Dividir PDF). Antes vivía duplicado dentro de cada componente — un solo módulo evita
// que las copias diverjan.
//
// Primero se intenta compartir los PDF ya adjuntos (Web Share API, que acepta varios
// archivos a la vez): un toque, sin depender de que el cliente tenga guardado el número.
// Si el celular no lo soporta (o el cliente cancela), cae al respaldo universal: descarga
// cada PDF y abre WhatsApp con el número correcto ya cargado, pidiendo que se adjunten a
// mano los que se acaban de descargar.

export type ArchivoPorCompartir = { bytes: Uint8Array; nombreArchivo: string };

export type CompartirPdfPorWhatsapp = {
  archivos: ArchivoPorCompartir[];
  whatsappNumber: string;
  tituloCompartir: string;
  /** Texto usado cuando los PDF se comparten ya adjuntos (Web Share API). */
  textoCompartir: string;
  /** Texto usado en el respaldo (wa.me): debe aclarar que hay que adjuntar el/los PDF a mano. */
  textoRespaldo: string;
};

export async function compartirPdfPorWhatsapp({
  archivos,
  whatsappNumber,
  tituloCompartir,
  textoCompartir,
  textoRespaldo,
}: CompartirPdfPorWhatsapp): Promise<void> {
  const archivosCompartir = archivos.map(
    ({ bytes, nombreArchivo }) =>
      new File([bytes as BlobPart], nombreArchivo, { type: 'application/pdf' }),
  );

  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: archivosCompartir })) {
    try {
      await navigator.share({
        files: archivosCompartir,
        title: tituloCompartir,
        text: textoCompartir,
      });
      return;
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return; // el cliente canceló
      // cualquier otro error cae al respaldo
    }
  }

  // Respaldo: una descarga por archivo, con una pequeña pausa entre cada una — varias
  // descargas disparadas de golpe se topan con el bloqueo de pop-ups de algunos
  // navegadores.
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

  const texto = encodeURIComponent(textoRespaldo);
  window.open(`https://wa.me/${whatsappNumber}?text=${texto}`, '_blank');
}
