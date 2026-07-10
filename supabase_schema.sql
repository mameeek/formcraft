-- FormCraft database schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- Products table
create table if not exists products (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now()
);

-- Form config table (single row, id = 'main')
create table if not exists form_config (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Submissions table
create table if not exists submissions (
  id text primary key,
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  field_values jsonb not null default '{}',
  items jsonb not null default '[]',
  shipping_method text not null default 'pickup',
  subtotal numeric not null default 0,
  shipping numeric not null default 0,
  total_amount numeric not null default 0,
  payment_slip text,
  payment_status text not null default 'pending',
  payment_confirmed_at timestamptz,
  payment_note text,
  submitted_at timestamptz not null default now()
);

-- ─── Row Level Security ─────────────────────────────────────────────────────
-- The anon key ships inside the static site's JS bundle, so it is public.
-- RLS is the only real access boundary — every table must have it enabled,
-- with the public form limited to what it actually needs (read products/form,
-- insert submissions) and everything else requiring an authenticated admin.

alter table products     enable row level security;
alter table form_config  enable row level security;
alter table submissions  enable row level security;

drop policy if exists "products public read"    on products;
drop policy if exists "products admin write"     on products;
drop policy if exists "form_config public read"  on form_config;
drop policy if exists "form_config admin write"  on form_config;
drop policy if exists "submissions public insert" on submissions;
drop policy if exists "submissions admin read"    on submissions;
drop policy if exists "submissions admin update"  on submissions;

-- products: anyone can read (needed by the public form), only logged-in
-- admins can create/edit/delete.
create policy "products public read" on products
  for select using (true);
create policy "products admin write" on products
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- form_config: anyone can read, only logged-in admins can edit.
create policy "form_config public read" on form_config
  for select using (true);
create policy "form_config admin write" on form_config
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- submissions: anyone can submit an order (insert), but only logged-in
-- admins can list/read or update payment status. No delete policy is
-- defined on purpose — nobody can delete submissions via the anon/admin key.
create policy "submissions public insert" on submissions
  for insert with check (true);
create policy "submissions admin read" on submissions
  for select using (auth.role() = 'authenticated');
create policy "submissions admin update" on submissions
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ─── Storage ("uploads" bucket) ─────────────────────────────────────────────
-- Product photos / banner / QR live here (uploaded by admins), and so do
-- payment slips (uploaded anonymously by customers during checkout — the
-- public form has no login, so this can't be locked to authenticated only).
-- Files are named with a random uid, so in practice they're only reachable
-- by whoever has the URL — not a real access-control boundary. If slip
-- privacy matters more than convenience, move slips to a separate private
-- bucket and serve them via signed URLs instead. Run this once the bucket
-- exists (create it in Dashboard → Storage if you haven't already).
drop policy if exists "uploads public read"    on storage.objects;
drop policy if exists "uploads admin write"    on storage.objects;
drop policy if exists "uploads public insert"  on storage.objects;

create policy "uploads public read" on storage.objects
  for select using (bucket_id = 'uploads');
create policy "uploads public insert" on storage.objects
  for insert with check (bucket_id = 'uploads');

-- ─── Admin login ─────────────────────────────────────────────────────────────
-- Create the admin's login in Supabase Dashboard → Authentication → Users →
-- "Add user" (email + password). The app only supports email/password sign-in
-- today; Google sign-in can be enabled later from Authentication → Providers
-- without any schema changes.
