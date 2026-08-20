import Link from 'next/link';
import { asc, count, eq } from 'drizzle-orm';

import { EncabezadoPantalla } from '@/components/EncabezadoPantalla';
import { FormularioCrud } from '@/components/FormularioCrud';
import { Paginacion } from '@/components/Paginacion';
import { Celda, Fila, SinDatos, Tabla } from '@/components/Tabla';
import { Distintivo } from '@/components/ui/Distintivo';
import { PAGINACION } from '@/config/pos';
import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { offsetDePagina, paginaDeBusqueda } from '@/lib/paginacion';
import { guardarProveedor } from './acciones';

export default async function PantallaProveedores({
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
      .from(suppliers)
      .orderBy(asc(suppliers.name))
      .limit(PAGINACION.porPagina)
      .offset(offsetDePagina(pagina)),
    db.select({ total: count() }).from(suppliers),
  ]);
  const total = filasTotal[0]?.total ?? 0;
  const enEdicion = Number.isInteger(idEditar)
    ? ((await db.select().from(suppliers).where(eq(suppliers.id, idEditar)).limit(1))[0] ?? null)
    : null;

  return (
    <section>
      <EncabezadoPantalla
        titulo="Proveedores"
        descripcion="El RFC valida el emisor de un CFDI al importar una factura en Recepción de Mercancía."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <Tabla encabezados={['#', 'Nombre', 'RFC', 'Contacto', 'Teléfono', 'Estado', '']}>
            {lista.length === 0 && <SinDatos columnas={7}>Todavía no hay proveedores.</SinDatos>}
            {lista.map((s) => (
              <Fila key={s.id}>
                <Celda mono>{s.id}</Celda>
                <Celda>{s.name}</Celda>
                <Celda mono>{s.rfc ?? '—'}</Celda>
                <Celda>{s.contactName ?? '—'}</Celda>
                <Celda mono>{s.phone ?? '—'}</Celda>
                <Celda>
                  {s.isActive ? (
                    <Distintivo tono="visto">Activo</Distintivo>
                  ) : (
                    <Distintivo tono="sello">Inactivo</Distintivo>
                  )}
                </Celda>
                <Celda>
                  <Link href={`/proveedores?editar=${s.id}`} className="text-boligrafo underline">
                    Editar
                  </Link>
                </Celda>
              </Fila>
            ))}
          </Tabla>
          <Paginacion
            ruta="/proveedores"
            pagina={pagina}
            totalFilas={total}
            porPagina={PAGINACION.porPagina}
          />
        </div>

        <aside className="border border-linea-fuerte bg-white p-5 shadow-impresa">
          <h2 className="mb-4 font-display text-cuerpo font-semibold text-tinta">
            {enEdicion ? `Editar «${enEdicion.name}»` : 'Nuevo proveedor'}
          </h2>

          <FormularioCrud
            key={enEdicion?.id ?? 'nuevo'}
            accion={guardarProveedor}
            textoEnviar={enEdicion ? 'Guardar cambios' : 'Crear proveedor'}
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
                nombre: 'rfc',
                etiqueta: 'RFC',
                valor: enEdicion?.rfc ?? '',
                ayuda: 'Debe coincidir con el RFC del emisor en el CFDI para poder importarlo.',
              },
              {
                tipo: 'texto',
                nombre: 'contactName',
                etiqueta: 'Contacto',
                valor: enEdicion?.contactName ?? '',
              },
              {
                tipo: 'texto',
                nombre: 'phone',
                etiqueta: 'Teléfono',
                valor: enEdicion?.phone ?? '',
              },
              {
                tipo: 'texto',
                nombre: 'email',
                etiqueta: 'Correo',
                valor: enEdicion?.email ?? '',
              },
              {
                tipo: 'casilla',
                nombre: 'isActive',
                etiqueta: 'Activo',
                valor: enEdicion?.isActive ?? true,
                ayuda: 'Los proveedores no se borran: se desactivan.',
              },
            ]}
          />

          {enEdicion && (
            <Link href="/proveedores" className="mt-3 block text-fino text-boligrafo underline">
              Cancelar edición
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
