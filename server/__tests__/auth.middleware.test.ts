import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock the Supabase SDK itself so these tests never touch the network --
// they exercise our middleware logic (token parsing, role checks) only.
const getUserMock = vi.fn();
const singleMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: singleMock,
        }),
      }),
    }),
  }),
}));

const { requireAuth, optionalAuth } = await import('../lib/supabaseAdmin');

function buildApp() {
  const app = express();

  app.get('/any-authed', requireAuth(), (req: any, res) => {
    res.json({ user: req.user });
  });

  app.get('/providers-only', requireAuth(['provider']), (req: any, res) => {
    res.json({ user: req.user });
  });

  app.get('/optional', optionalAuth(), (req: any, res) => {
    res.json({ user: req.user ?? null });
  });

  return app;
}

const PROVIDER_USER = { id: 'user-1', email: 'pro@example.com', name: 'Pro Person', role: 'provider' };
const DRIVER_USER = { id: 'user-2', email: 'driver@example.com', name: 'Driver Person', role: 'driver' };

beforeEach(() => {
  getUserMock.mockReset();
  singleMock.mockReset();
});

describe('requireAuth', () => {
  it('rejects requests with no Authorization header', async () => {
    const app = buildApp();
    const res = await request(app).get('/any-authed');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a token Supabase does not recognise', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });
    const app = buildApp();
    const res = await request(app).get('/any-authed').set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
  });

  it('accepts a valid token for any-role routes and attaches the profile', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: PROVIDER_USER.id } }, error: null });
    singleMock.mockResolvedValue({ data: PROVIDER_USER, error: null });

    const app = buildApp();
    const res = await request(app).get('/any-authed').set('Authorization', 'Bearer good-token');

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(PROVIDER_USER);
  });

  it('allows a provider onto a provider-only route', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: PROVIDER_USER.id } }, error: null });
    singleMock.mockResolvedValue({ data: PROVIDER_USER, error: null });

    const app = buildApp();
    const res = await request(app).get('/providers-only').set('Authorization', 'Bearer good-token');

    expect(res.status).toBe(200);
  });

  it('blocks a driver from a provider-only route (RBAC)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: DRIVER_USER.id } }, error: null });
    singleMock.mockResolvedValue({ data: DRIVER_USER, error: null });

    const app = buildApp();
    const res = await request(app).get('/providers-only').set('Authorization', 'Bearer good-token');

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/insufficient role/i);
  });
});

describe('optionalAuth', () => {
  it('proceeds anonymously when no token is present', async () => {
    const app = buildApp();
    const res = await request(app).get('/optional');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it('attaches the user when a valid token is present', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: DRIVER_USER.id } }, error: null });
    singleMock.mockResolvedValue({ data: DRIVER_USER, error: null });

    const app = buildApp();
    const res = await request(app).get('/optional').set('Authorization', 'Bearer good-token');

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(DRIVER_USER);
  });

  it('proceeds anonymously (not a 401) when the token is invalid', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });
    const app = buildApp();
    const res = await request(app).get('/optional').set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });
});
