# Trust/Brand Phase: Public Review List + Review Moderation

**Date:** 2026-09-28
**Status:** Draft for user review
**Phase:** GOAL.md trust/brand phase (3rd of 3 queued phases)

## 1. Problem

GOAL.md's trust/brand checklist asks for "verified buyer" badges and
general review trust signals. Two blockers to doing that literally:

- No `orders`/`purchases` table exists anywhere in the schema (confirmed
  via `mcp__supabase__list_tables`). A "verified buyer" badge cannot be
  honestly built — there is no purchase record to verify against.
- Individual reviews are not displayed publicly anywhere. `reviews` only
  feeds the aggregate stats block (`get_perfume_review_aggregate`) shown
  on the fragrance page. A trust signal on a review that visitors never
  see is not a trust signal.

Several other trust/brand checklist items (About page copy/photos,
business paperwork, trade licence, DBID registration) are non-engineering
work requiring the user's own content/action — out of scope for this
spec, previously flagged and set aside.

This spec covers the buildable subset: a public review list on the
fragrance page, a self-attested "owns this bottle" badge in place of an
unverifiable "verified buyer" badge, and moderation tooling so a public
review surface doesn't become a liability.

## 2. Approach

**Chosen: RPC-based public read (Approach B)**, matching the existing
`get_perfume_review_aggregate` pattern.

`public.reviews` deliberately has no public-read RLS policy — the
existing migration comment (`perfume-profile-depth.sql:1-4`) states this
is intentional, so anonymous visitors read review data only through a
`SECURITY DEFINER` RPC. Two alternatives were considered and rejected:

- **Direct RLS public-read policy on `reviews`** — rejected. Contradicts
  the existing documented boundary and would expose `user_id` and any
  future private fields to direct client queries unless carefully
  column-scoped, which RLS alone can't do (RLS is row-scoped, not
  column-scoped).
- **Materialized/denormalized public review table** — rejected as
  premature; adds sync complexity for no benefit at current review
  volume.

The RPC approach preserves the existing boundary, returns only the
columns the public should see (excluding `user_id`), and mirrors
`get_perfume_price_history`'s shape (`perfume_id` param, `STABLE`,
`GRANT EXECUTE ... TO anon, authenticated`).

## 3. Schema Changes

Add five columns to `public.reviews`:

```sql
ALTER TABLE public.reviews
  ADD COLUMN owns_bottle boolean NOT NULL DEFAULT false,
  ADD COLUMN is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN flag_reason text,
  ADD COLUMN flagged_at timestamptz,
  ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
```

- `owns_bottle`: self-attested by the reviewer at submission time via a
  checkbox in `ReviewForm.tsx`. Not verified against any purchase
  record (none exists) — displayed as "Says they own this bottle", not
  "Verified purchase", so the UI doesn't overclaim.
- `is_flagged` / `flag_reason` / `flagged_at`: mirrors the existing
  `listings` moderation columns exactly (same names, same semantics).
- `is_hidden`: mirrors `listings.is_hidden`. A hidden review is excluded
  from the public RPC but still visible to its author on their dashboard
  and to admins.

No RLS policy changes — `reviews` keeps its existing (non-public-read)
policy set. The new RPC is the only public read path, same as today.

## 4. RPC: `get_perfume_reviews`

```sql
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

`user_id` is deliberately excluded — the public list is anonymous
(reviews carry no display name today; adding reviewer identity is out of
scope for this spec). `is_flagged`/`flag_reason`/`flagged_at` are also
excluded — those are moderation-internal, not public.

Default `p_limit = 20` with offset-based pagination is enough for
current review volume; no perfume has more than a handful of reviews
today, so this isn't a place to over-engineer cursor pagination.

## 5. Query Layer (`lib/queries/perfumes.ts`)

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

Same error-swallowing pattern as `fetchPerfumePriceHistory` — a failed
review fetch degrades to an empty list, not a broken page.

## 6. Fragrance Page: Reviews Section

In `app/fragrance/[slug]/page.tsx`, add `fetchPerfumeReviews` to the
existing `Promise.all` fetch array. Add a "Reviews" section placed per
GOAL.md's documented page order — after the fake-spotting guide and
price trend sections, before "Similar Perfumes". Gated on
`reviews.length > 0`.

Each review card shows: rating (emoji/label, reusing `RATING_DISPLAY`
from `ReviewList.tsx`, ported inline since the fragrance page is a
different route), review text, first image (if present), longevity /
gender / climate / environment / when-to-wear chips (same chip styling
as the dashboard `ReviewList.tsx`), relative date, and — if
`owns_bottle` — a small badge: "Says they own this bottle". No "verified
purchase" language anywhere, since it isn't one.

## 7. Review Submission: "Owns Bottle" Checkbox

In `ReviewForm.tsx`, add a checkbox near the rating/review-text fields:

```tsx
<label className="flex items-center gap-2 text-sm text-gray-700">
  <input
    type="checkbox"
    checked={form.owns_bottle}
    onChange={(e) => setForm((f) => ({ ...f, owns_bottle: e.target.checked }))}
  />
  I own (or owned) this bottle
</label>
```

`ReviewInsert` (in both `lib/queries/reviews.ts` and
`lib/queries/client/reviews.ts`) gains `owns_bottle: boolean`, defaulting
to `false` in the initial form state wherever `ReviewInsert` is
constructed (the dashboard reviews page, not shown here — will be
located and updated during implementation).

## 8. Dashboard: Flagged Review Banner

**Correction from earlier in this brainstorm:** I had assumed a
seller-facing flagged-reason banner already existed for `listings` to
mirror. Verified this is false — `app/dashboard/listings` has no
`is_flagged`/`flag_reason` usage at all (grep confirmed zero matches).
The `ActionModal` copy on the superadmin listings page claims "The
seller will see this comment on their dashboard" but that display was
never built. This is net-new UI, not a mirror of an existing pattern.

In `ReviewList.tsx`, when `r.is_flagged`, render a banner above the
review card content:

```tsx
{r.is_flagged && (
  <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
    Flagged by moderators{r.flag_reason ? `: ${r.flag_reason}` : "."}
  </div>
)}
```

Styled as amber/warning (not red/error) — matching the existing red
error-state box's structure (`border-*-200 bg-*-50`) but a distinct
color so "flagged, needs your attention" reads differently from "load
failed". `Review` type in `lib/queries/reviews.ts` gains `owns_bottle`,
`is_flagged`, `flag_reason`, `flagged_at`, `is_hidden` fields (all
returned by `select("*")`, no query change needed beyond the type).

## 9. Superadmin Moderation

New page `app/(admin)/superadmin/reviews/page.tsx`, mirroring
`app/(admin)/superadmin/listings/page.tsx` structure exactly:

- Search (perfume name / brand — reviews have no seller-visible display
  name to search by today).
- Status filter: all / active / flagged / hidden (same `is_hidden` >
  `is_flagged` > active precedence as `listingStatus()`).
- Table columns: Perfume, Rating, Review snippet, Owns Bottle, Status,
  Actions.
- Flag (via `ActionModal` with `requireReason`) / Unflag / Remove
  (hard delete, via `ActionModal` without reason).

New `AdminReview` type + `useAdminReviews` / `useReviewAction` /
`useDeleteReview` hooks added to `lib/queries/admin.ts`, mirroring the
existing `AdminListing` + `useAdminListings` / `useListingAction` /
`useDeleteListing` block exactly (same TanStack Query + `qk` + `sonner`
pattern).

New API routes, mirroring the listings admin routes exactly
(`requireAdmin()` guard, `createAdminClient()`, same status codes):

- `app/api/admin/reviews/route.ts` — `GET`, selects
  `id, perfume_id, rating, review_text, owns_bottle, is_flagged, flag_reason, flagged_at, is_hidden, created_at, perfumes(name, brand)`
  ordered by `created_at desc`.
- `app/api/admin/reviews/[id]/route.ts` — `PATCH` (`{action: 'flag'|'unflag', reason?}`,
  same flag/unflag update shape as the listings route) and `DELETE`
  (hard delete).

`AdminSidebar.tsx` gains a "Reviews" nav entry between "Listings" and
"Blog" (`{ href: '/superadmin/reviews', label: 'Reviews', icon: MessageSquare }`),
with a flagged-count badge sourced from `useAdminReviews()`, matching
the existing badge pattern for sellers/blog/perfumes.

## 10. Error Handling

- RPC failure (`fetchPerfumeReviews`) → empty array, Reviews section
  doesn't render. No user-facing error on the public page (consistent
  with `fetchPerfumePriceHistory`'s existing behavior).
- Admin API failures → existing `sonner` toast pattern
  ("Action failed. Please try again." / "Failed to remove listing...").
  reused verbatim for reviews via the mirrored hooks.
- Review submission failure (owns_bottle included) → existing
  `ReviewForm` `error` prop / red banner, no new error path needed since
  `owns_bottle` is just one more field in the existing insert payload.

## 11. Testing

- `npx next build` — typecheck across all touched files (query layer,
  fragrance page, ReviewForm, ReviewList, new superadmin page, new API
  routes).
- Manual browser pass (dev server):
  1. Submit a review with `owns_bottle` checked and an image — confirm
     it appears in the fragrance page's Reviews section with the "Says
     they own this bottle" badge.
  2. In superadmin → Reviews, flag that review with a reason — confirm
     it disappears from the public fragrance page Reviews section, and
     the flagged-reason banner appears on the reviewer's own dashboard
     (`/dashboard/reviews`).
  3. Unflag — confirm it reappears publicly and the banner clears.
  4. Confirm only Flag/Unflag/Remove actions are exposed in the admin
     UI (no separate Hide toggle — see §12).
  5. Remove (hard delete) a review — confirm it's gone from admin list,
     public list, and the reviewer's dashboard.

## 12. Scope Boundaries (explicit exclusions)

- No "verified buyer" badge — no purchase record exists to verify
  against; `owns_bottle` is explicitly self-attested and labeled as such.
- No reviewer display name/identity on public reviews — reviews are
  shown anonymously, matching how the aggregate stats already treat
  review data as unattributed. Adding reviewer identity is a separate,
  unscoped feature (would need a public-safe profile view, privacy
  consideration, etc.).
- No review pagination UI beyond the RPC's `limit`/`offset` params — at
  most a handful of reviews per perfume today, so a "load more" control
  is unnecessary; the RPC supports it for later if volume grows.
- No automated flagging (spam detection, keyword filters) — manual
  admin moderation only, matching the `listings` precedent.
- `is_hidden` has no admin UI toggle in this spec (see Testing §11.4) —
  reserved for future automated moderation, not manually actionable now.
