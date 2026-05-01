# Fragrance Landing Pages — Design Spec

**Date:** 2026-04-28  
**Scope:** 266 static-catalog perfume discovery pages at `/fragrance/[slug]`  
**Goal:** Give Google 266 indexable pages for popular perfumes — capturing search traffic before sellers join

---

## 1. Architecture

### Route

`/fragrance/[slug]` — new route group, no conflict with existing `/perfumes/[username]` dynamic route.

### Static catalog

A single TypeScript file (`lib/fragrance-catalog.ts`) exports an array of 266 `PerfumeCatalogEntry` objects. This is the source of truth for which pages exist and their metadata.

```ts
export interface PerfumeCatalogEntry {
  slug: string;           // URL segment, kebab-case, e.g. "dior-sauvage"
  name: string;           // Display name, e.g. "Dior Sauvage"
  brand: string;          // Brand name, e.g. "Dior"
  metaDescription: string; // ~150 chars, from list.txt
  searchTerms: string[];  // Aliases used to match listings in DB, e.g. ["Sauvage", "Dior Sauvage"]
}
```

Adding a new perfume in future: append one entry to the array. No DB changes, no migrations.

### Rendering

- `generateStaticParams` exports all 266 slugs — Next.js pre-renders all pages at build time
- `revalidate: 3600` (ISR, 1-hour TTL) — listings grid refreshes hourly without a full rebuild
- DB query uses the Supabase **public anon client** (listings are public, no auth needed)

---

## 2. Config structure

```ts
// lib/fragrance-catalog.ts
export const fragranceCatalog: PerfumeCatalogEntry[] = [
  {
    slug: 'dior-sauvage',
    name: 'Dior Sauvage',
    brand: 'Dior',
    metaDescription: 'Dior Sauvage in Bangladesh — compare decant prices (5ml/10ml/30ml) from verified sellers. Read reviews & find cheapest sellers near you.',
    searchTerms: ['Dior Sauvage', 'Sauvage'],
  },
  // ... 265 more
];

export function getCatalogEntry(slug: string): PerfumeCatalogEntry | undefined {
  return fragranceCatalog.find((e) => e.slug === slug);
}
```

**Slug generation rule:** lowercase, spaces → hyphens, remove apostrophes and special characters, keep numbers. Examples:
- "Afnan 9pm Elixir" → `afnan-9pm-elixir`
- "Lattafa Bade'e Al Oud Amethyst" → `lattafa-badee-al-oud-amethyst`
- "Maison Francis Kurkdjian Baccarat Rouge 540" → `maison-francis-kurkdjian-baccarat-rouge-540`
- "Viktor&Rolf Spicebomb Extreme" → `viktor-rolf-spicebomb-extreme`

**searchTerms:** Include the full name plus any common alias/abbreviation from `list.txt` (e.g. "CDN Intense Man", "BR 540", "PDM Layton"). Used for DB `ILIKE ANY(searchTerms)` matching.

---

## 3. Page content

### 404 handling

If `getCatalogEntry(slug)` returns `undefined`, call Next.js `notFound()` — returns a proper 404 page and excludes the URL from Google's index.

### Head metadata

```
<title>{brand} {name} in Bangladesh | PerfumeDecant</title>
<meta name="description" content="{metaDescription}" />
<meta property="og:title" content="{brand} {name} in Bangladesh | PerfumeDecant" />
<meta property="og:description" content="{metaDescription}" />
```

### Page layout

```
H1: "{name} Decants in Bangladesh"
Subheading: "Find the cheapest {name} decants from verified sellers across Bangladesh."

[Listings grid — sorted by price ASC]
  └─ Each card: seller name, size, price, link to /perfumes/[username]/[id]
  └─ Empty state: "No listings yet — check back soon as more sellers join."

[Schema.org JSON-LD — see below]
```

### Listings query

```ts
const { data: listings } = await supabase
  .from('listings')
  .select('id, perfume_name, price, size_ml, type, user_id, profiles(display_name, username)')
  .ilike('perfume_name', `%${entry.name}%`)  // primary match on full name
  .eq('is_hidden', false)
  .order('price', { ascending: true })
  .limit(20)
```

If `entry.searchTerms` has aliases, run a second fallback query with `or(searchTerms.map(t => ilike('perfume_name', '%' + t + '%')).join(','))` and merge/deduplicate by listing id.

### Schema.org — Product + AggregateOffer

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{name}",
  "brand": { "@type": "Brand", "name": "{brand}" },
  "description": "{metaDescription}",
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "BDT",
    "lowPrice": "{min price from listings, or omit if none}",
    "highPrice": "{max price from listings, or omit if none}",
    "offerCount": "{listings.length}"
  }
}
```

When no listings exist: emit the Product schema without the `offers` field (valid per schema.org spec).

---

## 4. Sitemap update

`app/sitemap.ts` currently covers `/perfumes` and `/perfumes/[username]/[id]`. Add all 266 `/fragrance/[slug]` URLs with:
- `changeFrequency: 'weekly'`
- `priority: 0.7`
- `lastModified: new Date()`

---

## 5. Files to create / modify

| File | Action | Purpose |
|------|--------|---------|
| `lib/fragrance-catalog.ts` | Create | 266-entry catalog array + `getCatalogEntry` helper |
| `app/fragrance/[slug]/page.tsx` | Create | Page component — metadata, listings query, schema.org |
| `app/sitemap.ts` | Modify | Add 266 `/fragrance/[slug]` entries |

No DB migrations needed. No new API routes — page fetches directly from Supabase public client at render time.

---

## 6. Out of scope

- Seller reviews / ratings on fragrance pages (future)
- Filter by decant size on the listings grid (future)
- Fragrance notes / fragrance descriptions / community content (future)
- `/fragrance` index page listing all 266 perfumes (future)
