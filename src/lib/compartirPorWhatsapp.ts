// Compartido por las herramientas públicas que arman un PDF en el navegador y lo mandan
// por WhatsApp a la papelería (Acomoda Impresión pública, Rifas pública). Antes vivía
// duplicado dentro de cada componente — un solo módulo evita que las dos copias diverjan.
//
// Primero se intenta compartir el PDF ya adjunto (Web Share API): un toque, sin depender
// de que el cliente tenga guardado el número. Si el celular no lo soporta (o el cliente
// cancela), cae al respaldo universal: descarga el PDF y abre WhatsApp con el número
// correcto ya cargado, pidiendo que se adjunte lo que se acaba de descargar.

export type CompartirPdfPorWhatsapp = {
  bytes: Uint8Array;
  nombreArchivo: string;
  whatsappNumber: string;
  tituloCompartir: string;
  /** Texto usado cuando el PDF se comparte ya adjunto (Web Share API). */
  textoCompartir: string;
  /** Texto usado en el respaldo (wa.me): debe aclarar que hay que adjuntar el PDF a mano. */
  textoRespaldo: string;
};

export async function compartirPdfPorWhatsapp({
  bytes,
  nombreArchivo,
  whatsappNumber,
  tituloCompartir,
  textoCompartir,
  textoRespaldo,
}: CompartirPdfPorWhatsapp): Promise<void> {
  const archivo = new File([bytes as BlobPart], nombreArchivo, { type: 'application/pdf' });

  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: tituloCompartir, text: textoCompartir });
      return;
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return; // el cliente canceló
      // cualquier otro error cae al respaldo
    }
  }

  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);

  const texto = encodeURIComponent(textoRespaldo);
  window.open(`https://wa.me/${whatsappNumber}?text=${texto}`, '_blank');
}
