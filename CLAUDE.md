# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
npm run dev      # Next.js dev server (localhost:3000)
npm run build    # Static export to out/ — see constraint below
npm run start    # Serve the production build
npm run lint     # next lint
npx tsc --noEmit -p tsconfig.json   # Typecheck (not run by build — see below)
```

There is no test suite in this repo (no test framework in `package.json`).

`next.config.js` sets `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`, so `npm run build` succeeds even with type errors. Always run `npx tsc --noEmit` yourself after changes and confirm you haven't introduced *new* errors — a handful of pre-existing ones already exist (in `src/app/form/page.tsx` and the unused `src/components/form/ConfigureModal.tsx`, see below) and are safe to ignore.

## Architecture

### Static export, no server — Supabase is the entire backend

`next.config.js` has `output: 'export'`. This app is deployed as pure static HTML/JS to GitHub Pages (project site at `/formcraft`, no custom domain — see `.github/workflows/deploy.yml` and `nextjs.yml`, both trigger on push to the **`Deploy`** branch specifically, not `main`/`master`). This has consequences that shape most of the codebase:

- **No API routes, no middleware, no server components with server-side logic.** Everything is a client component talking directly to Supabase (`src/lib/db.ts`).
- **No dynamic path segments** (e.g. `/[formId]/edit`) — Next static export needs every dynamic route pre-rendered at build time via `generateStaticParams`, which can't work for forms created after deploy. Instead, admin routes use **query params**: `/editor?f=<formId>`, `/dashboard?f=<formId>`, `/submissions?f=<formId>`, and the public form is `/form/?f=<slug>`. Don't "fix" this into path-based routing without checking with the user first — it was a deliberate tradeoff.
- **RLS is the only real access boundary.** The anon key ships inside the public JS bundle, so table/storage permissions in `supabase_schema.sql` are what actually protects data — not application code. Any new table needs RLS policies before it holds anything sensitive.
- **`supabase_schema.sql` is the source of truth for the DB schema** — there's no migration tool. It's written to be idempotent (`create or replace function`, `drop policy if exists` before `create policy`, conditional `do $$ ... $$` migration blocks) so it can be re-run wholesale in the Supabase SQL editor after schema changes. When you touch the schema, update this file and tell the user to re-run it — you cannot run it yourself (no DB credentials in this environment).
- Uploads (product photos, banners, QR codes, payment slips) always go through Supabase Storage (`src/lib/storage.ts` → `uploadToStorage`) and get stored as short public URLs. **Never** embed images as base64 in a database row — this was a real bug once (a single products table blew up to 7.8MB because photos were inlined as base64 JSON) and undoing it required a one-off migration script.

### Multi-form data model

The app supports multiple independent order forms, each with its own products, fields, and submissions — not a shared catalog. Core tables (see `supabase_schema.sql`):

- `forms` — one row per form: `id`, `slug` (public URL), `owner_email` (always has full control).
- `form_config` — 1:1 with `forms.id`, holds the entire `FormConfig` (title, sections/fields, theme, shipping, payment, scheduling) as one JSONB blob in `data`.
- `products`, `submissions` — scoped by a `form_id` column.
- `form_permissions` — per-form role grants for non-owners: `editor` (edit form+products, view/confirm submissions) > `submissions` (view + confirm payments only) > `viewer` (read-only). Roles are resolved via `src/store/index.ts`'s `useFormsStore.resolveFormRole`.
- `platform_admins` — email allowlist gating who can *create* new forms (`forms` insert policy checks membership).

RLS for `forms`/`form_permissions` routes through `SECURITY DEFINER` helper functions (`is_form_owner`, `has_any_form_permission`, `has_form_role`) rather than raw cross-table subqueries — those two tables' policies reference each other, and a plain subquery on either side causes "infinite recursion detected in policy" in Postgres. If you add new cross-referencing policies between these tables, they must go through a `SECURITY DEFINER` function too.

### Store layout (`src/store/index.ts`, Zustand)

- `useAppStore` — the *currently loaded* form's data (`form`, `products`, `submissions`, `role`, `currentFormId`/`currentFormSlug`). `loadPublicData(slug)` (products+form only, for the public form) and `loadAdminData(formId)` (adds submissions, admin-only) are separate on purpose — the public form must never fetch submission data.
- `useFormsStore` — the forms list, creation, and permission management (used by `/forms` and the editor's Permissions tab).
- `useAuthStore` — Supabase Auth session (email/password + Google OAuth).
- `useUnsavedGuard` — Discord-style "you have unsaved changes" guard. The editor registers save/discard handlers here while dirty; `Sidebar` routes all its internal navigation through `guardNavigate()` instead of plain `<Link>` navigation so leaving mid-edit prompts save/discard/cancel.
- `useCartStore(formKey)` — **a factory, not a singleton.** Each form gets its own `localStorage`-persisted cart (keyed by slug) so carts never leak between forms; always call it with the current form's key, never bare.

### Editor draft/save pattern

`src/app/editor/page.tsx` holds a local draft (`draftForm`/`draftProducts`) that `FormBuilder`, `ProductManager`, and `FormSettings` all edit — nothing reaches Supabase until "Save Changes" is clicked (a sticky bar in the editor, not a fixed overlay). This is deliberate: it means accidentally deleting a topic/field, or a stray keystroke, doesn't touch the live database until you explicitly save.

### Shipping is a variable flag, not a field type

There's no dedicated "shipping" field type. Instead, any `choice`/`dropdown` field with 2+ options can be flagged `isShippingVariable` in its editor, with `deliveryOption` (which of its own option labels means "delivery") and `shippingCost`. `src/app/form/page.tsx` looks for the first field with this flag across all sections and derives `shippingMethod`/`shippingCost` from it — otherwise it falls back to the legacy global `form.shipping.enabled`/`cost` toggle (still in Form Settings) for forms that predate this. Conditional visibility (e.g. an address topic that only shows when shipping = delivery) works through the normal `FieldCondition` mechanism — the shipping field is just a regular field with a regular id once flagged, so it shows up in every condition dropdown like any other field. The legacy special condition target `__shipping__` is still supported for backward compatibility.

### Known dead code

`src/components/form/ConfigureModal.tsx` is unused — nothing imports it. The real product-configuration modal is defined inline inside `src/app/form/page.tsx`. The unused file's stale types (`ProductVariantOption` treated as a string) are the source of several pre-existing `tsc` errors; don't try to fix that file, it's a safe delete whenever someone gets around to it.
