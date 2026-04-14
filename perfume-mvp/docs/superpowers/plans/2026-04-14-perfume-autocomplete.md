# Perfume Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add linked typeahead autocomplete to brand, sub-brand, and perfume name fields in ListingForm and ReviewForm, sourced from `perfume_score` + a hardcoded seed list of popular brands.

**Architecture:** A reusable `ComboBox` component handles UI only. A `usePerfumeAutocomplete` hook fetches `perfume_score` on mount, merges with a seed list, and exposes filtered suggestion functions. Linking (brand filters names, name selection back-fills brand/sub-brand) is wired up in each form.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase client (`@supabase/supabase-js`), React hooks

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `perfume-mvp/lib/queries/client/perfumeSuggestions.ts` | Create | Fetch brand/name/sub_brand rows from `perfume_score` |
| `perfume-mvp/components/ComboBox.tsx` | Create | Presentational input + dropdown, keyboard nav, click-outside |
| `perfume-mvp/lib/hooks/usePerfumeAutocomplete.ts` | Create | Seed list, merge logic, filter functions, back-fill lookup |
| `perfume-mvp/app/dashboard/listings/listingComponents/ListingForm.tsx` | Modify | Wire ComboBox + hook into brand/sub-brand/name fields |
| `perfume-mvp/app/dashboard/reviews/reviewComponents/ReviewForm.tsx` | Modify | Wire ComboBox + hook into brand/name fields |

---

## Task 1: Create the perfumeSuggestions query

**Files:**
- Create: `perfume-mvp/lib/queries/client/perfumeSuggestions.ts`

- [ ] **Step 1: Create the file**

```ts
import { supabase } from "@/lib/supabaseClient";

export type PerfumeSuggestion = {
  brand: string;
  perfume_name: string;
  sub_brand: string | null;
};

export async function fetchPerfumeSuggestions(): Promise<PerfumeSuggestion[]> {
  const { data, error } = await supabase
    .from("perfume_score")
    .select("brand, perfume_name, sub_brand");
  if (error) throw error;
  return (data ?? []) as PerfumeSuggestion[];
}
```

- [ ] **Step 2: Commit**

```bash
git add perfume-mvp/lib/queries/client/perfumeSuggestions.ts
git commit -m "feat: add fetchPerfumeSuggestions query for autocomplete"
```

---

## Task 2: Create the ComboBox component

**Files:**
- Create: `perfume-mvp/components/ComboBox.tsx`

The component receives pre-filtered `suggestions[]` from the parent — it does not filter internally. It manages open/closed state, keyboard navigation, and click-outside.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

type ComboBoxProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  suggestions: string[];
  label: string;
  placeholder?: string;
  required?: boolean;
  inputClassName?: string;
};

export default function ComboBox({
  value,
  onChange,
  onSelect,
  suggestions,
  label,
  placeholder,
  required,
  inputClassName,
}: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlighted(-1);
  }, [suggestions]);

  // Close on click outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const visible = open && suggestions.length > 0;

  function select(val: string) {
    onChange(val);
    onSelect?.(val);
    setOpen(false);
    setHighlighted(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!visible) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      select(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-[#1a1a1a]">
        {label}
        {required && " *"}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className={
          inputClassName ??
          "mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
        }
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />
      {visible && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-black/10 bg-white shadow-md">
          {suggestions.map((s, i) => (
            <li
              key={s}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur before select
                select(s);
              }}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === highlighted ? "bg-black/5 font-medium" : "hover:bg-black/5"
              }`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add perfume-mvp/components/ComboBox.tsx
git commit -m "feat: add ComboBox component with keyboard nav and click-outside"
```

---

## Task 3: Create the usePerfumeAutocomplete hook

**Files:**
- Create: `perfume-mvp/lib/hooks/usePerfumeAutocomplete.ts`

This hook owns the seed list, fetch-on-mount, merge/dedup logic, and all four filter/lookup functions.

- [ ] **Step 1: Create the file**

```ts
"use client";

import { useEffect, useState } from "react";
import {
  fetchPerfumeSuggestions,
  type PerfumeSuggestion,
} from "@/lib/queries/client/perfumeSuggestions";

// ─── Seed list ────────────────────────────────────────────────────────────────
// Brand-only seeds (no perfume names). These cover the cold-start period before
// real listings populate perfume_score.
const SEED_BRANDS: string[] = [
  // Middle Eastern — strong Bangladesh market presence
  "Armaf",
  "Lattafa",
  "Al Haramain",
  "Rasasi",
  "Swiss Arabian",
  "Ajmal",
  "Nabeel",
  "Paris Corner",
  "Ard Al Zaafaran",
  "Zimaya",
  "Afnan",
  "Fragrance World",
  "Maison Alhambra",
  "Oud Elite",
  "Ahmed Al Maghribi",
  "Emper",
  "Surrati",
  "Khadlaj",
  "Orientica",
  "Arabiyat",
  // International
  "Dior",
  "Chanel",
  "Tom Ford",
  "Creed",
  "Yves Saint Laurent",
  "Giorgio Armani",
  "Versace",
  "Paco Rabanne",
  "Guerlain",
  "Jean Paul Gaultier",
  "Hermès",
  "Burberry",
  "Calvin Klein",
  "Hugo Boss",
  "Davidoff",
  "Montblanc",
  "Bvlgari",
  "Carolina Herrera",
  "Viktor & Rolf",
  "Thierry Mugler",
  "Narciso Rodriguez",
  "Marc Jacobs",
  "Gucci",
  "Dolce & Gabbana",
  "Valentino",
  "Givenchy",
  "Azzaro",
  "Joop",
  "Lancôme",
  "Penhaligon's",
  "Jo Malone",
  "Maison Margiela",
  "Byredo",
  "Le Labo",
];

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function usePerfumeAutocomplete() {
  const [allRecords, setAllRecords] = useState<PerfumeSuggestion[]>([]);

  useEffect(() => {
    fetchPerfumeSuggestions()
      .then((dbRecords) => {
        // Build a set of lowercase brands already in the DB
        const dbBrands = new Set(
          dbRecords.map((r) => r.brand.toLowerCase())
        );
        // Append seed brands not already present
        const seedRecords: PerfumeSuggestion[] = SEED_BRANDS.filter(
          (b) => !dbBrands.has(b.toLowerCase())
        ).map((b) => ({ brand: b, perfume_name: "", sub_brand: null }));

        setAllRecords([...dbRecords, ...seedRecords]);
      })
      .catch(() => {
        // On fetch failure fall back to seed-only so the UI still works
        setAllRecords(
          SEED_BRANDS.map((b) => ({ brand: b, perfume_name: "", sub_brand: null }))
        );
      });
  }, []);

  /** Distinct brand names matching query (case-insensitive includes). */
  function brandSuggestions(query: string): string[] {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const seen = new Set<string>();
    const results: string[] = [];
    for (const r of allRecords) {
      if (r.brand.toLowerCase().includes(lower) && !seen.has(r.brand)) {
        seen.add(r.brand);
        results.push(r.brand);
        if (results.length === 8) break;
      }
    }
    return results;
  }

  /**
   * Distinct perfume names matching query.
   * If brand is provided, restricts to that brand first.
   */
  function nameSuggestions(brand: string, query: string): string[] {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const brandLower = brand.trim().toLowerCase();
    const seen = new Set<string>();
    const results: string[] = [];
    for (const r of allRecords) {
      if (!r.perfume_name) continue;
      if (brandLower && r.brand.toLowerCase() !== brandLower) continue;
      if (
        r.perfume_name.toLowerCase().includes(lower) &&
        !seen.has(r.perfume_name)
      ) {
        seen.add(r.perfume_name);
        results.push(r.perfume_name);
        if (results.length === 8) break;
      }
    }
    return results;
  }

  /**
   * Distinct sub-brand values matching query.
   * If brand is provided, restricts to that brand first.
   */
  function subBrandSuggestions(brand: string, query: string): string[] {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const brandLower = brand.trim().toLowerCase();
    const seen = new Set<string>();
    const results: string[] = [];
    for (const r of allRecords) {
      if (!r.sub_brand) continue;
      if (brandLower && r.brand.toLowerCase() !== brandLower) continue;
      if (
        r.sub_brand.toLowerCase().includes(lower) &&
        !seen.has(r.sub_brand)
      ) {
        seen.add(r.sub_brand);
        results.push(r.sub_brand);
        if (results.length === 8) break;
      }
    }
    return results;
  }

  /**
   * Called when user selects a perfume name from the dropdown.
   * Returns the brand and sub_brand to back-fill into the form.
   * If multiple records share the same perfume_name, prefers the one
   * whose brand matches the currently typed brand value.
   */
  function onNameSelect(
    name: string,
    currentBrand: string
  ): { brand: string; sub_brand: string | null } {
    const nameLower = name.toLowerCase();
    const matches = allRecords.filter(
      (r) => r.perfume_name.toLowerCase() === nameLower
    );
    if (matches.length === 0) return { brand: currentBrand, sub_brand: null };
    const brandMatch = matches.find(
      (r) => r.brand.toLowerCase() === currentBrand.trim().toLowerCase()
    );
    const record = brandMatch ?? matches[0];
    return { brand: record.brand, sub_brand: record.sub_brand };
  }

  return {
    brandSuggestions,
    nameSuggestions,
    subBrandSuggestions,
    onNameSelect,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add perfume-mvp/lib/hooks/usePerfumeAutocomplete.ts
git commit -m "feat: add usePerfumeAutocomplete hook with seed list and linked filter functions"
```

---

## Task 4: Update ListingForm

**Files:**
- Modify: `perfume-mvp/app/dashboard/listings/listingComponents/ListingForm.tsx`

- [ ] **Step 1: Replace the import block at the top of the file**

Find the current imports (lines 1–10):
```tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import { uploadToBucket } from "@/lib/queries/storage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertListing } from "@/lib/queries/listings";
import { toast } from "sonner";
import { qk } from "@/lib/queries/key";
import Image from "next/image";
import { useSessionUserId } from "@/lib/hooks/useSessionUserId";
```

Replace with:
```tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import { uploadToBucket } from "@/lib/queries/storage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertListing } from "@/lib/queries/listings";
import { toast } from "sonner";
import { qk } from "@/lib/queries/key";
import Image from "next/image";
import { useSessionUserId } from "@/lib/hooks/useSessionUserId";
import ComboBox from "@/components/ComboBox";
import { usePerfumeAutocomplete } from "@/lib/hooks/usePerfumeAutocomplete";
```

- [ ] **Step 2: Call the hook inside the component**

Find this line inside `const ListingForm: React.FC = () => {` (just after the line `const qc = useQueryClient();`):
```tsx
  const qc = useQueryClient();
```

Replace with:
```tsx
  const qc = useQueryClient();
  const { brandSuggestions, nameSuggestions, subBrandSuggestions, onNameSelect } =
    usePerfumeAutocomplete();
```

- [ ] **Step 3: Replace the brand input with ComboBox**

Find:
```tsx
          <div>
            <label className="block text-sm font-medium text-[#1a1a1a]">
              Brand *
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
              placeholder="Dior"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              required
            />
          </div>
```

Replace with:
```tsx
          <div>
            <ComboBox
              label="Brand"
              placeholder="Dior"
              value={brand}
              onChange={setBrand}
              suggestions={brandSuggestions(brand)}
              required
            />
          </div>
```

- [ ] **Step 4: Replace the sub-brand input with ComboBox**

Find:
```tsx
          <div>
            <label className="block text-sm font-medium text-[#1a1a1a]">
              Sub-brand (optional)
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
              placeholder="Sauvage line"
              value={subBrand}
              onChange={(e) => setSubBrand(e.target.value)}
            />
          </div>
```

Replace with:
```tsx
          <div>
            <ComboBox
              label="Sub-brand (optional)"
              placeholder="Sauvage line"
              value={subBrand}
              onChange={setSubBrand}
              suggestions={subBrandSuggestions(brand, subBrand)}
            />
          </div>
```

- [ ] **Step 5: Replace the perfume name input with ComboBox (with back-fill on select)**

Find:
```tsx
          <div>
            <label className="block text-sm font-medium text-[#1a1a1a]">
              Perfume name *
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-black/10 bg-[#f8f7f3] px-3 py-2"
              placeholder="Sauvage"
              value={perfumeName}
              onChange={(e) => setPerfumeName(e.target.value)}
              required
            />
          </div>
```

Replace with:
```tsx
          <div>
            <ComboBox
              label="Perfume name"
              placeholder="Sauvage"
              value={perfumeName}
              onChange={setPerfumeName}
              onSelect={(name) => {
                const backfill = onNameSelect(name, brand);
                setBrand(backfill.brand);
                setSubBrand(backfill.sub_brand ?? "");
              }}
              suggestions={nameSuggestions(brand, perfumeName)}
              required
            />
          </div>
```

- [ ] **Step 6: Start the dev server and verify manually**

```bash
cd perfume-mvp && npm run dev
```

Navigate to `/dashboard/listings`. Verify:
1. Typing "arm" in Brand shows "Armaf" in dropdown
2. Selecting "Armaf" fills the brand field
3. Typing "ch" in Perfume Name (with brand = "Armaf") only shows Armaf perfumes if any exist in DB; shows all matches if DB is empty
4. Selecting a perfume name back-fills Brand and Sub-brand
5. Free-text entry works (type a custom name, ignore dropdown, form still submits)
6. Pressing Escape closes dropdown without clearing value
7. Pressing Enter on a highlighted suggestion selects it

- [ ] **Step 7: Commit**

```bash
git add perfume-mvp/app/dashboard/listings/listingComponents/ListingForm.tsx
git commit -m "feat: add autocomplete to ListingForm brand, sub-brand, and perfume name fields"
```

---

## Task 5: Update ReviewForm

**Files:**
- Modify: `perfume-mvp/app/dashboard/reviews/reviewComponents/ReviewForm.tsx`

ReviewForm receives `form` and `setForm` as props and does not manage its own brand/name state — but it is a `"use client"` component so calling a hook inside it is valid.

- [ ] **Step 1: Replace the import block at the top of the file**

Find:
```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ReviewInsert } from "@/lib/queries/reviews";
```

Replace with:
```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ReviewInsert } from "@/lib/queries/reviews";
import ComboBox from "@/components/ComboBox";
import { usePerfumeAutocomplete } from "@/lib/hooks/usePerfumeAutocomplete";
```

- [ ] **Step 2: Call the hook inside the component function**

Find this line at the top of the `ReviewForm` function body:
```tsx
  const [genderIdx, setGenderIdx] = useState<number | null>(
    form.gender ? GENDERS.findIndex((g) => g.value === form.gender) : null
  );
```

Replace with:
```tsx
  const [genderIdx, setGenderIdx] = useState<number | null>(
    form.gender ? GENDERS.findIndex((g) => g.value === form.gender) : null
  );
  const { brandSuggestions, nameSuggestions, onNameSelect } =
    usePerfumeAutocomplete();
```

- [ ] **Step 3: Replace the brand input with ComboBox**

Find:
```tsx
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
          <input
            type="text"
            value={form.brand}
            onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            placeholder="e.g. Dior"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
```

Replace with:
```tsx
        <div>
          <ComboBox
            label="Brand"
            placeholder="e.g. Dior"
            value={form.brand}
            onChange={(val) => setForm((f) => ({ ...f, brand: val }))}
            suggestions={brandSuggestions(form.brand)}
            required
            inputClassName="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
```

- [ ] **Step 4: Replace the perfume name input with ComboBox (with brand back-fill on select)**

Find:
```tsx
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Perfume Name *</label>
          <input
            type="text"
            value={form.perfume_name}
            onChange={(e) => setForm((f) => ({ ...f, perfume_name: e.target.value }))}
            placeholder="e.g. Sauvage EDP"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
```

Replace with:
```tsx
        <div>
          <ComboBox
            label="Perfume Name"
            placeholder="e.g. Sauvage EDP"
            value={form.perfume_name}
            onChange={(val) => setForm((f) => ({ ...f, perfume_name: val }))}
            onSelect={(name) => {
              const backfill = onNameSelect(name, form.brand);
              setForm((f) => ({ ...f, perfume_name: name, brand: backfill.brand }));
            }}
            suggestions={nameSuggestions(form.brand, form.perfume_name)}
            required
            inputClassName="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
```

- [ ] **Step 5: Start the dev server and verify manually**

```bash
cd perfume-mvp && npm run dev
```

Navigate to `/dashboard/reviews`. Verify:
1. Typing "latt" in Brand shows "Lattafa" in dropdown
2. Selecting a brand fills the brand field
3. Typing in Perfume Name filters to that brand's perfumes
4. Selecting a perfume name back-fills Brand
5. Keyboard nav works (↑↓ Enter Escape)
6. Free-text entry still works — form submits without selecting a suggestion

- [ ] **Step 6: Commit**

```bash
git add perfume-mvp/app/dashboard/reviews/reviewComponents/ReviewForm.tsx
git commit -m "feat: add autocomplete to ReviewForm brand and perfume name fields"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Typeahead on brand, sub-brand, perfume name — Tasks 4 & 5
- [x] No dropdown until typing — ComboBox: `value.length >= 1` gate
- [x] Suggestions from `perfume_score` + seed — Task 3
- [x] Seed: Middle Eastern + international brands — Task 3
- [x] Linked fields (brand filters names) — `nameSuggestions(brand, query)` in Tasks 4 & 5
- [x] Back-fill on name select — `onNameSelect` + `onSelect` prop in Tasks 4 & 5
- [x] Free-text always allowed — ComboBox never locks input
- [x] ReviewForm: brand + name only (no sub-brand) — Task 5
- [x] ListingForm: all three fields — Task 4
- [x] PerfumeForm deferred — out of scope

**Type consistency:**
- `PerfumeSuggestion` defined in Task 1, imported in Task 3 — consistent
- `usePerfumeAutocomplete` exported from Task 3, imported in Tasks 4 & 5 — consistent
- `ComboBox` props: `onSelect?: (value: string) => void` defined in Task 2, used in Tasks 4 & 5 — consistent
- `inputClassName` prop defined in Task 2, used in Task 5 — consistent
- `brandSuggestions`, `nameSuggestions`, `subBrandSuggestions`, `onNameSelect` — same names throughout
