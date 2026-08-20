import Link from 'next/link';
import { asc, count, eq } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { FormularioCrud } from '@/components/FormularioCrud';
import { Paginacion } from '@/components/Paginacion';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { PAGINACION } from '@/config/pos';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { offsetDePagina, paginaDeBusqueda } from '@/lib/paginacion';
import { guardarSucursal } from './acciones';

export default async function PantallaSucursales({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; pagina?: string }>;
}) {
  const { editar, pagina: paginaTexto } = await searchParams;
  const idEditar = Number(editar);
  const pagina = paginaDeBusqueda(paginaTexto);

  const [lista, filasTotal] = await Promise.all([
    db
      .select()
      .from(branches)
      .orderBy(asc(branches.id))
      .limit(PAGINACION.porPagina)
      .offset(offsetDePagina(pagina)),
    db.select({ total: count() }).from(branches),
  ]);
  const total = filasTotal[0]?.total ?? 0;
  const enEdicion = Number.isInteger(idEditar)
    ? ((await db.select().from(branches).where(eq(branches.id, idEditar)).limit(1))[0] ?? null)
    : null;

  return (
    <section>
      <EncabezadoPantalla
        titulo="Sucursales"
        descripcion="Cada usuario pertenece a una sucursal y vende contra su inventario."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <Tabla encabezados={['#', 'Nombre', 'Dirección', 'Teléfono', 'WhatsApp', 'Estado', '']}>
          {lista.length === 0 && <SinDatos columnas={7}>Todavía no hay sucursales.</SinDatos>}
          {lista.map((s) => (
            <Fila key={s.id}>
              <Celda mono>{s.id}</Celda>
              <Celda>{s.name}</Celda>
              <Celda>{s.address ?? '—'}</Celda>
              <Celda mono>{s.phone ?? '—'}</Celda>
              <Celda mono>{s.whatsappNumber ?? '—'}</Celda>
              <Celda>
                {s.isActive ? (
                  <Distintivo tono="visto">Activa</Distintivo>
                ) : (
                  <Distintivo tono="sello">Inactiva</Distintivo>
                )}
              </Celda>
              <Celda>
                <Link href={`/sucursales?editar=${s.id}`} className="text-boligrafo underline">
                  Editar
                </Link>
              </Celda>
            </Fila>
          ))}
        </Tabla>
        <Paginacion
          ruta="/sucursales"
          pagina={pagina}
          totalFilas={total}
          porPagina={PAGINACION.porPagina}
        />

        <aside className="border border-linea-fuerte bg-white p-5 shadow-impresa">
          <h2 className="mb-4 font-display text-cuerpo font-semibold text-tinta">
            {enEdicion ? `Editar «${enEdicion.name}»` : 'Nueva sucursal'}
          </h2>

          <FormularioCrud
            // `key` fuerza a React a montar un formulario nuevo al cambiar de registro: si
            // no, los `defaultValue` del anterior se quedarían pegados.
            key={enEdicion?.id ?? 'nueva'}
            accion={guardarSucursal}
            textoEnviar={enEdicion ? 'Guardar cambios' : 'Crear sucursal'}
            ocultos={enEdicion ? { id: String(enEdicion.id) } : {}}
            campos={[
              {
                tipo: 'texto',
                nombre: 'name',
                etiqueta: 'Nombre',
                requerido: true,
                valor: enEdicion?.name,
              },
              {
                tipo: 'texto',
                nombre: 'address',
                etiqueta: 'Dirección',
                valor: enEdicion?.address ?? '',
              },
              {
                tipo: 'texto',
                nombre: 'phone',
                etiqueta: 'Teléfono',
                valor: enEdicion?.phone ?? '',
              },
              {
                tipo: 'texto',
                nombre: 'whatsappNumber',
                etiqueta: 'WhatsApp para /imprimir/acomoda-impresion',
                valor: enEdicion?.whatsappNumber ?? '',
                ayuda: 'Formato internacional sin espacios ni signos, ej. 527445008175.',
              },
              {
                tipo: 'casilla',
                nombre: 'isActive',
                etiqueta: 'Activa',
                valor: enEdicion?.isActive ?? true,
                ayuda: 'Las sucursales no se borran: se desactivan.',
              },
            ]}
          />

          {enEdicion && (
            <Link href="/sucursales" className="mt-3 block text-fino text-boligrafo underline">
              Cancelar edición
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
