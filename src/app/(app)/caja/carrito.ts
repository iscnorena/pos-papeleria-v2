'use client';

import { create } from 'zustand';

import type { ProductoDeCaja } from '@/lib/catalogo';
import { aCentavos } from '@/lib/money';
import { calcularVenta, type RenglonVenta } from '@/lib/venta';

// §1 — el carrito es la única pantalla con estado de cliente de verdad; todo lo demás es
// Server Component. De ahí que Zustand aparezca aquí y en ningún otro sitio.
//
// Los totales NO se guardan en el estado: se derivan con el mismo `calcularVenta` que usa
// el servidor al cobrar. Guardarlos sería tener dos verdades y verlas divergir.

export type RenglonCarrito = {
  productId: number;
  nombre: string;
  codigo: string | null;
  /** Centésimas: 100 = 1 pieza. */
  cantidad: number;
  precioUnitario: number;
  costoUnitario: number;
  descuento: number;
  manejaInventario: boolean;
  existencia: number;
};

type EstadoCarrito = {
  renglones: RenglonCarrito[];
  activo: number | null;
  descuentoGeneral: number;

  agregar: (producto: ProductoDeCaja) => void;
  cambiarCantidad: (productId: number, cantidad: number) => void;
  sumarCantidad: (productId: number, delta: number) => void;
  cambiarDescuento: (productId: number, descuento: number) => void;
  quitar: (productId: number) => void;
  activar: (productId: number | null) => void;
  cambiarDescuentoGeneral: (descuento: number) => void;
  vaciar: () => void;
};

export const usarCarrito = create<EstadoCarrito>((set) => ({
  renglones: [],
  activo: null,
  descuentoGeneral: 0,

  agregar: (producto) =>
    set((estado) => {
      const existente = estado.renglones.find((r) => r.productId === producto.id);
      if (existente) {
        // Volver a tocar un producto suma una pieza, que es lo que espera quien cobra.
        return {
          renglones: estado.renglones.map((r) =>
            r.productId === producto.id ? { ...r, cantidad: r.cantidad + 100 } : r,
          ),
          activo: producto.id,
        };
      }
      return {
        renglones: [
          ...estado.renglones,
          {
            productId: producto.id,
            nombre: producto.nombre,
            codigo: producto.codigo,
            cantidad: 100,
            precioUnitario: aCentavos(producto.precio) ?? 0,
            costoUnitario: aCentavos(producto.costo) ?? 0,
            descuento: 0,
            manejaInventario: producto.manejaInventario,
            existencia: aCentavos(producto.existencia) ?? 0,
          },
        ],
        activo: producto.id,
      };
    }),

  cambiarCantidad: (productId, cantidad) =>
    set((estado) => ({
      renglones: estado.renglones.map((r) =>
        r.productId === productId ? { ...r, cantidad: Math.max(1, cantidad) } : r,
      ),
    })),

  sumarCantidad: (productId, delta) =>
    set((estado) => ({
      renglones: estado.renglones
        .map((r) =>
          r.productId === productId ? { ...r, cantidad: Math.max(0, r.cantidad + delta) } : r,
        )
        // Bajar de una pieza saca el renglón: es lo que quiere decir «−» hasta el final.
        .filter((r) => r.cantidad > 0),
    })),

  cambiarDescuento: (productId, descuento) =>
    set((estado) => ({
      renglones: estado.renglones.map((r) =>
        r.productId === productId ? { ...r, descuento: Math.max(0, descuento) } : r,
      ),
    })),

  quitar: (productId) =>
    set((estado) => ({
      renglones: estado.renglones.filter((r) => r.productId !== productId),
      activo: estado.activo === productId ? null : estado.activo,
    })),

  activar: (productId) => set({ activo: productId }),

  cambiarDescuentoGeneral: (descuento) => set({ descuentoGeneral: Math.max(0, descuento) }),

  vaciar: () => set({ renglones: [], activo: null, descuentoGeneral: 0 }),
}));

/** Totales derivados. Misma función que usa el servidor: una sola verdad. */
export function totalesDe(renglones: RenglonCarrito[], descuentoGeneral: number, tasa: number) {
  const paraCalculo: RenglonVenta[] = renglones.map((r) => ({
    cantidad: r.cantidad,
    precioUnitario: r.precioUnitario,
    costoUnitario: r.costoUnitario,
    descuento: r.descuento,
  }));
  return calcularVenta(paraCalculo, descuentoGeneral, tasa);
}
