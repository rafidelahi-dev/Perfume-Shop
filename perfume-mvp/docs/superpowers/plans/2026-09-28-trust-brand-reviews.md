# Trust/Brand Reviews: Public Review List + Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show individual reviews publicly on the fragrance page (with a
self-attested "owns this bottle" badge) and give admins flag/unflag/remove
moderation over them, mirroring the existing `listings` moderation pattern.

**Architecture:** New `reviews` columns (`owns_bottle`, `is_flagged`,
`flag_reason`, `flagged_at`, `is_hidden`) + a new `SECURITY DEFINER` RPC
`get_perfume_reviews` (public read path, since `reviews` has no public-read
RLS policy by design). Public fragrance page and dashboard consume the RPC
and the existing `Review` type respectively. New superadmin page + API
routes mirror the existing `listings` admin CRUD exactly.

**Tech Stack:** Next.js (App Router), Supabase (Postgres + RPC + RLS),
TanStack Query, `sonner` toasts, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-28-trust-brand-reviews-design.md`

**Note on testing:** This codebase has no automated test suite (confirmed —
no test files exist; prior sub-features this phase were verified via
`npx next build` + manual browser QA). Steps below follow that established
pattern instead of a TDD unit-test cycle.

## Global Constraints

- Mirror the existing `listings` admin moderation pattern exactly:
  column names (`is_flagged`, `flag_reason`, `flagged_at`, `is_hidden`),
  API shape (`PATCH {action, reason?}`, `DELETE`), hook shape
  (`useAdmin<X>`, `use<X>Action`, `useDelete<X>`), `requireAdmin()` guard.
- `owns_bottle` is self-attested, never described as "verified purchase"
  anywhere in UI copy — no purchase record exists to verify against.
- No RLS public-read policy added to `reviews` — public reads go through
  `get_perfume_reviews` only, preserving the existing documented boundary
  (see `perfume-profile-depth.sql:1-4`).
- `is_hidden` gets no admin UI toggle in this plan — schema-only, for
  future automated moderation.
- Run `npx next build` after each task that touches TypeScript/TSX files
  and confirm it exits 0 before moving to the next task.

---

### Task 1: Database migration — schema + RPC

**Files:**
- Modify (append only, log file): `supabase/perfume-profile-depth.sql`
- Migration applied via `mcp__supabase__apply_migration` (no local file
  is the source of truth — the Supabase project is; this file is a
  chronological log of what was applied, matching how every prior
  migration this phase was recorded).

**Interfaces:**
- Produces: `public.reviews` columns `owns_bottle boolean`, `is_flagged
  boolean`, `flag_reason text`, `flagged_at timestamptz`, `is_hidden
  boolean`. RPC `public.get_perfume_reviews(p_perfume_id uuid, p_limit
  int default 20, p_offset int default 0)` returning columns `id,
  rating, review_text, images, longevity, gender, when_to_wear,
  climate_season, environment, owns_bottle, created_at` — consumed by
  Task 2.

- [ ] **Step 1: Apply the schema + RPC migration**

Call `mcp__supabase__apply_migration` with name `reviews_trust_moderation`
and this SQL:

```sql
ALTER TABLE public.reviews
  ADD COLUMN owns_bottle boolean NOT NULL DEFAULT false,
  ADD COLUMN is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN flag_reason text,
  ADD COLUMN flagged_at timestamptz,
  ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;

CREATE FUNCTION public.get_perfume_reviews(
  p_perfume_id uuid,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  rating smallint,
  review_text text,
  images text[],
  longevity text,
  gender text,
  when_to_wear text[],
  climate_season text[],
  environment text,
  owns_bottle boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id, rating, review_text, images, longevity, gender,
         when_to_wear, climate_season, environment, owns_bottle, created_at
  FROM public.reviews
  WHERE perfume_id = p_perfume_id
    AND is_hidden = false
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_perfume_reviews(uuid, int, int) TO anon, authenticated;
```

- [ ] **Step 2: Verify the migration applied cleanly**

Call `mcp__supabase__list_tables` (or `execute_sql` with
`SELECT column_name FROM information_schema.columns WHERE table_name = 'reviews'`)
and confirm the 5 new columns exist. Confirm no error was returned by
`apply_migration`.

- [ ] **Step 3: Append the migration to the running SQL log**

Add to the end of `supabase/perfume-profile-depth.sql`:

```sql
-- Trust/brand phase: public review list + moderation. owns_bottle is
-- self-attested at submission time (no orders/purchases table exists,
-- so "verified purchase" cannot be honestly claimed). is_flagged /
-- flag_reason / flagged_at / is_hidden mirror the existing `listings`
-- moderation columns. get_perfume_reviews is a SECURITY DEFINER RPC
-- (same pattern as get_perfume_review_aggregate / get_perfume_price_history)
-- since `reviews` has no public-read RLS policy by design.
ALTER TABLE public.reviews
  ADD COLUMN owns_bottle boolean NOT NULL DEFAULT false,
  ADD COLUMN is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN flag_reason text,
  ADD COLUMN flagged_at timestamptz,
  ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;

CREATE FUNCTION public.get_perfume_reviews(
  p_perfume_id uuid,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  rating smallint,
  review_text text,
  images text[],
  longevity text,
  gender text,
  when_to_wear text[],
  climate_season text[],
  environment text,
  owns_bottle boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id, rating, review_text, images, longevity, gender,
         when_to_wear, climate_season, environment, owns_bottle, created_at
  FROM public.reviews
  WHERE perfume_id = p_perfume_id
    AND is_hidden = false
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_perfume_reviews(uuid, int, int) TO anon, authenticated;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/perfume-profile-depth.sql
git commit -m "feat: reviews trust/moderation schema + get_perfume_reviews RPC"
```

---

### Task 2: Query layer — public reviews + extended Review type

**Files:**
- Modify: `lib/queries/perfumes.ts`
- Modify: `lib/queries/reviews.ts`

**Interfaces:**
- Consumes: RPC `get_perfume_reviews` from Task 1.
- Produces: `PublicReview` type + `fetchPerfumeReviews(perfumeId: string): Promise<PublicReview[]>`
  in `lib/queries/perfumes.ts` — consumed by Task 5 (fragrance page).
  Extended `Review` type (adds `owns_bottle: boolean`, `is_flagged:
  boolean`, `flag_reason: string | null`, `flagged_at: string | null`,
  `is_hidden: boolean`) in `lib/queries/reviews.ts` — `ReviewInsert` is
  `Omit<Review, "id" | "user_id" | "created_at" | "updated_at">`, so it
  automatically gains `owns_bottle` (and the moderation fields, which the
  UI never sets on insert — harmless since they default server-side, but
  Task 3 will exclude them from what the form actually sends by only
  touching `owns_bottle` in `EMPTY_FORM`). Consumed by Task 3 and Task 4.

- [ ] **Step 1: Add `PublicReview` type and `fetchPerfumeReviews` to `lib/queries/perfumes.ts`**

Insert after the existing `fetchPerfumePriceHistory` function (after line
134 in the current file):

```ts
export type PublicReview = {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5 | null;
  review_text: string | null;
  images: string[];
  longevity: "0-2h" | "2-5h" | "5-7h" | "7-10h" | "10h+" | null;
  gender: "very_masculine" | "masculine" | "unisex" | "feminine" | "very_feminine" | null;
  when_to_wear: string[];
  climate_season: ("summer" | "monsoon" | "winter")[];
  environment: "ac_office" | "outdoors" | "mixed" | null;
  owns_bottle: boolean;
  created_at: string;
};

export async function fetchPerfumeReviews(perfumeId: string): Promise<PublicReview[]> {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase.rpc("get_perfume_reviews", {
    p_perfume_id: perfumeId,
  });
  if (error) {
    console.error("[perfumes] fetchPerfumeReviews failed:", error.message);
    return [];
  }
  return (data ?? []) as PublicReview[];
}
```

- [ ] **Step 2: Extend `Review` type in `lib/queries/reviews.ts`**

In `lib/queries/reviews.ts`, add the 5 new fields to the `Review` type
(after `environment` and before `created_at`, matching the migration
column order):

```ts
export type Review = {
  id: string;
  user_id: string;
  perfume_id: string | null;
  perfume_name: string;
  brand: string;
  category: string;
  sub_category: string | null;
  images: string[];
  review_text: string | null;
  rating: 1 | 2 | 3 | 4 | 5 | null;
  when_to_wear: string[];
  gender: "very_masculine" | "masculine" | "unisex" | "feminine" | "very_feminine" | null;
  longevity: "0-2h" | "2-5h" | "5-7h" | "7-10h" | "10h+" | null;
  climate_season: ("summer" | "monsoon" | "winter")[];
  environment: "ac_office" | "outdoors" | "mixed" | null;
  owns_bottle: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
  flagged_at: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
};
```

No change needed to `fetchMyReviews`/`insertReview`/`updateReview`/
`deleteReview` — they already use `select("*")` / spread `input`, so the
new columns flow through automatically once the type includes them.

- [ ] **Step 3: Build check**

Run `npx next build` in `perfume-mvp/`. Expect exit code 0. (Two call
sites will currently fail to satisfy `ReviewInsert` — `EMPTY_FORM` in
`app/dashboard/reviews/page.tsx` and the `ReviewForm` component's
internal state — this is expected and fixed in Task 3. If the build
fails ONLY on those two files with a missing `owns_bottle` property
error, that confirms this task's type changes are correct; proceed to
Task 3 without further action here.)

- [ ] **Step 4: Commit**

```bash
git add lib/queries/perfumes.ts lib/queries/reviews.ts
git commit -m "feat: add public review query + extend Review type with trust/moderation fields"
```

---

### Task 3: Review submission — "owns this bottle" checkbox

**Files:**
- Modify: `app/dashboard/reviews/reviewComponents/ReviewForm.tsx`
- Modify: `app/dashboard/reviews/page.tsx`

**Interfaces:**
- Consumes: `ReviewInsert` type from Task 2 (now includes `owns_bottle`).
- Produces: no new exports; `ReviewForm`'s `form.owns_bottle` is read by
  Task 4 indirectly only through the saved `Review` record, not directly.

- [ ] **Step 1: Add `owns_bottle: false` to `EMPTY_FORM` in `app/dashboard/reviews/page.tsx`**

```ts
const EMPTY_FORM: ReviewInsert = {
  perfume_id: null,
  perfume_name: "",
  brand: "",
  category: "",
  sub_category: null,
  images: [],
  review_text: null,
  rating: null,
  when_to_wear: [],
  gender: null,
  longevity: null,
  climate_season: [],
  environment: null,
  owns_bottle: false,
};
```

(Note: `is_flagged`, `flag_reason`, `flagged_at`, `is_hidden` are also
part of `ReviewInsert` per Task 2's `Omit`, but TypeScript requires all
non-optional fields — add them too, defaulted so the client never
attempts to set moderation state on insert: `is_flagged: false,
flag_reason: null, flagged_at: null, is_hidden: false`. The `reviews`
table's `NOT NULL DEFAULT false` / nullable columns mean these values
are harmless even though the client sends them explicitly.)

Full corrected `EMPTY_FORM`:

```ts
const EMPTY_FORM: ReviewInsert = {
  perfume_id: null,
  perfume_name: "",
  brand: "",
  category: "",
  sub_category: null,
  images: [],
  review_text: null,
  rating: null,
  when_to_wear: [],
  gender: null,
  longevity: null,
  climate_season: [],
  environment: null,
  owns_bottle: false,
  is_flagged: false,
  flag_reason: null,
  flagged_at: null,
  is_hidden: false,
};
```

- [ ] **Step 2: Add the checkbox to `ReviewForm.tsx`**

Insert a new block after the "Environment" section (after line 351,
before the `{error && (...)}` block):

```tsx
{/* Owns bottle */}
<div>
  <label className="flex items-center gap-2 text-sm text-gray-700">
    <input
      type="checkbox"
      checked={form.owns_bottle}
      onChange={(e) => setForm((f) => ({ ...f, owns_bottle: e.target.checked }))}
      className="rounded border-gray-300"
    />
    I own (or owned) this bottle
  </label>
</div>
```

- [ ] **Step 3: Build check**

Run `npx next build` in `perfume-mvp/`. Expect exit code 0 — this fixes
the two failures anticipated in Task 2 Step 3.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/reviews/reviewComponents/ReviewForm.tsx app/dashboard/reviews/page.tsx
git commit -m "feat: add owns-bottle self-attestation checkbox to review form"
```

---

### Task 4: Dashboard — flagged review banner

**Files:**
- Modify: `app/dashboard/reviews/reviewComponents/ReviewList.tsx`

**Interfaces:**
- Consumes: `Review` type from Task 2 (`is_flagged`, `flag_reason` now
  typed).

- [ ] **Step 1: Add the flagged banner**

In `ReviewList.tsx`, inside the `items.map((r) => (...))` block, insert
the banner as the first child of the `<div className="flex-1 min-w-0">`
wrapper (before the "Name + Brand" block, so it's the first thing shown
for a flagged review):

```tsx
<div className="flex-1 min-w-0">
  {r.is_flagged && (
    <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      Flagged by moderators{r.flag_reason ? `: ${r.flag_reason}` : "."}
    </div>
  )}

  {/* Name + Brand */}
  <div className="flex items-start justify-between gap-2">
  ...
```

(Only the opening of the wrapper div changes — everything after the
"Name + Brand" comment stays exactly as it is today.)

- [ ] **Step 2: Build check**

Run `npx next build`. Expect exit code 0.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/reviews/reviewComponents/ReviewList.tsx
git commit -m "feat: show flagged-reason banner on reviewer's own dashboard"
```

---

### Task 5: Fragrance page — public Reviews section

**Files:**
- Modify: `app/fragrance/[slug]/page.tsx`

**Interfaces:**
- Consumes: `fetchPerfumeReviews`, `PublicReview` from Task 2.

- [ ] **Step 1: Import and fetch reviews**

Add to the imports:

```ts
import { fetchPerfumeReviews } from "@/lib/queries/perfumes";
```

Add `fetchPerfumeReviews(perfume.id)` to the existing `Promise.all(...)`
fetch array (alongside `priceHistory`), and destructure the result into
a `reviews` variable (typed `PublicReview[]`).

- [ ] **Step 2: Add label maps**

Add near the top of the file, alongside `formatMonth` (these mirror
`ReviewList.tsx`'s `RATING_DISPLAY` / `CLIMATE_LABEL` /
`ENVIRONMENT_LABEL` / `GENDER_LABEL` constants exactly — duplicated
here rather than imported because `ReviewList.tsx` is a `"use client"`
component under `app/dashboard` and this is a server component route):

```ts
const RATING_DISPLAY: Record<number, { emoji: string; label: string }> = {
  5: { emoji: "❤️", label: "Love" },
  4: { emoji: "👍", label: "Like" },
  3: { emoji: "😐", label: "Okay" },
  2: { emoji: "👎", label: "Dislike" },
  1: { emoji: "💀", label: "Hate" },
};

const CLIMATE_LABEL: Record<string, string> = {
  summer: "Summer",
  monsoon: "Monsoon",
  winter: "Winter",
};

const ENVIRONMENT_LABEL: Record<string, string> = {
  ac_office: "AC / Office",
  outdoors: "Outdoors",
  mixed: "Mixed",
};
```

- [ ] **Step 3: Render the Reviews section**

Place this section after the fake-spotting guide and Price Trend
sections, before the "Similar Perfumes" section (per GOAL.md's
documented page order: "...fake-spotting guide → reviews → similar
perfumes → FAQ"). Gate on `reviews.length > 0`:

```tsx
{reviews.length > 0 && (
  <section className="mt-10">
    <h2 className="text-xl font-semibold mb-4">Reviews</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {reviews.map((r) => (
        <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            {r.rating && (
              <span className="text-sm font-medium">
                {RATING_DISPLAY[r.rating]?.emoji} {RATING_DISPLAY[r.rating]?.label}
              </span>
            )}
            {r.owns_bottle && (
              <span className="text-xs bg-gray-100 text-gray-600 rounded-md px-2 py-0.5">
                Says they own this bottle
              </span>
            )}
          </div>

          {r.images[0] && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={r.images[0]}
              alt="Review"
              className="w-20 h-20 object-cover rounded-lg mb-2"
            />
          )}

          {r.review_text && (
            <p className="text-sm text-gray-700 mb-2">{r.review_text}</p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {r.longevity && (
              <span className="text-xs bg-blue-50 text-blue-700 rounded-md px-2 py-0.5">
                {r.longevity}
              </span>
            )}
            {r.gender && (
              <span className="text-xs bg-purple-50 text-purple-700 rounded-md px-2 py-0.5">
                {r.gender.replace("_", " ")}
              </span>
            )}
            {r.environment && (
              <span className="text-xs bg-cyan-50 text-cyan-700 rounded-md px-2 py-0.5">
                {ENVIRONMENT_LABEL[r.environment]}
              </span>
            )}
            {r.climate_season.map((s) => (
              <span key={s} className="text-xs bg-teal-50 text-teal-700 rounded-md px-2 py-0.5">
                {CLIMATE_LABEL[s]}
              </span>
            ))}
            {r.when_to_wear.map((w) => (
              <span key={w} className="text-xs bg-amber-50 text-amber-700 rounded-md px-2 py-0.5 capitalize">
                {w}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
)}
```

- [ ] **Step 4: Build check**

Run `npx next build`. Expect exit code 0.

- [ ] **Step 5: Commit**

```bash
git add app/fragrance/\[slug\]/page.tsx
git commit -m "feat: show public review list on fragrance page"
```

---

### Task 6: Admin query layer — reviews

**Files:**
- Modify: `lib/queries/admin.ts`
- Modify: `lib/queries/key.ts`

**Interfaces:**
- Produces: `AdminReview` type, `useAdminReviews()`, `useReviewAction()`,
  `useDeleteReview()` — consumed by Task 8 (superadmin page) and Task 9
  (sidebar badge count).

- [ ] **Step 1: Add `qk.adminReviews` to `lib/queries/key.ts`**

```ts
adminReviews: () => ['admin', 'reviews'] as const,
```

Add it after the existing `adminPerfumes: () => ['admin', 'perfumes'] as const,` line.

- [ ] **Step 2: Add `AdminReview` type + hooks to `lib/queries/admin.ts`**

Append at the end of the file (after the `useDeleteListing` block),
mirroring the `Listings` section exactly:

```ts
export type AdminReview = {
  id: string
  perfume_id: string | null
  rating: number | null
  review_text: string | null
  owns_bottle: boolean
  is_flagged: boolean
  flag_reason: string | null
  flagged_at: string | null
  is_hidden: boolean
  created_at: string
  perfumes: { name: string; brand: string } | null
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

async function fetchAdminReviews(): Promise<AdminReview[]> {
  const res = await fetch('/api/admin/reviews')
  if (!res.ok) throw new Error('Failed to fetch reviews')
  return res.json()
}

export function useAdminReviews() {
  return useQuery({ queryKey: qk.adminReviews(), queryFn: fetchAdminReviews })
}

export function useReviewAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'flag' | 'unflag'; reason?: string }) =>
      fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      }).then((r) => { if (!r.ok) throw new Error('Failed') }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminReviews() }),
    onError: () => toast.error('Action failed. Please try again.'),
  })
}

export function useDeleteReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
        .then((r) => { if (!r.ok) throw new Error('Failed') }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminReviews() }),
    onError: () => toast.error('Failed to remove review. Please try again.'),
  })
}
```

- [ ] **Step 3: Build check**

Run `npx next build`. Expect exit code 0 (no consumers yet, so this
should pass cleanly — unused-export warnings, if any, are not build
failures in this project).

- [ ] **Step 4: Commit**

```bash
git add lib/queries/admin.ts lib/queries/key.ts
git commit -m "feat: add admin review query hooks"
```

---

### Task 7: Admin API routes — reviews

**Files:**
- Create: `app/api/admin/reviews/route.ts`
- Create: `app/api/admin/reviews/[id]/route.ts`

**Interfaces:**
- Consumes: `requireAdmin()` from `@/lib/adminAuth`, `createAdminClient()`
  from `@/lib/supabaseAdmin` (both existing, used verbatim as in the
  `listings` admin routes).
- Produces: `GET /api/admin/reviews`, `PATCH /api/admin/reviews/[id]`,
  `DELETE /api/admin/reviews/[id]` — consumed by Task 6's fetch
  functions.

- [ ] **Step 1: Create the list route**

`app/api/admin/reviews/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id, perfume_id, rating, review_text, owns_bottle,
      is_flagged, flag_reason, flagged_at, is_hidden, created_at,
      perfumes(name, brand)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
```

- [ ] **Step 2: Create the item route**

`app/api/admin/reviews/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin()
  if (response) return response

  const { id } = await params
  let body: { action: 'flag' | 'unflag'; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { action, reason } = body
  const supabase = createAdminClient()

  const validActions = ['flag', 'unflag'] as const
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const update =
    action === 'flag'
      ? { is_flagged: true, flag_reason: reason ?? null, flagged_at: new Date().toISOString() }
      : { is_flagged: false, flag_reason: null, flagged_at: null }

  const { error } = await supabase.from('reviews').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin()
  if (response) return response

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Build check**

Run `npx next build`. Expect exit code 0.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/reviews
git commit -m "feat: add admin review moderation API routes"
```

---

### Task 8: Superadmin reviews page

**Files:**
- Create: `app/(admin)/superadmin/reviews/page.tsx`

**Interfaces:**
- Consumes: `useAdminReviews`, `useReviewAction`, `useDeleteReview`,
  `AdminReview` from Task 6; `StatusBadge` from
  `@/components/admin/StatusBadge`; `ActionModal` from
  `@/components/admin/ActionModal` (both existing, unmodified).

- [ ] **Step 1: Create the page**

`app/(admin)/superadmin/reviews/page.tsx`, mirroring
`app/(admin)/superadmin/listings/page.tsx`'s structure:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useAdminReviews, useReviewAction, useDeleteReview, AdminReview } from '@/lib/queries/admin'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ActionModal } from '@/components/admin/ActionModal'

type StatusFilter = 'all' | 'active' | 'flagged' | 'hidden'

function reviewStatus(r: AdminReview): string {
  if (r.is_hidden) return 'hidden'
  if (r.is_flagged) return 'flagged'
  return 'active'
}

const RATING_LABEL: Record<number, string> = {
  5: 'Love', 4: 'Like', 3: 'Okay', 2: 'Dislike', 1: 'Hate',
}

export default function AdminReviewsPage() {
  const { data: reviews = [], isLoading, isError } = useAdminReviews()
  const flagAction   = useReviewAction()
  const deleteAction = useDeleteReview()

  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [flagModal, setFlagModal]       = useState<string | null>(null)
  const [removeModal, setRemoveModal]   = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return reviews.filter((r) => {
      if (q && !(
        r.perfumes?.name?.toLowerCase().includes(q) ||
        r.perfumes?.brand?.toLowerCase().includes(q)
      )) return false
      if (statusFilter !== 'all' && reviewStatus(r) !== statusFilter) return false
      return true
    })
  }, [reviews, search, statusFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <span className="text-sm text-gray-500">{reviews.length} total</span>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search perfume or brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="flagged">Flagged</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      {isLoading && <div className="text-center py-20 text-gray-400">Loading...</div>}
      {isError && <div className="text-center py-20 text-red-500">Failed to load reviews. Please refresh.</div>}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">No reviews match your filters.</div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[2fr_80px_2fr_100px_90px_140px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span>Perfume</span>
            <span>Rating</span>
            <span>Review</span>
            <span>Owns Bottle</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {filtered.map((review) => (
            <div
              key={review.id}
              className="grid grid-cols-[2fr_80px_2fr_100px_90px_140px] gap-4 px-6 py-4 items-center border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{review.perfumes?.name ?? '—'}</p>
                <p className="text-xs text-gray-400">{review.perfumes?.brand ?? '—'}</p>
              </div>

              <span className="text-xs text-gray-600">
                {review.rating ? RATING_LABEL[review.rating] : '—'}
              </span>

              <p className="text-xs text-gray-600 line-clamp-2">{review.review_text ?? '—'}</p>

              <span className="text-xs text-gray-500">{review.owns_bottle ? 'Yes' : 'No'}</span>

              <StatusBadge status={reviewStatus(review)} />

              <div className="flex items-center gap-2">
                {!review.is_hidden && (
                  !review.is_flagged ? (
                    <button
                      onClick={() => setFlagModal(review.id)}
                      className="px-2.5 py-1 text-xs font-medium bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg transition-colors"
                    >
                      Flag
                    </button>
                  ) : (
                    <button
                      onClick={() => flagAction.mutate({ id: review.id, action: 'unflag' })}
                      className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      Unflag
                    </button>
                  )
                )}
                <button
                  onClick={() => setRemoveModal(review.id)}
                  className="px-2.5 py-1 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {flagModal && (
        <ActionModal
          title="Flag review"
          description="The reviewer will see this comment on their dashboard so they know what to fix."
          confirmLabel="Flag review"
          confirmClass="bg-orange-500 hover:bg-orange-600 text-white"
          requireReason
          reasonPlaceholder="Reason visible to reviewer..."
          onConfirm={(reason) => { flagAction.mutate({ id: flagModal!, action: 'flag', reason }, { onSuccess: () => setFlagModal(null) }) }}
          onClose={() => setFlagModal(null)}
        />
      )}

      {removeModal && (
        <ActionModal
          title="Remove review"
          description="This permanently deletes the review. This cannot be undone."
          confirmLabel="Remove review"
          onConfirm={() => { deleteAction.mutate(removeModal!, { onSuccess: () => setRemoveModal(null) }) }}
          onClose={() => setRemoveModal(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build check**

Run `npx next build`. Expect exit code 0.

- [ ] **Step 3: Commit**

```bash
git add "app/(admin)/superadmin/reviews/page.tsx"
git commit -m "feat: add superadmin review moderation page"
```

---

### Task 9: Superadmin sidebar nav entry

**Files:**
- Modify: `components/admin/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `useAdminReviews` from Task 6.

- [ ] **Step 1: Add the nav entry**

In `components/admin/AdminSidebar.tsx`:

1. Add `MessageSquare` to the `lucide-react` import:
   ```ts
   import { Users, List, FileText, Droplet, MessageSquare } from 'lucide-react'
   ```
2. Add the import:
   ```ts
   import { useAdminReviews } from '@/lib/queries/admin'
   ```
3. Add to `NAV`, between `listings` and `blog`:
   ```ts
   const NAV = [
     { href: '/superadmin/sellers',  label: 'Sellers',  icon: Users },
     { href: '/superadmin/listings', label: 'Listings', icon: List },
     { href: '/superadmin/reviews',  label: 'Reviews',  icon: MessageSquare },
     { href: '/superadmin/blog',     label: 'Blog',     icon: FileText },
     { href: '/superadmin/perfumes', label: 'Perfumes', icon: Droplet },
   ]
   ```
4. Add the data hook and flagged count inside the component body:
   ```ts
   const { data: reviews = [] } = useAdminReviews()
   const flaggedReviewCount = reviews.filter((r) => r.is_flagged).length
   ```
5. Add the badge render, alongside the existing per-nav-item badges:
   ```tsx
   {href === '/superadmin/reviews' && flaggedReviewCount > 0 && (
     <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
       {flaggedReviewCount}
     </span>
   )}
   ```

- [ ] **Step 2: Build check**

Run `npx next build`. Expect exit code 0.

- [ ] **Step 3: Commit**

```bash
git add components/admin/AdminSidebar.tsx
git commit -m "feat: add Reviews nav entry with flagged-count badge to superadmin sidebar"
```

---

### Task 10: Manual QA + push

**Files:** none (verification only)

- [ ] **Step 1: Start dev server**

Run `npm run dev` in `perfume-mvp/` (background — needed for the
following manual checks).

- [ ] **Step 2: Submit a review with `owns_bottle` checked**

In the browser: go to `/dashboard/reviews`, submit a review for a real
perfume slug with an image, rating, and the "I own (or owned) this
bottle" checkbox checked.

- [ ] **Step 3: Confirm it appears publicly**

Visit that perfume's `/fragrance/[slug]` page. Confirm the new Reviews
section renders the review with the "Says they own this bottle" badge.

- [ ] **Step 4: Flag it from superadmin**

Go to `/superadmin/reviews`, find the review, click Flag, enter a
reason, confirm. Confirm:
- It disappears from the fragrance page's Reviews section (re-fetch/
  reload the page — RPC filters `is_hidden`, not `is_flagged`, so also
  confirm flagged-but-not-hidden reviews still show publicly per this
  plan's design — flagging alone does not hide from the public feed,
  only `is_hidden` does, and no UI sets `is_hidden` in this plan. **If
  this surprises you when testing, that's expected: flag is a
  moderator-visible/reviewer-visible marker, not an automatic public
  takedown. If the intent was for flagging to also hide publicly, flag
  this discrepancy to the user rather than silently changing the RPC.**)
- The flagged-reason banner appears on `/dashboard/reviews` for that
  review.

- [ ] **Step 5: Unflag, confirm banner clears**

Click Unflag in superadmin. Confirm the banner disappears from
`/dashboard/reviews`.

- [ ] **Step 6: Remove (hard delete) the review**

Click Remove in superadmin, confirm. Confirm it's gone from the admin
list, the fragrance page, and `/dashboard/reviews`.

- [ ] **Step 7: Push**

```bash
git push
```

---

## Note for the executor (Task 10, Step 4)

The spec (§10, Error Handling) does not explicitly state whether a
flagged-but-not-hidden review should still appear in the public RPC
result. Re-reading §4 of the spec: `get_perfume_reviews` filters only on
`is_hidden = false`, not `is_flagged`. This plan implements the spec as
written — flagging alone does not remove a review from public view. This
matches the `listings` precedent (a flagged listing is not automatically
hidden from `/listings` browsing either, per `listingStatus()`'s three
independent states). Do not change this behavior without checking with
the user first — it's a deliberate mirror of the existing pattern, not
an oversight.
