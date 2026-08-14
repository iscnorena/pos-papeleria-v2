import { redirect } from 'next/navigation';

import { catalogoDeSucursal } from '@/lib/catalogo';
import { requerirSesion } from '@/lib/sesion';
import { turnoAbiertoDe } from '@/lib/turnos';
import { PuntoDeVenta } from './PuntoDeVenta';

// §7.5 — sin turno abierto NO se vende: la pantalla redirige a abrir turno.
//
// El catálogo completo de la sucursal se carga aquí, en el servidor, y viaja con la página
// (§Fase 4): buscar deja de depender de la red en cada tecla, y si el internet parpadea a
// media venta la caja sigue armando el ticket.

export default async function PantallaCaja() {
  const sesion = await requerirSesion();

  const turno = await turnoAbiertoDe(sesion.userId);
  if (!turno) redirect('/turnos/abrir');

  const catalogo = await catalogoDeSucursal(sesion.branchId);

  return <PuntoDeVenta catalogo={catalogo} />;
}
