# Cloud PerfumeBD — Full Site Audit

**Date:** 2026-07-04
**Scope:** Performance, security, UI/UX, rate limiting, SEO, visuals, retention, and traffic strategy — from business, software, and community perspectives.
**Method:** Code review of every route/API/component, Supabase security + performance advisors (live database lint), `npm audit`, and metadata/schema coverage checks.

---

## Severity legend

| Level | Meaning |
|-------|---------|
| 🔴 Critical | Actively costing traffic, trust, or money — fix this week |
| 🟠 High | Real risk or measurable UX/SEO damage — fix this month |
| 🟡 Medium | Compounding drag; cheap to fix alongside other work |
| 🟢 Low / informational | Fix opportunistically |

---

## 1. Critical findings

### 1.1 🔴 No analytics of any kind

**Evidence:** No GA4, Plausible, Umami, or Search Console verification tag anywhere. `app/layout.tsx` renders no analytics script; no `verification` key in the root metadata.

**Impact:** Every SEO and content decision is a guess. You cannot see: which of the 254 fragrance pages get impressions, what keywords you rank for, where users drop off, or whether the blog drives any visits. For a site whose whole strategy is organic traffic, this is the single most expensive gap.

**Fix steps:**
1. Create a GA4 property at analytics.google.com → get measurement ID (`G-XXXXXXX`).
2. Add to `.env.local` and hosting env: `NEXT_PUBLIC_GA_ID=G-XXXXXXX`.
3. In `app/layout.tsx`, load gtag via `next/script` with `strategy="afterInteractive"`, gated on the env var (no ID set = no script, so dev stays clean).
4. Verify Google Search Console:
   - Add property for `https://www.cloudperfumebd.com`.
   - Choose HTML-tag verification → copy the content token.
   - Add `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<token>` and wire `metadata.verification.google` in `app/layout.tsx`.
5. In Search Console: submit `https://www.cloudperfumebd.com/sitemap.xml`.
6. (Optional, later) Bing Webmaster Tools — imports from Search Console in one click; Bing/Yandex matter less in BD but are free.

**Status: implemented 2026-07-04** (env-gated GA4 + verification meta). Owner must supply the two env values.

---

### 1.2 🔴 Trending ranking is gameable by anonymous users

**Evidence:** Supabase advisor flags `public.increment_perfume_click(p_perfume_id uuid)` as a `SECURITY DEFINER` function executable by both `anon` and `authenticated` roles via `POST /rest/v1/rpc/increment_perfume_click`. Called from `app/perfumes/components/PerfumeGrid.tsx:45` and `lib/queries/client/perfumeClicks.ts:7`. No rate limiting, no dedup.

**Impact:** Anyone can run a 10-line script and put any perfume at #1 in the landing-page Trending section — or bury competitors. Trending is your homepage's main merchandising surface; if the community realizes it's gameable, trust in the whole "community-driven" positioning dies.

**Fix steps (choose A now, B when traffic grows):**

**Option A — dedupe inside the function (no client changes):**
1. Create a dedup table:
   ```sql
   create table public.perfume_click_log (
     perfume_id uuid not null,
     visitor_key text not null,      -- hash of IP or user id
     day date not null default current_date,
     primary key (perfume_id, visitor_key, day)
   );
   alter table public.perfume_click_log enable row level security;
   -- no policies: only the SECURITY DEFINER function touches it
   ```
2. Rewrite `increment_perfume_click` to take a `p_visitor_key text`, attempt `insert ... on conflict do nothing`, and only bump `click_score` when the insert actually inserted (`FOUND`).
3. Client passes a stable anonymous key (e.g. a random UUID stored in `localStorage`) — imperfect but raises the cost of gaming from "curl loop" to "rotate identities".
4. Add a nightly cleanup: `delete from perfume_click_log where day < current_date - 7`.

**Option B — move behind an API route:**
1. Create `app/api/perfume-click/route.ts`; call the RPC server-side with the service role.
2. Rate limit with the existing `rateLimit(clientIp(req) + perfumeId, 3, 86_400_000)` from `lib/rateLimit.ts`.
3. `revoke execute on function public.increment_perfume_click from anon, authenticated;`

Also consider decaying scores (e.g. multiply `click_score` by 0.9 nightly) so trending reflects *current* interest and a one-time spike ages out.

---

### 1.3 🔴 `/perfumes` downloads the entire listings table — twice

**Evidence:**
- Server: `app/perfumes/page.tsx:20` (`fetchInitialListings`) — no `.limit()`, no pagination, joins full seller profiles.
- Client: `app/perfumes/components/PerfumePage.tsx:19` (`fetchPerfumes`) — identical unbounded query. The `useQuery` at `PerfumePage.tsx:66` has `initialData` but **no `staleTime`**, so React Query treats the SSR data as stale and refires the full query immediately on mount. Every visit = the whole table twice.
- All search/filter logic is in-memory (`PerfumePage.tsx:78-101`).
- Supabase advisor confirms the trigram indexes built for search (`idx_listings_perfume_name_trgm`, `idx_listings_brand_trgm`, `idx_listings_sub_brand_trgm`) are **never used** — because no query ever reaches the database with a search term.

**Impact:** Payload grows linearly with listings. Bangladesh mobile networks are slow and data is metered — a 500-listing table with profile joins is easily 1–2 MB of JSON per visit, doubled by the immediate refetch. Slow first paint = bounce = lost ranking (Core Web Vitals feed into Google ranking).

**Fix steps:**
1. **Now (1 line):** add `staleTime: 60_000` to the perfumes `useQuery` — kills the duplicate fetch on mount.
2. **Soon:** add `.limit(48)` + `.range()` pagination (infinite scroll with `useInfiniteQuery` fits the existing grid), and a "Load more" button as fallback.
3. **With that:** move search server-side — `.or('perfume_name.ilike.%q%,brand.ilike.%q%,sub_brand.ilike.%q%')` or a small RPC using the trigram indexes that already exist. Debounce input 300 ms.
4. Keep price/type filters as query params so filtered views are shareable and crawlable.

---

### 1.4 🔴 10 production dependency vulnerabilities (5 high)

**Evidence:** `npm audit --omit=dev`: `ws` 8.0.0–8.20.1 (uninitialized memory disclosure GHSA-58qx-3vcg-4xpx, DoS GHSA-96hv-2xvq-fx4p), `uuid` via `svix` via `resend`. 13 total including dev.

**Fix steps:**
1. `npm audit fix`
2. `npx tsc --noEmit` + `npm run build` to confirm nothing broke.
3. Add a monthly habit (or Dependabot/Renovate) so this doesn't accumulate again.

**Status: fixed 2026-07-04** — see batch 1 notes at end of this doc.

---

## 2. Security

### 2.1 🟠 Leaked password protection disabled

**Evidence:** Supabase advisor WARN (`auth_leaked_password_protection`).

**Fix:** Supabase Dashboard → Authentication → Providers → Email → enable "Prevent use of leaked passwords" (checks HaveIBeenPwned). Zero code. Do it today.

### 2.2 🟠 All four public storage buckets allow listing every file

**Evidence:** Advisor WARN on `avatars`, `blog-images`, `listing-images`, `user-perfumes` — each has a broad SELECT policy on `storage.objects`, letting any client enumerate the full bucket contents (including files whose DB references were deleted).

**Impact:** Enumeration of every user avatar and every image ever uploaded. Not catastrophic, but leaks more than intended and makes scraping trivial.

**Fix steps:** Public buckets serve object URLs without any SELECT policy. For each bucket:
```sql
drop policy "Public read avatars" on storage.objects;
drop policy "blog_images_public_read" on storage.objects;
drop policy "listing-images read" on storage.objects;
drop policy "public can read user-perfumes" on storage.objects;
```
Then verify images still load (they will — the bucket's `public` flag serves objects; the policy only enabled *listing*). Test one page per bucket type after dropping.

### 2.3 🟡 Account deletion: no rate limit, no confirmation

**Evidence:** `app/api/account/delete/route.ts` — authenticated, but a single POST irreversibly deletes the account via service role.

**Fix steps:**
1. Add `rateLimit('acct-del:' + user.id, 3, 3_600_000)`.
2. Require typed confirmation client-side ("type DELETE") — check the dashboard UI; add if missing.
3. Consider soft-delete (flag + 7-day purge) so accidental/rage deletions are recoverable. Marketplace accounts have listings other users may have bookmarked.

### 2.4 🟡 Rate limiter is per-instance, in-memory

**Evidence:** `lib/rateLimit.ts` — honest about this in its own doc comment. Covers OTP send/confirm, help form, blog upload. Resets on every deploy; parallel serverless instances don't share windows.

**Fix:** Acceptable at MVP scale. When traffic grows: swap internals for Upstash Redis (`@upstash/ratelimit`) — the call sites keep the same signature. Do not build this now.

### 2.5 🟢 `support_messages` RLS-enabled with no policies

Advisor INFO. **Intentional** — table is service-role-only after the 2026-07-03 hardening. No action. Documented here so nobody "fixes" it by adding policies.

---

## 3. Database performance (Supabase advisors)

### 3.1 🟠 RLS policies re-evaluate `auth.uid()` per row

**Evidence:** Advisor WARN on `listings` (`listings_public_read`, `listings_insert_owner`) and `blog_posts` (4 policies). `listings_public_read` sits on the hottest query path in the app.

**Fix:** For each flagged policy, replace `auth.uid()` / `auth.role()` with `(select auth.uid())` — Postgres then evaluates once per query instead of once per row:
```sql
-- example pattern; pull each policy's definition first with \d+ or the dashboard
alter policy "listings_public_read" on public.listings
  using (is_hidden = false or user_id = (select auth.uid()));
```
Do all six in one migration. Measurable win once listings pass a few thousand rows; free insurance now.

### 3.2 🟡 Unindexed foreign keys on blog join tables

```sql
create index if not exists idx_blog_post_categories_category_id
  on public.blog_post_categories (category_id);
create index if not exists idx_blog_post_tags_tag_id
  on public.blog_post_tags (tag_id);
```

### 3.3 🟡 Duplicate permissive SELECT policies on `blog_posts`

`blog_posts_auth_read_own` + `blog_posts_public_read_published` both run for every authenticated SELECT. Merge into one policy with an OR condition.

### 3.4 🟢 ~12 unused indexes

Includes the trigram search indexes (unused because search never reaches the DB — see 1.3; they become useful after server-side search) and several others (`listings_min_price_idx`, `blog_posts_published_at_idx`, etc.). **Don't drop yet** — most exist for features that will start using them (server-side search, blog pagination). Re-check the advisor 1 month after server-side search ships; drop what's still unused.

---

## 4. UI/UX issues

### 4.1 🔴 Footer social links point to facebook.com / instagram.com homepages

**Evidence:** `components/Footer.tsx:24-25` — `href: 'https://facebook.com'`, `href: 'https://instagram.com'`.

**Impact:** BD fragrance buyers live on Facebook. A user who clicks your Facebook icon and lands on facebook.com's generic homepage concludes the site is fake or abandoned. This is a direct trust hit on every page (footer is global).

**Fix steps:**
1. Centralize in `lib/site.ts` (`SOCIAL_LINKS`), render only links with real URLs.
2. Fill in the actual page URLs. If no FB page exists yet: **create one** — it's the #1 non-ad traffic channel for this market (see §7).

**Status: implemented 2026-07-04** — config-driven; FB/Instagram hidden until real URLs are set in `lib/site.ts`.

### 4.2 🔴 "Contact Us" footer link leads to an under-construction page

**Evidence:** `app/(placeholder)/contact-us/page.tsx` renders `<UnderConstruction />`; linked from footer on every page. Meanwhile `/help-center` is a **fully working support form** (posts to `/api/help`, rate-limited, wired to Resend).

**Impact:** A user with a problem (wrong item, scam worry, payment question) clicks Contact Us and hits a dead end. On a marketplace, that user assumes support doesn't exist and never returns. Worst possible page to stub out.

**Fix:** Make `/contact-us` a real page: support email + link to the Help Center form. (Or redirect to `/help-center`; a slim real page is better since both are linked in the footer.)

**Status: implemented 2026-07-04.**

### 4.3 🟠 Trending tab switch shows "No perfumes found" while loading

**Evidence:** `components/TrendingSection.tsx` — `isLoading` (line 80) tracks only the "now" query. Week/month/brands queries default to `[]`, so clicking "This Week" renders `TrendingGrid` with an empty array → "No perfumes found for this filter." flashes until data arrives.

**Fix:** Capture each query's `isLoading`/`isFetching`, derive `activeLoading` from the selected tab, and gate the grid + skeleton on that:
```tsx
const { data: week = [], isLoading: weekLoading } = useQuery({ ... });
const activeLoading =
  tab === "now" ? isLoading :
  tab === "week" ? weekLoading :
  tab === "month" ? monthLoading : brandsLoading;
```

### 4.4 🟠 No sort options on `/perfumes`

Filters exist (brand, price, type) but no sort control. Decant buyers are price-driven; "Price: low → high" is the first thing they reach for.

**Fix:** Add a sort dropdown (Newest / Price ↑ / Price ↓) to `PerfumePage.tsx`; sort in the same `useMemo` as filters, keyed on `effectivePrice`. Persist choice in the Zustand UI store like the filters.

### 4.5 🟡 Missing-image fallback is a gray "?"

**Evidence:** `components/TrendingGrid.tsx:53-55` and equivalent in `PerfumeGrid`.

**Fix:** Replace with a branded placeholder — bottle silhouette SVG on the cream background with the gold accent. One asset, reused everywhere. A "?" reads as broken; a branded placeholder reads as intentional.

### 4.6 🟡 Orphan placeholder page

`app/(placeholder)/new-arrivals/page.tsx` is under construction and linked from nowhere. Delete it or build it (a "newest listings" query is trivial and it's a good SEO/return-visit page — `order by created_at desc limit 24`).

---

## 5. SEO

**What's already good (keep):** sitemap with DB-driven URLs, robots.ts, RSS feed, JSON-LD (WebSite on home, BlogPosting on posts, structured data on fragrance pages), metadata template with canonicals, 254-entry fragrance directory with `generateStaticParams`, ISR on all content routes, www canonicalization in `proxy.ts`.

### 5.1 🟠 Fragrance pages declare `summary_large_image` with no image

**Evidence:** `app/fragrance/[slug]/page.tsx` `generateMetadata` — openGraph/twitter have title + description only.

**Impact:** Every share of a fragrance page into a Facebook group or WhatsApp chat renders a blank/ugly card. For your market, share-cards ARE marketing.

**Fix steps:**
1. Create `app/fragrance/[slug]/opengraph-image.tsx` using Next's `ImageResponse`: brand + fragrance name + "prices & decants in Bangladesh" on the brand's cream/gold design. Next auto-wires the OG/Twitter image meta.
2. Same treatment for blog posts missing cover images, and consider one for listing pages.

### 5.2 🟠 Sitemap fakes freshness

**Evidence:** `app/sitemap.ts:31-37, 64-69` — static + fragrance pages get `lastModified: new Date()` on every generation.

**Impact:** Google learns your `lastmod` is noise and starts ignoring it — including for pages that genuinely changed.

**Fix:** For fragrance pages, add a real `updatedAt` to catalog entries (or use the catalog file's build date as a constant). For static pages, hardcode the date of last real edit. Only listings/blog/profiles should use DB `updated_at`.

### 5.3 🟠 No Bengali content or hreflang

English-only site for a market that searches in both languages. "পারফিউম" keyword space has near-zero serious competition.

**Fix steps (incremental, not a rebuild):**
1. Start with 3–5 Bengali blog posts on the highest-volume topics (decant guide, fake-vs-real, best under ৳1000).
2. Add `alternates.languages` hreflang once parallel pages exist.
3. Long-term: bilingual fragrance-page intros (one paragraph is enough for keyword coverage).

### 5.4 🟡 Missing schema opportunities

- **BreadcrumbList** on fragrance + blog + listing pages (easy rich-result).
- **FAQPage** on fragrance pages ("How much does X cost in Bangladesh?", "Is X long-lasting?") — matches actual search queries; the catalog already has the data to answer price ranges.
- **Product/Offer** schema on listing detail pages (`app/perfumes/[username]/[id]/page.tsx`) — verify present; price-rich snippets for "brand X decant price" are the highest-intent queries you can win.

### 5.5 🟢 Minor

- `keywords` meta in `app/layout.tsx` — ignored by Google; harmless, leave or drop.
- Blog category/tag filters are query params (`/blog?category=x`) — fine at this scale; consider path-based category pages when post count grows.

---

## 6. Retention & community (business POV)

The brand says "community-powered"; the product has **zero community surfaces**. Nothing invites a second visit. Ranked ladder — each rung feeds the next:

### 6.1 Wishlist / favorites (small — 1–2 days)
- Table: `wishlists (user_id, listing_id, created_at)` + RLS (owner-only).
- Heart icon on cards + `/dashboard/wishlist` page.
- **Why first:** cheapest retention feature, and it's the prerequisite for price-drop alerts (§7), the strongest recurring-visit mechanic a price-comparison site can have.

### 6.2 Reviews & ratings on fragrance pages (medium — 3–5 days)
- Table: `fragrance_reviews (user_id, fragrance_slug, rating int, body text, created_at)`, RLS owner-write/public-read, unique (user, slug).
- Show avg rating + count on fragrance pages; `AggregateRating` schema → star rich-results in Google.
- **Why:** UGC compounds — every review is long-tail SEO content you didn't write, plus the trust layer a marketplace needs. Moderate via existing admin panel.

### 6.3 "My shelf" collection (medium)
- "I own / I've tried / I want" states per fragrance; public shelf page per user.
- Identity investment = retention; fragrance collectors love showing shelves. Shareable shelf pages are another organic loop.

### 6.4 Blog comments (small, after reviews)
Reuse the review infra. Adds return visits + freshness signals to posts.

---

## 7. Traffic without ads (beyond blog)

Ranked by effort-to-impact for the BD market:

1. **Facebook presence + share buttons.** BD fragrance buying happens in FB groups. Create the page (fix §4.1 with its real URL), then add FB + WhatsApp share buttons to fragrance and listing pages. Fragrance pages with live price data are natively shareable content in those groups — members constantly ask "koto dam?" (§5.1's OG images make these shares look good).
2. **Price-drop alerts** (needs wishlist §6.1 + email). "Dior Sauvage decant dropped to ৳450" is an email that gets opened and clicked. Resend is already a dependency.
3. **Newsletter capture.** The footer newsletter was removed for a Journal CTA — there is currently **no owned audience channel** (RSS exists but nobody in the market uses it). Re-add a simple email capture (footer + blog-post-end), store in a `subscribers` table, send a monthly digest via Resend.
4. **Programmatic comparison pages.** You already have the catalog: "Cheapest decants under ৳500", "Best [brand] fragrances in BD", "Winter fragrances for Dhaka weather", Eid/wedding gift guides. Each is a page type, not a page — templates over the existing data.
5. **"Find your signature scent" quiz.** 6–8 questions → result card (shareable image) → capture email for full results. Feeds both social sharing and the newsletter list.
6. **User shelves & reviews as SEO** (§6) — every public shelf and review page is indexable UGC.
7. **YouTube/TikTok embeds** on fragrance pages (embed popular reviews of that fragrance) — increases dwell time (ranking signal) at zero content cost.

---

## 8. Suggested execution order

| Batch | Contents | Effort |
|-------|----------|--------|
| **1 — this week** | `npm audit fix` · GA4 + Search Console wiring · fix footer socials · real Contact Us page | half day |
| **2 — security** | Lock down `increment_perfume_click` (§1.2) · drop bucket listing policies (§2.2) · enable leaked-password protection (§2.1) · rate-limit account delete (§2.3) | 1 day |
| **3 — perf/UX** | `staleTime` on perfumes query · pagination + server-side search (§1.3) · trending tab loading fix (§4.3) · sort options (§4.4) · RLS initplan migration (§3.1) + FK indexes (§3.2) | 2–3 days |
| **4 — SEO** | OG images (§5.1) · real sitemap dates (§5.2) · FAQ + breadcrumb schema (§5.4) · verify Product schema on listings | 1–2 days |
| **5 — retention ladder** | Wishlist → newsletter capture → reviews → price-drop alerts | 1–2 weeks, ship incrementally |

---

## Batch 1 completion notes (2026-07-04) — SHIPPED

**Verification:** `npx tsc --noEmit` exit 0 · `npm run build` exit 0 (all routes compile).

| Item | Change | Files |
|------|--------|-------|
| Dependency vulns | `npm audit fix` — all 10 production vulnerabilities resolved (ws high×2, uuid/svix chain). 2 moderate remain: postcss bundled inside Next itself; the only "fix" downgrades Next to 9.3.3, so skipped — resolves with a future Next patch release. | `package-lock.json` |
| GA4 | gtag loads via `next/script` (`afterInteractive`), gated on `NEXT_PUBLIC_GA_ID` — no env var, no script (dev stays clean). | `app/layout.tsx` |
| Search Console | `metadata.verification.google` renders when `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` is set. | `app/layout.tsx` |
| Env docs | New `.env.example` documenting all required + new env vars. | `.env.example` |
| Footer socials | Centralized in `lib/site.ts` `SOCIAL_LINKS`; FB/Instagram icons render only when a real URL is set (dead facebook.com/instagram.com links removed). External links now `target="_blank" rel="noopener noreferrer"` + `aria-label`. | `lib/site.ts`, `components/Footer.tsx` |
| Contact Us | Under-construction stub replaced with a real page: support email card + Help Center form card. Indexable, canonical set, added to sitemap. | `app/(placeholder)/contact-us/page.tsx`, `app/sitemap.ts` |

**Owner actions remaining (no code, ~20 min):**
1. Create GA4 property → set `NEXT_PUBLIC_GA_ID` in hosting env.
2. Create Search Console property (HTML-tag method) → set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` → submit `sitemap.xml`.
3. Create/locate real Facebook + Instagram pages → fill URLs in `lib/site.ts`.

**Next up:** Batch 2 (security) — lock down `increment_perfume_click` (§1.2), drop bucket listing policies (§2.2), enable leaked-password protection (§2.1), rate-limit account delete (§2.3).
