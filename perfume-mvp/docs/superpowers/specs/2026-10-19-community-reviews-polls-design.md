# Community Reviews, Polls & Seller Ratings — Design Spec

**Date:** 2026-10-19
**Scope:** in-page reviews and polls on `/fragrance/[slug]`, seller ratings, quick-join signup, shareable review link.
**Goal:** make leaving feedback a few-second action for any logged-in user (no dashboard, nothing mandatory) so the site accumulates BD-specific fragrance data and social proof. Supports the "Fragrantica for Bangladesh" moat in `docs/GOAL.md`.

**Supersedes:** the unbuilt `2026-09-28-trust-brand-reviews` plan (0/42 tasks done). Its moderation columns and public-read-via-RPC boundary are reused.

---

## 1. Current state (verified 2026-10-19)

- `reviews`: 0 rows. RLS own-row only (select/insert/update/delete); no public read by design. Review form lives only at `/dashboard/reviews` (`ReviewForm.tsx`, 381 lines) and requires an image, category and perfume.
- `perfumes`: 252 rows, all with notes. `profiles`: 16.
- `/fragrance/[slug]` renders review aggregates (3-review minimum) via `get_perfume_review_aggregate`; no write UI. `get_perfume_reviews` RPC is specced but not in the DB.
- Auth: phone+OTP and Google OAuth exist; signup requires username, full name, password. `/login?next=` works, but `proxy.ts` only guards protected routes.
- No seller rating exists anywhere.

## 2. Principles

1. Anyone reads. Only logged-in users interact.
2. Nothing is mandatory except what makes the record meaningful (a star, or a vote).
3. Logged-out users see the stars and an "Add a review" button (both route to login) and poll **results**, but no poll voting controls, not even disabled.
4. Fragrance pages stay static/ISR. Interactivity is a client island.
5. All public reads go through `SECURITY DEFINER` RPCs that never return `user_id`.

## 3. Data model

### 3.1 `reviews` (rebuilt; table is empty so no data migration)

| Column | Notes |
|---|---|
| `id`, `user_id`, `perfume_id` (NOT NULL FK `perfumes`) | `UNIQUE (user_id, perfume_id)` — one review per user per perfume, edited in place |
| `rating smallint NOT NULL CHECK 1..5` | tapping a star creates the row |
| `review_text text NULL` (max 2000) | optional |
| `images text[] DEFAULT '{}'` | optional, max 4 |
| `owns_bottle bool`, `knows_seller bool` | self-attested; labelled "Says they own this" / "Knows the seller" |
| `is_anonymous bool` | public name = "A Cloud member" |
| `is_flagged, flag_reason, flagged_at, is_hidden` | mirror `listings` moderation columns |
| `created_at, updated_at` | |

Dropped from `reviews`: `perfume_name`, `brand`, `category`, `sub_category`, `longevity`, `gender`, `when_to_wear`, `climate_season`, `environment` (superseded by polls / `perfume_id`). `get_perfume_review_aggregate` is rewritten to read rating from `reviews` and poll breakdowns from `perfume_votes`.

### 3.2 `perfume_votes`

`(user_id, perfume_id, dimension, option, value smallint)`; `UNIQUE (user_id, perfume_id, dimension, option)`. `value`: `1` = yes/selected, `-1` = no (only for `yes_no` dimensions). RLS: own rows only.

Dimension catalog lives in one TS module (`lib/polls.ts`) mirrored by a DB `CHECK` via a lookup table `poll_options(dimension, option, kind)`:

| dimension | kind | options |
|---|---|---|
| `gender` | single | very_masculine, masculine, unisex, feminine, very_feminine |
| `longevity` | single | 0-2h, 2-5h, 5-7h, 7-10h, 10h+ |
| `projection` | single | skin, moderate, strong, beast |
| `value` | single | overpriced, fair, good_value, steal |
| `climate` | yes_no | hot_summer, humid_rainy, winter, mild |
| `place` | yes_no | bus_metro, ac_room, restaurant, outdoors, wedding_event, jummah_eid |

Writes go through RPC `cast_vote(perfume_id, dimension, option, value)`: for `single` dimensions it deletes the caller's other options in that dimension first; `value = 0` clears the vote. Validates against `poll_options`.

### 3.3 `seller_reviews`

`(id, seller_id → profiles, reviewer_id → profiles, rating 1..5, comment ≤500 NULL, is_hidden, is_flagged..., created_at, updated_at)`; `UNIQUE (seller_id, reviewer_id)`; `CHECK (seller_id <> reviewer_id)`. Own-row write RLS; public read via RPC.

## 4. RPCs (all `STABLE SECURITY DEFINER`, `search_path = public`, granted to `anon, authenticated`)

- `get_perfume_reviews(perfume_id, limit, offset)` → public fields + display name (username, or "A Cloud member" if anonymous). No `user_id`. Excludes `is_hidden`.
- `get_perfume_review_aggregate(perfume_id)` → `review_count`, `rating_avg`, star histogram, per-dimension option counts / yes-percentages.
- `get_my_perfume_state(perfume_id)` (authenticated) → caller's review + votes, so the island hydrates "your vote".
- `get_seller_rating(seller_id)` and `get_seller_reviews(seller_id, limit, offset)`.
- `cast_vote(...)` (authenticated only).

## 5. UI

### 5.1 Fragrance page (`components/reviews/*`, client island under the static page)

- **Header:** average stars + count. `AggregateRating` JSON-LD emitted at ≥3 reviews.
- **StarRater:** logged out → 5 clickable stars; click navigates to `/login?next=<page>&rate=<n>`. Logged in → click saves immediately (optimistic), toast "Saved. Add a comment?" and an inline expander (text, photos, own-bottle, knows-seller, anonymous). Editable and deletable in place.
- **"Add a review" button** above the list: logged out → `/login?next=<page>&review=1`; logged in → focuses the expander.
- **Polls section:**
  - Everyone sees result bars (below 3 votes: "Be the first to vote" when logged in, "No votes yet" when logged out).
  - Logged in only: pick-one chips for gender/longevity/projection/value; ✅/❌ pairs for each climate and place option, showing "% say yes".
  - Logged out: no controls rendered.
- **Review list:** paginated, username (or "A Cloud member"), stars, text, photos, small badges ("Says they own this", "Knows the seller"), Report link for logged-in users.
- **Post-login resume:** island reads `?rate=` / `?review=1` once authenticated, applies the rating or opens the expander, then strips the params.

### 5.2 Dashboard
`/dashboard/reviews` becomes a read/edit/delete list of the user's own reviews (reusing `ReviewList`). `ReviewForm` is removed; creation is only on fragrance pages. `PerfumeComboBox` stays if used elsewhere.

### 5.3 Seller ratings
Rating bar + review list on `/perfumes/[username]`. Small star + count next to seller name on listing cards/pages. "Rate this seller" button (login-gated, same `next=` resume). Seller cannot rate self; UI hides the button.

### 5.4 Quick-join (slice C)
Signup path that asks only for Google one-tap or phone OTP, auto-generates a username (editable in profile later). Existing full signup remains for sellers.

### 5.5 Share link (slice C)
Dashboard card "Ask friends for reviews": copyable WhatsApp/Messenger text with a link to `/perfumes/<username>?review=1` and to chosen fragrance pages with `?review=1`. Retention digest tie-in ("N people voted on perfumes you reviewed") is out of scope here and discussed later.

## 6. Moderation & anti-abuse
- One review per user per perfume and per seller (DB-enforced).
- Report action sets `is_flagged`; `/superadmin/reviews` (exists) gains hide/unflag for both review tables.
- Rate limit: max 60 vote writes and 10 reviews per user per hour (enforced inside RPC / insert trigger).
- Text length caps in DB `CHECK`s. Image upload reuses the existing bucket and size limits.
- Honesty rule from `docs/GOAL.md`: seller never posts as a customer; friend reviews allowed and disclosed via the knows-seller badge.

## 7. Slices (each shippable end to end)

- **A — Perfume reviews + polls:** schema (3.1, 3.2), RPCs, fragrance-page island, login resume, dashboard list conversion, admin moderation update, `docs/WORKFLOWS.md` update.
- **B — Seller ratings:** 3.3, RPCs, profile + listing UI, moderation.
- **C — Quick-join + share link.**

## 8. Testing
- SQL: RLS checks (anon cannot read tables; cannot call `cast_vote`), unique constraints, self-rating blocked, single-choice vote replacement, rate limits.
- Unit: `lib/polls.ts` catalog vs `poll_options`; aggregate math.
- E2E (browser): logged-out sees stars+results, no vote controls; star click → login → returns with rating saved; vote change; review edit/delete; hidden review not public; Lighthouse/ISR unaffected.

## 9. Out of scope
Purchase-verified reviews, helpful-votes on reviews, reviewer profiles/follow, reply-by-seller, retention digest changes.
