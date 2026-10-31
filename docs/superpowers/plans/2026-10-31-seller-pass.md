# Seller Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every seller a shareable "Seller Pass": a generated link-preview card, a mobile-first profile header, and tiers (Silver/Gold/Platinum), Verified and Founding badges earned automatically.

**Architecture:** Tier rules live in SQL (`seller_tier_for` pure function plus a trigger that keeps `profiles.tier_floor` current), because the floor must update when reviews change. One RPC, `get_seller_pass`, returns the finished facts; the profile page and the `opengraph-image.tsx` card both read it, so they can never disagree. TypeScript only formats and displays.

**Tech Stack:** Next.js 16 (app router, ISR, `next/og` ImageResponse on edge), Supabase (Postgres, RPC, MCP `apply_migration` / `execute_sql`), Tailwind, vitest (`tests/*.test.ts`).

**Spec:** `docs/superpowers/specs/2026-10-31-seller-pass-design.md`. Mockups: `.superpowers/brainstorm/27701-1793458104/content/share-card.html` (option A) and `profile-mobile.html` (option 1).

## Global Constraints

- Profile URL stays `/perfumes/[username]`. No short link.
- Tier rows (`tier_config`), rating bars fixed: Silver 4.2, Gold 4.4, Platinum 4.5.

  | min_members | silver | gold | platinum |
  |---|---|---|---|
  | 0 | 20 | 35 | 50 |
  | 150 | 50 | 75 | 100 |
  | 200 | 100 | 125 | 150 |
  | 201 | 100 | 150 | 200 |

  The row with the highest `min_members` at or below the active member count applies. Member count = `profiles` where `status = 'active'`.
- Only reviews with `is_hidden = false` count. `seller_reviews` already has `UNIQUE (seller_id, reviewer_id)` (one review per reviewer per seller).
- A held tier is kept while the seller's average clears that tier's bar; count is only an entry bar. If the average falls under the bar the seller drops to the best tier they still clear and `tier_floor` resets to it. Held only because of the floor means `is_early = true` ("Early Gold" label).
- `tier_frozen = true` (admin only) hides the tier entirely.
- Founding number: signup order by `created_at`, first 100 only, stored once, never recomputed.
- Verified = existing `profiles.phone_verified`; "Verified seller" wording stays. Phone signups become verified automatically and the contact number locks.
- Card image 1200x630 PNG, edge runtime, flex layouts only (satori). The renderer draws WebP/AVIF as blank boxes and has no Bangla glyphs.
- Keep ISR (`revalidate = 300`) on the profile page. Tests are `tests/*.test.ts` run by `npm test` from `perfume-mvp/`.
- Working tree holds uncommitted Bangla-toggle work (Header, NotePyramid, AtAGlance, lang.tsx, etc.). Do not stage those files. `docs/WORKFLOWS.md` already has Bangla edits: leave it unstaged in Task 8 unless the owner has committed that work first.

## Review Focus

- Seller with zero reviews: average is null; no tier, "New seller" copy, no NaN or "null" on the card.
- Hiding or unhiding a review changes count/average; tier and floor must follow (trigger on `seller_reviews` update/delete).
- Rating dips under the bar while holding a floor tier: drops one tier and floor resets.
- Avatar missing, WebP/AVIF or unreachable: card falls back to an initial letter instead of a blank box.
- Display name with Bangla or other non-Latin characters, or 40+ characters: card shows `@username` instead of tofu boxes, and long names do not overflow.
- Unknown username on the card route: generic Cloud PerfumeBD card, not a 500.

---

### Task 1: Database: tiers, founding, verified, RPC

**Files:**
- Create: `perfume-mvp/supabase/seller-pass.sql` (applied live with `mcp__supabase__apply_migration`, name `seller_pass`)
- Create: `perfume-mvp/supabase/seller-pass-checks.sql` (assert-only `DO` block)

**Interfaces:**
- Produces (SQL):
  - table `public.tier_config(min_members int primary key, silver_min int, gold_min int, platinum_min int)`, public read, seeded with the four rows above.
  - columns on `profiles`: `founding_number int unique null`, `tier_floor text null check in ('silver','gold','platinum')`, `tier_frozen boolean not null default false`. These three plus `phone_verified` must not be writable by the owner through the client (follow `supabase/profiles-role-lockdown.sql`).
  - `seller_tier_for(p_count int, p_avg numeric, p_members int, p_floor text) returns text` (immutable; null when no tier).
  - `refresh_seller_tier(p_seller uuid) returns void` (recomputes and stores `tier_floor`); triggers on `seller_reviews` insert/update/delete and on `profiles` insert call what is needed (founding number assignment on insert).
  - `get_seller_pass(p_username text) returns table(seller_id uuid, username text, display_name text, avatar_url text, bio text, rating_count bigint, rating_avg numeric, tier text, is_early boolean, founding_number int, verified boolean, listing_count bigint, member_since int)` security definer; `tier` null when `tier_frozen`; returns zero rows for unknown username.

- [ ] **Step 1: Write the failing checks.** In `seller-pass-checks.sql`, one `DO $$ ... $$` block that `RAISE EXCEPTION` on any mismatch, calling `seller_tier_for(count, avg, members, floor)` with these cases (members 22 unless stated):
  `(19,4.5,22,null)` -> null; `(20,4.2,22,null)` -> `silver`; `(20,4.19,22,null)` -> null; `(35,4.4,22,null)` -> `gold`; `(50,4.5,22,null)` -> `platinum`; `(50,4.3,22,null)` -> `silver`; `(0,null,22,null)` -> null; floor kept: `(60,4.5,300,'platinum')` -> `platinum` (count below the 200 final bar, floor holds); floor with dip (count is an entry bar only, so the fallback ignores count): `(60,4.3,300,'platinum')` -> `silver`; `(60,4.1,300,'platinum')` -> null; `(60,4.4,300,'platinum')` -> `gold`; stage change: `(60,4.5,150,null)` -> `silver` (150 row: silver 50, gold 75); `(100,4.5,201,null)` -> `silver`; `(200,4.5,201,null)` -> `platinum`; `(150,4.4,201,null)` -> `gold`.
- [ ] **Step 2: Run to verify it fails.** Run the file via `mcp__supabase__execute_sql`. Expected: error `function seller_tier_for ... does not exist`.
- [ ] **Step 3: Implement `seller-pass.sql`.** Tier rule: take the row for the member count; `earned` = best of silver/gold/platinum where count >= its min and avg >= its bar; `held` = floor if avg >= floor's bar; result = the better of `earned` and `held`; else the best tier at or below the floor whose rating bar the avg still clears (count waived, already earned); else null. Founding number: trigger `before insert on profiles` sets `founding_number = (count of existing profiles with a number) + 1` when that is <= 100 (serialize with an advisory lock), plus a one-time backfill by `created_at`. Backfill `phone_verified` and `contact_number` from `auth.users` (`phone_confirmed_at is not null`), and add an `after update of phone_confirmed_at on auth.users` trigger that sets `phone_verified = true` and `contact_number = phone` on the matching profile. `refresh_seller_tier` stores `tier_floor = seller_tier_for(count, avg, members, current floor)`. `get_seller_pass` returns `tier` = `seller_tier_for(...)` unless frozen, and `is_early` = tier is higher than `seller_tier_for(count, avg, members, null)`.
- [ ] **Step 4: Apply and re-run checks.** Apply with `mcp__supabase__apply_migration`, then run `seller-pass-checks.sql`. Expected: no exception. Also run `select * from get_seller_pass('<an existing username>')` and check one row; `select * from get_seller_pass('nobody-here')` returns zero rows.
- [ ] **Step 5: Confirm lockdown.** Try `update profiles set tier_frozen = true` as an authenticated non-admin (follow the lockdown file's pattern for testing); expected: permission error. Run `mcp__supabase__get_advisors` (security) and note nothing new.
- [ ] **Step 6: Commit** `supabase/seller-pass.sql`, `supabase/seller-pass-checks.sql`.

### Task 2: Display helpers and typed fetch

**Files:**
- Create: `perfume-mvp/lib/sellerPass.ts`
- Test: `perfume-mvp/tests/sellerPass.test.ts`

**Interfaces:**
- Consumes: `get_seller_pass` RPC (Task 1).
- Produces:
  - `type Tier = 'silver' | 'gold' | 'platinum'`
  - `type SellerPass = { sellerId: string; username: string; displayName: string; avatarUrl: string | null; bio: string | null; ratingCount: number; ratingAvg: number | null; tier: Tier | null; isEarly: boolean; foundingNumber: number | null; verified: boolean; listingCount: number; memberSince: number }`
  - `fetchSellerPass(username: string): Promise<SellerPass | null>` (uses `createPublicSupabase` pattern from `app/perfumes/[username]/page.tsx`)
  - `tierLabel(tier: Tier | null, isEarly: boolean): string` ("Gold Seller", "Early Gold Seller", "New seller")
  - `cardName(displayName: string, username: string): string` (display name when all characters are Latin/digits/common punctuation and <= 28 chars, else `@username`)
  - `initialOf(name: string): string` (first Latin letter, uppercased, else `?`)
  - `isCardSafeImage(url: string | null): boolean` (false for null, `.webp`, `.avif`)

- [ ] **Step 1: Write failing tests** in `tests/sellerPass.test.ts`: `tierLabel('gold', false)` is `"Gold Seller"`; `tierLabel('gold', true)` is `"Early Gold Seller"`; `tierLabel(null, false)` is `"New seller"`; `cardName('রাফিদ', 'rafid')` is `"@rafid"`; `cardName('Rafid Elahi', 'rafid')` is `"Rafid Elahi"`; a 40-character name gives `"@rafid"`; `initialOf('rafid')` is `"R"`; `initialOf('রাফিদ')` is `"?"`; `isCardSafeImage('https://x/a.webp')` false, `.png?x=1` true, `null` false.
- [ ] **Step 2: Run** `npm test -- sellerPass` from `perfume-mvp/`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** the functions above in `lib/sellerPass.ts`; `fetchSellerPass` maps the RPC row (bigints to numbers) and returns null for zero rows.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Commit.**

### Task 3: Share card (link preview image)

**Files:**
- Create: `perfume-mvp/app/perfumes/[username]/opengraph-image.tsx`
- Modify: `perfume-mvp/app/perfumes/[username]/page.tsx:23-65` (`generateMetadata`)

**Interfaces:**
- Consumes: `fetchSellerPass`, `tierLabel`, `cardName`, `initialOf`, `isCardSafeImage` (Task 2).
- Produces: card at `/perfumes/<username>/opengraph-image`; Next attaches it as `og:image`.

- [ ] **Step 1: Implement** `Image({ params })` following `app/fragrance/[slug]/opengraph-image.tsx` (same exports: `runtime = 'edge'`, `size = { width: 1200, height: 630 }`, `contentType = 'image/png'`). Design per option A mockup: dark radial background with gold hairline border, "Cloud PerfumeBD · Seller Pass" top right, avatar circle (gold ring; initial letter when `!isCardSafeImage`), `cardName`, tier line (`tierLabel`, plus `FOUNDING #nnn` when present, plus "Verified" when true), three stats (rating `x.x★` and review count, listings, member since), URL line `cloudperfumebd.com/perfumes/<username>`, and a bottom "Get yours free at cloudperfumebd.com" line. No tier: show "New seller, building their reputation" and omit the rating stat when `ratingCount` is 0. Unknown username: generic Cloud PerfumeBD card with the same background.
- [ ] **Step 2: Update `generateMetadata`** so title/description use the pass (add tier and rating when present), `openGraph.images` and `twitter` use the generated image (`twitter.card = 'summary_large_image'`), and remove the avatar-as-preview code.
- [ ] **Step 3: Verify visually.** Run the dev server; fetch `http://localhost:3000/perfumes/<real username>/opengraph-image` with `curl -o card.png`, Read the PNG, and compare against the option A mockup. Repeat for an unknown username and one with a non-Latin display name (use `execute_sql` on a throwaway profile or temporarily test via `cardName` result in the image). Expected: no blank boxes, no overflow, correct text.
- [ ] **Step 4: Check `tsc --noEmit` and `npm run lint` on changed files; commit.**

### Task 4: Profile page header, tabs, contact buttons, join bar

**Files:**
- Create: `perfume-mvp/components/profile/SellerPassHeader.tsx` (server component)
- Create: `perfume-mvp/components/profile/ProfileTabs.tsx` (client: Listings / Reviews tabs)
- Create: `perfume-mvp/components/profile/JoinBar.tsx` (client: sticky "Get your card" bar for logged-out visitors, links to `/signup`)
- Modify: `perfume-mvp/app/perfumes/[username]/page.tsx` (layout), `perfume-mvp/lib/queries/profile.ts` and `perfume-mvp/lib/queries/client/profile.ts` only if the `website` field needs adding to a type

**Interfaces:**
- Consumes: `SellerPass` and `tierLabel` (Task 2); existing `SellerRatingSection`, `SellerRatingBadge`, `UsernameListingGrid`.
- Produces: `<SellerPassHeader pass={SellerPass} contact={{ whatsapp: string|null; messenger: string|null; facebook: string|null; phone: string|null; website: string|null }} />`

- [ ] **Step 1: Implement `SellerPassHeader`** matching the "Pass on top" mockup: dark gold-ringed card with avatar, name, tier line, three stats (reviews/rating, fragrances, member since), then a button row under it (WhatsApp, Messenger, Facebook, Call, Website; a "Rate" button that switches to the Reviews tab), then chips (Verified, Founding #nnn). Keep the existing "seller hasn't shared contact details" warning when no contact exists. Mobile first: one column, touch targets 44px.
- [ ] **Step 2: Rework `page.tsx`**: fetch the pass via `fetchSellerPass` (replace the separate `get_seller_rating` call) while keeping listings and reviews queries; render header, then `ProfileTabs` with listings grid and `SellerRatingSection`; add `website` to the profile select and pass it on (render as `https://` link, `rel="noreferrer"`, only `http(s)` URLs).
- [ ] **Step 3: `JoinBar`** appears only when no session (client check using the existing Supabase browser client), dismissible for the session, links to `/signup?next=/perfumes/<username>`.
- [ ] **Step 4: Verify in the browser (gstack `$B`)**: screenshot the profile at 375px width and desktop for a seller with reviews, one new seller, and one with no contact info. Expected: matches mockup; no horizontal scroll; tabs switch; Rate opens the Reviews tab.
- [ ] **Step 5: `tsc --noEmit`, lint changed files, commit.**

### Task 5: Verified at signup, lock contact number, website field

**Files:**
- Modify: `perfume-mvp/app/dashboard/profile/page.tsx:528-575` (contact number field), plus the form where `website` should be editable
- Modify: `perfume-mvp/lib/queries/client/profile.ts`, `perfume-mvp/lib/queries/profile.ts` (add `website`)
- Modify: `perfume-mvp/lib/ensureProfile.ts` only if the DB trigger from Task 1 does not already cover signup-time verification

**Interfaces:**
- Consumes: `profiles.phone_verified`, `contact_number` (Task 1 trigger sets both for phone signups).
- Produces: contact number input disabled with "Verified" shown when `phone_verified`; a validated `website` input saved with the rest of the form.

- [ ] **Step 1: Disable the contact number input and hide the Verify button when `profile.phone_verified`** (existing code at lines 544-575 already hides Verify; add the disabled state and helper text "This is the number you signed up with.").
- [ ] **Step 2: Add a Website field** to the profile form; save as `website`; accept only `http://` or `https://` URLs (prefix `https://` when missing, reject others) with an inline error.
- [ ] **Step 3: Verify**: sign up a test phone account if possible, otherwise `select phone_verified, contact_number from profiles` for an existing phone-confirmed account after the Task 1 backfill; check the dashboard form shows it locked. Save a website and see it on the public profile.
- [ ] **Step 4: `tsc --noEmit`, lint, commit.**

### Task 6: Admin tier freeze

**Files:**
- Modify: `perfume-mvp/app/api/admin/sellers/[id]/route.ts` (PATCH accepts `tier_frozen: boolean`, validated, uses `requireAdmin()`, revalidates `/perfumes/[username]`)
- Modify: `perfume-mvp/components/admin/SellerDetailPanel.tsx` (toggle "Freeze tier")
- Modify: `perfume-mvp/app/api/admin/sellers/route.ts` GET to include `tier_frozen` if the panel reads from it

**Interfaces:**
- Consumes: `profiles.tier_frozen` (Task 1).
- Produces: admin toggle; frozen sellers show no tier on page and card.

- [ ] **Step 1: Extend PATCH** to accept and validate `tier_frozen` as a boolean, following the existing validation in that route.
- [ ] **Step 2: Add the toggle** to `SellerDetailPanel` using the same mutation hook pattern as its existing actions.
- [ ] **Step 3: Verify** with a seller that has a tier (set test data via SQL if no seller qualifies, then restore): freeze, confirm `get_seller_pass(...).tier` is null and the card shows "New seller"; unfreeze, tier returns.
- [ ] **Step 4: `tsc --noEmit`, lint, commit.**

### Task 7: Docs and final verification

**Files:**
- Modify: `docs/WORKFLOWS.md` (new Mermaid flow: review -> tier/floor -> Seller Pass card and page; phone signup -> verified; admin freeze; changelog row dated 2026-10-31)

- [ ] **Step 1: Add the flows** to `docs/WORKFLOWS.md` in the file's existing style.
- [ ] **Step 2: Full verification**: `npx tsc --noEmit`, `npm run lint` (changed files), `npm test`, and one browser pass (`$B`) of a profile at mobile width plus the card PNG. Expected: clean typecheck, no new lint errors, all tests pass, screenshots match the mockups.
- [ ] **Step 3: Commit** the doc change (see Global Constraints about staging `WORKFLOWS.md`).
