'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { inventories } from '@/db/schema';
import { obtenerIdioma, t } from '@/lib/i18n/servidor';
import { aCentesimas, aPesos } from '@/lib/money';
import { erroresDeZod, type EstadoFormulario } from '@/lib/resultado';
import { exigirRol } from '@/lib/sesion';

export async function ajustarExistencia(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const permiso = await exigirRol('admin');
  if (!permiso.ok) return { error: permiso.error };
  const idioma = await obtenerIdioma();

  const esquema = z.object({
    productId: z.coerce.number().int().positive(),
    branchId: z.coerce.number().int().positive(),
    stock: z
      .string()
      .trim()
      .transform((texto, ctx) => {
        const centesimas = aCentesimas(texto);
        if (centesimas === null) {
          ctx.addIssue({ code: 'custom', message: t(idioma, 'admin.cantidadInvalida') });
          return z.NEVER;
        }
        return centesimas;
      }),
  });

  const analisis = esquema.safeParse({
    productId: datos.get('productId'),
    branchId: datos.get('branchId'),
    stock: datos.get('stock'),
  });
  if (!analisis.success) return { errores: erroresDeZod(analisis.error) };

  const { productId, branchId, stock } = analisis.data;

  try {
    const actualizadas = await db
      .update(inventories)
      .set({ stock: aPesos(stock) })
      .where(and(eq(inventories.productId, productId), eq(inventories.branchId, branchId)))
      .returning({ id: inventories.id });

    if (actualizadas.length === 0) {
      // Puede pasar si el producto se creó sin manejar inventario y luego se activó.
      await db.insert(inventories).values({ productId, branchId, stock: aPesos(stock) });
    }
  } catch {
    return { error: t(idioma, 'inventario.errorNoSePudoAjustar') };
  }

  revalidatePath('/inventario');
  return { ok: true, mensaje: t(idioma, 'inventario.exitoAjustada') };
}
