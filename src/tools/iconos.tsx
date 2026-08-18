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
