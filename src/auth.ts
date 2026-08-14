import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { and, eq, isNotNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

import { db } from '@/db';
import { users } from '@/db/schema';
import type { Rol } from '@/db/schema';

// §5 — dos formas de entrar, dos proveedores Credentials sobre la misma tabla de usuarios.
//
// Auth.js y no Supabase Auth porque aquí nadie tiene correo: se entra con un nombre de
// usuario corto (`cajera`) o con un PIN. Supabase Auth obligaría a inventar correos falsos.
//
// `authorize` devuelve `null` para CUALQUIER fallo, sin distinguir «no existe» de
// «contraseña mala»: el criterio de aceptación 1 pide que el error no revele si el usuario
// existe. El mensaje en español lo pone la Server Action que llama a `signIn`.

/** Duración de la sesión: 12 horas, más que un turno (§5). */
const DOCE_HORAS = 12 * 60 * 60;

type UsuarioSesion = {
  id: string;
  name: string;
  role: Rol;
  branchId: number;
};

async function porContrasena(usuario: string, contrasena: string): Promise<UsuarioSesion | null> {
  const [fila] = await db
    .select()
    .from(users)
    .where(and(eq(users.username, usuario), eq(users.isActive, true)))
    .limit(1);

  if (!fila) {
    // Comparación contra un hash de relleno para que un usuario inexistente tarde lo mismo
    // que uno existente: si no, el tiempo de respuesta delata qué usuarios hay.
    await bcrypt.compare(contrasena, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    return null;
  }

  if (!(await bcrypt.compare(contrasena, fila.passwordHash))) return null;

  return { id: String(fila.id), name: fila.name, role: fila.role, branchId: fila.branchId };
}

async function porPin(pin: string): Promise<UsuarioSesion | null> {
  // El PIN se trata como único GLOBAL, no por sucursal. §5 permite las dos lecturas y manda
  // la global cuando no se sabe la sucursal: esta pantalla de login no pregunta sucursal
  // porque el equipo se comparte entre turnos. La unicidad se valida al crear el usuario.
  //
  // Hay que comparar contra cada hash porque bcrypt siembra distinto en cada uno y no se
  // puede buscar por hash. Con los tres usuarios de una papelería es irrelevante; si algún
  // día fueran cientos, habría que indexar por sucursal y preguntar la sucursal en el login.
  const candidatos = await db
    .select()
    .from(users)
    .where(and(eq(users.isActive, true), isNotNull(users.pinHash)));

  for (const fila of candidatos) {
    if (fila.pinHash && (await bcrypt.compare(pin, fila.pinHash))) {
      return { id: String(fila.id), name: fila.name, role: fila.role, branchId: fila.branchId };
    }
  }
  return null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: DOCE_HORAS },
  pages: { signIn: '/login' },
  trustHost: true,
  cookies: {
    sessionToken: {
      name: 'pos.sesion',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    Credentials({
      id: 'password',
      credentials: { usuario: {}, contrasena: {} },
      authorize: async (credenciales) => {
        const usuario = credenciales?.usuario;
        const contrasena = credenciales?.contrasena;
        if (typeof usuario !== 'string' || typeof contrasena !== 'string') return null;
        return await porContrasena(usuario, contrasena);
      },
    }),
    Credentials({
      id: 'pin',
      credentials: { pin: {} },
      authorize: async (credenciales) => {
        const pin = credenciales?.pin;
        if (typeof pin !== 'string') return null;
        return await porPin(pin);
      },
    }),
  ],
  callbacks: {
    // El JWT lleva { userId, name, role, branchId } (§5): con eso, autorizar una acción no
    // necesita ir a la base en cada request.
    jwt({ token, user }) {
      if (user) {
        const u = user as unknown as UsuarioSesion;
        token.userId = Number(u.id);
        token.name = u.name;
        token.role = u.role;
        token.branchId = u.branchId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.userId ?? '');
      session.user.name = String(token.name ?? '');
      session.user.role = token.role as Rol;
      session.user.branchId = token.branchId as number;
      return session;
    },
  },
});
