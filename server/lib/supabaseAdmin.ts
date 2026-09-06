import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    '[supabaseAdmin] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'Auth-protected routes will reject every request until these are configured.'
  );
}

// Service-role client: full DB access, bypasses Row Level Security.
// SERVER-ONLY. Never import this file from anything that ships to the browser.
export const supabaseAdmin = createClient(supabaseUrl || '', serviceRoleKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type AuthedUser = {
  id: string;
  email: string;
  role: 'tenant' | 'provider' | 'driver' | 'merchant' | 'admin';
  name: string | null;
};

export interface AuthedRequest extends Request {
  user?: AuthedUser;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return null;
}

/**
 * Verifies the Supabase access token sent by the client (from
 * supabase.auth.getSession()) and loads the caller's profile/role.
 *
 * This is a defense-in-depth check at the API layer. The authoritative
 * access control is the Row Level Security policies in
 * supabase/migrations/0001_auth_and_rbac.sql — even if a route here had a
 * bug, Postgres itself would still refuse a cross-tenant read or write made
 * with the caller's own (anon-key) session.
 */
export async function loadUserFromToken(token: string): Promise<AuthedUser | null> {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, name, role')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
  };
}

/**
 * Express middleware. `requiredRoles` empty = any authenticated user.
 * Use requireAuth() with no roles just to require sign-in, or
 * requireAuth(['provider']) / requireAuth(['admin']) etc. to restrict.
 */
export function requireAuth(requiredRoles: AuthedUser['role'][] = []) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing bearer token' });
    }

    const user = await loadUserFromToken(token);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' });
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: insufficient role' });
    }

    req.user = user;
    next();
  };
}

/** Like requireAuth() but never rejects — just attaches req.user if present. */
export function optionalAuth() {
  return async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    const token = getBearerToken(req);
    if (token) {
      const user = await loadUserFromToken(token);
      if (user) req.user = user;
    }
    next();
  };
}
