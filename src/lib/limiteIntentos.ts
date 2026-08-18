import 'server-only';

import { headers } from 'next/headers';
import { and, count, eq, gt } from 'drizzle-orm';

import { db } from '@/db';
import { loginAttempts } from '@/db/schema';

// Límite de intentos por IP, genérico: lo usa el PIN del login (§5) y la búsqueda pública
// de bancos de imágenes de /imprimir. Los intentos van a la base y no a memoria porque
// cada request puede caer en una instancia distinta (§1.1). `kind` es la columna que
// distingue un límite de otro dentro de la misma tabla `login_attempts`.

export async function ipDelCliente(): Promise<string> {
  const h = await headers();
  // En Vercel el proxy pone la IP real al frente de `x-forwarded-for`.
  const reenviada = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return reenviada || h.get('x-real-ip') || 'desconocida';
}

export async function intentosRecientes(
  ip: string,
  kind: string,
  ventanaMinutos: number,
): Promise<number> {
  const desde = new Date(Date.now() - ventanaMinutos * 60_000);
  const [fila] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ip, ip),
        eq(loginAttempts.kind, kind),
        gt(loginAttempts.attemptedAt, desde),
      ),
    );
  return fila?.n ?? 0;
}

export async function anotarIntento(ip: string, kind: string): Promise<void> {
  await db.insert(loginAttempts).values({ ip, kind });
}
