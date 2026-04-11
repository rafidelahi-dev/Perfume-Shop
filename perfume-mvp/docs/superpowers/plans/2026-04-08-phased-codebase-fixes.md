# Phased Codebase Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical UX bugs, missing SEO metadata, dead code, and auth flash across the Perfume Shop Next.js app in four progressive phases.

**Architecture:** Fixes proceed from highest-impact user-facing issues (double burger, auth flash) → SEO metadata → dead code removal → auth data-flow consolidation. Each phase is independently deployable. No new abstractions are introduced beyond what the fix requires.

**Tech Stack:** Next.js 14 App Router, Supabase SSR, React Query (TanStack), Tailwind CSS, TypeScript

---

## Phase 1: Critical UX Bugs

### Task 1: Fix Double Burger Menu on Dashboard

**Problem:** On `/dashboard` routes, both `Header.tsx` (mobile burger, `md:hidden`) and `DashboardSidebar.tsx` (mobile burger, `lg:hidden fixed top-4 left-4`) are rendered simultaneously. Below 768 px both buttons are visible at the same time.

**Files:**
- Modify: `perfume-mvp/components/Header.tsx`

- [ ] **Step 1: Add `hideMobileBurger` prop to Header**

In `perfume-mvp/components/Header.tsx`, change the function signature from:

```tsx
export default function Header() {
```

to:

```tsx
export default function Header({ hideMobileBurger = false }: { hideMobileBurger?: boolean }) {
```

- [ ] **Step 2: Conditionally render the mobile burger button**

Find the mobile menu button block (around line 145–156):

```tsx
          {/* Mobile Menu Button */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
```

Replace the opening `<button` tag so it respects the prop:

```tsx
          {/* Mobile Menu Button */}
          {!hideMobileBurger && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="sr-only">Menu</span>
            {open ? (
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            )}
          </button>
          )}
```

Also remove the original closing `</button>` that was part of the replaced block (it is now inside the conditional).

- [ ] **Step 3: Pass `hideMobileBurger` from Dashboard layout**

In `perfume-mvp/app/dashboard/layout.tsx`, change:

```tsx
      <Header />
```

to:

```tsx
      <Header hideMobileBurger />
```

- [ ] **Step 4: Verify visually**

Run `npm run dev` from `perfume-mvp/`, navigate to `/dashboard` on a narrow viewport (< 768 px). Confirm only one hamburger icon is visible (top-left, the sidebar's own burger). Navigate to `/` and confirm the Header's hamburger still appears on narrow viewports.

- [ ] **Step 5: Commit**

```bash
git add perfume-mvp/components/Header.tsx perfume-mvp/app/dashboard/layout.tsx
git commit -m "fix: hide Header mobile burger on dashboard routes to remove double hamburger"
```

---

### Task 2: Fix Auth Flash in Header

**Problem:** `Header.tsx` initialises `useAuthProfile` with `loading: true` and `isAuthenticated: false`. During the async session fetch, the header renders unauthenticated UI (Log in / Sign up buttons), then snaps to the user chip. This is a visible flash every page load.

**Files:**
- Modify: `perfume-mvp/components/Header.tsx`

- [ ] **Step 1: Add a loading skeleton to replace auth buttons during load**

In `Header.tsx`, find the desktop nav section that conditionally renders auth UI (around line 118–142):

```tsx
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                ...
              </div>
            ) : (
              <div className="flex items-center gap-3 ml-2">
                <Link href={`/login?next=${next}`} ...>Log in</Link>
                <Link href={`/signup?next=${next}`} ...>Sign up</Link>
              </div>
            )}
```

Replace the entire conditional with:

```tsx
            {loading ? (
              <div className="flex items-center gap-3 ml-2 animate-pulse">
                <div className="h-8 w-16 rounded-full bg-gray-200" />
                <div className="h-9 w-24 rounded-full bg-gray-200" />
              </div>
            ) : isAuthenticated ? (
              <div className="flex items-center gap-2">
                <NavLink href="/dashboard" label="Dashboard" />
                <UserChip />
                <button
                  onClick={logout}
                  className="ml-2 rounded-full p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 ml-2">
                <Link href={`/login?next=${next}`} className="text-sm font-medium hover:text-[#d4af37] transition-colors">
                  Log in
                </Link>
                <Link
                  href={`/signup?next=${next}`}
                  className="rounded-full bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#333] hover:shadow-lg"
                >
                  Sign up
                </Link>
              </div>
            )}
```

- [ ] **Step 2: Apply the same loading skeleton in the Mobile Drawer**

Inside the mobile drawer section (around line 160–217), find:

```tsx
            {isAuthenticated ? (
              <>
                <Link href="/dashboard/profile" ...>
```

Replace with:

```tsx
            {loading ? (
              <div className="flex flex-col gap-3 mt-4 animate-pulse">
                <div className="h-14 rounded-xl bg-gray-100" />
                <div className="h-10 rounded-lg bg-gray-100" />
              </div>
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 shadow-sm"
                  onClick={() => setOpen(false)}
                >
                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                    <Image
                      src={safeAvatar}
                      alt={displayName || "User avatar"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{displayName}</span>
                    <span className="text-xs text-gray-500">View Profile</span>
                  </div>
                </Link>

                <NavLink href="/dashboard" label="Dashboard" />
                
                <button
                  onClick={() => { logout(); setOpen(false); }}
                  className="mt-4 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3 mt-4">
                 <Link
                  href={`/login?next=${next}`}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-sm font-medium"
                  onClick={() => setOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href={`/signup?next=${next}`}
                  className="w-full rounded-lg bg-[#1a1a1a] px-4 py-3 text-center text-sm font-medium text-white"
                  onClick={() => setOpen(false)}
                >
                  Create Account
                </Link>
              </div>
            )}
```

- [ ] **Step 3: Verify no flash**

Run `npm run dev`, open `/` in an incognito window. Confirm the header shows grey skeletons briefly instead of "Log in / Sign up" buttons popping in/out.

- [ ] **Step 4: Commit**

```bash
git add perfume-mvp/components/Header.tsx
git commit -m "fix: replace auth flash with skeleton during session load in Header"
```

---

## Phase 2: SEO — OG Tags

### Task 3: Add generateMetadata to Listing Detail Page

**Problem:** `app/perfumes/[username]/[id]/page.tsx` has no `generateMetadata()`, so shared links show the default site title and logo. This is the highest-value shareable page.

**Files:**
- Modify: `perfume-mvp/app/perfumes/[username]/[id]/page.tsx`

- [ ] **Step 1: Add the generateMetadata export**

At the top of `perfume-mvp/app/perfumes/[username]/[id]/page.tsx`, after the imports, add:

```tsx
export async function generateMetadata({ params }: Props): Promise<import("next").Metadata> {
  const { username, id } = await params;
  const supabase = await createServerSupabase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("username", username)
    .single();

  const { data: listing } = await supabase
    .from("listings")
    .select("brand, perfume_name, type, price, min_price, images")
    .eq("id", id)
    .single();

  if (!listing || !profile) {
    return { title: "Listing Not Found | CloudPerfumeBD" };
  }

  const isDecant = (listing.type ?? "").toLowerCase() === "decant";
  const priceNum = isDecant && listing.min_price != null
    ? Number(listing.min_price)
    : Number(listing.price ?? NaN);
  const priceText = Number.isFinite(priceNum) ? `TK${priceNum.toFixed(0)}` : "Price on Contact";

  const title = `${listing.brand} — ${listing.perfume_name} | ${profile.display_name ?? profile.username}`;
  const description = `${listing.type?.toUpperCase()} • ${priceText} • Sold by ${profile.display_name ?? profile.username} on CloudPerfumeBD`;
  const image = Array.isArray(listing.images) && listing.images[0]
    ? (listing.images as string[])[0]
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: listing.perfume_name }] } : {}),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
```

- [ ] **Step 2: Verify metadata in browser**

Run `npm run dev`, navigate to any listing page (e.g. `/perfumes/someuser/some-id`). Open browser DevTools → Elements → `<head>`. Confirm `<meta property="og:title" ...>` and `<meta property="og:image" ...>` are present with the correct listing values.

- [ ] **Step 3: Commit**

```bash
git add perfume-mvp/app/perfumes/[username]/[id]/page.tsx
git commit -m "feat: add generateMetadata with OG/Twitter tags to listing detail page"
```

---

### Task 4: Add generateMetadata to Seller Profile Page

**Problem:** `app/perfumes/[username]/page.tsx` also has no metadata, so shared seller profile links show the default site title.

**Files:**
- Modify: `perfume-mvp/app/perfumes/[username]/page.tsx`
- Read first to check current structure.

- [ ] **Step 1: Read the file to confirm imports and Props type**

Read `perfume-mvp/app/perfumes/[username]/page.tsx` to confirm the Props type and what data is fetched (profile, listings count, etc).

- [ ] **Step 2: Add generateMetadata export**

After the existing imports and before the default export, insert:

```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<import("next").Metadata> {
  const { username } = await params;
  const supabase = await createServerSupabase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_url")
    .eq("username", username)
    .single();

  if (!profile) {
    return { title: "Seller Not Found | CloudPerfumeBD" };
  }

  const displayName = profile.display_name ?? profile.username;
  const title = `${displayName}'s Perfumes | CloudPerfumeBD`;
  const description = profile.bio
    ? `${profile.bio} — Browse ${displayName}'s perfume listings on CloudPerfumeBD.`
    : `Browse ${displayName}'s perfume listings on CloudPerfumeBD.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(profile.avatar_url
        ? { images: [{ url: profile.avatar_url, width: 400, height: 400, alt: displayName }] }
        : {}),
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(profile.avatar_url ? { images: [profile.avatar_url] } : {}),
    },
  };
}
```

- [ ] **Step 3: Verify**

Run `npm run dev`, navigate to `/perfumes/someusername`. Check DevTools head for `og:title`. Confirm it shows the seller's name.

- [ ] **Step 4: Commit**

```bash
git add perfume-mvp/app/perfumes/[username]/page.tsx
git commit -m "feat: add generateMetadata with OG tags to seller profile page"
```

---

## Phase 3: Code Quality

### Task 5: Remove Dead File DashbaordOverviewClient.tsx

**Problem:** `app/dashboard/DashbaordOverviewClient.tsx` is a stale unused file (typo in name, accepts a `userId` prop, has no callers). The live dashboard is `app/dashboard/page.tsx`. The dead file adds confusion and is never bundled, but its presence suggests it should be used.

**Files:**
- Delete: `perfume-mvp/app/dashboard/DashbaordOverviewClient.tsx`

- [ ] **Step 1: Confirm no imports of DashbaordOverviewClient**

Run:

```bash
grep -r "DashbaordOverviewClient" perfume-mvp/app perfume-mvp/components perfume-mvp/lib
```

Expected: no output (zero matches means it is safe to delete).

- [ ] **Step 2: Delete the file**

```bash
rm perfume-mvp/app/dashboard/DashbaordOverviewClient.tsx
```

- [ ] **Step 3: Confirm build still works**

```bash
cd perfume-mvp && npm run build 2>&1 | tail -20
```

Expected: build completes without errors referencing DashbaordOverviewClient.

- [ ] **Step 4: Commit**

```bash
git add -u perfume-mvp/app/dashboard/DashbaordOverviewClient.tsx
git commit -m "chore: remove unused DashbaordOverviewClient.tsx dead file"
```

---

### Task 6: Consolidate Logout — Remove Duplicate in Header on Dashboard

**Problem:** Both `Header.tsx` (desktop nav logout button) and `DashboardSidebar.tsx` have logout buttons. On `/dashboard`, users see two logout paths. The sidebar's logout is the primary one for dashboard; the header logout is redundant and calls `router.refresh()` (inconsistent with sidebar's `router.replace("/login")`).

**Files:**
- Modify: `perfume-mvp/components/Header.tsx`
- Modify: `perfume-mvp/app/dashboard/layout.tsx`

**Strategy:** Add a `hideLogout` prop to `Header`. The dashboard layout passes `hideLogout` since the sidebar already handles logout.

- [ ] **Step 1: Add `hideLogout` prop to Header**

In `perfume-mvp/components/Header.tsx`, change the function signature to:

```tsx
export default function Header({
  hideMobileBurger = false,
  hideLogout = false,
}: {
  hideMobileBurger?: boolean;
  hideLogout?: boolean;
}) {
```

- [ ] **Step 2: Wrap the desktop logout button**

Find the desktop logout button (around line 122–129 after Task 2's changes):

```tsx
                <button
                  onClick={logout}
                  className="ml-2 rounded-full p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Logout"
                >
                  ...
                </button>
```

Wrap it:

```tsx
                {!hideLogout && (
                <button
                  onClick={logout}
                  className="ml-2 rounded-full p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                </button>
                )}
```

- [ ] **Step 3: Wrap the mobile drawer Sign Out button**

Find the mobile "Sign Out" button in the drawer section:

```tsx
                <button
                  onClick={() => { logout(); setOpen(false); }}
                  className="mt-4 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600"
                >
                  Sign Out
                </button>
```

Wrap it:

```tsx
                {!hideLogout && (
                <button
                  onClick={() => { logout(); setOpen(false); }}
                  className="mt-4 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600"
                >
                  Sign Out
                </button>
                )}
```

- [ ] **Step 4: Pass `hideLogout` from Dashboard layout**

In `perfume-mvp/app/dashboard/layout.tsx`, change:

```tsx
      <Header hideMobileBurger />
```

to:

```tsx
      <Header hideMobileBurger hideLogout />
```

- [ ] **Step 5: Verify**

Run `npm run dev`. On `/dashboard`, desktop viewport: confirm the logout icon is gone from the header, only the sidebar logout remains. On `/` (non-dashboard), confirm the logout button is still visible in the header when authenticated.

- [ ] **Step 6: Commit**

```bash
git add perfume-mvp/components/Header.tsx perfume-mvp/app/dashboard/layout.tsx
git commit -m "fix: hide redundant Header logout on dashboard routes, sidebar is authoritative"
```

---

## Phase 4: Auth Data-Flow — Eliminate Client-Side Profile Fetch on Dashboard

### Task 7: Pass auth state from DashboardLayout server component to Header

**Problem:** On `/dashboard` routes, the server-side `DashboardLayout` already fetches the authenticated user (via `supabase.auth.getUser()`). Despite this, `Header.tsx` runs a second async client-side session + profile fetch via `useAuthProfile`, causing the auth flash (partially addressed by Phase 1 Task 2's skeleton) and extra Supabase round-trips.

**Goal:** On dashboard, pass the server-fetched user data into a static header slot so `useAuthProfile` never has to run on `/dashboard`.

**Files:**
- Modify: `perfume-mvp/app/dashboard/layout.tsx`
- Modify: `perfume-mvp/components/Header.tsx`
- Modify: `perfume-mvp/lib/supabaseServer.ts` (read first to check available exports)

- [ ] **Step 1: Fetch profile data in DashboardLayout**

In `perfume-mvp/app/dashboard/layout.tsx`, after the existing `getUser()` call, add a profile fetch:

```tsx
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email ?? null;

  // Fetch profile for Header pre-population
  let displayName: string | null = null;
  let avatarUrl: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("id", user.id)
      .single();
    displayName = profile?.display_name ?? profile?.username ?? null;
    avatarUrl = profile?.avatar_url ?? null;
  }
```

- [ ] **Step 2: Add `initialAuth` prop to Header**

In `perfume-mvp/components/Header.tsx`, extend the props:

```tsx
export default function Header({
  hideMobileBurger = false,
  hideLogout = false,
  initialAuth,
}: {
  hideMobileBurger?: boolean;
  hideLogout?: boolean;
  initialAuth?: {
    isAuthenticated: boolean;
    displayName: string | null;
    avatarUrl: string | null;
  };
}) {
```

- [ ] **Step 3: Use initialAuth to pre-populate useAuthProfile state**

At the top of the Header function body, replace:

```tsx
  const { loading, isAuthenticated, displayName, avatarUrl } = useAuthProfile();
```

with:

```tsx
  const authProfile = useAuthProfile(initialAuth);
  const { loading, isAuthenticated, displayName, avatarUrl } = authProfile;
```

- [ ] **Step 4: Update useAuthProfile to accept initialAuth**

In `perfume-mvp/lib/hooks/useAuthProfile.ts`, change the function signature and initial state:

```ts
export function useAuthProfile(initialAuth?: {
  isAuthenticated: boolean;
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const [loading, setLoading] = useState(!initialAuth);
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth?.isAuthenticated ?? false);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(initialAuth?.displayName ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAuth?.avatarUrl ?? null);
```

Keep the rest of the hook exactly the same — `loadFromSession` will still run and update state once the client-side session is confirmed, but the initial render will not flash because we already have the server-side values.

- [ ] **Step 5: Pass initialAuth from DashboardLayout to Header**

In `perfume-mvp/app/dashboard/layout.tsx`, change:

```tsx
      <Header hideMobileBurger hideLogout />
```

to:

```tsx
      <Header
        hideMobileBurger
        hideLogout
        initialAuth={{
          isAuthenticated: !!user,
          displayName,
          avatarUrl,
        }}
      />
```

- [ ] **Step 6: Verify zero flash on dashboard**

Run `npm run dev`. Hard-refresh `/dashboard`. The header should immediately show the user chip with the correct name and avatar — no skeleton flash, no "Log in" flash.

- [ ] **Step 7: Verify non-dashboard pages are unaffected**

Navigate to `/` and `/perfumes`. The header should still work correctly without any `initialAuth` (falls back to the hook's client-side fetch).

- [ ] **Step 8: Commit**

```bash
git add perfume-mvp/app/dashboard/layout.tsx perfume-mvp/components/Header.tsx perfume-mvp/lib/hooks/useAuthProfile.ts
git commit -m "perf: pre-populate Header auth state from server on dashboard to eliminate client-side flash"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Double burger on /dashboard — Task 1
- [x] Auth flash on page load — Tasks 2 & 7
- [x] No OG tags on listing detail — Task 3
- [x] No OG tags on seller profile — Task 4
- [x] Dead file DashbaordOverviewClient.tsx — Task 5
- [x] Duplicate logout buttons on dashboard — Task 6
- [x] Consolidate server vs client auth reads — Task 7

**Type consistency:**
- `hideMobileBurger` and `hideLogout` are introduced in Task 1/6 and used in Task 7 — consistent throughout
- `initialAuth` shape `{ isAuthenticated, displayName, avatarUrl }` defined in Task 4 and matched in Tasks 5 and the hook update in Task 4 — consistent
- `useAuthProfile(initialAuth?)` signature change in Task 4 is backward-compatible (optional param) — existing non-dashboard callers pass nothing

**Placeholder scan:** No TBD/TODO placeholders present. All code blocks are complete.
