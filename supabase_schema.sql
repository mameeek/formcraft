-- FormCraft database schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
--
-- This version adds multi-form support: every form gets its own products,
-- fields and submissions, and access to a form is controlled per-person via
-- ownership + form_permissions rather than "any logged-in user = admin."
-- If you're running this for the first time (fresh project), the migration
-- block near the bottom is a no-op (nothing to migrate) and safe to run.

-- ─── Core tables ─────────────────────────────────────────────────────────────

-- Who is allowed to create new forms. Seeded with your existing account below.
-- Add more rows later (insert into platform_admins (email) values ('someone@x.com'))
-- if you want other people to also be able to create forms of their own.
create table if not exists platform_admins (
  email text primary key,
  added_at timestamptz default now()
);

-- One row per form.
create table if not exists forms (
  id text primary key,              -- matches form_config.id, products.form_id, submissions.form_id
  slug text unique not null,        -- public URL: /form/?f=<slug>
  owner_email text not null,        -- full control over this form, always
  created_at timestamptz default now()
);

-- Per-form access grants for people who aren't the owner.
create table if not exists form_permissions (
  form_id text references forms(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor', 'submissions', 'viewer')),
  granted_at timestamptz default now(),
  primary key (form_id, email)
);

-- Form config (was a single row id='main' — now one row per form, 1:1 with forms.id)
create table if not exists form_config (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Products
create table if not exists products (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now()
);

-- Submissions
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

-- ─── Migration: attach existing single-form data to a 'main' form ───────────
-- Safe to run on a fresh project too (every insert is conditional / no-op).
do $$
declare
  first_admin_email text;
begin
  select email into first_admin_email from auth.users order by created_at asc limit 1;

  if first_admin_email is not null then
    insert into platform_admins (email)
    values (lower(first_admin_email))
    on conflict (email) do nothing;

    if exists (select 1 from form_config where id = 'main')
       and not exists (select 1 from forms where id = 'main') then
      insert into forms (id, slug, owner_email)
      values ('main', 'main', lower(first_admin_email));
    end if;
  end if;
end $$;

-- Add form_id columns (nullable first so backfill can run, then locked down)
alter table products add column if not exists form_id text;
alter table submissions add column if not exists form_id text;

update products set form_id = 'main' where form_id is null and exists (select 1 from forms where id = 'main');
update submissions set form_id = 'main' where form_id is null and exists (select 1 from forms where id = 'main');

-- Only enforce not-null / foreign keys once every row has a form_id — if you
-- ran the migration above on real data this will already be true.
do $$
begin
  if not exists (select 1 from products where form_id is null) then
    alter table products alter column form_id set not null;
  end if;
  if not exists (select 1 from submissions where form_id is null) then
    alter table submissions alter column form_id set not null;
  end if;
end $$;

alter table products drop constraint if exists products_form_fk;
alter table products add constraint products_form_fk foreign key (form_id) references forms(id) on delete cascade;

alter table submissions drop constraint if exists submissions_form_fk;
alter table submissions add constraint submissions_form_fk foreign key (form_id) references forms(id) on delete cascade;

alter table form_config drop constraint if exists form_config_form_fk;
alter table form_config add constraint form_config_form_fk foreign key (id) references forms(id) on delete cascade;

-- ─── Role helpers ────────────────────────────────────────────────────────────
-- All of these are SECURITY DEFINER: they run as the function's owner (the
-- postgres role, which has BYPASSRLS), so the queries *inside* them don't
-- re-trigger RLS on forms/form_permissions. That's not just an optimization —
-- it's required. forms' own policy needs to check form_permissions, and
-- form_permissions' own policy needs to check forms; if either check were a
-- plain subquery instead of going through one of these functions, evaluating
-- one table's policy would re-trigger the other's, which re-triggers the
-- first again, forever ("infinite recursion detected in policy" from Postgres).

create or replace function is_form_owner(fid text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from forms where id = fid and owner_email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

create or replace function has_any_form_permission(fid text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from form_permissions where form_id = fid and email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

-- Owner always passes. Otherwise checks form_permissions for at least the
-- given role tier (editor > submissions > viewer).
create or replace function has_form_role(fid text, min_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from forms where id = fid and owner_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    ) then true
    when min_role = 'viewer' then exists (
      select 1 from form_permissions
      where form_id = fid and email = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    when min_role = 'submissions' then exists (
      select 1 from form_permissions
      where form_id = fid and email = lower(coalesce(auth.jwt() ->> 'email', '')) and role in ('submissions', 'editor')
    )
    when min_role = 'editor' then exists (
      select 1 from form_permissions
      where form_id = fid and email = lower(coalesce(auth.jwt() ->> 'email', '')) and role = 'editor'
    )
    else false
  end
$$;

-- ─── Row Level Security ─────────────────────────────────────────────────────
-- The anon key ships inside the static site's JS bundle, so it is public.
-- RLS is the only real access boundary. Once Google sign-in is enabled,
-- ANY Google account can authenticate — "authenticated" no longer implies
-- "admin" anywhere below, every write is gated by has_form_role() instead.

alter table platform_admins  enable row level security;
alter table forms            enable row level security;
alter table form_permissions enable row level security;
alter table products         enable row level security;
alter table form_config      enable row level security;
alter table submissions      enable row level security;

drop policy if exists "platform_admins self read" on platform_admins;
drop policy if exists "forms select for permitted users" on forms;
drop policy if exists "forms insert by platform admins" on forms;
drop policy if exists "forms owner update" on forms;
drop policy if exists "forms owner delete" on forms;
drop policy if exists "form_permissions readable by owner and self" on form_permissions;
drop policy if exists "form_permissions managed by owner" on form_permissions;
drop policy if exists "products public read"    on products;
drop policy if exists "products admin write"     on products;
drop policy if exists "form_config public read"  on form_config;
drop policy if exists "form_config admin write"  on form_config;
drop policy if exists "submissions public insert" on submissions;
drop policy if exists "submissions admin read"    on submissions;
drop policy if exists "submissions admin update"  on submissions;

-- platform_admins: readable by whoever is in it (so the UI can check "can I
-- create a form?"); only editable by hand in the SQL editor for now.
create policy "platform_admins self read" on platform_admins
  for select using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- forms: visible to the owner or anyone granted a role; creatable only by
-- platform admins (and only as their own email as owner); only the owner
-- can rename/delete.
create policy "forms select for permitted users" on forms
  for select using (
    owner_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    or has_any_form_permission(id)
  );
create policy "forms insert by platform admins" on forms
  for insert with check (
    owner_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    and exists (select 1 from platform_admins where email = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
create policy "forms owner update" on forms
  for update using (owner_email = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "forms owner delete" on forms
  for delete using (owner_email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- form_permissions: a grantee can see their own row; only the form's owner
-- can see/add/change/remove any grant (this is why only owners get the
-- Permissions tab, not editors).
create policy "form_permissions readable by owner and self" on form_permissions
  for select using (
    email = lower(coalesce(auth.jwt() ->> 'email', ''))
    or is_form_owner(form_id)
  );
create policy "form_permissions managed by owner" on form_permissions
  for all using (is_form_owner(form_id))
  with check (is_form_owner(form_id));

-- products: anyone can read (needed by the public form), editors+owners write.
create policy "products public read" on products
  for select using (true);
create policy "products admin write" on products
  for all using (has_form_role(form_id, 'editor')) with check (has_form_role(form_id, 'editor'));

-- form_config: anyone can read, editors+owners write.
create policy "form_config public read" on form_config
  for select using (true);
create policy "form_config admin write" on form_config
  for all using (has_form_role(id, 'editor')) with check (has_form_role(id, 'editor'));

-- submissions: anyone can submit an order (insert). Viewing needs at least
-- viewer role; confirming/rejecting payment needs at least submissions role.
-- No delete policy on purpose — nobody can delete submissions via this key.
create policy "submissions public insert" on submissions
  for insert with check (true);
create policy "submissions admin read" on submissions
  for select using (has_form_role(form_id, 'viewer'));
create policy "submissions admin update" on submissions
  for update using (has_form_role(form_id, 'submissions')) with check (has_form_role(form_id, 'submissions'));

-- ─── Public lookups (anonymous checkout needs these, but forms/submissions
-- are otherwise locked to owners/permitted roles) ───────────────────────────
-- The public form page has no login, so it can't rely on the `forms` or
-- `submissions` RLS policies above (both require a matching email). These two
-- functions expose the absolute minimum an anonymous visitor needs — a form's
-- id (to resolve /form/?f=<slug>) and a submission count (for the response
-- limit setting) — without opening up owner_email or actual submission rows.

create or replace function public.form_id_for_slug(p_slug text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select id from forms where slug = p_slug limit 1
$$;
grant execute on function public.form_id_for_slug(text) to anon, authenticated;

create or replace function public.form_submission_count(p_form_id text)
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*) from submissions where form_id = p_form_id
$$;
grant execute on function public.form_submission_count(text) to anon, authenticated;

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
-- Email/password: create logins in Supabase Dashboard → Authentication →
-- Users → "Add user". Google sign-in: Dashboard → Authentication → Providers
-- → Google (needs a Google Cloud OAuth client — see the app's /login page
-- for the corresponding "Sign in with Google" button).
--
-- Only emails present in platform_admins can create new forms. The migration
-- above seeds it with whichever account is oldest in auth.users — add more
-- with: insert into platform_admins (email) values ('someone@example.com');
