// Lectura única de variables de entorno del servidor. Falla al arrancar, con nombre
// de variable, en vez de reventar a media petición con `undefined`.
//
// SUPABASE_SERVICE_ROLE_KEY nunca lleva prefijo NEXT_PUBLIC_ (§2): la llave de
// servicio solo vive en el servidor.

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Cópiala de .env.example a .env.local.`,
    );
  }
  return valor;
}

function opcional(nombre: string, porDefecto: string): string {
  return process.env[nombre] || porDefecto;
}

export const env = {
  get databaseUrl() {
    return requerida('DATABASE_URL');
  },
  get supabaseUrl() {
    return requerida('SUPABASE_URL');
  },
  get supabaseServiceRoleKey() {
    return requerida('SUPABASE_SERVICE_ROLE_KEY');
  },
  get authSecret() {
    return requerida('AUTH_SECRET');
  },
  get nombreNegocio() {
    return opcional('POS_COMPANY_NAME', 'Mi Negocio');
  },
};
