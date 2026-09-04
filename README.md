# OmniServe — LocalPro Market

LocalPro & Market is a small full-stack TypeScript prototype that demonstrates an on-demand local services and marketplace experience (tenants, verified pros, local stores, and drivers). The app is a React + Vite SPA with a minimal Express backend. This branch adds a Prisma-based Postgres schema, a simple JS seed script, and a README documenting setup and next steps.

## Quick start (dev)

1. Install dependencies

```bash
npm install
```

2. Set environment variables (create a .env file or set in your shell)

Required:
- DATABASE_URL — Postgres connection string (e.g. postgres://user:pass@localhost:5432/community)

Optional:
- GEMINI_API_KEY — Google GenAI API key for /api/ai/diagnose
- NODE_ENV — production|development
- DISABLE_HMR — set to "true" to disable Vite HMR in the dev server

3. Generate Prisma client and run migrations

```bash
npx prisma generate
npx prisma migrate dev --name init --preview-feature
```

4. Seed demo data

```bash
npm run db:seed
```

5. Run in dev (Vite middleware + Express)

```bash
npm run dev
```

6. Build for production

```bash
npm run build
npm run start
```

## Files added in this change

- prisma/schema.prisma — Prisma schema (models & enums)
- prisma/seed.js — Node seed script that populates demo data (providers, stores, drivers, orders)
- README.md — this file
- package.json — updated scripts & added Prisma dependencies

## Architecture (short)

- server.ts — Node + Express server that exposes REST endpoints under /api/* and serves the built SPA for production. It currently contains the route handlers and business logic; we will move persistence to Prisma.
- src/App.tsx — React single-page application that calls the Express APIs and implements tenant/provider/driver/merchant UI flows.

## Next recommended changes

- Add authentication (JWT or an external provider) and protect provider/driver/merchant endpoints.
- Replace in-memory dispatch logic with transactional operations and webhooks or sockets for live tracking.
- Add unit and integration tests for the API (Jest + supertest) and for the front-end (Vitest / React Testing Library).

