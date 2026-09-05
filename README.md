# Community Delivery

Community Delivery is a marketplace platform that connects providers (drivers, couriers, and sellers) with customers for on-demand delivery and commerce — combining the on-demand transportation model (like Uber) with a multi-vendor marketplace (like Alibaba).

This repository contains the backend and frontend for the service, with integrations to Supabase for auth and database, and Redis for caching.

Key concepts
- Provider: a person or business offering delivery or goods/services.
- Customer: a user requesting deliveries or buying items.
- Job / Order: a delivery or purchase request assigned to a provider.
- Dashboard (Provider): the web interface where providers see jobs, earnings, stats, and manage availability.

Providers Dashboard (overview)
- Authentication: sign in with Supabase auth (email / OAuth).
- Active Jobs list: accepted, in-progress, and completed jobs with status updates and navigation links.
- Earnings & Payouts: total earnings, pending payouts, payout history and simple export.
- Availability / Schedule: toggle availability and set service areas.
- Inbox / Messages: messages from customers and system notifications.
- Inventory / Listings (for sellers): manage products, prices, and stock.
- Analytics: simple charts for trips, revenue, acceptance rate, completion rate.
- Settings: profile, vehicle info, bank/payment details (do not store raw bank details in repo), notification preferences.

Getting started (local development)
1. Clone the repo
   git clone https://github.com/Alice34mung3ai/community-delivery.git
   cd community-delivery

2. Install dependencies
   # Example: Node.js project
   npm install

3. Create .env from .env.example and fill values
   cp .env.example .env
   # Fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, etc.

4. Setup Supabase
   - Create a Supabase project at https://app.supabase.com
   - Create the required tables (users, providers, jobs, listings, payouts, messages). Migrations or SQL files should be in the migrations/ directory if present.
   - Copy the project URL and anon/service keys into your .env

5. Run database migrations (example)
   npm run migrate

6. Start the app
   npm run dev

Environment variables
See .env.example for a full list. Important ones for Supabase:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- DATABASE_URL
- NEXT_PUBLIC_SUPABASE_URL (if frontend)
- NEXT_PUBLIC_SUPABASE_ANON_KEY (if frontend)

Provider Dashboard: Implementation notes
- Architecture: frontend (React/Next.js or similar) + backend serverless or Node server + Supabase Postgres + Redis cache.
- Realtime: use Supabase Realtime or WebSockets to push job updates (accepted, started, completed).
- Authorization: providers should be a role in Supabase auth. Use row-level security (RLS) to restrict access to provider-specific data.
- Notifications: integrate with push notifications (FCM/APNs) or SMS for critical updates.
- Maps & routing: integrate with a maps provider (Mapbox, Google Maps) for navigation and service-area geofencing.

Contributing
- Create feature branches and open PRs targeting main.
- Follow repository linting and formatting rules.

License
- Add a license file (e.g., MIT) if this is your intent.

Contact
- For questions, open an issue or contact the maintainers.
