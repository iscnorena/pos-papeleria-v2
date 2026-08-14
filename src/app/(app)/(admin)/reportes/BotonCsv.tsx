'use client';

import { Boton } from '@/components/ui/Boton';

// §Fase 5 — exportar a CSV **desde el cliente**: nada de generar archivos en el servidor,
// que en Vercel no tiene dónde escribirlos (§1.1).

/** Escapa un campo de CSV: comillas dobladas y entrecomillado si trae separador o salto. */
function campo(valor: string | number): string {
  const texto = String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function BotonCsv({
  nombre,
  encabezados,
  filas,
}: {
  nombre: string;
  encabezados: string[];
  filas: (string | number)[][];
}) {
  function descargar() {
    const lineas = [encabezados, ...filas].map((fila) => fila.map(campo).join(';'));

    // Dos detalles que deciden si el archivo abre bien en Excel:
    //
    // 1. El BOM UTF-8 (﻿). Sin él, Excel en Windows lee el archivo como ANSI y
    //    «Papelería» sale «PapelerÃ­a». Es el criterio 4 de esta fase.
    // 2. El separador `;`. El Excel en español espera punto y coma; con comas mete todo
    //    en una sola columna.
    const contenido = '﻿' + lineas.join('\r\n');
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `${nombre}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Boton variante="secundaria" onClick={descargar} disabled={filas.length === 0}>
      Exportar CSV
    </Boton>
  );
}
