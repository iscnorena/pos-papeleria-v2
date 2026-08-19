// Iconos a trazo, no emoji (§Fase 6). Trazo de 1.5 y esquinas vivas, para que peguen con
// los filetes del resto del sistema.

const comunes = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  'aria-hidden': true,
} as const;

export function IconoHojas() {
  return (
    <svg {...comunes}>
      <rect x="3" y="3" width="12" height="16" />
      <path d="M7 7h4M7 11h4M7 15h2" />
      <path d="M9 21h12V7" />
    </svg>
  );
}

export function IconoEtiqueta() {
  return (
    <svg {...comunes}>
      <path d="M3 3h9l9 9-9 9-9-9V3z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}

export function IconoCalculadora() {
  return (
    <svg {...comunes}>
      <rect x="4" y="2" width="16" height="20" />
      <path d="M8 6h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h8" />
    </svg>
  );
}

export function IconoRifa() {
  return (
    <svg {...comunes}>
      <path d="M3 6h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4V6z" />
      <path d="M15 6v12" strokeDasharray="2 2" />
    </svg>
  );
}

export function IconoPdf() {
  return (
    <svg {...comunes}>
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v4h4" />
      <path d="M9 13h2a1.5 1.5 0 0 1 0 3H9v-3zM9 16v3" />
    </svg>
  );
}

export function IconoUnirPdf() {
  return (
    <svg {...comunes}>
      <path d="M4 3h7l3 3v7H4z" />
      <path d="M10 3v3h3" />
      <path d="M13 11h7l-3 3v7h-7v-7z" />
      <path d="M17 11v3h3" />
    </svg>
  );
}

export function IconoDividirPdf() {
  return (
    <svg {...comunes}>
      <path d="M6 2h8l4 4v6H6z" />
      <path d="M14 2v4h4" />
      <path d="M6 12h16l-4 4v6H10v-6z" />
      <path d="M18 12v4h4" />
    </svg>
  );
}

export function IconoRotarPdf() {
  return (
    <svg {...comunes}>
      <path d="M8 4h6l4 4v10H8z" />
      <path d="M14 4v4h4" />
      <path d="M4 14a4 4 0 0 1 4-4" />
      <path d="M4 14v-3M4 14h3" />
    </svg>
  );
}

export function IconoReordenarPdf() {
  return (
    <svg {...comunes}>
      <rect x="4" y="3" width="9" height="12" />
      <rect x="11" y="9" width="9" height="12" />
      <path d="M16 3v3M14.5 4.5h3" />
    </svg>
  );
}

export function IconoLibreta() {
  return (
    <svg {...comunes}>
      <rect x="7" y="3" width="14" height="18" />
      <path d="M3 5v2M3 9v2M3 13v2M3 17v2" />
      <path d="M10 8h8M10 12h8M10 16h5" />
    </svg>
  );
}

export function IconoNumerarPdf() {
  return (
    <svg {...comunes}>
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v4h4" />
      <circle cx="9.5" cy="13.5" r="0.75" fill="currentColor" stroke="none" />
      <path d="M11.5 13.5h3" />
      <circle cx="9.5" cy="17.5" r="0.75" fill="currentColor" stroke="none" />
      <path d="M11.5 17.5h3" />
    </svg>
  );
}
