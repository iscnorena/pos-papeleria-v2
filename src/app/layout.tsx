import type { Metadata, Viewport } from 'next';
import { claseFuentes } from '@/lib/fonts';
import { IdiomaProvider } from '@/lib/i18n/cliente';
import { obtenerIdioma } from '@/lib/i18n/servidor';
import './globals.css';

export const metadata: Metadata = {
  title: 'POS Papelería',
  description: 'Punto de venta para papelería',
};

export const viewport: Viewport = {
  themeColor: '#FAF9F4',
};

// Clave de localStorage duplicada a propósito de src/lib/tema.ts (`TEMA_STORAGE_KEY`):
// este script corre antes de que cualquier módulo de la app cargue, así que no puede
// importarlo. Si cambia la clave allá, hay que cambiarla aquí también.
const SCRIPT_ANTI_PARPADEO = `try{var t=localStorage.getItem('pos.tema');if(t==='moderno'||t==='clasico'){document.documentElement.dataset.theme=t;}}catch(e){}`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // El idioma sí decide el HTML del primer render (a diferencia del tema, que se corrige
  // en el cliente con el script de abajo): viene de una cookie, se lee en el servidor, y
  // no hace falta ningún truco anti-parpadeo — el HTML ya sale en el idioma correcto.
  const idioma = await obtenerIdioma();

  return (
    // suppressHydrationWarning: el script anti-parpadeo de abajo puede cambiar
    // `data-theme` antes de que React hidrate, a propósito — no es un bug a corregir.
    <html lang={idioma} data-theme="clasico" className={claseFuentes} suppressHydrationWarning>
      <body>
        {/* Primer hijo de <body>, síncrono a propósito: el navegador bloquea el pintado
            hasta que este script corra, así que la preferencia de tema (Clásico/Moderno)
            ya está aplicada antes del primer frame — nunca se ve el tema por defecto
            parpadear al tema guardado. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_ANTI_PARPADEO }} />
        <IdiomaProvider idioma={idioma}>{children}</IdiomaProvider>
      </body>
    </html>
  );
}
