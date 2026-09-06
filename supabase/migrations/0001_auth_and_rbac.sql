-- 0001_auth_and_rbac.sql
--
-- Run this AFTER `npx prisma migrate dev` (or `prisma migrate deploy`) has
-- created the domain tables (profiles, drivers, verified_pros, local_stores,
-- store_items, orders) from prisma/schema.prisma.
--
-- Apply it in the Supabase SQL Editor, or via:
--   supabase db execute -f supabase/migrations/0001_auth_and_rbac.sql
--
-- This file does NOT create tables. It wires Supabase Auth (auth.users) to
-- the `profiles` table Prisma already created, and turns on Row Level
-- Security so tenant isolation is enforced by Postgres itself, not just by
-- the Express layer.

-- --------------------------------------------------
-- 1. Auto-create a profile row whenever someone signs up
-- --------------------------------------------------
-- Client-side signUp() should pass user metadata like:
--   { data: { name: 'Alice', role: 'provider' } }
-- Role defaults to 'tenant' if missing or not a recognised value.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
  safe_role "UserRole";
begin
  begin
    safe_role := requested_role::"UserRole";
  exception when others then
    safe_role := 'tenant';
  end;

  -- Nobody can self-register as admin through the public sign-up form.
  if safe_role = 'admin' then
    safe_role := 'tenant';
  end if;

  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    safe_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep profiles.email in sync if a user changes their email via Supabase Auth.
create or replace function public.handle_user_email_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute procedure public.handle_user_email_update();

-- --------------------------------------------------
-- 2. Helper to read the caller's role inside policies
-- --------------------------------------------------
create or replace function public.current_user_role()
returns "UserRole"
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- --------------------------------------------------
-- 3. Row Level Security
-- --------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.drivers       enable row level security;
alter table public.verified_pros enable row level security;
alter table public.local_stores  enable row level security;
alter table public.store_items   enable row level security;
alter table public.orders        enable row level security;

-- profiles: everyone can read (needed to show provider/driver names on an
-- order), but you can only edit your own row, and never your own role.
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists "profiles_admin_manage" on public.profiles;
create policy "profiles_admin_manage" on public.profiles
  for all using (public.current_user_role() = 'admin');

-- drivers: public can see basic driver info (for tracking an assigned
-- delivery); a driver can manage only their own row; admins manage all.
drop policy if exists "drivers_select_all" on public.drivers;
create policy "drivers_select_all" on public.drivers
  for select using (true);

drop policy if exists "drivers_insert_own" on public.drivers;
create policy "drivers_insert_own" on public.drivers
  for insert with check (auth.uid() = user_id);

drop policy if exists "drivers_update_own" on public.drivers;
create policy "drivers_update_own" on public.drivers
  for update using (auth.uid() = user_id);

drop policy if exists "drivers_admin_manage" on public.drivers;
create policy "drivers_admin_manage" on public.drivers
  for all using (public.current_user_role() = 'admin');

-- verified_pros ("services" a provider offers): this is the tenant-context
-- table — a provider only ever sees/edits the row(s) tied to their own
-- user_id. Everyone can browse verified pros to book them.
drop policy if exists "verified_pros_select_all" on public.verified_pros;
create policy "verified_pros_select_all" on public.verified_pros
  for select using (true);

drop policy if exists "verified_pros_insert_own" on public.verified_pros;
create policy "verified_pros_insert_own" on public.verified_pros
  for insert with check (auth.uid() = user_id);

drop policy if exists "verified_pros_update_own" on public.verified_pros;
create policy "verified_pros_update_own" on public.verified_pros
  for update using (auth.uid() = user_id);

drop policy if exists "verified_pros_delete_own" on public.verified_pros;
create policy "verified_pros_delete_own" on public.verified_pros
  for delete using (auth.uid() = user_id);

drop policy if exists "verified_pros_admin_manage" on public.verified_pros;
create policy "verified_pros_admin_manage" on public.verified_pros
  for all using (public.current_user_role() = 'admin');

-- local_stores + store_items: same tenant-isolation pattern, keyed by owner_id.
drop policy if exists "local_stores_select_all" on public.local_stores;
create policy "local_stores_select_all" on public.local_stores
  for select using (true);

drop policy if exists "local_stores_manage_own" on public.local_stores;
create policy "local_stores_manage_own" on public.local_stores
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "local_stores_admin_manage" on public.local_stores;
create policy "local_stores_admin_manage" on public.local_stores
  for all using (public.current_user_role() = 'admin');

drop policy if exists "store_items_select_all" on public.store_items;
create policy "store_items_select_all" on public.store_items
  for select using (true);

drop policy if exists "store_items_manage_via_store_owner" on public.store_items;
create policy "store_items_manage_via_store_owner" on public.store_items
  for all using (
    exists (
      select 1 from public.local_stores s
      where s.id = store_items.store_id and s.owner_id = auth.uid()
    )
  );

-- orders: a customer sees their own orders; the assigned provider/driver
-- sees orders assigned to them; admins see everything. Nobody can read
-- someone else's order.
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (
    auth.uid() = tenant_user_id
    or auth.uid() in (select user_id from public.verified_pros where id = orders.provider_id)
    or auth.uid() in (select user_id from public.drivers where id = orders.driver_id)
    or public.current_user_role() = 'admin'
  );

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid() = tenant_user_id);

drop policy if exists "orders_update_assigned" on public.orders;
create policy "orders_update_assigned" on public.orders
  for update using (
    auth.uid() in (select user_id from public.verified_pros where id = orders.provider_id)
    or auth.uid() in (select user_id from public.drivers where id = orders.driver_id)
    or public.current_user_role() = 'admin'
  );
