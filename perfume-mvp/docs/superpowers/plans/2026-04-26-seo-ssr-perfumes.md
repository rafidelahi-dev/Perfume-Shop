# SEO & SSR Fix — CloudPerfumeBD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/perfumes` and all listing pages indexable by Google by converting CSR to SSR/ISR, then sharpen meta titles, descriptions, and schema markup.

**Architecture:** The `/perfumes` page uses a `"use client"` React Query component that renders "Loading…" on the server. Fix: server-fetch listings in the page Server Component, pass as `initialData` to the client component so Next.js pre-renders real HTML. Listing/seller detail pages already SSR but use `cookies()` which prevents ISR — switch to a public Supabase client + `revalidate`. Sitemap, robots, and base layout are already solid.

**Tech Stack:** Next.js 16 App Router, @supabase/supabase-js, @tanstack/react-query v5, TypeScript, Tailwind CSS

---

## What is already done — do NOT redo

- `app/sitemap.ts` — full sitemap with static + listing + profile URLs ✅
- `app/robots.ts` — allows all, points to sitemap ✅
- `app/layout.tsx` — global metadata, OG, Twitter Card ✅
- `app/perfumes/[username]/[id]/page.tsx` — SSR, Product + Breadcrumb JSON-LD, `generateMetadata` ✅
- `app/perfumes/[username]/page.tsx` — SSR, `generateMetadata`, OG ✅

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/perfumes/page.tsx` | Modify | Add server-side listings fetch + `revalidate = 30`, pass `initialListings` prop |
| `app/perfumes/components/PerfumePage.tsx` | Modify | Accept `initialListings` prop, use as `initialData` in `useQuery` |
| `app/perfumes/[username]/[id]/page.tsx` | Modify | Switch to public Supabase client, add `revalidate = 300`, update title/desc format, add `aggregateRating` |
| `app/perfumes/[username]/page.tsx` | Modify | Switch to public Supabase client, add `revalidate = 300` |

---

## Task 1: SSR/ISR for /perfumes listing page

**This is the critical fix.** Google currently sees `<div>Loading...</div>` in the HTML. After this task, it will see a full grid of perfume listings.

**Root cause:** `PerfumePage.tsx` is `"use client"` with `useQuery` and no `initialData`. On the server, React Query has no data, so `isLoading = true`, rendering the Suspense fallback.

**Fix:** Fetch listings in the Server Component (`page.tsx`) using an anonymous Supabase client (no cookies → ISR-compatible), pass as `initialListings` prop, use as `initialData` in `useQuery`.

**Files:**
- Modify: `perfume-mvp/app/perfumes/page.tsx`
- Modify: `perfume-mvp/app/perfumes/components/PerfumePage.tsx`

- [ ] **Step 1: Add server-side fetch to `app/perfumes/page.tsx`**

Replace the entire file with:

```tsx
import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import PerfumesPage from "./components/PerfumePage";
import type { Metadata } from "next";
import type { PerfumeListing, SellerProfile } from "@/types/perfume";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Browse Perfumes — Buy & Sell Fragrances in Bangladesh",
  description:
    "Explore hundreds of genuine perfume listings from sellers across Bangladesh. Find full bottles, partials, and decants at community-driven prices.",
  alternates: { canonical: "https://cloudperfumebd.com/perfumes" },
};

type RawListing = Omit<PerfumeListing, "profiles"> & {
  profiles?: SellerProfile[] | SellerProfile | null;
};

async function fetchInitialListings(): Promise<PerfumeListing[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("listings")
    .select(`
      id,
      perfume_id,
      brand,
      perfume_name,
      sub_brand,
      price,
      min_price,
      type,
      bottle_size_ml,
      partial_left_ml,
      decant_options,
      images,
      profiles:profiles!inner (
        id,
        username,
        display_name,
        avatar_url,
        contact_number,
        messenger_link,
        whatsapp_number
      )
    `)
    .order("created_at", { ascending: false });

  if (error) return [];

  const rows = (data as RawListing[]) ?? [];
  return rows.map((l) => ({
    ...l,
    profiles: Array.isArray(l.profiles) ? l.profiles[0] ?? null : l.profiles ?? null,
  }));
}

export default async function Page() {
  const initialListings = await fetchInitialListings();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PerfumesPage initialListings={initialListings} />
    </Suspense>
  );
}
```

- [ ] **Step 2: Add `initialListings` prop to `PerfumesPage` client component**

In `perfume-mvp/app/perfumes/components/PerfumePage.tsx`, change the component signature and `useQuery` call.

Find this block (lines 63–67):
```tsx
export default function PerfumesPage() {
  const { data: listings = [], isLoading, error } = useQuery({
    queryKey: ["perfumes"],
    queryFn: fetchPerfumes,
  });
```

Replace with:
```tsx
export default function PerfumesPage({ initialListings }: { initialListings?: PerfumeListing[] }) {
  const { data: listings = [], isLoading, error } = useQuery({
    queryKey: ["perfumes"],
    queryFn: fetchPerfumes,
    initialData: initialListings,
  });
```

- [ ] **Step 3: Verify the HTML source contains listings**

Run:
```bash
cd perfume-mvp && npm run build 2>&1 | tail -20
```

Expected: build completes without error. The `/perfumes` route should appear as `○ (ISR)` or `● (SSG)`, not `λ (Dynamic)` with no data.

Then start the server and curl:
```bash
npm run start &
curl -s http://localhost:3000/perfumes | grep -o 'perfume_name\|TK[0-9]' | head -5
```

Expected: see `TK` price values in the HTML — confirms real data is server-rendered.

- [ ] **Step 4: Commit**

```bash
git add perfume-mvp/app/perfumes/page.tsx perfume-mvp/app/perfumes/components/PerfumePage.tsx
git commit -m "feat: SSR+ISR for /perfumes — pass server-fetched listings as initialData to stop Loading… flash"
```

---

## Task 2: ISR for listing detail and seller pages

Both `app/perfumes/[username]/[id]/page.tsx` and `app/perfumes/[username]/page.tsx` use `createServerSupabase()` which calls `cookies()`. This opts the page into dynamic rendering, preventing ISR. Since these are public pages (no auth needed to view), switching to the anonymous Supabase client unlocks `revalidate`.

**Files:**
- Modify: `perfume-mvp/app/perfumes/[username]/[id]/page.tsx`
- Modify: `perfume-mvp/app/perfumes/[username]/page.tsx`

- [ ] **Step 5: Switch listing detail page to public client + add `revalidate`**

In `perfume-mvp/app/perfumes/[username]/[id]/page.tsx`:

Replace the import:
```tsx
import { createServerSupabase } from "@/lib/supabaseServer";
```
with:
```tsx
import { createClient } from "@supabase/supabase-js";
```

Add after the imports (before `type Props`):
```tsx
export const revalidate = 300;

function createPublicSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

In `generateMetadata` (line 16), replace:
```tsx
  const supabase = await createServerSupabase();
```
with:
```tsx
  const supabase = createPublicSupabase();
```

In `ListingDetailPage` (line 71), replace:
```tsx
  const supabase = await createServerSupabase();
```
with:
```tsx
  const supabase = createPublicSupabase();
```

- [ ] **Step 6: Switch seller profile page to public client + add `revalidate`**

In `perfume-mvp/app/perfumes/[username]/page.tsx`:

Replace the import:
```tsx
import { createServerSupabase } from "@/lib/supabaseServer";
```
with:
```tsx
import { createClient } from "@supabase/supabase-js";
```

Add after the imports:
```tsx
export const revalidate = 300;

function createPublicSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

In `generateMetadata` (line 17), replace:
```tsx
  const supabase = await createServerSupabase();
```
with:
```tsx
  const supabase = createPublicSupabase();
```

In `SellerListingsPage` (line 60), replace:
```tsx
  const supabase = await createServerSupabase();
```
with:
```tsx
  const supabase = createPublicSupabase();
```

- [ ] **Step 7: Build and verify ISR routes**

```bash
cd perfume-mvp && npm run build 2>&1 | grep -E "perfumes|ISR|Dynamic"
```

Expected: `/perfumes/[username]` and `/perfumes/[username]/[id]` appear as ISR (shown as `○` with revalidation time) instead of fully dynamic (`λ`).

- [ ] **Step 8: Commit**

```bash
git add perfume-mvp/app/perfumes/[username]/[id]/page.tsx perfume-mvp/app/perfumes/[username]/page.tsx
git commit -m "perf: switch listing+seller pages to public supabase client + ISR revalidate 300s"
```

---

## Task 3: Update meta title and description for listing detail pages

**Target format:**
- Title: `{Brand} {Name} in Bangladesh — Decant 5ml/10ml — CloudPerfumeBD`
  - For decants: show actual ml sizes from `decant_options`
  - For non-decants: show type (Intact / Partial)
- Description: unique, ≤150 chars, includes price, type, and seller

**File:**
- Modify: `perfume-mvp/app/perfumes/[username]/[id]/page.tsx`

- [ ] **Step 9: Add a `buildTitle` helper and update `generateMetadata`**

In `generateMetadata`, after the `listing` is fetched (around line 38), replace the title/description building block:

Find:
```tsx
  const isDecant = (listing.type ?? "").toLowerCase() === "decant";
  const priceNum = isDecant && listing.min_price != null
    ? Number(listing.min_price)
    : Number(listing.price ?? NaN);
  const priceText = Number.isFinite(priceNum) ? `TK${priceNum.toFixed(0)}` : "Price on Contact";

  const title = `${listing.brand} — ${listing.perfume_name} | ${profile.display_name ?? profile.username}`;
  const description = `${listing.type?.toUpperCase()} • ${priceText} • Sold by ${profile.display_name ?? profile.username} on CloudPerfumeBD`;
```

Replace with:
```tsx
  const isDecant = (listing.type ?? "").toLowerCase() === "decant";
  const priceNum = isDecant && listing.min_price != null
    ? Number(listing.min_price)
    : Number(listing.price ?? NaN);
  const priceText = Number.isFinite(priceNum) ? `TK${priceNum.toFixed(0)}` : "price on contact";
  const displayName = profile.display_name ?? profile.username;

  // Build size string for decants, e.g. "5ml/10ml/30ml"
  type DecantOption = { ml: number; price: number };
  const decantOptions = Array.isArray(listing.decant_options)
    ? (listing.decant_options as DecantOption[]).sort((a, b) => a.ml - b.ml)
    : [];
  const sizeStr = isDecant && decantOptions.length > 0
    ? decantOptions.map((o) => `${o.ml}ml`).join("/")
    : null;
  const typeLabel = isDecant
    ? `Decant${sizeStr ? ` ${sizeStr}` : ""}`
    : (listing.type ?? "").charAt(0).toUpperCase() + (listing.type ?? "").slice(1);

  const title = `${listing.brand} ${listing.perfume_name} in Bangladesh — ${typeLabel} — CloudPerfumeBD`;
  const description = `Buy ${listing.brand} ${listing.perfume_name} ${typeLabel.toLowerCase()} in Bangladesh from ${displayName}. Starting ${priceText}. Authentic fragrance.`.slice(0, 150);
```

- [ ] **Step 10: Build and spot-check a title in the HTML**

```bash
cd perfume-mvp && npm run build 2>&1 | tail -5
```

Then manually open a listing page in a browser or curl and check `<title>` in the `<head>` matches the new format, e.g.:

```
Dior Sauvage in Bangladesh — Decant 5ml/10ml — CloudPerfumeBD
```

- [ ] **Step 11: Commit**

```bash
git add perfume-mvp/app/perfumes/[username]/[id]/page.tsx
git commit -m "seo: update listing page title to {Brand} {Name} in Bangladesh format + 150-char description"
```

---

## Task 4: Add `aggregateRating` to Product JSON-LD schema

The `reviews` table stores per-perfume reviews (keyed by `brand` + `perfume_name`) with qualitative ratings. Map to numeric: `love→5, like→4, okay→3, dislike→2, hate→1`. Add `aggregateRating` and sample `review` items to the Product JSON-LD only when reviews exist.

**File:**
- Modify: `perfume-mvp/app/perfumes/[username]/[id]/page.tsx`

- [ ] **Step 12: Fetch reviews for the listing's perfume**

In `ListingDetailPage`, after the listing fetch (around line 92, after `if (lErr || !listing) redirect(...)`), add a reviews fetch:

```tsx
  // Fetch public reviews for this perfume by brand + name
  const { data: perfumeReviews } = await supabase
    .from("reviews")
    .select("rating, review_text, created_at")
    .eq("brand", listing.brand ?? "")
    .eq("perfume_name", listing.perfume_name ?? "")
    .not("rating", "is", null)
    .limit(20);
```

- [ ] **Step 13: Compute aggregate rating values**

Add this block immediately after the reviews fetch:

```tsx
  const ratingMap: Record<string, number> = {
    love: 5,
    like: 4,
    okay: 3,
    dislike: 2,
    hate: 1,
  };

  const numericRatings = (perfumeReviews ?? [])
    .map((r) => ratingMap[r.rating ?? ""])
    .filter((n): n is number => n !== undefined);

  const avgRating =
    numericRatings.length > 0
      ? numericRatings.reduce((a, b) => a + b, 0) / numericRatings.length
      : null;
```

- [ ] **Step 14: Add `aggregateRating` and `review` to the existing `productSchema` object**

Find the existing `productSchema` block (around line 108):
```tsx
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.perfume_name,
    brand: { "@type": "Brand", name: listing.brand },
    ...(listing.sub_brand ? { description: listing.sub_brand } : {}),
    image: Array.isArray(listing.images) && listing.images.length > 0
      ? (listing.images as string[])
      : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: Number.isFinite(priceToShow) ? priceToShow.toFixed(2) : undefined,
      availability: "https://schema.org/InStock",
      url: `https://cloudperfumebd.com/perfumes/${username}/${id}`,
      seller: {
        "@type": "Person",
        name: profile.display_name ?? profile.username,
        url: `https://cloudperfumebd.com/perfumes/${username}`,
      },
    },
  };
```

Replace with:
```tsx
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.perfume_name,
    brand: { "@type": "Brand", name: listing.brand },
    ...(listing.sub_brand ? { description: listing.sub_brand } : {}),
    image: Array.isArray(listing.images) && listing.images.length > 0
      ? (listing.images as string[])
      : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: Number.isFinite(priceToShow) ? priceToShow.toFixed(2) : undefined,
      availability: "https://schema.org/InStock",
      url: `https://cloudperfumebd.com/perfumes/${username}/${id}`,
      seller: {
        "@type": "Person",
        name: profile.display_name ?? profile.username,
        url: `https://cloudperfumebd.com/perfumes/${username}`,
      },
    },
    ...(avgRating !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avgRating.toFixed(1),
            reviewCount: numericRatings.length,
            bestRating: 5,
            worstRating: 1,
          },
          review: (perfumeReviews ?? [])
            .filter((r) => r.review_text)
            .slice(0, 3)
            .map((r) => ({
              "@type": "Review",
              reviewRating: {
                "@type": "Rating",
                ratingValue: ratingMap[r.rating ?? ""] ?? 3,
                bestRating: 5,
                worstRating: 1,
              },
              reviewBody: r.review_text,
              datePublished: r.created_at?.split("T")[0],
            })),
        }
      : {}),
  };
```

- [ ] **Step 15: Build and validate the JSON-LD output**

```bash
cd perfume-mvp && npm run build 2>&1 | tail -5
```

Start the server and test with Google's Rich Results Test by pasting the source of a listing page that has reviews. Alternatively, curl a listing page and look for `"aggregateRating"` in the `<script type="application/ld+json">` block:

```bash
npm run start &
curl -s "http://localhost:3000/perfumes/<some-username>/<some-id>" | grep -o '"aggregateRating"'
```

Expected: `"aggregateRating"` appears in the HTML for listings that have reviews. Listings without reviews omit it cleanly.

- [ ] **Step 16: Commit**

```bash
git add perfume-mvp/app/perfumes/[username]/[id]/page.tsx
git commit -m "seo: add aggregateRating + review JSON-LD to listing pages from community reviews"
```

---

## Self-Review Checklist

### Spec coverage
| Requirement | Covered by |
|------------|-----------|
| SSR/ISR for /perfumes — no "Loading…" | Task 1 |
| SSR/ISR for /perfumes/[slug] | Task 2 |
| Sitemap with all routes | Already done ✅ |
| schema.org/Product JSON-LD with name/brand/image/description/offers | Already done ✅ |
| aggregateRating + review in schema | Task 4 |
| Title pattern: `{Brand} {Name} in Bangladesh — ...` | Task 3 |
| 150-char meta description | Task 3 |
| OpenGraph + Twitter Card | Already done ✅ |
| robots.txt allow all + sitemap | Already done ✅ |
| TTFB < 800ms + no render-blocking JS | Solved by ISR (Task 1+2) |

### `/blog` and `/sellers` routes
The user requested these in the sitemap. These routes **do not exist** in the codebase (no `app/blog/` or `app/sellers/` directories). **Do not add phantom URLs.** When those pages are built, add them to `sitemap.ts` at that time.

### No placeholders
All steps contain actual code. No "TBD" or "add appropriate handling" entries.

### Type consistency
- `DecantOption` type (`{ ml: number; price: number }`) is defined inline in Task 3 Step 9 — matches the type used in `DecantOptions.tsx`.
- `ratingMap` defined in Task 4 Step 13 is used in Steps 14 (both in aggregateRating and in the inline review map). Consistent.
- `perfumeReviews` fetched in Step 12 is used in Steps 13 and 14. Consistent.
