# Supabase Service Layer Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every `supabase.from()`, `supabase.auth.*`, and `supabase.rpc()` call out of components, pages, and hooks into a centralized `lib/queries/client/` and `lib/queries/server/` layer with a hard folder boundary enforcing which Supabase instance each layer may import.

**Architecture:** `lib/queries/client/` holds plain async functions using the browser Supabase client; `lib/queries/server/` holds plain async functions using the server Supabase client. Components and hooks import from these folders only — never from `supabaseClient` or `supabaseServer` directly. API routes and `middleware.ts` remain the only permitted exceptions.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase JS v2, `@supabase/ssr`

---

## File Map

**Create:**
- `lib/queries/client/auth.ts` — all `supabase.auth.*` calls + session helpers
- `lib/queries/client/listings.ts` — client-side listing queries + image upload
- `lib/queries/client/profile.ts` — client-side profile queries + username check
- `lib/queries/client/reviews.ts` — client-side review queries
- `lib/queries/client/storage.ts` — generic bucket upload
- `lib/queries/client/userPerfumes.ts` — user perfume queries
- `lib/queries/client/trending.ts` — perfume_score queries + public listings fetch
- `lib/queries/client/perfumeClicks.ts` — registerPerfumeClick RPC
- `lib/queries/server/profile.ts` — server-side profile lookups by username
- `lib/queries/server/listings.ts` — server-side listing lookups
- `lib/queries/server/dashboard.ts` — server-side session for dashboard layout

**Modify:**
- `lib/hooks/useSessionUserId.ts`
- `lib/hooks/useAuthProfile.ts`
- `components/Header.tsx`
- `components/DashboardSidebar.tsx`
- `app/(auth)/login/LoginClient.tsx`
- `app/(auth)/signup/SignupClient.tsx`
- `app/(auth)/reset/ResetRequestClient.tsx`
- `app/(auth)/reset/update/RequestUpdateClient.tsx`
- `components/TrendingSection.tsx`
- `app/perfumes/components/PerfumePage.tsx`
- `app/perfumes/components/PerfumeGrid.tsx`
- `app/dashboard/listings/[id]/page.tsx`
- `app/dashboard/profile/page.tsx`
- `app/perfumes/[username]/page.tsx`
- `app/perfumes/[username]/[id]/page.tsx`
- `app/dashboard/layout.tsx`

**Delete (last task only):**
- `lib/queries/auth.ts`
- `lib/queries/listings.ts`
- `lib/queries/profile.ts`
- `lib/queries/reviews.ts`
- `lib/queries/storage.ts`
- `lib/queries/userPerfumes.ts`

---

## Task 1: Create `lib/queries/client/auth.ts`

**Files:**
- Create: `perfume-mvp/lib/queries/client/auth.ts`

- [ ] **Step 1: Create the file**

```typescript
import { supabase } from "@/lib/supabaseClient";

export async function getSessionUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error("Not Authenticated");
  return id;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getUserProfile() {
  const session = await getSession();
  const user = session?.user;
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", user.id)
    .single();
  return { user, profile: profile ?? null };
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithOAuth(
  provider: "google",
  redirectTo?: string
) {
  return supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
}

export async function signUp(
  email: string,
  password: string,
  options?: { data?: Record<string, unknown> }
) {
  return supabase.auth.signUp({ email, password, options });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resetPassword(email: string, redirectTo: string) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}

export function onAuthStateChange(
  callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]
) {
  return supabase.auth.onAuthStateChange(callback);
}
```

- [ ] **Step 2: Run type check**

```bash
cd perfume-mvp && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `lib/queries/client/auth.ts`

- [ ] **Step 3: Commit**

```bash
git add perfume-mvp/lib/queries/client/auth.ts
git commit -m "feat: add lib/queries/client/auth.ts service layer"
```

---

## Task 2: Create `lib/queries/client/listings.ts`

**Files:**
- Create: `perfume-mvp/lib/queries/client/listings.ts`

- [ ] **Step 1: Create the file**

```typescript
import { supabase } from "@/lib/supabaseClient";
import { getSessionUserId } from "./auth";

export async function fetchMyListings() {
  const userId = await getSessionUserId();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchListingById(id: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateListing(
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  const userId = await getSessionUserId();
  const { error } = await supabase
    .from("listings")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function insertListing(values: Record<string, unknown>) {
  const userId = await getSessionUserId();
  const { error } = await supabase
    .from("listings")
    .insert({ user_id: userId, ...values });
  if (error) throw error;
}

export async function fetchPublicListings(filters: {
  brand?: string;
  q?: string;
}) {
  let query = supabase
    .from("listings")
    .select(`*, profiles:profiles(display_name, username)`)
    .order("created_at", { ascending: false });
  if (filters.brand) query = query.ilike("brand", `%${filters.brand}%`);
  if (filters.q)
    query = query.or(
      `perfume_name.ilike.%${filters.q}%,brand.ilike.%${filters.q}%,sub_brand.ilike.%${filters.q}%`
    );
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function deleteMyListing(id: string) {
  const userId = await getSessionUserId();
  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function uploadListingImage(
  file: File,
  userId: string
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("listing-images")
    .upload(path, file, { cacheControl: "3600", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] **Step 2: Run type check**

```bash
cd perfume-mvp && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add perfume-mvp/lib/queries/client/listings.ts
git commit -m "feat: add lib/queries/client/listings.ts service layer"
```

---

## Task 3: Create `lib/queries/client/profile.ts`

**Files:**
- Create: `perfume-mvp/lib/queries/client/profile.ts`

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { supabase } from "@/lib/supabaseClient";
import { getSessionUserId } from "./auth";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  contact_number: string | null;
  messenger_link: string | null;
  facebook_link: string | null;
  whatsapp_number: string | null;
  website: string | null;
  location: string | null;
  bio: string | null;
  created_at?: string;
  updated_at?: string;
  email?: string | null;
  phone_verified?: boolean;
};

export async function fetchMyProfile(): Promise<Profile> {
  const userId = await getSessionUserId();
  const [{ data: sessionData }, { data, error }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.from("profiles").select("*").eq("id", userId).single(),
  ]);
  if (error) throw error;
  return {
    ...(data as Profile),
    email: sessionData.session?.user?.email ?? null,
  };
}

export async function updateMyProfile(patch: Partial<Profile>): Promise<void> {
  const userId = await getSessionUserId();
  const payload = {
    display_name: patch.display_name ?? null,
    avatar_url: patch.avatar_url ?? null,
    contact_number: patch.contact_number ?? null,
    messenger_link: patch.messenger_link ?? null,
    facebook_link: patch.facebook_link ?? null,
    whatsapp_number: patch.whatsapp_number ?? null,
    website: patch.website ?? null,
    location: patch.location ?? null,
    bio: patch.bio ?? null,
  };
  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId);
  if (error) throw error;
}

export async function checkUsernameAvailability(
  username: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .limit(1);
  return !data?.length && !error;
}
```

- [ ] **Step 2: Run type check**

```bash
cd perfume-mvp && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add perfume-mvp/lib/queries/client/profile.ts
git commit -m "feat: add lib/queries/client/profile.ts service layer"
```

---

## Task 4: Create `lib/queries/client/reviews.ts`

**Files:**
- Create: `perfume-mvp/lib/queries/client/reviews.ts`

- [ ] **Step 1: Create the file**

```typescript
import { supabase } from "@/lib/supabaseClient";
import { getSessionUserId } from "./auth";

export type Review = {
  id: string;
  user_id: string;
  perfume_name: string;
  brand: string;
  category: string;
  sub_category: string | null;
  images: string[];
  review_text: string | null;
  rating: "love" | "like" | "okay" | "dislike" | "hate" | null;
  when_to_wear: string[];
  gender:
    | "very_masculine"
    | "masculine"
    | "unisex"
    | "feminine"
    | "very_feminine"
    | null;
  longevity: "0-2h" | "2-5h" | "5-7h" | "7-10h" | "10h+" | null;
  created_at: string;
  updated_at: string;
};

export type ReviewInsert = Omit<
  Review,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export async function fetchMyReviews(): Promise<Review[]> {
  const userId = await getSessionUserId();
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertReview(input: ReviewInsert): Promise<void> {
  const userId = await getSessionUserId();
  const { error } = await supabase
    .from("reviews")
    .insert({ ...input, user_id: userId });
  if (error) throw error;
}

export async function updateReview(
  id: string,
  input: Partial<ReviewInsert>
): Promise<void> {
  const userId = await getSessionUserId();
  const { error } = await supabase
    .from("reviews")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteReview(id: string): Promise<void> {
  const userId = await getSessionUserId();
  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
```

- [ ] **Step 2: Run type check**

```bash
cd perfume-mvp && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add perfume-mvp/lib/queries/client/reviews.ts
git commit -m "feat: add lib/queries/client/reviews.ts service layer"
```

---

## Task 5: Create `lib/queries/client/storage.ts`, `userPerfumes.ts`, `perfumeClicks.ts`, `trending.ts`

**Files:**
- Create: `perfume-mvp/lib/queries/client/storage.ts`
- Create: `perfume-mvp/lib/queries/client/userPerfumes.ts`
- Create: `perfume-mvp/lib/queries/client/perfumeClicks.ts`
- Create: `perfume-mvp/lib/queries/client/trending.ts`

- [ ] **Step 1: Create `client/storage.ts`**

```typescript
import { supabase } from "@/lib/supabaseClient";
import { getSessionUserId } from "./auth";

export async function uploadToBucket(
  bucket: string,
  files: File[]
): Promise<string[]> {
  const userId = await getSessionUserId();
  const urls: string[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${userId}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: "3600", upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}
```

- [ ] **Step 2: Create `client/userPerfumes.ts`**

```typescript
import { supabase } from "@/lib/supabaseClient";
import { getSessionUserId } from "./auth";

export async function fetchMyPerfumes() {
  const userId = await getSessionUserId();
  const { data, error } = await supabase
    .from("user_perfumes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertMyPerfumes(input: {
  brand: string;
  sub_brand?: string;
  name: string;
  images: string[];
}) {
  const userId = await getSessionUserId();
  const { error } = await supabase.from("user_perfumes").insert({
    user_id: userId,
    brand: input.brand,
    sub_brand: input.sub_brand || null,
    name: input.name,
    images: input.images,
  });
  if (error) throw error;
}

export async function deleteMyPerfume(input: { id: string }) {
  const userId = await getSessionUserId();
  const { error } = await supabase
    .from("user_perfumes")
    .delete()
    .eq("id", input.id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateMyPerfume(input: {
  id: string;
  brand: string;
  sub_brand?: string | null;
  name: string;
  images: string[];
}) {
  const userId = await getSessionUserId();
  const { error } = await supabase
    .from("user_perfumes")
    .update({
      brand: input.brand,
      sub_brand: input.sub_brand ?? null,
      name: input.name,
      images: input.images,
    })
    .eq("id", input.id)
    .eq("user_id", userId);
  if (error) throw error;
}
```

- [ ] **Step 3: Create `client/perfumeClicks.ts`**

```typescript
import { supabase } from "@/lib/supabaseClient";

export async function registerPerfumeClick(
  perfumeId: string | null | undefined
): Promise<void> {
  if (!perfumeId) return;
  const { error } = await supabase.rpc("increment_perfume_click", {
    p_perfume_id: perfumeId,
  });
  if (error) console.warn("increment_perfume_click failed:", error.message);
}
```

- [ ] **Step 4: Create `client/trending.ts`**

```typescript
import { supabase } from "@/lib/supabaseClient";

export async function fetchTrendingNow() {
  const { data, error } = await supabase
    .from("perfume_score")
    .select(
      "id, brand, perfume_name, sub_brand, min_price, representative_images, click_score, last_clicked_at"
    )
    .order("click_score", { ascending: false })
    .order("last_clicked_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data ?? [];
}

export async function fetchTrendingWeek() {
  const { data, error } = await supabase
    .from("perfume_score")
    .select("*")
    .gte(
      "last_clicked_at",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    )
    .order("click_score", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data ?? [];
}

export async function fetchTrendingMonth() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const { data, error } = await supabase
    .from("perfume_score")
    .select("*")
    .gte("last_clicked_at", startOfMonth.toISOString())
    .order("click_score", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function fetchTrendingBrands() {
  const { data, error } = await supabase.rpc("get_trending_brands").limit(9);
  if (error) throw error;
  return data ?? [];
}

export async function fetchPublicPerfumes() {
  const { data, error } = await supabase
    .from("listings")
    .select(`
      id, perfume_id, brand, perfume_name, sub_brand, price, min_price,
      type, bottle_size_ml, partial_left_ml, decant_options, images,
      profiles:profiles!inner(
        id, username, display_name, avatar_url,
        contact_number, messenger_link, whatsapp_number
      )
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 5: Run type check**

```bash
cd perfume-mvp && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors

- [ ] **Step 6: Commit**

```bash
git add perfume-mvp/lib/queries/client/
git commit -m "feat: add remaining client query files (storage, userPerfumes, perfumeClicks, trending)"
```

---

## Task 6: Create `lib/queries/server/` layer

**Files:**
- Create: `perfume-mvp/lib/queries/server/profile.ts`
- Create: `perfume-mvp/lib/queries/server/listings.ts`
- Create: `perfume-mvp/lib/queries/server/dashboard.ts`

- [ ] **Step 1: Create `server/profile.ts`**

```typescript
import { createServerSupabase } from "@/lib/supabaseServer";

export async function fetchProfileByUsername(username: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, contact_number, bio, whatsapp_number, messenger_link, facebook_link"
    )
    .eq("username", username)
    .single();
  if (error) return null;
  return data;
}

export async function fetchProfileMetaByUsername(username: string) {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url")
    .eq("username", username)
    .single();
  return data ?? null;
}
```

- [ ] **Step 2: Create `server/listings.ts`**

```typescript
import { createServerSupabase } from "@/lib/supabaseServer";

export async function fetchListingsByUserId(userId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("listings")
    .select("id, brand, perfume_name, sub_brand, price, type, min_price, images")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function fetchListingByIdAndOwner(
  listingId: string,
  userId: string
) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, brand, perfume_name, sub_brand, type, price, min_price, decant_options, images, created_at"
    )
    .eq("id", listingId)
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data;
}

export async function fetchListingMetaByIdAndOwner(
  listingId: string,
  userId: string
) {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("listings")
    .select("brand, perfume_name, type, price, min_price, images")
    .eq("id", listingId)
    .eq("user_id", userId)
    .single();
  return data ?? null;
}
```

- [ ] **Step 3: Create `server/dashboard.ts`**

```typescript
import { createServerSupabase } from "@/lib/supabaseServer";

export async function getDashboardSession() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, email: null, displayName: null, avatarUrl: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    user,
    email: user.email ?? null,
    displayName: profile?.display_name || profile?.username || "User",
    avatarUrl: profile?.avatar_url ?? null,
  };
}
```

- [ ] **Step 4: Run type check**

```bash
cd perfume-mvp && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors

- [ ] **Step 5: Commit**

```bash
git add perfume-mvp/lib/queries/server/
git commit -m "feat: add lib/queries/server/ layer (profile, listings, dashboard)"
```

---

## Task 7: Refactor hooks

**Files:**
- Modify: `perfume-mvp/lib/hooks/useSessionUserId.ts`
- Modify: `perfume-mvp/lib/hooks/useAuthProfile.ts`

- [ ] **Step 1: Replace `useSessionUserId.ts`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { getSessionUserId, onAuthStateChange } from "@/lib/queries/client/auth";

export function useSessionUserId() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const id = await getSessionUserId();
        if (!cancelled) setUserId(id);
      } catch {
        if (!cancelled) setUserId(null);
      }
    };

    void load();

    const { data: listener } = onAuthStateChange((_event, session) => {
      if (!cancelled) setUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return userId;
}
```

- [ ] **Step 2: Replace `useAuthProfile.ts`**

```typescript
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getSession,
  getUserProfile,
  onAuthStateChange,
} from "@/lib/queries/client/auth";

export function useAuthProfile(initialAuth?: {
  isAuthenticated: boolean;
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const [loading, setLoading] = useState(!initialAuth);
  const [isAuthenticated, setIsAuthenticated] = useState(
    initialAuth?.isAuthenticated ?? false
  );
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(
    initialAuth?.displayName ?? null
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    initialAuth?.avatarUrl ?? null
  );

  const hadInitialAuth = useRef(!!initialAuth);

  const loadFromSession = useCallback(async () => {
    setLoading(true);
    const session = await getSession();
    const user = session?.user || null;

    if (!user) {
      setIsAuthenticated(false);
      setEmail(null);
      setDisplayName(null);
      setAvatarUrl(null);
      setLoading(false);
      return;
    }

    const { profile } = await getUserProfile();

    setIsAuthenticated(true);
    setEmail(user.email ?? null);
    setDisplayName(profile?.display_name || profile?.username || "User");
    setAvatarUrl(profile?.avatar_url || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      if (!hadInitialAuth.current) await loadFromSession();
    })();

    const { data: sub } = onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setIsAuthenticated(false);
        setEmail(null);
        setDisplayName(null);
        setAvatarUrl(null);
        setLoading(false);
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") loadFromSession();
      if (event === "TOKEN_REFRESHED" && !hadInitialAuth.current)
        loadFromSession();
    });

    return () => {
      cancelled = true;
      sub.subscription?.unsubscribe();
    };
  }, [loadFromSession]);

  return { loading, isAuthenticated, email, displayName, avatarUrl };
}
```

- [ ] **Step 3: Run type check**

```bash
cd perfume-mvp && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add perfume-mvp/lib/hooks/useSessionUserId.ts perfume-mvp/lib/hooks/useAuthProfile.ts
git commit -m "refactor: hooks delegate Supabase calls to client/auth.ts"
```

---

## Task 8: Update auth form components

**Files:**
- Modify: `perfume-mvp/app/(auth)/login/LoginClient.tsx`
- Modify: `perfume-mvp/app/(auth)/signup/SignupClient.tsx`
- Modify: `perfume-mvp/app/(auth)/reset/ResetRequestClient.tsx`
- Modify: `perfume-mvp/app/(auth)/reset/update/RequestUpdateClient.tsx`

- [ ] **Step 1: Update `LoginClient.tsx`**

Replace the `supabase` import and all direct calls:

```typescript
// Remove:
import { supabase } from "@/lib/supabaseClient";

// Add:
import {
  getSession,
  signIn,
  signInWithOAuth as authSignInWithOAuth,
} from "@/lib/queries/client/auth";
```

Replace the `useEffect` session check:
```typescript
useEffect(() => {
  getSession().then((session) => {
    if (session) router.replace(nextPath);
  });
}, [nextPath, router]);
```

Replace `onSubmit` sign-in call:
```typescript
async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setError(null);
  const { error } = await signIn(email, password);
  if (error) {
    setError(error.message);
    setLoading(false);
    return;
  }
  router.replace(nextPath);
  setLoading(false);
}
```

Replace `signInWithOAuth` function:
```typescript
async function handleOAuthSignIn(provider: "google") {
  try {
    setOauthLoading(provider);
    setError(null);
    const redirectTo =
      typeof window !== "undefined"
        ? `${location.origin}${nextPath}`
        : undefined;
    const { error } = await authSignInWithOAuth(provider, redirectTo);
    if (error) setError(error.message);
  } finally {
    setOauthLoading(null);
  }
}
```

Update the JSX call site from `onClick={() => signInWithOAuth("google")}` to `onClick={() => handleOAuthSignIn("google")}`.

- [ ] **Step 2: Update `SignupClient.tsx`**

Replace the `supabase` import:
```typescript
// Remove:
import { supabase } from "@/lib/supabaseClient";

// Add:
import {
  signUp,
  signInWithOAuth as authSignInWithOAuth,
} from "@/lib/queries/client/auth";
import { checkUsernameAvailability } from "@/lib/queries/client/profile";
```

Replace `checkAvailability`:
```typescript
async function checkAvailability(u: string) {
  if (!u || u.length < 3) { setUsernameOk(null); return; }
  setChecking(true);
  const available = await checkUsernameAvailability(u);
  setChecking(false);
  setUsernameOk(available);
}
```

Replace sign-up call in `onSubmit`:
```typescript
const { error: signErr } = await signUp(email, password, {
  data: {
    username,
    display_name: displayName,
    full_name: fullName,
    contact_number: contactNumber,
    whatsappNumber: whatsappNumber,
    facebook_link: facebookLink,
    messenger_link: messengerLink,
  },
});
```

Replace `signInWithOAuth` function:
```typescript
async function handleOAuthSignIn(provider: "google") {
  try {
    setOauthLoading(provider);
    setError(null);
    const redirectTo =
      typeof window !== "undefined" ? `${location.origin}` : undefined;
    const { error } = await authSignInWithOAuth(provider, redirectTo);
    if (error) setError(error.message);
  } finally {
    setOauthLoading(null);
  }
}
```

Update JSX call site from `onClick={() => signInWithOAuth("google")}` to `onClick={() => handleOAuthSignIn("google")}`.

- [ ] **Step 3: Update `ResetRequestClient.tsx`**

```typescript
// Remove:
import { supabase } from "@/lib/supabaseClient";

// Add:
import { resetPassword } from "@/lib/queries/client/auth";
```

Replace `handleRequest` body:
```typescript
const { error } = await resetPassword(
  email,
  "https://cloudperfumebd.com/reset/update"
);
if (error) {
  setErr(error.message);
} else {
  setMsg("Check your email for a reset link.");
}
```

- [ ] **Step 4: Update `RequestUpdateClient.tsx`**

```typescript
// Remove:
import { supabase } from "@/lib/supabaseClient";

// Add:
import { getSession, updatePassword } from "@/lib/queries/client/auth";
```

Replace `useEffect` session check:
```typescript
useEffect(() => {
  let cancelled = false;
  getSession().then((session) => {
    if (cancelled) return;
    if (session) {
      setAllowed(true);
    } else {
      setErr("Reset link is invalid or expired. Please request a new link.");
    }
  });
  return () => { cancelled = true; };
}, []);
```

Replace `handleUpdate` password call:
```typescript
const { error } = await updatePassword(password);
```

- [ ] **Step 5: Run type check**

```bash
cd perfume-mvp && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors

- [ ] **Step 6: Commit**

```bash
git add perfume-mvp/app/\(auth\)/
git commit -m "refactor: auth form components use client/auth.ts queries"
```

---

## Task 9: Update `Header.tsx` and `DashboardSidebar.tsx`

**Files:**
- Modify: `perfume-mvp/components/Header.tsx`
- Modify: `perfume-mvp/components/DashboardSidebar.tsx`

- [ ] **Step 1: Update `Header.tsx`**

```typescript
// Remove:
import { supabase } from "@/lib/supabaseClient";

// Add:
import { signOut } from "@/lib/queries/client/auth";
```

Replace the `logout` function:
```typescript
async function logout() {
  await signOut();
  router.refresh();
}
```

- [ ] **Step 2: Update `DashboardSidebar.tsx`**

```typescript
// Remove:
import { supabase } from "@/lib/supabaseClient";

// Add:
import { signOut } from "@/lib/queries/client/auth";
```

Replace the `logout` function:
```typescript
const logout = async () => {
  await signOut();
  startTransition(() => router.replace("/login"));
};
```

- [ ] **Step 3: Run type check**

```bash
cd perfume-mvp && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add perfume-mvp/components/Header.tsx perfume-mvp/components/DashboardSidebar.tsx
git commit -m "refactor: Header and DashboardSidebar use client/auth.ts signOut"
```

---

## Task 10: Update `TrendingSection.tsx`, `PerfumePage.tsx`, `PerfumeGrid.tsx`

**Files:**
- Modify: `perfume-mvp/components/TrendingSection.tsx`
- Modify: `perfume-mvp/app/perfumes/components/PerfumePage.tsx`
- Modify: `perfume-mvp/app/perfumes/components/PerfumeGrid.tsx`

- [ ] **Step 1: Update `TrendingSection.tsx`**

Remove the top-level `supabase` import and the four inline async functions (`fetchTrendingPerfumes`, `fetchTrendingWeek`, `fetchTrendingMonth`, `fetchTrendingBrands`). Replace with imports:

```typescript
// Remove:
import { supabase } from "@/lib/supabaseClient";
// Remove: async function fetchTrendingPerfumes() { ... }
// Remove: async function fetchTrendingWeek() { ... }
// Remove: async function fetchTrendingMonth() { ... }
// Remove: async function fetchTrendingBrands() { ... }

// Add:
import {
  fetchTrendingNow,
  fetchTrendingWeek,
  fetchTrendingMonth,
  fetchTrendingBrands,
} from "@/lib/queries/client/trending";
```

Update the `queryFn` references in `useQuery` calls:
- `queryFn: fetchTrendingPerfumes` → `queryFn: fetchTrendingNow`
- `queryFn: fetchTrendingWeek` — name matches, no change
- `queryFn: fetchTrendingMonth` — name matches, no change
- `queryFn: fetchTrendingBrands` — name matches, no change

- [ ] **Step 2: Update `PerfumePage.tsx`**

```typescript
// Remove:
import { supabase } from "@/lib/supabaseClient";
// Remove: async function fetchPerfumes() { ... }

// Add:
import { fetchPublicPerfumes } from "@/lib/queries/client/trending";
```

Update `useQuery`:
```typescript
const { data: listings = [], isLoading, error } = useQuery({
  queryKey: ["perfumes"],
  queryFn: fetchPublicPerfumes,
});
```

The `rows.map(...)` normalisation that was inside `fetchPerfumes` now needs to move into the component. Replace the query result usage:

```typescript
const { data: rawListings = [], isLoading, error } = useQuery({
  queryKey: ["perfumes"],
  queryFn: fetchPublicPerfumes,
});

const listings = useMemo(
  () =>
    (rawListings as RawListing[]).map((l) => ({
      ...l,
      profiles: Array.isArray(l.profiles)
        ? l.profiles[0] ?? null
        : l.profiles ?? null,
    })),
  [rawListings]
);
```

- [ ] **Step 3: Update `PerfumeGrid.tsx`**

```typescript
// Remove:
import { supabase } from "@/lib/supabaseClient";
// Remove: async function registerPerfumeClick(...) { ... }

// Add:
import { registerPerfumeClick } from "@/lib/queries/client/perfumeClicks";
```

The `onClick` handler in the Link stays the same: `onClick={() => registerPerfumeClick(p.perfume_id)}`.

- [ ] **Step 4: Run type check**

```bash
cd perfume-mvp && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add perfume-mvp/components/TrendingSection.tsx perfume-mvp/app/perfumes/components/
git commit -m "refactor: TrendingSection, PerfumePage, PerfumeGrid use client query layer"
```

---

## Task 11: Update `app/dashboard/listings/[id]/page.tsx`

**Files:**
- Modify: `perfume-mvp/app/dashboard/listings/[id]/page.tsx`

- [ ] **Step 1: Update imports**

```typescript
// Remove:
import { supabase } from "@/lib/supabaseClient";

// Add:
import {
  fetchListingById,
  updateListing,
  uploadListingImage,
} from "@/lib/queries/client/listings";
import { getSessionUserId } from "@/lib/queries/client/auth";
```

- [ ] **Step 2: Delete the three inline Supabase helpers**

Remove these three functions entirely from the file (they live in client/listings.ts now):

```typescript
// DELETE this block:
async function fetchListing(id: string): Promise<Listing> { ... }
async function uploadImage(file: File, userId: string): Promise<string> { ... }
async function updateListing(id: string, patch: ListingPatch): Promise<void> { ... }
```

- [ ] **Step 3: Update `useQuery` queryFn**

```typescript
const {
  data: listing,
  isLoading,
  error,
} = useQuery<Listing, Error>({
  queryKey: [qk.listingById(id)],
  queryFn: () => fetchListingById(id) as Promise<Listing>,
});
```

- [ ] **Step 4: Update `onUpload` to use `getSessionUserId`**

```typescript
async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const files = Array.from(e.target.files ?? []);
  if (!files.length) return;

  try {
    const currentUserId = await getSessionUserId();
    const urls: string[] = [];
    for (const f of files) {
      const url = await uploadListingImage(f, currentUserId);
      urls.push(url);
    }
    setImages((prev) => [...prev, ...urls]);
    toast.success("Images uploaded!");
  } catch {
    toast.error("You must be logged in to upload images.");
  } finally {
    if (fileRef.current) fileRef.current.value = "";
  }
}
```

- [ ] **Step 5: Run type check**

```bash
cd perfume-mvp && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add "perfume-mvp/app/dashboard/listings/[id]/page.tsx"
git commit -m "refactor: dashboard listing edit page uses client query layer"
```

---

## Task 12: Update `app/dashboard/profile/page.tsx`

**Files:**
- Modify: `perfume-mvp/app/dashboard/profile/page.tsx`

- [ ] **Step 1: Update imports**

```typescript
// Remove:
import { supabase } from "@/lib/supabaseClient";
import {
  fetchMyProfile,
  updateMyProfile,
  changeMyPassword,
  type Profile,
} from "@/lib/queries/profile";
import { uploadToBucket } from "@/lib/queries/storage";

// Add:
import {
  fetchMyProfile,
  updateMyProfile,
  type Profile,
} from "@/lib/queries/client/profile";
import { uploadToBucket } from "@/lib/queries/client/storage";
import {
  updatePassword,
  getSessionUserId,
  signOut,
} from "@/lib/queries/client/auth";
```

- [ ] **Step 2: Replace inline auth subscription with `useSessionUserId` hook**

Replace the entire `useEffect` that manages `userId` with the hook:

```typescript
// Remove the useEffect for userId (lines ~62-76)
// Remove: const [userId, setUserId] = useState<string | null>(null);

// Add at the top of the component:
import { useSessionUserId } from "@/lib/hooks/useSessionUserId";
// ...
const userId = useSessionUserId() ?? null;
```

- [ ] **Step 3: Replace `changeMyPassword` call with `updatePassword`**

```typescript
async function onChangePassword(e: React.FormEvent) {
  e.preventDefault();
  if (pwd.newPwd.length < 6) {
    toast.error("Password must be at least 6 characters long");
    return;
  }
  if (pwd.newPwd !== pwd.confirmPwd) {
    toast.error("Passwords do not match");
    return;
  }
  setPwdSaving(true);
  try {
    const { error } = await updatePassword(pwd.newPwd);
    if (error) throw error;
    toast.success("Password updated successfully");
    setPwd({ newPwd: "", confirmPwd: "" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update password";
    toast.error(message);
  } finally {
    setPwdSaving(false);
  }
}
```

- [ ] **Step 4: Replace inline auth check and `signOut` in `handleConfirmDelete`**

```typescript
async function handleConfirmDelete() {
  setDeleteLoading(true);
  setDeleteError(null);
  try {
    const userId = await getSessionUserId().catch(() => null);
    if (!userId) {
      setDeleteError("You are not logged in.");
      setDeleteLoading(false);
      return;
    }
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to delete account.");
    }
    await signOut();
    setDeleteModalOpen(false);
    router.replace("/");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    setDeleteError(message);
  } finally {
    setDeleteLoading(false);
  }
}
```

- [ ] **Step 5: Run type check**

```bash
cd perfume-mvp && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add perfume-mvp/app/dashboard/profile/page.tsx
git commit -m "refactor: dashboard profile page uses client query layer"
```

---

## Task 13: Update server pages — `app/perfumes/[username]/page.tsx` and `[id]/page.tsx`

**Files:**
- Modify: `perfume-mvp/app/perfumes/[username]/page.tsx`
- Modify: `perfume-mvp/app/perfumes/[username]/[id]/page.tsx`

- [ ] **Step 1: Update `app/perfumes/[username]/page.tsx`**

```typescript
// Remove:
import { createServerSupabase } from "@/lib/supabaseServer";

// Add:
import {
  fetchProfileByUsername,
  fetchProfileMetaByUsername,
} from "@/lib/queries/server/profile";
import { fetchListingsByUserId } from "@/lib/queries/server/listings";
```

Replace `generateMetadata`:
```typescript
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchProfileMetaByUsername(username);

  if (!profile) return { title: "Seller Not Found | CloudPerfumeBD" };

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

Replace the page function body:
```typescript
export default async function SellerListingsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await fetchProfileByUsername(username);
  if (!profile) redirect("/perfumes");

  const listings = await fetchListingsByUserId(profile.id);

  const listingsWithProfile = listings.map((l) => ({
    ...l,
    profiles: { username: profile.username, display_name: profile.display_name },
  }));

  const hasAnyContact =
    !!profile.whatsapp_number ||
    !!profile.messenger_link ||
    !!profile.facebook_link ||
    !!profile.contact_number;

  // Keep the entire return statement and all JSX exactly as it was.
  // Only the data-fetching code above changed — the variables
  // (profile, listingsWithProfile, hasAnyContact) have identical shapes.
  return (
    // ... keep existing JSX unchanged ...
  );
}
```

- [ ] **Step 2: Update `app/perfumes/[username]/[id]/page.tsx`**

```typescript
// Remove:
import { createServerSupabase } from "@/lib/supabaseServer";

// Add:
import {
  fetchProfileByUsername,
  fetchProfileMetaByUsername,
} from "@/lib/queries/server/profile";
import {
  fetchListingByIdAndOwner,
  fetchListingMetaByIdAndOwner,
} from "@/lib/queries/server/listings";
```

Replace `generateMetadata`:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, id } = await params;

  const profile = await fetchProfileMetaByUsername(username);
  if (!profile) return { title: "Listing Not Found | CloudPerfumeBD" };

  const listing = await fetchListingMetaByIdAndOwner(id, profile.id);
  if (!listing) return { title: "Listing Not Found | CloudPerfumeBD" };

  const isDecant = (listing.type ?? "").toLowerCase() === "decant";
  const priceNum =
    isDecant && listing.min_price != null
      ? Number(listing.min_price)
      : Number(listing.price ?? NaN);
  const priceText = Number.isFinite(priceNum)
    ? `TK${priceNum.toFixed(0)}`
    : "Price on Contact";

  const title = `${listing.brand} — ${listing.perfume_name} | ${profile.display_name ?? profile.username}`;
  const description = `${listing.type?.toUpperCase()} • ${priceText} • Sold by ${profile.display_name ?? profile.username} on CloudPerfumeBD`;
  const image =
    Array.isArray(listing.images) && listing.images[0]
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

Replace the page function body:
```typescript
export default async function ListingDetailPage({ params }: Props) {
  const { username, id } = await params;

  const profile = await fetchProfileByUsername(username);
  if (!profile) redirect("/perfumes");

  const listing = await fetchListingByIdAndOwner(id, profile.id);
  if (!listing) redirect(`/perfumes/${username}`);

  // Keep all calculated properties (hasAnyContact, isDecant, priceToShow)
  // and the entire return statement exactly as they are.
  // Only the supabase fetches above changed.
}
```

- [ ] **Step 3: Run type check**

```bash
cd perfume-mvp && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add "perfume-mvp/app/perfumes/[username]/"
git commit -m "refactor: seller profile and listing detail pages use server query layer"
```

---

## Task 14: Update `app/dashboard/layout.tsx`

**Files:**
- Modify: `perfume-mvp/app/dashboard/layout.tsx`

- [ ] **Step 1: Update the file**

```typescript
import { ReactNode } from "react";
import { getDashboardSession } from "@/lib/queries/server/dashboard";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import Header from "@/components/Header";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { email, displayName, avatarUrl, user } = await getDashboardSession();

  return (
    <>
      <Header
        hideLogout
        initialAuth={{
          isAuthenticated: !!user,
          displayName,
          avatarUrl,
        }}
      />
      <div className="flex">
        <DashboardSidebar email={email} />
        <main className="flex-1 lg:ml-64 min-h-[calc(100vh-64px)] p-4 lg:p-6 pt-16 lg:pt-6">
          {children}
        </main>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Run type check**

```bash
cd perfume-mvp && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add perfume-mvp/app/dashboard/layout.tsx
git commit -m "refactor: dashboard layout uses server/dashboard.ts getDashboardSession"
```

---

## Task 15: Audit remaining imports and delete old `lib/queries/*.ts` root files

**Files:**
- Delete: `perfume-mvp/lib/queries/auth.ts`
- Delete: `perfume-mvp/lib/queries/listings.ts`
- Delete: `perfume-mvp/lib/queries/profile.ts`
- Delete: `perfume-mvp/lib/queries/reviews.ts`
- Delete: `perfume-mvp/lib/queries/storage.ts`
- Delete: `perfume-mvp/lib/queries/userPerfumes.ts`

- [ ] **Step 1: Find any remaining imports from old paths**

```bash
cd perfume-mvp && grep -r "from \"@/lib/queries/auth\"" --include="*.ts" --include="*.tsx" -l
grep -r "from \"@/lib/queries/listings\"" --include="*.ts" --include="*.tsx" -l
grep -r "from \"@/lib/queries/profile\"" --include="*.ts" --include="*.tsx" -l
grep -r "from \"@/lib/queries/reviews\"" --include="*.ts" --include="*.tsx" -l
grep -r "from \"@/lib/queries/storage\"" --include="*.ts" --include="*.tsx" -l
grep -r "from \"@/lib/queries/userPerfumes\"" --include="*.ts" --include="*.tsx" -l
```

Expected: each command returns no files. If any files are listed, update those imports to the new `client/` paths before proceeding.

- [ ] **Step 2: Delete old root query files**

```bash
cd perfume-mvp && rm lib/queries/auth.ts lib/queries/listings.ts lib/queries/profile.ts lib/queries/reviews.ts lib/queries/storage.ts lib/queries/userPerfumes.ts
```

- [ ] **Step 3: Run type check — must pass cleanly**

```bash
cd perfume-mvp && npx tsc --noEmit 2>&1
```

Expected: zero errors. If errors appear, fix the import paths they point to before committing.

- [ ] **Step 4: Run build**

```bash
cd perfume-mvp && npm run build 2>&1 | tail -20
```

Expected: build completes without errors.

- [ ] **Step 5: Commit**

```bash
cd perfume-mvp && git add -A
git commit -m "refactor: delete legacy lib/queries/*.ts root files — all access now via client/ and server/ subfolders"
```

---

## Task 16: Final verification

- [ ] **Step 1: Confirm zero direct Supabase imports outside permitted files**

```bash
cd perfume-mvp && grep -r "from \"@/lib/supabaseClient\"" --include="*.ts" --include="*.tsx" -l | grep -v "lib/queries/client"
grep -r "from \"@/lib/supabaseServer\"" --include="*.ts" --include="*.tsx" -l | grep -v "lib/queries/server"
```

Expected output — only these files are permitted to remain:
- `lib/supabaseClient.ts` itself
- `lib/supabaseServer.ts` itself
- `lib/ensureProfile.ts`
- `middleware.ts`
- `app/api/**`

- [ ] **Step 2: Confirm client/ files never import supabaseServer**

```bash
cd perfume-mvp && grep -r "supabaseServer" lib/queries/client/ 2>/dev/null
```

Expected: no output.

- [ ] **Step 3: Confirm server/ files never import supabaseClient**

```bash
cd perfume-mvp && grep -r "supabaseClient" lib/queries/server/ 2>/dev/null
```

Expected: no output.

- [ ] **Step 4: Run full build one more time**

```bash
cd perfume-mvp && npm run build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully`

- [ ] **Step 5: Final commit**

```bash
cd perfume-mvp && git add -A
git commit -m "chore: verify Supabase service layer refactor complete — all boundaries enforced"
```
