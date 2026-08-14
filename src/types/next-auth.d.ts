import type { DefaultSession } from 'next-auth';
import type { Rol } from '@/db/schema';

// La sesión de §5 lleva { userId, name, role, branchId }. Sin esta ampliación,
// `session.user.role` no existe para TypeScript y cada uso pediría un `as`.

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Rol;
      branchId: number;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: number;
    role?: Rol;
    branchId?: number;
  }
}
