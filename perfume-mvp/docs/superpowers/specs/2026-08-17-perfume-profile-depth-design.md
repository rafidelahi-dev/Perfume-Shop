# Perfume Profile Depth — Design Spec

**Date:** 2026-08-17
**Scope:** note pyramid, community perception charts, and similar-perfume recommendations on `/fragrance/[slug]`
**Goal:** first sub-project of the Fragrantica-for-Bangladesh pivot — turn fragrance pages from listing-comparison pages into reference/profile pages, the core mechanic the rest of the pivot (content, redesign, SEO) points traffic at.

**Context:** this is the first of five independently-scoped sub-projects identified during brainstorming for the broader site pivot (content pipeline, visual redesign, community layer, and SEO/growth infra are the other four — each gets its own spec later). Not addressed here: content publishing, visual redesign, wishlists/collections, or wiring `listings.perfume_id`/`perfume_clicks.perfume_id`/`perfume_score` off their current text-matching (deliberately deferred — see §6).

---

## 1. Current state

- `/fragrance/[slug]` is driven by a static file, `lib/fragrance-catalog.ts` (252 entries: `slug`, `name`, `brand`, `metaDescription`, `searchTerms`). No note pyramid, no accords, no ratings data anywhere in the catalog.
- Supabase already has a `perfumes` table (`id, slug, name, brand, meta_title, meta_description`) — **0 rows, unused**. An earlier attempt to move the catalog into the DB that was abandoned in favor of the static file.
- `listings.perfume_id` and `perfume_clicks.perfume_id` are both existing `uuid` columns, **unused** — no FK constraint, always null. Matching is done everywhere via free-text `brand`/`perfume_name` (`ilike`, or the generated `perfume_key` on `perfume_score`).
- `reviews` table (0 rows, feature unused so far) already collects `longevity`, `when_to_wear` (occasion), and `gender` per review — exactly the fields a Fragrantica-style community perception chart needs — but has no link to a canonical perfume, only free-text `perfume_name`/`brand`.

## 2. Data model

Extend `perfumes` (becomes the canonical fragrance entity, replacing the static TS catalog as the source of truth for `/fragrance/[slug]`):

| Column | Type | Notes |
|---|---|---|
| *(existing)* `id, slug, name, brand, meta_title, meta_description` | — | unchanged |
| `top_notes`, `heart_notes`, `base_notes` | `text[]` | the note pyramid |
| `accords` | `text[]` | e.g. `{oud, sweet, woody}` — powers similarity + future filter chips |
| `gender_lean` | `text`, check constraint matching `reviews.gender`'s enum (`very_masculine`…`very_feminine`) | curated baseline shown until enough community votes exist |
| `house_description` | `text` | 2-3 sentence editorial blurb |
| `is_verified` | `boolean default false` | flips true once an admin has spot-checked the AI-seeded row |

New: `reviews.perfume_id uuid references perfumes(id)`, **nullable**. Existing `perfume_name`/`brand` text columns on `reviews` stay untouched as a display fallback for reviews without a match.

RLS: confirm `perfumes` already has a public-SELECT policy (it's never served public reads before now — likely needs one added alongside the new columns).

## 3. Content seeding (252 perfumes)

One-time script, run against the existing `fragranceCatalog` array: for each entry, AI-generate `top/heart/base_notes`, `accords`, `gender_lean`, `house_description`, upsert into `perfumes` by `slug` with `is_verified = false`.

New `/superadmin/perfumes` page (CRUD pattern mirrors `/superadmin/blog`): list sorted unverified-first, inline edit for note/accord/description fields, toggle `is_verified`. Does not gate the pages going live — verification is a curation queue, not a publish gate.

## 4. `/fragrance/[slug]` page changes

- `generateStaticParams` switches from importing `fragranceCatalog` to querying `perfumes` at build time. Same SSG shape and `revalidate = 3600` ISR behavior — just DB-sourced instead of file-sourced.
- **Note pyramid**: three-tier display (top/heart/base). Empty note tiers render "not yet documented," not a blank gap — unverified/incomplete entries shouldn't look broken.
- **Community read**: three small aggregates computed from `reviews` grouped by `perfume_id` — season/occasion histogram (from `when_to_wear`), longevity distribution, gender-lean gauge. Below ~3 reviews, render an "not enough reviews yet" empty state instead of a misleading single-vote chart.
- **Similar perfumes**: 4-6 cards, computed via Postgres array-overlap (`accords && $1`) scored by shared-accord count + same-brand bonus, queried at request time (covered by the page's existing ISR cache — no separate precompute job needed at 252-perfume scale). Reuses the existing card component pattern from `TrendingSection`/`BlogPostCard`.

## 5. Reviews changes

`ReviewForm` (`app/dashboard/reviews/reviewComponents/ReviewForm.tsx`) replaces its free-text brand/perfume-name inputs with an autocomplete against `perfumes`, reusing the existing `usePerfumeAutocomplete` pattern from `/dashboard/perfumes`. On selection, `perfume_id` is stored and `perfume_name`/`brand` are filled from the match (existing review-list UI keeps working unmodified). If a perfume isn't found in the catalog, the free-text fields remain as a fallback (`perfume_id` stays null) — such reviews simply don't feed the aggregated charts until that perfume is added to `perfumes`.

## 6. Explicitly out of scope

- Wiring `listings.perfume_id`, `perfume_clicks.perfume_id`, or migrating `perfume_score` off its generated text key — all touch live marketplace data (14 listings, 32 perfume_score rows) and are a separate, riskier cleanup pass.
- Content pipeline, visual redesign, community layer (wishlists/collections), and SEO/growth infra — separate sub-projects of the broader pivot, each gets its own spec.
- Automated tests — no test suite exists in this repo (per `README.md`); verification here is manual (`npm run build` for the SSG source change, spot-check `/fragrance/[slug]` pages at 0/few/many-review states).

## 7. Migration & rollout order

1. Migration: new `perfumes` columns, `reviews.perfume_id` FK (nullable), confirm/add public-SELECT RLS on `perfumes`.
2. Seed script: populate `perfumes` from the 252 catalog entries + AI-generated fields.
3. Swap `/fragrance/[slug]`'s `generateStaticParams`/data source from the static file to the `perfumes` table.
4. Ship note pyramid + empty-state community charts (works immediately, no reviews needed).
5. Ship reworked `ReviewForm`; charts populate as reviews accumulate.
6. Ship `/superadmin/perfumes` verification page for ongoing curation.
7. Once confirmed working end-to-end: delete `lib/fragrance-catalog.ts` and `scripts/generate-fragrance-catalog.mjs` (keep `list.txt` — harmless historical source list).

## 8. Files to create / modify

| File | Action |
|---|---|
| new migration SQL (`supabase/perfume-profile-depth.sql`) | Create — new `perfumes` columns, `reviews.perfume_id` FK, RLS |
| seed script (e.g. `scripts/seed-perfume-profiles.ts`) | Create — AI-seed the 252 entries |
| `app/fragrance/[slug]/page.tsx` | Modify — DB-sourced params, note pyramid, community charts, similar perfumes |
| `app/dashboard/reviews/reviewComponents/ReviewForm.tsx` | Modify — autocomplete perfume selection, `perfume_id` |
| `app/(admin)/superadmin/perfumes/*` | Create — verification CRUD page |
| `lib/queries/*` | Modify/create — perfume profile fetchers, review-aggregate queries, similarity query |
| `lib/fragrance-catalog.ts`, `scripts/generate-fragrance-catalog.mjs` | Delete (final step, after cutover confirmed) |
