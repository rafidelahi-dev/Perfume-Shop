# Perfume Autocomplete Design

**Date:** 2026-04-14
**Goal:** Add typeahead autocomplete to brand, sub-brand, and perfume name fields in ListingForm and ReviewForm. Suggestions come from the `perfume_score` table merged with a hardcoded seed list. Fields are linked — brand selection filters name suggestions, and selecting a perfume name back-fills brand and sub-brand.

---

## Architecture

Three new files, two modified forms.

### New: `lib/queries/client/perfumeSuggestions.ts`
Fetches all rows from `perfume_score` — specifically `brand`, `perfume_name`, `sub_brand`. Called once on hook mount. No debounce needed; the table is small and grows slowly.

### New: `components/ComboBox.tsx`
Reusable input + dropdown component. Purely presentational — no knowledge of brands or linking logic.

**Props:**
```ts
type ComboBoxProps = {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];   // pre-filtered list passed from parent
  label: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}
```

**Behaviour:**
- Dropdown visible only when `value.length >= 1` AND suggestions exist
- Max 8 suggestions rendered
- Case-insensitive `includes` match (filtering done by parent/hook, not component)
- Keyboard: `↓/↑` navigate, `Enter` selects highlighted, `Escape` closes, `Tab` closes
- Click outside closes dropdown
- Free-text always allowed — field is never locked to suggestion list
- Styling: `bg-[#f8f7f3]` input, white dropdown card with shadow, `bg-black/5` on highlighted row, `className` prop overrides input wrapper for per-form style differences

### New: `lib/hooks/usePerfumeAutocomplete.ts`
Fetches `perfume_score` on mount, merges with seed list, deduplicates case-insensitively.

**Exposes:**
```ts
{
  brandSuggestions: (query: string) => string[]
  nameSuggestions: (brand: string, query: string) => string[]
  subBrandSuggestions: (brand: string, query: string) => string[]
  onNameSelect: (name: string, brand: string) => { brand: string; sub_brand: string | null }
}
```

- `brandSuggestions` — searches full merged list by brand
- `nameSuggestions` — if brand is non-empty, filters to that brand first; otherwise searches all
- `subBrandSuggestions` — same pattern as nameSuggestions
- `onNameSelect` — looks up matching record; if multiple match same name, prefers the one matching current brand; returns `{ brand, sub_brand }` for back-fill

**Clearing behaviour:** Clearing the brand field resets name/sub-brand suggestions to all-brands scope. Previously back-filled values are NOT auto-cleared — user clears manually to avoid data loss.

---

## Seed Data

Hardcoded in `usePerfumeAutocomplete.ts` as brand-only entries (no hardcoded perfume names).

**Middle Eastern brands:**
Armaf, Lattafa, Al Haramain, Rasasi, Swiss Arabian, Ajmal, Nabeel, Paris Corner, Ard Al Zaafaran, Zimaya, Afnan, Fragrance World, Maison Alhambra, Oud Elite, Ahmed Al Maghribi, Emper, Surrati, Khadlaj, Orientica, Arabiyat

**International brands:**
Dior, Chanel, Tom Ford, Creed, Yves Saint Laurent, Giorgio Armani, Versace, Paco Rabanne, Guerlain, Jean Paul Gaultier, Hermès, Burberry, Calvin Klein, Hugo Boss, Davidoff, Montblanc, Bvlgari, Carolina Herrera, Viktor & Rolf, Thierry Mugler, Narciso Rodriguez, Marc Jacobs, Gucci, Dolce & Gabbana, Valentino, Givenchy, Azzaro, Joop, Lancôme, Penhaligon's, Jo Malone, Maison Margiela, Byredo, Le Labo

Merge rule: seed entries whose brand does not exist in `perfume_score` (case-insensitive) are appended to the suggestions pool.

---

## Form Changes

### ListingForm (`app/dashboard/listings/listingComponents/ListingForm.tsx`)
- Replace brand `<input>` → `<ComboBox>` wired to `brandSuggestions(brand)`
- Replace sub-brand `<input>` → `<ComboBox>` wired to `subBrandSuggestions(brand, subBrand)`
- Replace perfume name `<input>` → `<ComboBox>` wired to `nameSuggestions(brand, perfumeName)`
- On name selection: call `onNameSelect(name, brand)` → call `setBrand` + `setSubBrand` with returned values
- No changes to validation, submit logic, or mutation

### ReviewForm (`app/dashboard/reviews/reviewComponents/ReviewForm.tsx`)
- Replace brand `<input>` → `<ComboBox>` wired to `brandSuggestions(brand)`
- Replace perfume name `<input>` → `<ComboBox>` wired to `nameSuggestions(brand, perfumeName)`
- On name selection: call `onNameSelect(name, brand)` → call `setForm` to back-fill brand only (no sub-brand field in ReviewForm)
- No changes to validation, submit logic, or mutation

---

## Data Flow

```
mount
  → fetchPerfumeSuggestions() (perfume_score)
  → merge + deduplicate with SEED_BRANDS
  → stored in hook state as allRecords[]

user types in brand field
  → brandSuggestions(query) filters allRecords by brand
  → passed to ComboBox as suggestions[]

user selects brand / continues typing in name field
  → nameSuggestions(brand, query) filters allRecords by brand first, then name
  → passed to name ComboBox as suggestions[]

user selects perfume name
  → onNameSelect(name, brand) looks up record
  → returns { brand, sub_brand }
  → form back-fills brand and sub-brand fields
```

---

## Files Changed

| File | Action |
|------|--------|
| `lib/queries/client/perfumeSuggestions.ts` | Create |
| `components/ComboBox.tsx` | Create |
| `lib/hooks/usePerfumeAutocomplete.ts` | Create |
| `app/dashboard/listings/listingComponents/ListingForm.tsx` | Modify |
| `app/dashboard/reviews/reviewComponents/ReviewForm.tsx` | Modify |

---

## Out of Scope

- PerfumeForm (personal collection) — deferred
- Server-side search/debounce — not needed at current DB scale
- Fuzzy matching — `includes` is sufficient; trigram search deferred until DB grows
