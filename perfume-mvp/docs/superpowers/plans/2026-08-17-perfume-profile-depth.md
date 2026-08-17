# Perfume Profile Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/fragrance/[slug]` from a listing-comparison page into a reference/profile page — note pyramid, community-voted perception charts, and similar-perfume recommendations — sourced from the DB instead of the static `lib/fragrance-catalog.ts` file.

**Architecture:** The existing (currently empty, unused) `perfumes` table becomes the canonical fragrance entity. It gains note/accord/gender-lean/description/verification columns plus a `search_terms text[]` column that carries over today's alias-matching data so the listings query on `/fragrance/[slug]` keeps working unchanged. `reviews` gets a nullable `perfume_id` FK; a `SECURITY DEFINER` Postgres function exposes aggregate (not raw) review counts to anonymous visitors without loosening `reviews`' existing owner-only RLS. All 254 catalog entries are seeded into `perfumes` via a one-time script. The page, sitemap, directory hub, and review form are then cut over from the static file to DB queries, an admin verification page is added, and the static file is deleted last.

**Tech Stack:** Next.js 16 App Router (Server Components, ISR `revalidate=3600`), `@supabase/supabase-js` (anon client for public reads, service-role via `createAdminClient()` for admin routes), TanStack React Query v5 (admin CRUD only — public pages fetch directly, no client hooks), Tailwind CSS. No test framework exists in this repo; verification is `npx tsc --noEmit` + `npm run build` + manual dev-server spot checks, per this repo's established convention (see `docs/superpowers/plans/2026-04-28-fragrance-landing-pages.md`).

## Global Constraints

- Gender-lean / review `gender` values are exactly: `very_masculine`, `masculine`, `unisex`, `feminine`, `very_feminine` (matches live `reviews_gender_check` constraint).
- Longevity values are exactly: `0-2h`, `2-5h`, `5-7h`, `7-10h`, `10h+` (matches live `reviews_longevity_check` constraint).
- Occasion (`when_to_wear`) values are exactly: `Winter`, `Spring`, `Summer`, `Fall`, `Day`, `Night` (matches `ReviewForm.tsx`'s `WEAR_OPTIONS`).
- Community charts render an "not enough reviews yet" empty state below 3 reviews (spec §4).
- Note-pyramid tiers render "not yet documented" when empty, never a blank gap (spec §4).
- New `perfumes` rows are seeded with `is_verified = false`; verification is a curation queue, not a publish gate (spec §3).
- Do not touch `listings.perfume_id`, `perfume_clicks.perfume_id`, or `perfume_score` — explicitly out of scope (spec §6).
- No automated tests exist in this repo — verify via `npx tsc --noEmit`, `npm run build`, and manual dev-server checks only.
- Gold accent color for all admin UI: `#d4af37` (matches every existing `/superadmin/*` page).
- Site URL constant: `https://www.cloudperfumebd.com`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/perfume-profile-depth.sql` | Create | New `perfumes` columns, `reviews.perfume_id` FK, aggregate RPC function |
| `lib/queries/perfumes.ts` | Create | Public-facing fetchers used directly by server components |
| `lib/queries/key.ts` | Modify | Add `adminPerfumes` query key |
| `scripts/perfume-profile-seed-data.ts` | Create | 254-entry note/accord/gender/description seed array |
| `scripts/seed-perfume-profiles.ts` | Create | Upserts seed data into `perfumes` |
| `components/perfume/SimilarPerfumeCard.tsx` | Create | Card for the "Similar Perfumes" section |
| `components/perfume/PerfumeComboBox.tsx` | Create | ID-carrying autocomplete against `perfumes`, for `ReviewForm` |
| `app/fragrance/[slug]/page.tsx` | Modify | DB-sourced params, note pyramid, community charts, similar perfumes |
| `app/sitemap.ts` | Modify | Fragrance URLs sourced from `perfumes` instead of the static file |
| `app/fragrances/page.tsx` | Modify | Directory hub sourced from `perfumes` instead of the static file |
| `lib/queries/reviews.ts` | Modify | Add `perfume_id` to `Review`/`ReviewInsert` |
| `app/dashboard/reviews/reviewComponents/ReviewForm.tsx` | Modify | Swap free-text brand/name for `PerfumeComboBox` |
| `app/dashboard/reviews/page.tsx` | Modify | Add `perfume_id: null` to `EMPTY_FORM` |
| `lib/queries/adminPerfumes.ts` | Create | Admin CRUD hooks (mirrors `lib/queries/blog.ts`) |
| `app/api/admin/perfumes/route.ts` | Create | `GET`/list, admin-guarded |
| `app/api/admin/perfumes/[id]/route.ts` | Create | `PATCH`/update, admin-guarded |
| `app/(admin)/superadmin/perfumes/page.tsx` | Create | Verification queue UI |
| `components/admin/AdminSidebar.tsx` | Modify | Add "Perfumes" nav entry with unverified-count badge |
| `lib/fragrance-catalog.ts`, `scripts/generate-fragrance-catalog.mjs` | Delete | Superseded by DB (final task) |
| `package.json` | Modify | Remove `generate:catalog` script (final task) |

---

## Task 1: Database migration

**Files:**
- Create: `perfume-mvp/supabase/perfume-profile-depth.sql`

Extends `perfumes` with the note pyramid, accords, gender lean, description, verification flag, and a `search_terms` column that preserves today's alias-matching behavior for the listings query. Adds `reviews.perfume_id`. Adds a `SECURITY DEFINER` aggregate function so `/fragrance/[slug]` (anonymous, no auth) can read review *counts* without loosening `reviews`' existing owner-only RLS. Confirmed via live schema query: `perfumes` already has a public-SELECT RLS policy (`perfumes_public_read`, `USING (true)`) — no RLS change needed there. `reviews` currently only allows `SELECT` where `auth.uid() = user_id` — this must stay as-is; the aggregate function is the only public read path.

- [ ] **Step 1: Write the migration SQL**

Create `perfume-mvp/supabase/perfume-profile-depth.sql`:

```sql
-- Perfume profile depth: note pyramid, accords, gender lean, verification flag,
-- and carried-over search terms on `perfumes`; nullable perfume_id FK on `reviews`;
-- a SECURITY DEFINER aggregate function so anonymous visitors can read review
-- counts without a public-read policy on `reviews` itself.

ALTER TABLE public.perfumes
  ADD COLUMN top_notes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN heart_notes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN base_notes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN accords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN search_terms text[] NOT NULL DEFAULT '{}',
  ADD COLUMN gender_lean text,
  ADD COLUMN house_description text,
  ADD COLUMN is_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.perfumes
  ADD CONSTRAINT perfumes_gender_lean_check
  CHECK (gender_lean IS NULL OR gender_lean = ANY (ARRAY[
    'very_masculine', 'masculine', 'unisex', 'feminine', 'very_feminine'
  ]));

CREATE INDEX idx_perfumes_accords ON public.perfumes USING gin (accords);

ALTER TABLE public.reviews
  ADD COLUMN perfume_id uuid REFERENCES public.perfumes(id) ON DELETE SET NULL;

CREATE INDEX idx_reviews_perfume_id ON public.reviews(perfume_id) WHERE perfume_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_perfume_review_aggregate(p_perfume_id uuid)
RETURNS TABLE (
  review_count bigint,
  longevity_counts jsonb,
  gender_counts jsonb,
  occasion_counts jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (SELECT count(*) FROM public.reviews WHERE perfume_id = p_perfume_id) AS review_count,
    (SELECT coalesce(jsonb_object_agg(longevity, cnt), '{}'::jsonb)
       FROM (
         SELECT longevity, count(*) cnt FROM public.reviews
         WHERE perfume_id = p_perfume_id AND longevity IS NOT NULL
         GROUP BY longevity
       ) s) AS longevity_counts,
    (SELECT coalesce(jsonb_object_agg(gender, cnt), '{}'::jsonb)
       FROM (
         SELECT gender, count(*) cnt FROM public.reviews
         WHERE perfume_id = p_perfume_id AND gender IS NOT NULL
         GROUP BY gender
       ) s) AS gender_counts,
    (SELECT coalesce(jsonb_object_agg(occasion, cnt), '{}'::jsonb)
       FROM (
         SELECT unnest(when_to_wear) occasion, count(*) cnt FROM public.reviews
         WHERE perfume_id = p_perfume_id
         GROUP BY occasion
       ) s) AS occasion_counts;
$$;

GRANT EXECUTE ON FUNCTION public.get_perfume_review_aggregate(uuid) TO anon, authenticated;
```

- [ ] **Step 2: Apply the migration**

Use the `mcp__supabase__apply_migration` tool with `name: "perfume_profile_depth"` and `query` set to the exact SQL content from Step 1.

- [ ] **Step 3: Verify the migration applied**

Use `mcp__supabase__execute_sql` with:

```sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'perfumes'
  and column_name in ('top_notes','heart_notes','base_notes','accords','search_terms','gender_lean','house_description','is_verified');
```

Expected: 8 rows returned. Then:

```sql
select proname from pg_proc where proname = 'get_perfume_review_aggregate';
```

Expected: 1 row.

- [ ] **Step 4: Commit**

```bash
cd E:/Projects/Perfume-Shop
git add perfume-mvp/supabase/perfume-profile-depth.sql
git commit -m "feat: migrate perfumes/reviews schema for profile depth (notes, accords, review aggregate RPC)"
```

---

## Task 2: Public data layer

**Files:**
- Create: `perfume-mvp/lib/queries/perfumes.ts`
- Modify: `perfume-mvp/lib/queries/key.ts`

**Interfaces:**
- Produces: `createPublicSupabase()`, `type PerfumeProfile`, `fetchAllPerfumeSlugs()`, `fetchPerfumeBySlug(slug)`, `fetchSimilarPerfumes(perfume, limit?)`, `fetchPerfumeReviewAggregate(perfumeId)`, `type ReviewAggregate` — consumed by Task 4 (`app/fragrance/[slug]/page.tsx`) and Task 5 (`app/sitemap.ts`, `app/fragrances/page.tsx`).

- [ ] **Step 1: Create the data layer file**

Create `perfume-mvp/lib/queries/perfumes.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

export function createPublicSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type PerfumeProfile = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  meta_title: string | null;
  meta_description: string | null;
  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];
  accords: string[];
  search_terms: string[];
  gender_lean: "very_masculine" | "masculine" | "unisex" | "feminine" | "very_feminine" | null;
  house_description: string | null;
  is_verified: boolean;
};

const PROFILE_COLUMNS =
  "id, slug, name, brand, meta_title, meta_description, top_notes, heart_notes, base_notes, accords, search_terms, gender_lean, house_description, is_verified";

export async function fetchAllPerfumeSlugs(): Promise<{ slug: string }[]> {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase.from("perfumes").select("slug");
  if (error) {
    console.error("[perfumes] fetchAllPerfumeSlugs failed:", error.message);
    return [];
  }
  return data ?? [];
}

export async function fetchPerfumeBySlug(slug: string): Promise<PerfumeProfile | null> {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from("perfumes")
    .select(PROFILE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("[perfumes] fetchPerfumeBySlug failed:", error.message);
    return null;
  }
  return data as PerfumeProfile | null;
}

export async function fetchSimilarPerfumes(
  perfume: Pick<PerfumeProfile, "id" | "brand" | "accords">,
  limit = 6
): Promise<PerfumeProfile[]> {
  if (perfume.accords.length === 0) return [];

  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from("perfumes")
    .select(PROFILE_COLUMNS)
    .overlaps("accords", perfume.accords)
    .neq("id", perfume.id)
    .limit(40);

  if (error) {
    console.error("[perfumes] fetchSimilarPerfumes failed:", error.message);
    return [];
  }

  const candidates = (data ?? []) as PerfumeProfile[];
  return candidates
    .map((c) => {
      const shared = c.accords.filter((a) => perfume.accords.includes(a)).length;
      const brandBonus = c.brand === perfume.brand ? 1 : 0;
      return { entry: c, score: shared * 2 + brandBonus };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}

export type ReviewAggregate = {
  review_count: number;
  longevity_counts: Record<string, number>;
  gender_counts: Record<string, number>;
  occasion_counts: Record<string, number>;
};

export async function fetchPerfumeReviewAggregate(perfumeId: string): Promise<ReviewAggregate> {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .rpc("get_perfume_review_aggregate", { p_perfume_id: perfumeId })
    .single();

  if (error || !data) {
    console.error("[perfumes] fetchPerfumeReviewAggregate failed:", error?.message);
    return { review_count: 0, longevity_counts: {}, gender_counts: {}, occasion_counts: {} };
  }
  return data as ReviewAggregate;
}
```

- [ ] **Step 2: Add the admin query key**

In `perfume-mvp/lib/queries/key.ts`, add one line inside the `qk` object, after the `dashboardBlogPosts` line:

```typescript
  adminPerfumes: () => ['admin', 'perfumes'] as const,
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd E:/Projects/Perfume-Shop/perfume-mvp
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd E:/Projects/Perfume-Shop
git add perfume-mvp/lib/queries/perfumes.ts perfume-mvp/lib/queries/key.ts
git commit -m "feat: add perfumes data layer (profile fetch, similarity, review aggregate)"
```

---

## Task 3: Seed the 254 catalog entries into `perfumes`

**Files:**
- Create: `perfume-mvp/scripts/perfume-profile-seed-data.ts`
- Create: `perfume-mvp/scripts/seed-perfume-profiles.ts`

Per spec §3, content is AI-seeded and admin-reviewed after the fact (`is_verified` starts `false`). The 12 entries below are written from real, verifiable fragrance knowledge and serve as the exact template — schema, accord vocabulary, tone of `house_description` — for the remaining 242 entries.

**Interfaces:**
- Consumes: `PerfumeCatalogEntry` shape from `perfume-mvp/lib/fragrance-catalog.ts` (still present until Task 8) — read it to get every `{slug, name, brand}` that needs an entry.
- Produces: `scripts/perfume-profile-seed-data.ts` exports `type PerfumeSeedEntry` and `const perfumeProfileSeedData: PerfumeSeedEntry[]`, consumed only by `scripts/seed-perfume-profiles.ts`.

- [ ] **Step 1: Create the seed data file with the template + first 12 real entries**

Create `perfume-mvp/scripts/perfume-profile-seed-data.ts`:

```typescript
export type PerfumeSeedEntry = {
  slug: string;
  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];
  accords: string[];
  search_terms: string[];
  gender_lean: "very_masculine" | "masculine" | "unisex" | "feminine" | "very_feminine";
  house_description: string;
};

export const perfumeProfileSeedData: PerfumeSeedEntry[] = [
  {
    slug: "afnan-9pm",
    top_notes: ["pear", "bergamot", "saffron"],
    heart_notes: ["vanilla orchid", "almond", "coffee"],
    base_notes: ["cedarwood", "tonka bean", "vanilla"],
    accords: ["sweet", "vanilla", "spicy", "gourmand"],
    search_terms: ["Afnan 9pm"],
    gender_lean: "masculine",
    house_description:
      "Afnan's breakout gourmand-oriental, built around a dense vanilla-almond-coffee heart. One of the most recognized budget fragrances in Bangladesh, often reached for as an evening, cool-weather scent.",
  },
  {
    slug: "lattafa-yara",
    top_notes: ["pear", "orange blossom", "mandarin"],
    heart_notes: ["jasmine", "tuberose", "orange blossom"],
    base_notes: ["vanilla", "musk", "sandalwood"],
    accords: ["floral", "sweet", "fruity", "musky"],
    search_terms: ["Lattafa Yara"],
    gender_lean: "feminine",
    house_description:
      "Lattafa's best-selling women's fruity-floral gourmand — soft, sweet, and long-lasting, positioned as an affordable alternative to designer white-floral bestsellers.",
  },
  {
    slug: "armaf-club-de-nuit-intense-man",
    top_notes: ["pineapple", "blackcurrant", "apple", "bergamot"],
    heart_notes: ["birch", "patchouli", "jasmine"],
    base_notes: ["musk", "oakmoss", "ambergris"],
    accords: ["fruity", "woody", "smoky", "fresh"],
    search_terms: ["Armaf Club de Nuit Intense Man", "CDN Intense Man"],
    gender_lean: "masculine",
    house_description:
      "Armaf's most famous release, widely known in Bangladesh as an accessible take on a blockbuster fruity-chypre structure — sharp pineapple-birch opening settling into a smoky, ambery base.",
  },
  {
    slug: "rasasi-hawas",
    top_notes: ["bergamot", "pink pepper", "cardamom"],
    heart_notes: ["geranium", "lavender", "sage"],
    base_notes: ["leather", "oud", "amberwood"],
    accords: ["woody", "spicy", "leather", "aromatic"],
    search_terms: ["Rasasi Hawas"],
    gender_lean: "masculine",
    house_description:
      "A sharp, confident Rasasi men's fragrance layering spicy aromatic top notes over a leather-oud base — a common recommendation for office-to-evening wear.",
  },
  {
    slug: "rasasi-la-yuqawam",
    top_notes: ["cardamom", "cinnamon", "saffron"],
    heart_notes: ["agarwood (oud)", "rose", "leather"],
    base_notes: ["amber", "musk", "oud"],
    accords: ["oud", "spicy", "amber", "woody"],
    search_terms: ["Rasasi La Yuqawam"],
    gender_lean: "masculine",
    house_description:
      "One of Rasasi's flagship oud-oriental releases — rich spice and rose over a deep resinous oud base, aimed squarely at the region's love of dense amber-oud fragrances.",
  },
  {
    slug: "dior-sauvage",
    top_notes: ["calabrian bergamot", "pepper"],
    heart_notes: ["sichuan pepper", "lavender", "pink pepper", "vetiver", "patchouli", "geranium", "elemi"],
    base_notes: ["ambroxan", "cedar", "labdanum"],
    accords: ["fresh", "spicy", "aromatic", "woody", "amber"],
    search_terms: ["Dior Sauvage"],
    gender_lean: "masculine",
    house_description:
      "Dior's global bestseller — a fresh, peppery bergamot opening over a signature ambroxan-cedar base. The most universally recognized designer fragrance among Bangladeshi buyers.",
  },
  {
    slug: "ysl-y-eau-de-parfum",
    top_notes: ["apple", "ginger", "bergamot"],
    heart_notes: ["sage", "geranium"],
    base_notes: ["tonka bean", "cedar", "vetiver", "incense", "amberwood"],
    accords: ["aromatic", "woody", "fresh", "sweet"],
    search_terms: ["YSL Y Eau de Parfum", "Yves Saint Laurent Y EDP"],
    gender_lean: "masculine",
    house_description:
      "YSL's modern aromatic-woody signature scent — a crisp apple-ginger opening resolving into a warm, slightly sweet tonka-vetiver base. A popular step-up gift choice.",
  },
  {
    slug: "tom-ford-oud-wood",
    top_notes: ["rosewood", "cardamom", "chinese pepper"],
    heart_notes: ["oud", "sandalwood", "palisander rosewood"],
    base_notes: ["vanilla", "tonka bean", "amber"],
    accords: ["oud", "woody", "amber", "sweet", "smoky"],
    search_terms: ["Tom Ford Oud Wood"],
    gender_lean: "unisex",
    house_description:
      "The fragrance that brought oud into mainstream Western perfumery — smooth, smoky, and sweetened by vanilla and amber rather than the sharper medicinal oud found in traditional attars.",
  },
  {
    slug: "tom-ford-black-orchid",
    top_notes: ["black truffle", "ylang-ylang", "bergamot", "black currant"],
    heart_notes: ["orchid", "spicy notes", "lotus", "fruity notes"],
    base_notes: ["patchouli", "vanilla", "incense", "amber", "sandalwood", "dark chocolate"],
    accords: ["sweet", "woody", "amber", "floral"],
    search_terms: ["Tom Ford Black Orchid"],
    gender_lean: "unisex",
    house_description:
      "A dark, opulent gourmand-floral with a distinctive truffle-and-chocolate undertone — one of Tom Ford's most polarizing but iconic releases, worn confidently by both men and women.",
  },
  {
    slug: "tom-ford-tobacco-vanille",
    top_notes: ["tobacco leaf", "spicy notes"],
    heart_notes: ["tonka bean", "vanilla", "cacao", "dried fruits"],
    base_notes: ["woody notes", "amber"],
    accords: ["sweet", "spicy", "woody", "amber"],
    search_terms: ["Tom Ford Tobacco Vanille"],
    gender_lean: "unisex",
    house_description:
      "A cold-weather gourmand built on sweet tobacco leaf and vanilla — one of the most-decanted Tom Ford Private Blend fragrances due to strong projection and longevity.",
  },
  {
    slug: "creed-aventus",
    top_notes: ["pineapple", "blackcurrant", "apple", "bergamot"],
    heart_notes: ["birch", "patchouli", "moroccan jasmine", "rose"],
    base_notes: ["musk", "oakmoss", "ambergris", "vanilla"],
    accords: ["fruity", "smoky", "woody", "fresh"],
    search_terms: ["Creed Aventus"],
    gender_lean: "masculine",
    house_description:
      "The most-referenced niche fragrance in the world of clones and inspirations (Armaf Club de Nuit among them) — smoky birch and pineapple over a musky, ambery base originally composed for Creed's 250th anniversary.",
  },
  {
    slug: "armaf-club-de-nuit-woman",
    top_notes: ["pear", "mandarin", "raspberry"],
    heart_notes: ["jasmine", "may rose", "apricot"],
    base_notes: ["patchouli", "vanilla", "musk", "amber"],
    accords: ["fruity", "floral", "sweet", "musky"],
    search_terms: ["Armaf Club de Nuit Woman"],
    gender_lean: "feminine",
    house_description:
      "The women's counterpart to Armaf's Club de Nuit line — a fruity-floral built on the same crowd-pleasing sweetness that made the men's Intense Man a bestseller.",
  },
];
```

- [ ] **Step 2: Extend the seed data to all 254 catalog entries**

Read `perfume-mvp/lib/fragrance-catalog.ts` to get the full list of `{slug, name, brand}`. For every entry **not** already covered above, append a `PerfumeSeedEntry` to the `perfumeProfileSeedData` array, following the exact shape and accord vocabulary established by the 12 examples above:

- Use real, well-known note pyramids where the fragrance is a recognizable release (most Dior/Chanel/YSL/Tom Ford/Armani/Versace/Creed/Xerjoff entries, and Lattafa/Afnan/Rasasi/Armaf/Al Haramain flagship lines).
- For lesser-known regional SKUs where the exact pyramid isn't confidently known, fill in a reasonable, brand-consistent set of notes/accords for that fragrance's evident style (e.g. a "Lattafa ... Oud ..." name gets an oud/amber/woody profile) rather than leaving any field empty. This is exactly why every row seeds with `is_verified: false` — an admin corrects these later via `/superadmin/perfumes` (Task 7).
- `accords` should be 3-5 lowercase single/double-word tags drawn from a consistent vocabulary across the whole file (reuse tags already used above — `woody`, `oud`, `sweet`, `fresh`, `spicy`, `floral`, `fruity`, `amber`, `musky`, `aromatic`, `leather`, `smoky`, `citrus`, `aquatic`, `green`, `powdery` — introduce new tags only when none of these fit).
- `search_terms` should exactly match that catalog entry's `searchTerms` array in `lib/fragrance-catalog.ts` — this is load-bearing: it is what keeps the listings query on `/fragrance/[slug]` matching the same listings it matches today.
- Work in batches of roughly 40 entries, committing after each batch:

```bash
cd E:/Projects/Perfume-Shop
git add perfume-mvp/scripts/perfume-profile-seed-data.ts
git commit -m "feat: seed profile data for perfumes N-M of 254"
```

- [ ] **Step 3: Verify every catalog slug has a matching seed entry**

Run this from `perfume-mvp/`:

```bash
cd E:/Projects/Perfume-Shop/perfume-mvp
node -e "
const { fragranceCatalog } = require('./lib/fragrance-catalog.ts');
" 2>/dev/null || npx tsx -e "
import { fragranceCatalog } from './lib/fragrance-catalog';
import { perfumeProfileSeedData } from './scripts/perfume-profile-seed-data';
const seedSlugs = new Set(perfumeProfileSeedData.map((e) => e.slug));
const missing = fragranceCatalog.filter((e) => !seedSlugs.has(e.slug));
console.log('Catalog entries:', fragranceCatalog.length);
console.log('Seed entries:', perfumeProfileSeedData.length);
console.log('Missing:', missing.length);
if (missing.length) console.log(missing.slice(0, 20).map((e) => e.slug));
"
```

Expected: `Missing: 0`. If not, add the missing entries and re-run.

- [ ] **Step 4: Write the upsert script**

Create `perfume-mvp/scripts/seed-perfume-profiles.ts`, mirroring the `.env.local` loader pattern already used in `scripts/seed-perfumes.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fragranceCatalog } from "../lib/fragrance-catalog";
import { perfumeProfileSeedData, type PerfumeSeedEntry } from "./perfume-profile-seed-data";

function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const bySlug = new Map<string, PerfumeSeedEntry>(perfumeProfileSeedData.map((e) => [e.slug, e]));

  const rows = fragranceCatalog.map((entry) => {
    const seed = bySlug.get(entry.slug);
    if (!seed) {
      console.error(`Missing seed data for catalog slug: ${entry.slug}`);
      process.exit(1);
    }
    return {
      slug: entry.slug,
      name: entry.name,
      brand: entry.brand,
      meta_title: `${entry.name} in Bangladesh`,
      meta_description: entry.metaDescription,
      top_notes: seed.top_notes,
      heart_notes: seed.heart_notes,
      base_notes: seed.base_notes,
      accords: seed.accords,
      search_terms: seed.search_terms,
      gender_lean: seed.gender_lean,
      house_description: seed.house_description,
      is_verified: false,
    };
  });

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: existing, error: fetchErr } = await supabase.from("perfumes").select("slug");
  if (fetchErr) {
    console.error("Failed to fetch existing slugs:", fetchErr.message);
    process.exit(1);
  }
  const existingSlugs = new Set((existing ?? []).map((r) => r.slug));
  const newCount = rows.filter((r) => !existingSlugs.has(r.slug)).length;

  const { error: upsertErr } = await supabase
    .from("perfumes")
    .upsert(rows, { onConflict: "slug", ignoreDuplicates: false });

  if (upsertErr) {
    console.error("Upsert failed:", upsertErr.message);
    process.exit(1);
  }

  console.log(`\n✓ Done — ${rows.length} perfumes processed`);
  console.log(`  Inserted : ${newCount}`);
  console.log(`  Updated  : ${rows.length - newCount}`);
}

main();
```

- [ ] **Step 5: Run the seed script**

```bash
cd E:/Projects/Perfume-Shop/perfume-mvp
npx tsx scripts/seed-perfume-profiles.ts
```

Expected: `✓ Done — 254 perfumes processed`, `Inserted : 254`, `Updated : 0`.

- [ ] **Step 6: Verify in the database**

Use `mcp__supabase__execute_sql`:

```sql
select count(*) as total, count(*) filter (where array_length(accords,1) > 0) as with_accords
from public.perfumes;
```

Expected: `total = 254`, `with_accords = 254`.

- [ ] **Step 7: Commit the seed script**

```bash
cd E:/Projects/Perfume-Shop
git add perfume-mvp/scripts/seed-perfume-profiles.ts
git commit -m "feat: add perfume profile seeding script, seed all 254 catalog entries"
```

---

## Task 4: Rewrite `/fragrance/[slug]` off the DB

**Files:**
- Create: `perfume-mvp/components/perfume/SimilarPerfumeCard.tsx`
- Modify: `perfume-mvp/app/fragrance/[slug]/page.tsx`

**Interfaces:**
- Consumes: `fetchAllPerfumeSlugs`, `fetchPerfumeBySlug`, `fetchSimilarPerfumes`, `fetchPerfumeReviewAggregate`, `type PerfumeProfile`, `type ReviewAggregate` from Task 2's `lib/queries/perfumes.ts`.

- [ ] **Step 1: Create the similar-perfume card component**

Create `perfume-mvp/components/perfume/SimilarPerfumeCard.tsx`:

```tsx
import Link from "next/link";

type Props = {
  slug: string;
  name: string;
  brand: string;
  accords: string[];
};

export default function SimilarPerfumeCard({ slug, name, brand, accords }: Props) {
  return (
    <Link
      href={`/fragrance/${slug}`}
      className="group flex flex-col rounded-2xl border border-black/5 bg-white p-4 shadow-sm hover:shadow-md hover:border-[#d4af37]/30 transition-all"
    >
      <span className="text-xs font-semibold uppercase tracking-widest text-[#d4af37] mb-1">
        {brand}
      </span>
      <h3 className="font-serif font-semibold text-[#1a1a1a] text-base leading-snug mb-2">
        {name}
      </h3>
      {accords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {accords.slice(0, 3).map((a) => (
            <span
              key={a}
              className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 capitalize"
            >
              {a}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Rewrite the fragrance page**

Replace the full contents of `perfume-mvp/app/fragrance/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogPostCard from '@/components/blog/BlogPostCard';
import SimilarPerfumeCard from '@/components/perfume/SimilarPerfumeCard';
import {
  createPublicSupabase,
  fetchAllPerfumeSlugs,
  fetchPerfumeBySlug,
  fetchSimilarPerfumes,
  fetchPerfumeReviewAggregate,
  type PerfumeProfile,
  type ReviewAggregate,
} from '@/lib/queries/perfumes';

export const revalidate = 3600;

const SITE_URL = 'https://www.cloudperfumebd.com';
const MIN_REVIEWS_FOR_CHART = 3;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await fetchAllPerfumeSlugs();
  return slugs.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const perfume = await fetchPerfumeBySlug(slug);
  if (!perfume) return { title: 'Not Found' };

  const title = perfume.name.startsWith(perfume.brand)
    ? `${perfume.name} in Bangladesh`
    : `${perfume.brand} ${perfume.name} in Bangladesh`;
  const description =
    perfume.meta_description ??
    `${perfume.name} in Bangladesh — compare decant prices from verified sellers.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/fragrance/${perfume.slug}` },
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

type FragranceListing = {
  id: string;
  perfume_name: string | null;
  price: number | null;
  min_price: number | null;
  type: string | null;
  profiles: { display_name: string | null; username: string } | null;
};

function effectivePrice(listing: FragranceListing): number {
  if ((listing.type ?? '').toLowerCase() === 'decant' && listing.min_price != null) {
    return Number(listing.min_price);
  }
  return Number(listing.price ?? NaN);
}

type RelatedPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  cover_image_url: string | null
  published_at: string | null
  blog_post_categories: { blog_categories: { name: string; slug: string } | null }[]
  blog_post_tags: { blog_tags: { name: string; slug: string } | null }[]
}

async function fetchRelatedPosts(perfume: PerfumeProfile): Promise<RelatedPost[]> {
  const supabase = createPublicSupabase();
  const terms = [perfume.name.toLowerCase(), perfume.brand.toLowerCase()];

  const { data: posts } = await supabase
    .from('blog_posts')
    .select(`
      id, slug, title, excerpt, cover_image_url, published_at,
      blog_post_categories(blog_categories(name, slug)),
      blog_post_tags(blog_tags(name, slug))
    `)
    .eq('status', 'published')
    .limit(20);

  if (!posts) return [];

  return (posts as unknown as RelatedPost[]).filter((p) => {
    const catSlugs = p.blog_post_categories?.map((c) => c.blog_categories?.slug ?? '').filter(Boolean) ?? [];
    const tagSlugs = p.blog_post_tags?.map((t) => t.blog_tags?.slug ?? '').filter(Boolean) ?? [];
    const all = [...catSlugs, ...tagSlugs];
    return terms.some((term) => all.some((s) => s.includes(term) || term.includes(s)));
  }).slice(0, 2);
}

async function fetchListings(perfume: PerfumeProfile): Promise<FragranceListing[]> {
  const supabase = createPublicSupabase();
  const terms = perfume.search_terms.length > 0 ? perfume.search_terms : [perfume.name];
  const filter = terms.map((t) => `perfume_name.ilike.%${t}%`).join(',');
  const { data, error } = await supabase
    .from('listings')
    .select('id, perfume_name, price, min_price, type, profiles!inner(display_name, username)')
    .or(filter)
    .eq('is_hidden', false)
    .order('price', { ascending: true })
    .limit(20);

  if (error) {
    console.error('[FragrancePage] fetchListings failed:', error.message);
    return [];
  }
  return ((data ?? []) as unknown as FragranceListing[]).sort(
    (a, b) => effectivePrice(a) - effectivePrice(b)
  );
}

const LONGEVITY_ORDER = ['0-2h', '2-5h', '5-7h', '7-10h', '10h+'] as const;
const GENDER_ORDER = ['very_masculine', 'masculine', 'unisex', 'feminine', 'very_feminine'] as const;
const GENDER_LABELS: Record<string, string> = {
  very_masculine: 'Very Masc.',
  masculine: 'Masculine',
  unisex: 'Unisex',
  feminine: 'Feminine',
  very_feminine: 'Very Fem.',
};
const OCCASION_ORDER = ['Winter', 'Spring', 'Summer', 'Fall', 'Day', 'Night'] as const;

function DistributionBar({
  counts,
  order,
  labels,
  total,
}: {
  counts: Record<string, number>;
  order: readonly string[];
  labels?: Record<string, string>;
  total: number;
}) {
  return (
    <div className="space-y-2">
      {order.map((key) => {
        const count = counts[key] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={key} className="flex items-center gap-3 text-xs">
            <span className="w-16 shrink-0 text-gray-500">{labels?.[key] ?? key}</span>
            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-[#d4af37]" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right text-gray-400">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function NoteTier({ label, notes }: { label: string; notes: string[] }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-gray-400 mb-1.5">{label}</p>
      {notes.length > 0 ? (
        <p className="text-sm text-[#1a1a1a] capitalize">{notes.join(', ')}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">Not yet documented</p>
      )}
    </div>
  );
}

export default async function FragrancePage({ params }: Props) {
  const { slug } = await params;
  const perfume = await fetchPerfumeBySlug(slug);
  if (!perfume) notFound();

  const [listings, relatedPosts, similarPerfumes, aggregate] = await Promise.all([
    fetchListings(perfume),
    fetchRelatedPosts(perfume),
    fetchSimilarPerfumes(perfume),
    fetchPerfumeReviewAggregate(perfume.id),
  ]);

  const hasEnoughReviews = aggregate.review_count >= MIN_REVIEWS_FOR_CHART;

  const prices = listings.map(effectivePrice).filter(Number.isFinite);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : null;
  const highPrice = prices.length > 0 ? Math.max(...prices) : null;

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: perfume.name,
    brand: { '@type': 'Brand', name: perfume.brand },
    description: perfume.meta_description ?? undefined,
    ...(listings.length > 0 && {
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'BDT',
        offerCount: listings.length,
        ...(lowPrice !== null && { lowPrice: lowPrice.toFixed(2) }),
        ...(highPrice !== null && { highPrice: highPrice.toFixed(2) }),
      },
    }),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <Header />
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-24">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold mb-1">
            {perfume.brand}
          </p>
          <h1 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-2">
            {perfume.name} Decants in Bangladesh
          </h1>
          <p className="text-gray-500 text-sm">
            Find the cheapest {perfume.name} decants from verified sellers across Bangladesh.
          </p>
          {perfume.house_description && (
            <p className="text-gray-600 text-sm mt-3 max-w-2xl">{perfume.house_description}</p>
          )}
        </div>

        <section className="mb-12 rounded-2xl border border-black/5 bg-white p-6">
          <h2 className="text-lg font-serif font-semibold text-[#1a1a1a] mb-4">Note Pyramid</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <NoteTier label="Top Notes" notes={perfume.top_notes} />
            <NoteTier label="Heart Notes" notes={perfume.heart_notes} />
            <NoteTier label="Base Notes" notes={perfume.base_notes} />
          </div>
        </section>

        <section className="mb-12 rounded-2xl border border-black/5 bg-white p-6">
          <h2 className="text-lg font-serif font-semibold text-[#1a1a1a] mb-4">Community Read</h2>
          {hasEnoughReviews ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Longevity</p>
                <DistributionBar
                  counts={aggregate.longevity_counts}
                  order={LONGEVITY_ORDER}
                  total={aggregate.review_count}
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Gender Lean</p>
                <DistributionBar
                  counts={aggregate.gender_counts}
                  order={GENDER_ORDER}
                  labels={GENDER_LABELS}
                  total={aggregate.review_count}
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Best Worn</p>
                <DistributionBar
                  counts={aggregate.occasion_counts}
                  order={OCCASION_ORDER}
                  total={aggregate.review_count}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Not enough reviews yet.</p>
          )}
        </section>

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <p className="text-gray-500 font-light">
              No listings yet — check back soon as more sellers join.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => {
              const price = effectivePrice(listing);
              const seller = listing.profiles;
              if (!seller?.username) return null;
              return (
                <li key={listing.id}>
                  <Link
                    href={`/perfumes/${seller.username}/${listing.id}`}
                    className="block rounded-2xl border border-black/5 bg-white p-4 shadow-sm hover:shadow-md hover:border-[#d4af37]/30 transition-all"
                  >
                    <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
                      {listing.type ?? 'listing'}
                    </p>
                    <p className="font-serif font-semibold text-[#1a1a1a] mb-2">
                      {listing.perfume_name}
                    </p>
                    <p className="text-xl font-bold text-[#d4af37]">
                      {Number.isFinite(price) ? `TK${price.toFixed(0)}` : 'Price on Contact'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      by {seller.display_name ?? seller.username}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {similarPerfumes.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-serif font-semibold text-[#1a1a1a] mb-6">Similar Perfumes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {similarPerfumes.map((p) => (
                <SimilarPerfumeCard key={p.id} slug={p.slug} name={p.name} brand={p.brand} accords={p.accords} />
              ))}
            </div>
          </div>
        )}

        {relatedPosts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-serif font-semibold text-[#1a1a1a] mb-6">Related Reading</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedPosts.map((post) => {
                const cat = post.blog_post_categories?.[0]?.blog_categories?.name ?? null;
                return (
                  <BlogPostCard
                    key={post.id}
                    slug={post.slug}
                    title={post.title}
                    excerpt={post.excerpt}
                    cover_image_url={post.cover_image_url}
                    published_at={post.published_at}
                    category={cat}
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
```

Note: `notFound()` throws, so `ReviewAggregate` is imported only for the type annotations inferred via `fetchPerfumeReviewAggregate`'s return type — no unused-import issue since it's referenced nowhere directly; if `tsc`/`eslint` flags it as unused, remove the explicit `ReviewAggregate` import (it's not directly referenced in this file).

- [ ] **Step 3: Remove the unused type import if flagged**

Run:

```bash
cd E:/Projects/Perfume-Shop/perfume-mvp
npx tsc --noEmit
```

If it reports `'ReviewAggregate' is declared but never used`, remove `ReviewAggregate,` from the import list in Step 2's file. Re-run `npx tsc --noEmit` until it passes with no errors.

- [ ] **Step 4: Manual smoke test**

```bash
cd E:/Projects/Perfume-Shop/perfume-mvp
npm run dev
```

Visit `http://localhost:3000/fragrance/dior-sauvage`:
- Note Pyramid section shows real top/heart/base notes.
- Community Read section shows "Not enough reviews yet." (0 reviews exist).
- Similar Perfumes section shows 4-6 cards with shared accords (e.g. other `fresh`/`woody`/`amber` fragrances).
- Listings/empty-state and Related Reading behave exactly as before.

Visit `http://localhost:3000/fragrance/made-up-slug`: expect Next.js 404.

- [ ] **Step 5: Commit**

```bash
cd E:/Projects/Perfume-Shop
git add perfume-mvp/app/fragrance/[slug]/page.tsx perfume-mvp/components/perfume/SimilarPerfumeCard.tsx
git commit -m "feat: rewrite /fragrance/[slug] with DB-sourced note pyramid, community charts, similar perfumes"
```

---

## Task 5: Cut the sitemap and directory hub over to the DB

**Files:**
- Modify: `perfume-mvp/app/sitemap.ts`
- Modify: `perfume-mvp/app/fragrances/page.tsx`

**Interfaces:**
- Consumes: `createPublicSupabase` from `lib/queries/perfumes.ts` (sitemap); a direct `perfumes` query (directory hub).

- [ ] **Step 1: Update the sitemap**

In `perfume-mvp/app/sitemap.ts`, replace the import and the `fragrancePages` construction:

```typescript
import { MetadataRoute } from "next";
import { createPublicSupabase } from "@/lib/queries/perfumes";
```

Replace the old `import { createClient } from "@supabase/supabase-js";` and `import { fragranceCatalog } from "@/lib/fragrance-catalog";` lines with the two lines above.

Replace:

```typescript
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
```

with:

```typescript
  const supabase = createPublicSupabase();
```

Add a `perfumes` query into the existing `Promise.all`:

```typescript
  const [{ data: profiles }, { data: listings }, { data: blogPosts }, { data: perfumes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, updated_at")
      .not("username", "is", null),
    supabase
      .from("listings")
      .select("id, updated_at, profiles!inner(username)")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false }),
    supabase
      .from("perfumes")
      .select("slug, updated_at"),
  ]);
```

Replace the `fragrancePages` block:

```typescript
  const fragrancePages: MetadataRoute.Sitemap = (perfumes ?? []).map((p) => ({
    url: `${SITE_URL}/fragrance/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
```

- [ ] **Step 2: Update the directory hub**

Replace the full contents of `perfume-mvp/app/fragrances/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { createPublicSupabase } from '@/lib/queries/perfumes'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Fragrance Directory — Prices & Decants in Bangladesh',
  description:
    'Browse every fragrance tracked on Cloud PerfumeBD. Compare decant and bottle prices from sellers across Bangladesh, brand by brand.',
  alternates: { canonical: 'https://www.cloudperfumebd.com/fragrances' },
}

type DirectoryEntry = { slug: string; name: string; brand: string }

async function fetchDirectoryEntries(): Promise<DirectoryEntry[]> {
  const supabase = createPublicSupabase()
  const { data, error } = await supabase
    .from('perfumes')
    .select('slug, name, brand')
    .order('brand', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('[FragranceDirectory] fetch failed:', error.message)
    return []
  }
  return data ?? []
}

export default async function FragranceDirectoryPage() {
  const entries = await fetchDirectoryEntries()

  const byBrand = new Map<string, DirectoryEntry[]>()
  for (const entry of entries) {
    const list = byBrand.get(entry.brand) ?? []
    list.push(entry)
    byBrand.set(entry.brand, list)
  }
  const brands = [...byBrand.keys()].sort((a, b) => a.localeCompare(b))

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#fdfbf7] pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <p className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold mb-2">
              Directory
            </p>
            <h1 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-3">
              Fragrance Directory
            </h1>
            <p className="text-gray-500 max-w-2xl">
              {entries.length} fragrances tracked across {brands.length} brands.
              Each page shows live listings and the cheapest decants available in Bangladesh.
            </p>
          </div>

          <div className="space-y-10">
            {brands.map((brand) => (
              <section key={brand}>
                <h2 className="text-xl font-serif font-semibold text-[#1a1a1a] mb-4 border-b border-black/5 pb-2">
                  {brand}
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                  {byBrand.get(brand)!.map((entry) => (
                    <li key={entry.slug}>
                      <Link
                        href={`/fragrance/${entry.slug}`}
                        className="text-sm text-gray-600 hover:text-[#d4af37] transition-colors"
                      >
                        {entry.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd E:/Projects/Perfume-Shop/perfume-mvp
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

```bash
cd E:/Projects/Perfume-Shop/perfume-mvp
npm run dev
```

Visit `http://localhost:3000/fragrances`: expect 254 fragrances grouped by brand, matching the old page's look.
Visit `http://localhost:3000/sitemap.xml`: expect 254 `/fragrance/...` entries.

- [ ] **Step 5: Commit**

```bash
cd E:/Projects/Perfume-Shop
git add perfume-mvp/app/sitemap.ts perfume-mvp/app/fragrances/page.tsx
git commit -m "feat: source sitemap and fragrance directory from perfumes table"
```

---

## Task 6: Wire `perfume_id` into reviews

**Files:**
- Modify: `perfume-mvp/lib/queries/reviews.ts`
- Create: `perfume-mvp/components/perfume/PerfumeComboBox.tsx`
- Modify: `perfume-mvp/app/dashboard/reviews/reviewComponents/ReviewForm.tsx`
- Modify: `perfume-mvp/app/dashboard/reviews/page.tsx`

`usePerfumeAutocomplete` (`lib/hooks/usePerfumeAutocomplete.ts`) sources free-text strings from the `perfume_score` table, not IDs from `perfumes` — it cannot be reused here. `PerfumeComboBox` is a small new component built on the existing `ComboBox` primitive, querying `perfumes` directly and resolving the selected suggestion string back to a `{id, name, brand}` via a local lookup map.

**Interfaces:**
- Consumes: `createPublicSupabase` from `lib/queries/perfumes.ts`; `ComboBox` from `components/ComboBox.tsx`.
- Produces: `PerfumeComboBox` with props `{ value: string; onChange: (v: string) => void; onSelect: (match: { id: string; name: string; brand: string } | null) => void; label: string; placeholder?: string; required?: boolean }`.

- [ ] **Step 1: Add `perfume_id` to the reviews types**

In `perfume-mvp/lib/queries/reviews.ts`, add `perfume_id` to the `Review` type, right after `user_id`:

```typescript
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
  rating: "love" | "like" | "okay" | "dislike" | "hate" | null;
  when_to_wear: string[];
  gender: "very_masculine" | "masculine" | "unisex" | "feminine" | "very_feminine" | null;
  longevity: "0-2h" | "2-5h" | "5-7h" | "7-10h" | "10h+" | null;
  created_at: string;
  updated_at: string;
};
```

The rest of the file (`ReviewInsert`, `fetchMyReviews`, `insertReview`, `updateReview`, `deleteReview`) is unchanged — `ReviewInsert` already derives from `Review` via `Omit`, so it automatically picks up `perfume_id`.

- [ ] **Step 2: Create `PerfumeComboBox`**

Create `perfume-mvp/components/perfume/PerfumeComboBox.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import ComboBox from "@/components/ComboBox";
import { createPublicSupabase } from "@/lib/queries/perfumes";

type PerfumeMatch = { id: string; name: string; brand: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (match: PerfumeMatch | null) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
};

function formatSuggestion(p: PerfumeMatch): string {
  return p.name.startsWith(p.brand) ? p.name : `${p.brand} ${p.name}`;
}

export default function PerfumeComboBox({ value, onChange, onSelect, label, placeholder, required }: Props) {
  const [matches, setMatches] = useState<PerfumeMatch[]>([]);

  useEffect(() => {
    if (value.trim().length < 2) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const supabase = createPublicSupabase();
      const { data } = await supabase
        .from("perfumes")
        .select("id, name, brand")
        .or(`name.ilike.%${value}%,brand.ilike.%${value}%`)
        .limit(8);
      if (!cancelled) setMatches((data ?? []) as PerfumeMatch[]);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  const suggestions = matches.map(formatSuggestion);

  return (
    <ComboBox
      value={value}
      onChange={(v) => {
        onChange(v);
        onSelect(null);
      }}
      onSelect={(v) => {
        const match = matches.find((m) => formatSuggestion(m) === v) ?? null;
        onSelect(match);
      }}
      suggestions={suggestions}
      label={label}
      placeholder={placeholder}
      required={required}
    />
  );
}
```

- [ ] **Step 3: Use `PerfumeComboBox` in `ReviewForm`**

In `perfume-mvp/app/dashboard/reviews/reviewComponents/ReviewForm.tsx`, replace the import of `ComboBox` and `usePerfumeAutocomplete`:

```typescript
import PerfumeComboBox from "@/components/perfume/PerfumeComboBox";
```

Find the existing brand/name `ComboBox` usage (driven by `usePerfumeAutocomplete`) inside the form's JSX and replace it with a single `PerfumeComboBox` that fills both `brand` and `perfume_name` on selection, and clears `perfume_id` on manual free-text edits:

```tsx
<PerfumeComboBox
  value={form.perfume_name}
  onChange={(v) => setForm((f) => ({ ...f, perfume_name: v, perfume_id: null }))}
  onSelect={(match) =>
    setForm((f) => ({
      ...f,
      perfume_id: match?.id ?? null,
      perfume_name: match?.name ?? f.perfume_name,
      brand: match?.brand ?? f.brand,
    }))
  }
  label="Perfume"
  placeholder="Start typing a perfume or brand…"
  required
/>
```

This replaces both the old separate brand `ComboBox` and name `ComboBox` fields — one field now drives both, with a fallback to manual free text (`perfume_id` stays `null`) when nothing matches, per spec §5. Remove the now-unused `usePerfumeAutocomplete` import and any `brandSuggestions`/`nameSuggestions` calls tied to it.

- [ ] **Step 4: Add `perfume_id` to `EMPTY_FORM`**

In `perfume-mvp/app/dashboard/reviews/page.tsx`, add one line to `EMPTY_FORM`:

```typescript
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
};
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd E:/Projects/Perfume-Shop/perfume-mvp
npx tsc --noEmit
```

Expected: no errors. If `ReviewForm.tsx` still imports `usePerfumeAutocomplete` or the old `ComboBox` without using them, remove those unused imports.

- [ ] **Step 6: Manual smoke test**

```bash
cd E:/Projects/Perfume-Shop/perfume-mvp
npm run dev
```

Sign in, go to `/dashboard/reviews`, click "Write a Review":
- Type "Dior Sauvage" in the Perfume field — a matching suggestion should appear after ~250ms.
- Selecting it should silently set `perfume_id`; the review still submits identically to before.
- Typing a perfume that doesn't exist in `perfumes` should still let the review submit (free-text fallback, `perfume_id` stays null).

- [ ] **Step 7: Commit**

```bash
cd E:/Projects/Perfume-Shop
git add perfume-mvp/lib/queries/reviews.ts perfume-mvp/components/perfume/PerfumeComboBox.tsx perfume-mvp/app/dashboard/reviews/reviewComponents/ReviewForm.tsx perfume-mvp/app/dashboard/reviews/page.tsx
git commit -m "feat: link reviews to perfumes via ID-carrying autocomplete"
```

---

## Task 7: Admin verification page

**Files:**
- Create: `perfume-mvp/lib/queries/adminPerfumes.ts`
- Create: `perfume-mvp/app/api/admin/perfumes/route.ts`
- Create: `perfume-mvp/app/api/admin/perfumes/[id]/route.ts`
- Create: `perfume-mvp/app/(admin)/superadmin/perfumes/page.tsx`
- Modify: `perfume-mvp/components/admin/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `requireAdmin` from `lib/adminAuth.ts`; `createAdminClient` from `lib/supabaseAdmin.ts`; `qk.adminPerfumes` from Task 2.
- Produces: `useAdminPerfumes()`, `useAdminUpdatePerfume()`, `type AdminPerfume`.

- [ ] **Step 1: Create the admin API list route**

Create `perfume-mvp/app/api/admin/perfumes/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('perfumes')
    .select('id, slug, name, brand, top_notes, heart_notes, base_notes, accords, gender_lean, house_description, is_verified')
    .order('is_verified', { ascending: true })
    .order('brand', { ascending: true })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
```

- [ ] **Step 2: Create the admin API update route**

Create `perfume-mvp/app/api/admin/perfumes/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { response } = await requireAdmin()
  if (response) return response

  const { id } = await params
  const body = await req.json()
  const { top_notes, heart_notes, base_notes, accords, gender_lean, house_description, is_verified } = body

  const supabase = createAdminClient()
  const updates: Record<string, unknown> = {}
  if (top_notes !== undefined) updates.top_notes = top_notes
  if (heart_notes !== undefined) updates.heart_notes = heart_notes
  if (base_notes !== undefined) updates.base_notes = base_notes
  if (accords !== undefined) updates.accords = accords
  if (gender_lean !== undefined) updates.gender_lean = gender_lean
  if (house_description !== undefined) updates.house_description = house_description
  if (is_verified !== undefined) updates.is_verified = is_verified

  const { data, error } = await supabase
    .from('perfumes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 3: Create the admin query hooks**

Create `perfume-mvp/lib/queries/adminPerfumes.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { qk } from './key'

export type AdminPerfume = {
  id: string
  slug: string
  name: string
  brand: string
  top_notes: string[]
  heart_notes: string[]
  base_notes: string[]
  accords: string[]
  gender_lean: string | null
  house_description: string | null
  is_verified: boolean
}

export type AdminPerfumeUpdate = Partial<
  Pick<AdminPerfume, 'top_notes' | 'heart_notes' | 'base_notes' | 'accords' | 'gender_lean' | 'house_description' | 'is_verified'>
>

async function fetchAdminPerfumes(): Promise<AdminPerfume[]> {
  const res = await fetch('/api/admin/perfumes')
  if (!res.ok) throw new Error('Failed to fetch perfumes')
  return res.json()
}

export function useAdminPerfumes() {
  return useQuery({ queryKey: qk.adminPerfumes(), queryFn: fetchAdminPerfumes })
}

export function useAdminUpdatePerfume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: AdminPerfumeUpdate & { id: string }) =>
      fetch(`/api/admin/perfumes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
        return r.json() as Promise<AdminPerfume>
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminPerfumes() }),
    onError: (e: Error) => toast.error(e.message),
  })
}
```

- [ ] **Step 4: Create the verification page**

Create `perfume-mvp/app/(admin)/superadmin/perfumes/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { useAdminPerfumes, useAdminUpdatePerfume, type AdminPerfume } from '@/lib/queries/adminPerfumes'

function arrayToText(arr: string[]): string {
  return arr.join(', ')
}

function textToArray(text: string): string[] {
  return text.split(',').map((s) => s.trim()).filter(Boolean)
}

function PerfumeRow({ perfume }: { perfume: AdminPerfume }) {
  const update = useAdminUpdatePerfume()
  const [topNotes, setTopNotes] = useState(arrayToText(perfume.top_notes))
  const [heartNotes, setHeartNotes] = useState(arrayToText(perfume.heart_notes))
  const [baseNotes, setBaseNotes] = useState(arrayToText(perfume.base_notes))
  const [accords, setAccords] = useState(arrayToText(perfume.accords))
  const [description, setDescription] = useState(perfume.house_description ?? '')

  function save(extra: Partial<{ is_verified: boolean }> = {}) {
    update.mutate({
      id: perfume.id,
      top_notes: textToArray(topNotes),
      heart_notes: textToArray(heartNotes),
      base_notes: textToArray(baseNotes),
      accords: textToArray(accords),
      house_description: description,
      ...extra,
    })
  }

  return (
    <div className="border-b border-gray-100 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">{perfume.brand}</p>
          <p className="text-sm font-medium text-gray-900">{perfume.name}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            perfume.is_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {perfume.is_verified ? 'Verified' : 'Unverified'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <label className="text-xs text-gray-500">
          Top notes
          <input
            value={topNotes}
            onChange={(e) => setTopNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Heart notes
          <input
            value={heartNotes}
            onChange={(e) => setHeartNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Base notes
          <input
            value={baseNotes}
            onChange={(e) => setBaseNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Accords
          <input
            value={accords}
            onChange={(e) => setAccords(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
          />
        </label>
      </div>
      <label className="text-xs text-gray-500 block mb-3">
        House description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
        />
      </label>

      <div className="flex gap-2">
        <button
          onClick={() => save()}
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
        >
          Save
        </button>
        {!perfume.is_verified && (
          <button
            onClick={() => save({ is_verified: true })}
            className="px-3 py-1.5 text-xs font-medium bg-[#d4af37] hover:bg-[#c4a030] text-[#1a1a1a] rounded-lg"
          >
            Save & Verify
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminPerfumesPage() {
  const { data: perfumes = [], isLoading } = useAdminPerfumes()
  const [search, setSearch] = useState('')

  const filtered = perfumes.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Perfumes</h1>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or brand…"
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
        />
      </div>

      {isLoading && <div className="text-center py-20 text-gray-400">Loading…</div>}

      {!isLoading && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filtered.map((perfume) => (
            <PerfumeRow key={perfume.id} perfume={perfume} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Add the sidebar nav entry**

In `perfume-mvp/components/admin/AdminSidebar.tsx`:

```typescript
import { Users, List, FileText, Droplet } from 'lucide-react'
import { useAdminSellers } from '@/lib/queries/admin'
import { useAdminBlogPosts } from '@/lib/queries/blog'
import { useAdminPerfumes } from '@/lib/queries/adminPerfumes'

const NAV = [
  { href: '/superadmin/sellers',  label: 'Sellers',  icon: Users },
  { href: '/superadmin/listings', label: 'Listings', icon: List },
  { href: '/superadmin/blog',     label: 'Blog',     icon: FileText },
  { href: '/superadmin/perfumes', label: 'Perfumes', icon: Droplet },
]
```

Inside `AdminSidebar`, add the data hook and badge count next to the existing `sellers`/`blogPosts` ones:

```typescript
  const { data: sellers = [] } = useAdminSellers()
  const { data: blogPosts = [] } = useAdminBlogPosts()
  const { data: perfumes = [] } = useAdminPerfumes()

  const pendingCount = sellers.filter((s) => s.status === 'pending').length
  const blogPendingCount = blogPosts.filter((p) => p.status === 'pending_review').length
  const unverifiedPerfumeCount = perfumes.filter((p) => !p.is_verified).length
```

And add the matching badge block alongside the existing two, inside the `NAV.map`:

```tsx
              {href === '/superadmin/perfumes' && unverifiedPerfumeCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {unverifiedPerfumeCount}
                </span>
              )}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd E:/Projects/Perfume-Shop/perfume-mvp
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Manual smoke test**

```bash
cd E:/Projects/Perfume-Shop/perfume-mvp
npm run dev
```

Sign in as an admin, visit `/superadmin/perfumes`:
- Sidebar shows a "Perfumes" link with a badge count of 254 (all unverified after seeding).
- List renders, search filters by name/brand.
- Editing a row's fields and clicking "Save & Verify" updates it and the badge count decrements by 1 after refetch.

- [ ] **Step 8: Commit**

```bash
cd E:/Projects/Perfume-Shop
git add perfume-mvp/lib/queries/adminPerfumes.ts perfume-mvp/app/api/admin/perfumes perfume-mvp/app/(admin)/superadmin/perfumes perfume-mvp/components/admin/AdminSidebar.tsx
git commit -m "feat: add /superadmin/perfumes verification queue"
```

---

## Task 8: Delete the static catalog

**Files:**
- Delete: `perfume-mvp/lib/fragrance-catalog.ts`
- Delete: `perfume-mvp/scripts/generate-fragrance-catalog.mjs`
- Modify: `perfume-mvp/package.json`

Only run this task after Tasks 4-7 are deployed and confirmed working — `scripts/seed-perfume-profiles.ts` (Task 3) still imports `lib/fragrance-catalog.ts`, so if the seed script needs to be re-run for any reason, do it before this task.

- [ ] **Step 1: Confirm nothing still imports the static catalog**

```bash
cd E:/Projects/Perfume-Shop/perfume-mvp
grep -rl "fragrance-catalog" app lib components scripts
```

Expected: only `scripts/seed-perfume-profiles.ts` (its one-time job is done) — no `app/`, `lib/`, or `components/` files. If any other file still references it, stop and fix that file first (it was missed in an earlier task).

- [ ] **Step 2: Delete the catalog file and generator script**

```bash
cd E:/Projects/Perfume-Shop
rm perfume-mvp/lib/fragrance-catalog.ts
rm perfume-mvp/scripts/generate-fragrance-catalog.mjs
```

- [ ] **Step 3: Remove the `generate:catalog` npm script**

In `perfume-mvp/package.json`, remove this line from `"scripts"`:

```json
    "generate:catalog": "node scripts/generate-fragrance-catalog.mjs"
```

(Remove the trailing comma from the preceding `"lint"` line if it becomes the last entry in the object.)

- [ ] **Step 4: Update `scripts/seed-perfume-profiles.ts` to stand alone**

Since `lib/fragrance-catalog.ts` is now deleted, `scripts/seed-perfume-profiles.ts` (Task 3) can no longer import it. Replace its `fragranceCatalog` import and usage: since all 254 rows already exist in `perfumes` from Task 3's run, this script's ongoing purpose is done — delete it too:

```bash
cd E:/Projects/Perfume-Shop
rm perfume-mvp/scripts/seed-perfume-profiles.ts
```

Keep `perfume-mvp/scripts/perfume-profile-seed-data.ts` and `perfume-mvp/scripts/seed-perfumes.ts` (the latter was already unused/dormant before this plan — out of scope to touch).

- [ ] **Step 5: Verify the build**

```bash
cd E:/Projects/Perfume-Shop/perfume-mvp
npx tsc --noEmit
npm run build
```

Expected: both succeed with no errors, and the build log shows 254 static `/fragrance/[slug]` pages generated.

- [ ] **Step 6: Commit**

```bash
cd E:/Projects/Perfume-Shop
git add -u perfume-mvp/lib/fragrance-catalog.ts perfume-mvp/scripts/generate-fragrance-catalog.mjs perfume-mvp/scripts/seed-perfume-profiles.ts perfume-mvp/package.json
git commit -m "chore: remove static fragrance catalog — perfumes table is now the source of truth"
```

---

## Self-Review

**Spec coverage:**
- §1 Current state — addressed by Task 1 (schema) and Task 3 (seeding), no dedicated task needed (it's a description, not a requirement).
- §2 Data model — Task 1 (columns, FK) covers everything except the RLS note, which live inspection (during planning) showed was already correct on `perfumes`; the equivalent concern on `reviews` is handled by the `SECURITY DEFINER` aggregate function instead of a public policy, a stronger version of the spec's intent.
- §3 Content seeding + `/superadmin/perfumes` — Task 3 (seeding) + Task 7 (verification page).
- §4 `/fragrance/[slug]` changes — Task 4 (note pyramid, community charts w/ 3-review threshold, similar perfumes, DB-sourced params).
- §5 Reviews changes — Task 6 (`PerfumeComboBox`, `perfume_id`, free-text fallback).
- §6 Out of scope — respected throughout; no task touches `listings.perfume_id`, `perfume_clicks.perfume_id`, or `perfume_score`.
- §7 Migration & rollout order — Tasks 1→8 follow the spec's numbered order exactly, ending in catalog deletion.
- §8 Files to create/modify — every row is covered by a task; `lib/queries/*` split into `perfumes.ts` (public) and `adminPerfumes.ts` (admin) for a clean server-fetch/client-hook boundary, noted in the Architecture section.

**Placeholder scan:** No "TBD"/"TODO"/"implement later" strings. Task 3's Step 2 asks the implementing agent to author ~242 more data rows — this is a bounded, fully-specified content-authoring task (exact schema, exact vocabulary, worked examples, a verification step that fails loudly if any slug is missing), not an unspecified placeholder.

**Type consistency:** `PerfumeProfile` (Task 2) fields are used identically in Task 4's page and Task 4's `SimilarPerfumeCard` props. `Review`/`ReviewInsert` (Task 6) stay consistent with `EMPTY_FORM` in `app/dashboard/reviews/page.tsx`. `AdminPerfume`/`AdminPerfumeUpdate` (Task 7) field names match the columns added in Task 1 and the `PATCH` route's accepted body. `qk.adminPerfumes()` (Task 2) is the only new query key, used in both `adminPerfumes.ts` and `AdminSidebar.tsx` (Task 7).

---

**Plan complete and saved to `docs/superpowers/plans/2026-08-17-perfume-profile-depth.md`.** Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
