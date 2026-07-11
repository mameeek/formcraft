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

**Don't run `npm run build` while a `npm run dev` server is running against the same directory** — both write to `.next`, and running them concurrently corrupts the dev server's cache (manifests reference chunks the other process deleted), producing 404s and `PageNotFoundError` on routes that were working fine. If this happens: stop the dev server, `rm -rf .next`, then restart. Same reason to `rm -rf .next` after a one-off `npm run build` check before starting `dev` again.

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
- `useAuthStore` — Supabase Auth session (email/password + Google OAuth). `init()` only flips `initialized: true` once `getSession()`/`onAuthStateChange` actually resolve — flipping it synchronously first (as an earlier version did) meant every page gating on `(initialized, !session)` briefly saw "logged out" on a hard reload of an already-authenticated session, bouncing `/editor`, `/dashboard`, `/submissions` through `/login` and losing the `?f=` target. Don't reintroduce that ordering.
- `useUnsavedGuard` — Discord-style "you have unsaved changes" guard. The editor registers save/discard handlers here while dirty; `Sidebar` routes all its internal navigation through `guardNavigate()` instead of plain `<Link>` navigation so leaving mid-edit prompts save/discard/cancel.
- `useCartStore(formKey)` — **a factory, not a singleton.** Each form gets its own `localStorage`-persisted cart (keyed by slug) so carts never leak between forms; always call it with the current form's key, never bare.

### Editor draft/save pattern

`src/app/editor/page.tsx` holds a local draft (`draftForm`/`draftProducts`) that `FormBuilder`, `ProductManager`, and `FormSettings` all edit — nothing reaches Supabase until "Save Changes" is clicked (a sticky bar in the editor, not a fixed overlay). This is deliberate: it means accidentally deleting a topic/field, or a stray keystroke, doesn't touch the live database until you explicitly save.

### Shipping is a dedicated field type, and a singleton

`'shipping'` is a real `FieldType` (`src/types/index.ts`) with its own editor UI in `FormBuilder.tsx` — a fixed pickup/delivery icon-card pair (`options[0]` = pickup, `options[1]` = delivery) plus a `shippingCost` added when delivery is selected. It's addable/reorderable like any field, including moving it into its own topic (see "Fields can move between topics" below).

**A form can only have one.** `FormBuilder.tsx` filters `'shipping'` out of every "+ add field" button and every field's type-change dropdown once one already exists anywhere in the form (`allFields.some(f => f.type === 'shipping')`). This isn't cosmetic — before this guard existed, a second shipping field was fully interactive but its selection was silently ignored (`src/app/form/page.tsx` only reads `find(f => f.type === 'shipping')`, i.e. the first one), so an admin could build a second pickup/delivery card that charged nothing and did nothing. Don't remove the guard without replacing the underlying single-shipping-field assumption in `form/page.tsx` first.

The legacy global `form.shipping.enabled`/`cost` toggle (Form Settings) is still read as a fallback *only* when no field of type `'shipping'` exists anywhere in the form — for forms that predate this feature. The legacy special condition target `__shipping__` (evaluates to `'pickup'`/`'delivery'`, not the field's own option labels) is also still supported for the same reason — don't mix the two: a condition on the real shipping field must match its actual option label text (e.g. "จัดส่งทางไปรษณีย์"), while a condition on `__shipping__` must match the literal string `"delivery"`/`"pickup"`. `ConditionValueField` in `FormBuilder.tsx` renders the right kind of picker for whichever one is selected so this can't be typed wrong.

### Field conditions are AND/OR rule groups

`FieldCondition` (`src/types/index.ts`) is `{ logic: 'AND' | 'OR', rules: ConditionRule[] }`, not a single `{fieldId, operator, value}` — a field/section can show/hide on multiple rules combined with one logic operator (uniform across the group, no mixed/nested boolean trees). Forms saved before this existed have the old flat shape; `normalizeCondition()` (`src/lib/utils.ts`) reads either shape as a 1-rule AND group, used by both the public form's evaluator (`evalCond`/`evalRule` in `src/app/form/page.tsx`) and the editor's `ConditionEditor` (`FormBuilder.tsx`) — nothing needed migrating, and anything re-saved through the editor now writes the new shape.

### Fields can move between topics

Each field's editor has a "ย้ายไปหัวข้ออื่น" dropdown (`FormBuilder.tsx`'s `moveFieldToSection`) that relocates it to a different section without changing its `id` — necessary because anything referencing a field by id (another section's condition, a set item's fixed-option key) would otherwise break. There's no drag-and-drop; it's a select-and-jump.

### Set products: duplicate items and per-item pricing

A set's `setItems` (`SetItem[]`, `src/types/index.ts`) each have their own `id` (not just `productId`) specifically so the *same* product can appear more than once in one set (e.g. two jackets, one size S and one XL, at different prices) — code keyed off `productId` alone would collide between the two instances. Per item, in `ProductManager.tsx`'s set-item editor, each variant dimension is either:

- **Locked** (`fixedOptions[variantId] = optionLabel`) — the customer doesn't choose it; pair with a flat `priceOverride` for that instance. Clearing a lock also clears `priceOverride` (`ProductEditorPanel`'s init state does the same cleanup for data saved before that guard existed) — a leftover flat price must never survive as the pre-selection default once a dimension is unlocked again.
- **Left open** — the customer still picks it like normal, but priced from that item's own `variantPriceOverrides[variantId][optionLabel]` table instead of the referenced product's own pricing (falls back to the product's own price/`priceOverride` for any option not listed).

Runtime pricing (`getEffectiveUnitPrice` → `resolveSetItemPrice`, `src/lib/utils.ts`) only switches from the set's flat, manually-typed `price` field to live-summing each item's resolved price once `setUsesComputedPricing()` detects the admin is actually using one of the features above (a duplicate `productId`, or any item with `fixedOptions`/`priceOverride`/`variantPriceOverrides` set). Plain/legacy sets — each item just a bare product reference, no per-item config — can never match this, so an existing deliberate bundle-discount price (set cheaper than the sum of its parts) never silently changes underneath anyone. `ProductManager.tsx`'s "ใช้ราคานี้" button is a one-time convenience that copies the current computed sum into the flat `price` field; it doesn't make the two stay in sync afterward.

### Submissions: raw-item breakdown for shipping/production

Both the CSV export and the admin "ตาราง" tab (`src/app/submissions/page.tsx`) have, alongside the normal per-product columns (which keep sets bundled, e.g. `group2` → `jacket_s*1/jacket_m*1`), one `__raw_<code>` column per raw product+variant combination in the catalog (`buildRawItemCodes`, `src/lib/utils.ts`) — a set is broken apart into its real components here, so `__raw_jacket_2xl` counts a 2XL jacket the same whether it was bought standalone or as part of a bundle. `buildRawItemCountsForSubmission` fills one row; `buildRawItemCounts` (used by the Summary tab's "สรุปสำหรับจัดส่ง/เตรียมของ" card) aggregates the same breakdown across many submissions. Column set is derived from the product catalog's own variants, not from what's actually been ordered, so it's stable across filters.

### Known dead code

`src/components/form/ConfigureModal.tsx` and `src/components/form/ProductCard.tsx` are unused — nothing imports either. The real product-configuration modal and product card are defined inline inside `src/app/form/page.tsx`. `ConfigureModal.tsx`'s stale types (`ProductVariantOption` treated as a string) are the source of several pre-existing `tsc` errors; don't try to fix that file, both are a safe delete whenever someone gets around to it.
