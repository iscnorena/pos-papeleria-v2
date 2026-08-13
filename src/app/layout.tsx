import type { Metadata, Viewport } from 'next';
import { claseFuentes } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'POS Papelería',
  description: 'Punto de venta para papelería',
};

export const viewport: Viewport = {
  themeColor: '#FAF9F4',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={claseFuentes}>
      <body>{children}</body>
    </html>
  );
}
