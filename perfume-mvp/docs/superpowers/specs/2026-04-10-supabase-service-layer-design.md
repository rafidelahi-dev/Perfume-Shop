# Supabase Service Layer Refactor

**Date:** 2026-04-10  
**Status:** Approved  
**Scope:** Centralize all Supabase access into `lib/queries/client/` and `lib/queries/server/`

---

## Problem

31 files currently import Supabase directly. Data fetching logic is scattered across components, hooks, and pages with no structural boundary between browser-client and server-client usage. This makes security audits harder, allows accidental misuse of the wrong client, and creates duplication (e.g., `fetchTrendingPerfumes` lives inline in `TrendingSection.tsx` instead of a shared location).

---

## Goal

- Every `supabase.from()`, `supabase.auth.*`, and `supabase.rpc()` call lives in `lib/queries/`
- `lib/queries/client/` exclusively imports `supabaseClient` (browser)
- `lib/queries/server/` exclusively imports `supabaseServer` (server)
- Components, pages, and hooks import from `lib/queries/*` only — never from `supabaseClient` or `supabaseServer` directly
- API routes and `middleware.ts` are the only permitted exceptions (they are boundary code)

---

## Folder Structure

```
lib/queries/
  client/
    auth.ts           # All supabase.auth.* calls + session helpers
    listings.ts       # Client-side listing queries
    profile.ts        # Client-side profile queries
    reviews.ts        # Client-side review queries
    storage.ts        # File upload helpers
    userPerfumes.ts   # Client-side user perfume queries
    trending.ts       # NEW: perfume_score queries + public listings fetch
    perfumeClicks.ts  # NEW: registerPerfumeClick RPC
  server/
    profile.ts        # NEW: server-side profile lookups
    listings.ts       # NEW: server-side listing lookups
    dashboard.ts      # NEW: server-side session validation for dashboard layout
```

---

## Client Layer (`lib/queries/client/`)

### `auth.ts`
Expands from current `lib/queries/auth.ts`. Gains auth form operations extracted from components:

| Function | Source |
|---|---|
| `getSessionUserId()` | exists |
| `getSession()` | exists |
| `getUserProfile()` | exists |
| `signIn(email, password)` | `LoginClient.tsx` |
| `signUp(email, password)` | `SignupClient.tsx` |
| `signOut()` | `Header.tsx`, `DashboardSidebar.tsx` |
| `resetPassword(email)` | `ResetRequestClient.tsx` |
| `updatePassword(password)` | `RequestUpdateClient.tsx` |
| `onAuthStateChange(callback)` | `useAuthProfile.ts` |

### `listings.ts`
Migrates as-is from `lib/queries/listings.ts`. No new functions.

| Function | Notes |
|---|---|
| `fetchMyListings()` | unchanged |
| `insertListing(values)` | unchanged |
| `fetchPublicListings(filters)` | unchanged |
| `deleteMyListing(id)` | unchanged |

### `profile.ts`
Migrates from `lib/queries/profile.ts`. `changeMyPassword` is removed — it calls `supabase.auth.updateUser` which is an auth operation and consolidates into `auth.ts` as `updatePassword`.

| Function | Notes |
|---|---|
| `fetchMyProfile()` | unchanged |
| `updateMyProfile(patch)` | unchanged |
| ~~`changeMyPassword(newPassword)`~~ | moved to `auth.ts` as `updatePassword` |

### `reviews.ts`
Migrates from `lib/queries/reviews.ts` with `user_id` filters already in place (fixed in prior session).

### `storage.ts`
Migrates as-is from `lib/queries/storage.ts`.

### `userPerfumes.ts`
Migrates as-is from `lib/queries/userPerfumes.ts`.

### `trending.ts` *(new)*
Extracts all inline data fetches from `TrendingSection.tsx` and `PerfumePage.tsx`.

| Function | Source |
|---|---|
| `fetchTrendingNow()` | `TrendingSection.tsx` — `fetchTrendingPerfumes` |
| `fetchTrendingWeek()` | `TrendingSection.tsx` — `fetchTrendingWeek` |
| `fetchTrendingMonth()` | `TrendingSection.tsx` — `fetchTrendingMonth` |
| `fetchTrendingBrands()` | `TrendingSection.tsx` — `fetchTrendingBrands` |
| `fetchPublicPerfumes()` | `PerfumePage.tsx` — `fetchPerfumes` |

### `perfumeClicks.ts` *(new)*
Extracts the inline RPC call from `PerfumeGrid.tsx`.

| Function | Source |
|---|---|
| `registerPerfumeClick(perfumeId)` | `PerfumeGrid.tsx` — `registerPerfumeClick` |

---

## Server Layer (`lib/queries/server/`)

All new. Each function creates a `supabaseServer` instance internally (via `createServerSupabase()`) and returns typed data. Pages become pure rendering components.

### `server/profile.ts`

| Function | Source | Used by |
|---|---|---|
| `fetchProfileByUsername(username)` | inline in page | `app/perfumes/[username]/page.tsx`, `app/perfumes/[username]/[id]/page.tsx` |
| `fetchProfileById(id)` | inline in page | `app/dashboard/profile/page.tsx` |

### `server/listings.ts`

| Function | Source | Used by |
|---|---|---|
| `fetchListingsByUsername(username)` | inline in page | `app/perfumes/[username]/page.tsx` |
| `fetchListingById(id)` | inline in page | `app/perfumes/[username]/[id]/page.tsx` |
| `fetchMyListingById(id)` | inline in page | `app/dashboard/listings/[id]/page.tsx` — session resolved internally, not passed as param |

### `server/dashboard.ts`

| Function | Source | Used by |
|---|---|---|
| `getDashboardSession()` | inline in layout | `app/dashboard/layout.tsx` |

---

## Hook Refactor (`lib/hooks/`)

Hooks become thin React orchestrators. No Supabase imports remain.

### `useSessionUserId.ts`
- Before: calls `supabase.auth.getUser()` directly
- After: calls `getSessionUserId()` from `client/auth.ts`

### `useAuthProfile.ts`
- Before: sets up `supabase.auth.onAuthStateChange` subscription directly
- After: calls `onAuthStateChange(cb)` from `client/auth.ts` for the subscription setup; manages state and lifecycle only

---

## Component & Page Changes

Pure import surgery — no logic, render, or prop signature changes.

| File | Change |
|---|---|
| `TrendingSection.tsx` | Delete 4 inline fetch functions → import from `client/trending.ts` |
| `PerfumePage.tsx` | Delete inline `fetchPerfumes` → import `fetchPublicPerfumes` from `client/trending.ts` |
| `PerfumeGrid.tsx` | Delete inline `registerPerfumeClick` → import from `client/perfumeClicks.ts` |
| `LoginClient.tsx` | Delete `supabase.auth.signInWithPassword` → import `signIn` from `client/auth.ts` |
| `SignupClient.tsx` | Delete `supabase.auth.signUp` → import `signUp` from `client/auth.ts` |
| `ResetRequestClient.tsx` | Delete `supabase.auth.resetPasswordForEmail` → import `resetPassword` from `client/auth.ts` |
| `RequestUpdateClient.tsx` | Delete `supabase.auth.updateUser` → import `updatePassword` from `client/auth.ts` |
| `Header.tsx` | Delete `supabase.auth.signOut` → import `signOut` from `client/auth.ts` |
| `DashboardSidebar.tsx` | Delete `supabase.auth.signOut` → import `signOut` from `client/auth.ts` |
| `app/perfumes/[username]/page.tsx` | Delete inline server queries → import from `server/profile.ts`, `server/listings.ts` |
| `app/perfumes/[username]/[id]/page.tsx` | Delete inline server queries → import from `server/profile.ts`, `server/listings.ts` |
| `app/dashboard/layout.tsx` | Delete inline server query → import `getDashboardSession` from `server/dashboard.ts` |
| `app/dashboard/listings/[id]/page.tsx` | Delete inline server query → import `fetchMyListingById` from `server/listings.ts` |
| `app/dashboard/profile/page.tsx` | Delete inline server query → import `fetchProfileById` from `server/profile.ts` |

---

## Exclusions

| File | Reason |
|---|---|
| `app/api/*/route.ts` | API routes are boundary code — thin auth-check + RPC, no duplication, correct already |
| `lib/ensureProfile.ts` | Standalone server utility, no change needed |
| `middleware.ts` | Must use Supabase directly by Next.js middleware contract |

---

## Constraints

- No component render logic changes
- No prop signature changes
- No new abstractions beyond the folder split
- Existing `lib/queries/*.ts` root files are deleted after migration (no parallel systems)
- Each file in `client/` or `server/` imports Supabase exactly once, at the top of the file

---

## Success Criteria

- Zero direct `supabase` imports in any file outside `lib/queries/`, `lib/supabaseClient.ts`, `lib/supabaseServer.ts`, `lib/ensureProfile.ts`, `middleware.ts`, and `app/api/`
- `lib/queries/client/` contains no import from `supabaseServer`
- `lib/queries/server/` contains no import from `supabaseClient`
- All existing functionality works unchanged
