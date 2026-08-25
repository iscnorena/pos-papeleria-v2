// §Fase 6 — contrato de cobro. Se define AHORA y se conecta después.
//
// Las herramientas que calculan un precio no cobran por su cuenta: declaran un cargo con
// esta forma y ya está. Quien lo cobra es el punto de venta.

export type CargoHerramienta = {
  concepto: string; // 'Impresión color 4/hoja'
  cantidad: number; // 5
  precioUnitario: number; // en centavos
  origen: { toolId: string; meta: Record<string, unknown> };
};

/**
 * La bandera que decide si el cobro desde herramientas está disponible. Hoy vale `false`
 * y no hay nada detrás.
 *
 * Lleva `NEXT_PUBLIC_` a propósito: la decide el navegador para pintar o esconder el
 * botón. No es un secreto, es un interruptor (ver también `ZONA_HORARIA` en
 * `src/config/pos.ts`, la otra variable `NEXT_PUBLIC_` del sistema).
 */
export const COBRO_HERRAMIENTAS_ACTIVO = process.env.NEXT_PUBLIC_COBRO_HERRAMIENTAS === 'true';

/**
 * Sin implementar, a propósito (§Fase 6).
 *
 * Cuando se conecte, insertará un renglón de servicio en el carrito del punto de venta sin
 * producto asociado — lo que implicará permitir `product_id` nulo en `sale_items` con
 * `product_name` obligatorio. **Esa migración está anotada en `docs/estado.md` y no se ha
 * hecho todavía**, porque §6 manda no hacerla.
 */
export function agregarAlCarrito(cargo: CargoHerramienta): never {
  throw new Error(
    `El cobro desde herramientas todavía no está conectado (${cargo.origen.toolId}). ` +
      'Ver la migración pendiente de sale_items en docs/estado.md.',
  );
}
