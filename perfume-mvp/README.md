# Cloud PerfumeBD — Codebase Context

> **Purpose of this file:** complete orientation document for any future AI assistant or developer.
> Read this before touching anything. Last full audit: 2026-07-02.

**Live site:** https://www.cloudperfumebd.com (middleware 308-redirects apex → www)
**Repo layout:** monorepo-ish — the actual app lives in `perfume-mvp/`; the repo root only holds AI-agent config (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, etc.).

---

## 1. What this product is

A **community marketplace + content platform for perfume in Bangladesh**:

- **Marketplace (original core):** users list perfumes for sale — full bottles ("intact"), partials, and **decants** (small quantities poured from a bottle, each with per-ml `decant_options` pricing). There is **no checkout/payment** — buyers contact sellers directly via WhatsApp / Messenger / Facebook / phone. Currency is BDT ("TK").
- **Content pivot (current strategic focus):** the site is shifting toward being an **honest learning platform for BD fragrance buyers** — blog/CMS for guides & reviews, plus 252 programmatic SEO landing pages (`/fragrance/[slug]`) targeting "buy X in Bangladesh" searches. Goal: organic BD traffic.

Design language: warm cream/ivory background (`#fdfbf7`), gold accent (`#d4af37`), charcoal text (`#1a1a1a`), serif display type. Mobile-first BD audience.

## 2. Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, RSC, turbopack build), React 19, TypeScript |
| Styling | **Tailwind CSS v3** (`tailwind.config.js` + `postcss.config.js` + `@tailwind` directives in `app/globals.css`) + `@tailwindcss/typography` for blog prose |
| Data | Supabase (Postgres + Auth + Storage + RLS). No ORM — supabase-js query builder everywhere |
| Client state/fetching | TanStack React Query v5 (query keys centralized in `lib/queries/key.ts`) + Zustand (`stores/useUiStore.ts` — perfume filter UI state only) |
| Rich text | Tiptap (blog editor writes JSON; server renders via `generateHTML` in `app/blog/[slug]/page.tsx`) |
| Email | Resend (`/api/help` support form) |
| SMS OTP | BulkSMSBD gateway (`/api/send-contact-otp`) + Supabase RPCs storing OTPs in `phone_verification` |
| Toasts | sonner (`<Toaster>` mounted in `app/providers.tsx`) |
| Icons | lucide-react |

Env vars (`.env.local`, gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `SUPPORT_EMAIL`, `BULKSMSBD_API_KEY`, `BULKSMSBD_SENDER_ID`.

## 3. Supabase clients — the three-tier pattern

| File | Client | Where used | Notes |
|---|---|---|---|
| `lib/supabaseClient.ts` | `createBrowserClient` (anon key), exported singleton `supabase` | all `"use client"` components/hooks | subject to RLS |
| `lib/supabaseServer.ts` | `createServerSupabase()` — SSR client bound to Next cookies | API routes needing the logged-in user | use for `auth.getUser()` |
| `lib/supabaseAdmin.ts` | `createAdminClient()` — **service role**, `server-only` | API routes | **bypasses RLS entirely** — every use must do its own auth/ownership checks |

Public pages (`/perfumes`, `/blog`, `/fragrance/[slug]`, sitemap, `LatestArticles`) create throwaway anon `createClient(...)` instances inline — fine for ISR, RLS applies.

## 4. Route map

### Public (SSR/ISR)
- `/` — landing: `HeroCarousel` (15 rotating bg images from `public/Background/*.webp`), `TrendingSection` (client, 4 React Query tabs off `perfume_score`), `LatestArticles` (server, latest 3 published posts), CTA, `Footer`. WebSite JSON-LD with SearchAction.
- `/perfumes` — `revalidate = 30`. Server fetches **all** visible listings (no pagination!) → hydrates client `PerfumePage` (React Query `initialData` + Zustand filters: q/brand/price/type, all filtering client-side in `useMemo`).
- `/perfumes/[username]` — seller profile + their listings.
- `/perfumes/[username]/[id]` — listing detail, `revalidate = 300`. Product + BreadcrumbList JSON-LD, community review aggregate (maps love/like/okay/dislike/hate → 5..1), contact buttons, caution banner when seller has no contact info.
- `/fragrance/[slug]` — **252 programmatic SEO pages**, `revalidate = 3600`, `generateStaticParams` from `lib/fragrance-catalog.ts` (AUTO-GENERATED — regenerate via `npm run generate:catalog`, source list was `list.txt`, now embedded). Matches live listings by `perfume_name ilike` search terms, shows cheapest first (decants use `min_price`), Product/AggregateOffer JSON-LD, related blog posts by tag/category-slug ⊆ name/brand match.
- `/blog` — `revalidate = 3600`. All published posts + category/tag pill filters (filtering done in JS after fetching everything).
- `/blog/[slug]` — Tiptap JSON → HTML server-side, prose styling, cover image, tags.
- `(placeholder)` group: `/about`, `/contact-us`, `/help-center` (posts to `/api/help`), `/privacy-policy`, `/terms`, `/verify-email`, `/new-arrivals` (UnderConstruction).
- `app/sitemap.ts` — static + seller profiles + listings + 252 fragrance pages + published blog posts. `app/robots.ts` — disallows `/dashboard/`, `/login`, `/signup`, `/reset`, `/api/`.

### Auth `(auth)` group
`/login`, `/signup`, `/reset`, `/reset/update` — thin server pages wrapping `*Client.tsx` components. Supabase email/password + Google/Facebook OAuth. `lib/ensureProfile.ts` upserts a `profiles` row on sign-in (also triggered from `AuthWatcher` in `app/providers.tsx`).

### Seller dashboard `/dashboard/*` — **protected by `middleware.ts`** (matcher: `/dashboard/:path*`, `/reset/:path*`)
- `/dashboard` — stats overview; `layout.tsx` + `DashboardSidebar`.
- `/dashboard/perfumes` — user's perfume collection (`user_perfumes`), autocomplete via `lib/hooks/usePerfumeAutocomplete` + `perfume_suggestions`.
- `/dashboard/listings` — CRUD listings (`ListingForm`/`ListingGrid`), images → Supabase Storage via `lib/queries/client/storage.ts`.
- `/dashboard/reviews` — personal perfume reviews.
- `/dashboard/blog` — **seller blog authoring**: create draft → edit → submit (`action: 'submit'` → `pending_review`) → admin publishes/rejects. Editor: `components/blog/BlogEditor.tsx` (Tiptap) + `CoverImageUpload`.
- `/dashboard/profile` — profile + phone OTP verification flow.

### Admin `/superadmin/*` (`(admin)` group) — ⚠️ **NO AUTH GUARD AT ALL** (see §7)
- `/superadmin` → redirects to `/superadmin/sellers`.
- `sellers` — approve/flag/ban sellers (ban cascades `is_hidden` onto their listings).
- `listings` — hide/unhide/delete any listing.
- `blog`, `blog/new`, `blog/[id]/edit`, `blog/categories`, `blog/tags` — full blog CMS; admin-created posts publish immediately.

### API routes (`app/api/`)
| Route | Auth status | Purpose |
|---|---|---|
| `admin/sellers` GET, `admin/sellers/[id]` PATCH | ❌ **none** | list all seller PII; ban/flag/approve anyone |
| `admin/listings*` | ❌ **none** | list/hide/delete any listing |
| `admin/blog/posts*`, `admin/blog/{categories,tags}*` | ❌ GET none; POST checks only "any active user" | full blog CRUD, direct publish |
| `dashboard/blog`, `dashboard/blog/[id]` | ✅ user + ownership + status checks | seller draft workflow (uses admin client but filters by `author_id`) |
| `blog/upload` | ⚠️ optional auth | 5MB image upload to public `blog-images` bucket; creates bucket on the fly |
| `help` | ❌ anon allowed (by design) | Resend email + insert `support_messages` |
| `send-contact-otp`, `confirm-contact-otp` | ✅ session required | BD phone (`+8801XXXXXXXXX`) OTP via BulkSMSBD; uniqueness check on verified numbers |
| `account/delete` | ✅ | deletes own auth user via service role |

## 5. Database (Supabase, schema `public`, all tables RLS-enabled)

`profiles` (user + seller status: active/flagged/banned, contact channels, username) · `listings` (brand, perfume_name, sub_brand, type intact/partial/decant, price, min_price, decant_options jsonb, images[], is_hidden, user_id) · `user_perfumes` · `perfume_score` (trending: click_score, last_clicked_at, representative_images — synced by trigger `sync_perfume_score_from_listing`) · `perfume_clicks` (rpc `increment_perfume_click`) · `phone_verification` (OTPs) · `support_messages` · `reviews` (rating enum-ish text love→hate) · `perfumes` (catalog, currently unused/empty) · blog: `blog_posts` (status enum draft/pending_review/published/rejected, content jsonb, author_id) + `blog_categories`/`blog_tags` + join tables.

Only committed SQL: `supabase/blog-cms.sql` (blog schema + RLS + storage bucket). Everything else was created ad-hoc in the Supabase dashboard — **the rest of the schema has no source of truth in the repo.**

RLS highlights: blog_posts public read only when `status='published'`; authors CRUD own drafts/rejected. Categories/tags write = service role only. Marketplace tables have their own policies (not in repo).

DB functions (SECURITY DEFINER, flagged by advisors as anon-executable — see §7): `send_contact_otp`, `confirm_contact_otp`, `send_phone_otp`, `verify_phone_otp`, `increment_perfume_click`, `handle_new_user`, `sync_perfume_score_from_listing`, `get_trending_brands`, `update_blog_updated_at`.

## 6. Conventions & gotchas

- Query-key factory `lib/queries/key.ts` (`qk.*`) — always use it, never inline key arrays.
- `lib/queries/*.ts` = server-usable fetchers; `lib/queries/client/*.ts` = browser fetchers using the singleton client; React Query hooks live beside their domain (e.g. `lib/queries/blog.ts` is hooks-only, calls the API routes).
- "Effective price" pattern repeated in 3 places (`PerfumePage`, fragrance page, listing detail): decant → `min_price`, else `price`.
- `profiles!inner` joins used to drop listings whose profile is missing.
- Next 15/16 style: `params`/`searchParams` are Promises — always `await`.
- Header is a client component accepting optional `initialAuth` (server can pre-hydrate to avoid auth flash); auth state via `lib/hooks/useAuthProfile.ts` + `onAuthStateChange`.
- `docs/superpowers/{plans,specs}/` — design docs for every major feature (service layer, autocomplete, SEO SSR, superadmin, fragrance landing pages, blog CMS). Read these for intent/history.
- `scripts/generate-fragrance-catalog.mjs` regenerates `lib/fragrance-catalog.ts`; `scripts/seed-perfumes.ts` seeds catalog data.
- Build: `npm run build` (turbopack). No test suite exists. ESLint 9 flat config.

## 7. Audit 2026-07-02 — fixes applied 2026-07-03

### Critical security — ✅ ALL FIXED (2026-07-03)
1. ✅ `/api/admin/*` + `/superadmin/*` had zero auth → added `profiles.role` ('user'|'admin', check constraint), `lib/adminAuth.ts` (`requireAdmin()`/`requireUser()`) applied in every admin handler, `/superadmin` added to middleware matcher with role check. DB migration `roles_and_rpc_lockdown` (repo copy: `supabase/roles-and-rpc-lockdown.sql`). Admin role granted to owner account only.
2. ✅ `POST /api/admin/blog/posts` "any active user can publish" → admin-only.
3. ✅ `POST /api/blog/upload` unauthenticated → requires user + 30/hour rate limit.
4. ✅ OTP RPC bypass (`send_contact_otp` returned the OTP to any authenticated PostgREST caller) → new service-role-only `admin_send_contact_otp`/`admin_confirm_contact_otp(p_user_id, …)`; EXECUTE revoked from anon/authenticated on all old OTP fns + `handle_new_user` + `sync_perfume_score_from_listing`. Routes now call the admin variants via service role and use `getUser()`.
5. ✅ Rate limiting added (`lib/rateLimit.ts`, in-memory sliding window — per-instance only; swap for Redis at scale): `/api/help` 5/h/IP + length caps, OTP send 3/10min/user + 6/10min/IP, OTP confirm 10/10min, upload 30/h. `support_messages` open INSERT policy dropped (migration `tighten_support_messages_insert`); `/api/help` inserts via service role.
6. ✅ `update_blog_updated_at` search_path pinned. ⚠️ STILL OPEN: leaked-password protection is a **Supabase dashboard toggle** (Auth → Passwords) — enable manually. Remaining advisor WARNs accepted deliberately: `increment_perfume_click` anon-exec (needed for click tracking; score manipulation possible), public bucket listing on avatars/blog-images/listing-images/user-perfumes (filenames only).

### Performance — ✅ fixed 2026-07-03
- ✅ `public/Background` 21MB→1.1MB (unused PNG dupes deleted); HeroCarousel now mounts slides progressively (current+1) instead of all 15, 6s interval.
- ✅ Statics compressed via sharp: logo 777K→8K, noimageuser 1.4M→5K, og-image 400K→167K, privacy-hero 675K→300K, underConstruction 461K→132K.
- ✅ TrendingSection tabs fetch lazily (`enabled: tab === …`).
- ✅ `globals.css`: removed `transition: all` + removed universal `a:hover { translateY(-2px) }` (now opt-in `.hover-lift`).
- STILL OPEN (fine at current scale): `/perfumes` fetches all listings + contact PII, client-side filtering — paginate/server-filter when listings grow; blog/related-posts JS filtering.

### SEO — ✅ fixed 2026-07-03
- ✅ Host unified to `https://www.cloudperfumebd.com` everywhere (canonicals, JSON-LD, sitemap, robots).
- ✅ Title-template duplication fixed (homepage `title.absolute`, brand suffixes stripped from child titles).
- ✅ Blog posts: BlogPosting JSON-LD + OG `publishedTime`/`modifiedTime`/`authors` + next/image cover.
- ✅ RSS at `/feed.xml`; listing detail canonical added; robots disallows `/superadmin/`; global `not-found.tsx` + `error.tsx`.
- ✅ `/fragrances` hub page (brand-grouped index of all 252 landing pages), linked from Header nav, Footer, sitemap.
- ❗ BIGGEST LEVER STILL OPEN: `blog_posts` has 0 published rows. Publish BD-focused content (Bangla/Benglish keywords: "perfume price in bd", "best perfume for men bd"), FAQ page + FAQ schema, author pages.

### UX — ✅ fixed 2026-07-03
- ✅ Footer added to `/perfumes`, `/fragrance/[slug]`, listing detail; fake newsletter replaced with Journal CTA; footer "Discover" column (directory + blog).
- ✅ Price presets now TK500/1500/5000 bands; "Nationwide" typo; mobile drawer scroll-lock + own scrolling; `/perfumes` skeleton fallback; homepage hero copy repositioned learn→discover→trade, secondary CTA → /blog.
- STILL OPEN: footer social links point to bare facebook.com/instagram.com (need real profile URLs).

### Direction (agreed strategy)
Reposition around **learn → choose → buy**: marketplace stays, Blog + `/fragrances` directory elevated (done in nav/landing). Next: publish content, FAQ page with schema, author pages, internal links blog→fragrance pages.
