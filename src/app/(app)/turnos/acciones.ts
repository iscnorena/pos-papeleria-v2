'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { cashRegisterShifts } from '@/db/schema';
import { aCentavos, aPesos } from '@/lib/money';
import { erroresDeZod, type EstadoFormulario } from '@/lib/resultado';
import { calcularCorte, congelarDesglose, turnoAbiertoDe } from '@/lib/turnos';
import { requerirSesion } from '@/lib/sesion';

const cantidad = (etiqueta: string) =>
  z
    .string()
    .trim()
    .transform((texto, ctx) => {
      const centavos = aCentavos(texto);
      if (centavos === null) {
        ctx.addIssue({ code: 'custom', message: `${etiqueta} no es una cantidad válida.` });
        return z.NEVER;
      }
      if (centavos < 0) {
        ctx.addIssue({ code: 'custom', message: `${etiqueta} no puede ser negativo.` });
        return z.NEVER;
      }
      return centavos;
    });

const esquemaApertura = z.object({ openingAmount: cantidad('El fondo de caja') });
const esquemaCierre = z.object({
  shiftId: z.coerce.number().int().positive(),
  actualCash: cantidad('El efectivo contado'),
  notes: z.string().trim().max(300, 'La nota es demasiado larga.').optional(),
});

export async function abrirTurno(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const sesion = await requerirSesion();

  // §7.5 — un usuario no puede tener dos turnos abiertos.
  if (await turnoAbiertoDe(sesion.userId)) {
    return { error: 'Ya tienes un turno abierto.' };
  }

  const analisis = esquemaApertura.safeParse({ openingAmount: datos.get('openingAmount') ?? '0' });
  if (!analisis.success) return { errores: erroresDeZod(analisis.error) };

  try {
    await db.insert(cashRegisterShifts).values({
      userId: sesion.userId,
      branchId: sesion.branchId,
      openingAmount: aPesos(analisis.data.openingAmount),
    });
  } catch {
    return { error: 'No se pudo abrir el turno. Inténtalo de nuevo.' };
  }

  revalidatePath('/turnos');
  redirect('/turnos');
}

/**
 * Cierre del turno. Es irreversible, por eso la pantalla lo confirma antes.
 *
 * El efectivo esperado y la diferencia se calculan **aquí**, en el servidor, aunque la
 * pantalla los muestre en vivo: lo que ve la cajera es una ayuda, no la fuente de verdad.
 */
export async function cerrarTurno(
  _previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const sesion = await requerirSesion();

  const analisis = esquemaCierre.safeParse({
    shiftId: datos.get('shiftId'),
    actualCash: datos.get('actualCash') ?? '0',
    notes: datos.get('notes') || undefined,
  });
  if (!analisis.success) return { errores: erroresDeZod(analisis.error) };

  const { shiftId, actualCash, notes } = analisis.data;

  const [turno] = await db
    .select()
    .from(cashRegisterShifts)
    .where(and(eq(cashRegisterShifts.id, shiftId), eq(cashRegisterShifts.status, 'open')))
    .limit(1);

  if (!turno) return { error: 'Ese turno ya no está abierto.' };
  // Nadie cierra el turno de otra persona, ni siquiera un admin: el corte lo firma quien
  // contó el dinero.
  if (turno.userId !== sesion.userId) return { error: 'Solo puedes cerrar tu propio turno.' };

  const fondo = aCentavos(turno.openingAmount) ?? 0;
  const corte = await calcularCorte(turno.id, fondo);
  const diferencia = actualCash - corte.efectivoEsperado;

  try {
    await db
      .update(cashRegisterShifts)
      .set({
        status: 'closed',
        closedAt: new Date(),
        expectedCash: aPesos(corte.efectivoEsperado),
        actualCash: aPesos(actualCash),
        difference: aPesos(diferencia),
        notes: notes ?? null,
      })
      .where(eq(cashRegisterShifts.id, turno.id));

    await congelarDesglose(turno.id, corte.porMetodo);
  } catch {
    return { error: 'No se pudo cerrar el turno. Inténtalo de nuevo.' };
  }

  revalidatePath('/turnos');
  redirect(`/turnos/${turno.id}`);
}
