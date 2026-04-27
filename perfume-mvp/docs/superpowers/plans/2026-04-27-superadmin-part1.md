# Superadmin Panel Part 1 — Admin Shell, Seller & Listing Management

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/superadmin` with seller approval/flagging/banning and listing moderation, backed by Supabase service-role API routes.

**Architecture:** A `(admin)` Next.js route group gives the admin panel its own layout (sidebar + content). All mutations go through API routes at `/api/admin/*` using a Supabase service-role client that bypasses RLS entirely. The public marketplace filters `is_hidden = false` so banned-seller listings disappear automatically. UI follows the existing React Query + Tailwind + Lucide patterns from `/dashboard`.

**Tech Stack:** Next.js 15 App Router, Supabase (service role key), TanStack Query v5, Tailwind CSS, Lucide React

---

## File Map

**Create:**
- `perfume-mvp/lib/supabaseAdmin.ts`
- `perfume-mvp/lib/queries/admin.ts`
- `perfume-mvp/app/api/admin/sellers/route.ts`
- `perfume-mvp/app/api/admin/sellers/[id]/route.ts`
- `perfume-mvp/app/api/admin/listings/route.ts`
- `perfume-mvp/app/api/admin/listings/[id]/route.ts`
- `perfume-mvp/app/(admin)/superadmin/layout.tsx`
- `perfume-mvp/app/(admin)/superadmin/page.tsx`
- `perfume-mvp/app/(admin)/superadmin/sellers/page.tsx`
- `perfume-mvp/app/(admin)/superadmin/listings/page.tsx`
- `perfume-mvp/components/admin/AdminSidebar.tsx`
- `perfume-mvp/components/admin/StatusBadge.tsx`
- `perfume-mvp/components/admin/ActionModal.tsx`
- `perfume-mvp/components/admin/SellerDetailPanel.tsx`

**Modify:**
- `perfume-mvp/lib/queries/key.ts` — add `adminSellers` and `adminListings` keys
- `perfume-mvp/lib/queries/listings.ts` — add `.eq('is_hidden', false)` to public queries
- `perfume-mvp/app/dashboard/layout.tsx` — show pending-approval banner

---

### Task 1: Database Migration

**Files:** Apply via `mcp__supabase__apply_migration` tool — no file to create.
Also modify: `perfume-mvp/lib/queries/listings.ts`

- [ ] **Step 1: Apply migration**

Use `mcp__supabase__apply_migration` with name `admin_seller_status` and this SQL:

```sql
-- Seller status management
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS flag_reason text,
  ADD COLUMN IF NOT EXISTS ban_reason text,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;

-- Existing profiles were already live — promote them to active
UPDATE profiles SET status = 'active' WHERE status = 'pending';

-- Listing moderation columns
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text,
  ADD COLUMN IF NOT EXISTS flagged_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Filter hidden listings from public marketplace**

Open `perfume-mvp/lib/queries/listings.ts`. Find every `.from('listings').select(...)` call used by public pages (not admin). Add `.eq('is_hidden', false)` to each before `.order(...)`. Example:

```typescript
// Before
supabase.from('listings').select('...').order('created_at', { ascending: false })

// After
supabase.from('listings').select('...').eq('is_hidden', false).order('created_at', { ascending: false })
```

- [ ] **Step 3: Commit**

```bash
git add perfume-mvp/lib/queries/listings.ts
git commit -m "feat: add is_hidden filter to public listing queries"
```

---

### Task 2: Admin Client + Query Keys

**Files:**
- Create: `perfume-mvp/lib/supabaseAdmin.ts`
- Modify: `perfume-mvp/lib/queries/key.ts`

- [ ] **Step 1: Create admin Supabase client**

Create `perfume-mvp/lib/supabaseAdmin.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

Never import this in client components — the service role key would be exposed to the browser. Server files (API routes) only.

- [ ] **Step 2: Add admin query keys**

Open `perfume-mvp/lib/queries/key.ts`. Inside the `qk` object, add:

```typescript
adminSellers: () => ['admin', 'sellers'] as const,
adminListings: () => ['admin', 'listings'] as const,
```

- [ ] **Step 3: Commit**

```bash
git add perfume-mvp/lib/supabaseAdmin.ts perfume-mvp/lib/queries/key.ts
git commit -m "feat: add admin supabase client and query keys"
```

---

### Task 3: Sellers API Routes

**Files:**
- Create: `perfume-mvp/app/api/admin/sellers/route.ts`
- Create: `perfume-mvp/app/api/admin/sellers/[id]/route.ts`

- [ ] **Step 1: Create GET /api/admin/sellers**

Create `perfume-mvp/app/api/admin/sellers/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'

export async function GET() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, username, display_name, contact_number, whatsapp_number,
      facebook_link, bio, location, avatar_url,
      status, flag_reason, ban_reason, status_updated_at, created_at,
      listings(count)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sellers = (data ?? []).map((s) => ({
    ...s,
    listing_count: (s.listings as unknown as { count: number }[])?.[0]?.count ?? 0,
    listings: undefined,
  }))

  return NextResponse.json(sellers)
}
```

- [ ] **Step 2: Verify GET**

With dev server running:

```bash
curl http://localhost:3000/api/admin/sellers
```

Expected: JSON array. Each object has `status`, `listing_count`, `contact_number`.

- [ ] **Step 3: Create PATCH /api/admin/sellers/[id]**

Create `perfume-mvp/app/api/admin/sellers/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'

type Action = 'approve' | 'flag' | 'ban' | 'unflag' | 'unban'

const STATUS_MAP: Record<Action, string> = {
  approve: 'active',
  flag: 'flagged',
  ban: 'banned',
  unflag: 'active',
  unban: 'active',
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { action, reason }: { action: Action; reason?: string } = await req.json()
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {
    status: STATUS_MAP[action],
    status_updated_at: new Date().toISOString(),
    flag_reason: null,
    ban_reason: null,
  }

  if (action === 'flag') update.flag_reason = reason ?? null
  if (action === 'ban') update.ban_reason = reason ?? null

  const { error } = await supabase.from('profiles').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (action === 'ban') {
    await supabase.from('listings').update({ is_hidden: true }).eq('user_id', id)
  }
  if (action === 'unban') {
    await supabase.from('listings').update({ is_hidden: false }).eq('user_id', id)
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Verify PATCH**

```bash
curl -X PATCH http://localhost:3000/api/admin/sellers/<a-real-seller-id> \
  -H "Content-Type: application/json" \
  -d '{"action":"approve"}'
```

Expected: `{"ok":true}`. Check the seller's `status` in Supabase — should now be `active`.

- [ ] **Step 5: Commit**

```bash
git add perfume-mvp/app/api/admin/sellers/
git commit -m "feat: add admin sellers API (GET all, PATCH approve/flag/ban)"
```

---

### Task 4: Listings API Routes

**Files:**
- Create: `perfume-mvp/app/api/admin/listings/route.ts`
- Create: `perfume-mvp/app/api/admin/listings/[id]/route.ts`

- [ ] **Step 1: Create GET /api/admin/listings**

Create `perfume-mvp/app/api/admin/listings/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'

export async function GET() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('listings')
    .select(`
      id, perfume_name, brand, price, type, created_at,
      is_flagged, flag_reason, flagged_at, is_hidden, user_id,
      profiles(display_name, username)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
```

- [ ] **Step 2: Create PATCH + DELETE /api/admin/listings/[id]**

Create `perfume-mvp/app/api/admin/listings/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { action, reason }: { action: 'flag' | 'unflag'; reason?: string } = await req.json()
  const supabase = createAdminClient()

  const update =
    action === 'flag'
      ? { is_flagged: true, flag_reason: reason ?? null, flagged_at: new Date().toISOString() }
      : { is_flagged: false, flag_reason: null, flagged_at: null }

  const { error } = await supabase.from('listings').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('listings').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Verify**

```bash
curl http://localhost:3000/api/admin/listings
```

Expected: JSON array with `profiles` nested on each listing.

- [ ] **Step 4: Commit**

```bash
git add perfume-mvp/app/api/admin/listings/
git commit -m "feat: add admin listings API (GET all, PATCH flag/unflag, DELETE)"
```

---

### Task 5: Admin Query Hooks

**Files:**
- Create: `perfume-mvp/lib/queries/admin.ts`

- [ ] **Step 1: Create admin.ts**

Create `perfume-mvp/lib/queries/admin.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from './key'

export type AdminSeller = {
  id: string
  username: string | null
  display_name: string | null
  contact_number: string | null
  whatsapp_number: string | null
  facebook_link: string | null
  bio: string | null
  location: string | null
  avatar_url: string | null
  status: 'pending' | 'active' | 'flagged' | 'banned'
  flag_reason: string | null
  ban_reason: string | null
  status_updated_at: string | null
  created_at: string
  listing_count: number
}

export type AdminListing = {
  id: string
  perfume_name: string | null
  brand: string | null
  price: number | null
  type: string | null
  created_at: string
  is_flagged: boolean
  flag_reason: string | null
  flagged_at: string | null
  is_hidden: boolean
  user_id: string
  profiles: { display_name: string | null; username: string | null } | null
}

// ─── Sellers ─────────────────────────────────────────────────────────────────

async function fetchAdminSellers(): Promise<AdminSeller[]> {
  const res = await fetch('/api/admin/sellers')
  if (!res.ok) throw new Error('Failed to fetch sellers')
  return res.json()
}

export function useAdminSellers() {
  return useQuery({ queryKey: qk.adminSellers(), queryFn: fetchAdminSellers })
}

type SellerAction = 'approve' | 'flag' | 'ban' | 'unflag' | 'unban'

export function useSellerAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: SellerAction; reason?: string }) =>
      fetch(`/api/admin/sellers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      }).then((r) => { if (!r.ok) throw new Error('Failed') }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminSellers() }),
  })
}

// ─── Listings ────────────────────────────────────────────────────────────────

async function fetchAdminListings(): Promise<AdminListing[]> {
  const res = await fetch('/api/admin/listings')
  if (!res.ok) throw new Error('Failed to fetch listings')
  return res.json()
}

export function useAdminListings() {
  return useQuery({ queryKey: qk.adminListings(), queryFn: fetchAdminListings })
}

export function useListingAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'flag' | 'unflag'; reason?: string }) =>
      fetch(`/api/admin/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      }).then((r) => { if (!r.ok) throw new Error('Failed') }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminListings() }),
  })
}

export function useDeleteListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/listings/${id}`, { method: 'DELETE' })
        .then((r) => { if (!r.ok) throw new Error('Failed') }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminListings() }),
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add perfume-mvp/lib/queries/admin.ts
git commit -m "feat: add admin React Query hooks for sellers and listings"
```

---

### Task 6: Shared UI Components

**Files:**
- Create: `perfume-mvp/components/admin/StatusBadge.tsx`
- Create: `perfume-mvp/components/admin/ActionModal.tsx`

- [ ] **Step 1: Create StatusBadge**

Create `perfume-mvp/components/admin/StatusBadge.tsx`:

```typescript
const STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  active:  'bg-green-100 text-green-800',
  flagged: 'bg-orange-100 text-orange-800',
  banned:  'bg-red-100 text-red-800',
  hidden:  'bg-gray-100 text-gray-600',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        STYLES[status] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {status}
    </span>
  )
}
```

- [ ] **Step 2: Create ActionModal**

Create `perfume-mvp/components/admin/ActionModal.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  title: string
  description: string
  confirmLabel: string
  confirmClass?: string
  requireReason?: boolean
  reasonPlaceholder?: string
  onConfirm: (reason: string) => void
  onClose: () => void
}

export function ActionModal({
  title,
  description,
  confirmLabel,
  confirmClass = 'bg-red-600 hover:bg-red-700 text-white',
  requireReason = false,
  reasonPlaceholder = 'Enter reason...',
  onConfirm,
  onClose,
}: Props) {
  const [reason, setReason] = useState('')
  const canConfirm = !requireReason || reason.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        {requireReason && (
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] resize-none mb-4"
            rows={3}
            placeholder={reasonPlaceholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => canConfirm && onConfirm(reason)}
            disabled={!canConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add perfume-mvp/components/admin/StatusBadge.tsx perfume-mvp/components/admin/ActionModal.tsx
git commit -m "feat: add admin StatusBadge and ActionModal components"
```

---

### Task 7: Admin Shell — Layout, Sidebar, Redirect

**Files:**
- Create: `perfume-mvp/components/admin/AdminSidebar.tsx`
- Create: `perfume-mvp/app/(admin)/superadmin/layout.tsx`
- Create: `perfume-mvp/app/(admin)/superadmin/page.tsx`

- [ ] **Step 1: Create AdminSidebar**

Create `perfume-mvp/components/admin/AdminSidebar.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, List, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { qk } from '@/lib/queries/key'

const NAV = [
  { href: '/superadmin/sellers',  label: 'Sellers',  icon: Users },
  { href: '/superadmin/listings', label: 'Listings', icon: List },
  { href: '/superadmin/blog',     label: 'Blog',     icon: FileText },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  const { data: sellers = [] } = useQuery<{ status: string }[]>({
    queryKey: qk.adminSellers(),
    queryFn: () => fetch('/api/admin/sellers').then((r) => r.json()),
    refetchInterval: 60_000,
  })

  const pendingCount = sellers.filter((s) => s.status === 'pending').length

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="px-6 py-5 border-b border-gray-200">
        <span className="text-xs font-semibold text-[#d4af37] uppercase tracking-widest">
          Superadmin
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#d4af37]/10 text-[#d4af37]'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {href.includes('sellers') && pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {pendingCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Create admin layout**

Create `perfume-mvp/app/(admin)/superadmin/layout.tsx`:

```typescript
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[#fdfbf7]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Create redirect page**

Create `perfume-mvp/app/(admin)/superadmin/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

export default function AdminRoot() {
  redirect('/superadmin/sellers')
}
```

- [ ] **Step 4: Verify in browser**

Open http://localhost:3000/superadmin — should redirect to `/superadmin/sellers`. The sidebar renders with Sellers / Listings / Blog links. Content area is empty (pages not built yet).

- [ ] **Step 5: Commit**

```bash
git add perfume-mvp/app/\(admin\)/ perfume-mvp/components/admin/AdminSidebar.tsx
git commit -m "feat: add admin shell layout, sidebar, and root redirect"
```

---

### Task 8: Seller Detail Panel

**Files:**
- Create: `perfume-mvp/components/admin/SellerDetailPanel.tsx`

- [ ] **Step 1: Create SellerDetailPanel**

Create `perfume-mvp/components/admin/SellerDetailPanel.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Phone, MessageCircle, Facebook, AlertTriangle, CheckCircle } from 'lucide-react'
import { AdminSeller, AdminListing, useSellerAction } from '@/lib/queries/admin'
import { ActionModal } from './ActionModal'
import { StatusBadge } from './StatusBadge'

type ModalType = 'flag' | 'ban' | 'unban' | null

type Props = {
  seller: AdminSeller
  listings: AdminListing[]
}

export function SellerDetailPanel({ seller, listings }: Props) {
  const [modal, setModal] = useState<ModalType>(null)
  const action = useSellerAction()

  const contactOk = !!seller.contact_number && !!(seller.whatsapp_number || seller.facebook_link)
  const sellerListings = listings.filter((l) => l.user_id === seller.id)

  function handleAction(type: ModalType, reason: string) {
    if (!type) return
    action.mutate({ id: seller.id, action: type, reason })
    setModal(null)
  }

  return (
    <div className="bg-[#fdfbf7] border-t border-gray-100 px-6 py-5 grid grid-cols-3 gap-6 text-sm">
      {/* Column 1: Profile */}
      <div className="space-y-3">
        <p className="font-medium text-gray-900">Profile</p>
        {seller.bio && <p className="text-gray-600 text-xs leading-relaxed">{seller.bio}</p>}
        {seller.location && <p className="text-gray-500 text-xs">📍 {seller.location}</p>}
        <div className="space-y-1.5">
          <div className={`flex items-center gap-2 text-xs ${seller.contact_number ? 'text-gray-700' : 'text-red-500'}`}>
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{seller.contact_number ?? 'No phone number'}</span>
          </div>
          {seller.whatsapp_number && (
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{seller.whatsapp_number}</span>
            </div>
          )}
          {seller.facebook_link && (
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <Facebook className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{seller.facebook_link}</span>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${contactOk ? 'text-green-600' : 'text-amber-600'}`}>
          {contactOk
            ? <><CheckCircle className="w-3.5 h-3.5" /> Contact complete</>
            : <><AlertTriangle className="w-3.5 h-3.5" /> Needs a second contact method</>}
        </div>
      </div>

      {/* Column 2: Listings */}
      <div className="space-y-3">
        <p className="font-medium text-gray-900">Listings ({sellerListings.length})</p>
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {sellerListings.length === 0 && <p className="text-xs text-gray-400">No listings yet.</p>}
          {sellerListings.map((l) => (
            <div key={l.id} className="flex items-center justify-between text-xs">
              <span className="text-gray-700 truncate">{l.perfume_name ?? '—'}</span>
              <span className="text-gray-500 ml-2 flex-shrink-0">৳{l.price}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Column 3: Status + Actions */}
      <div className="space-y-3">
        <p className="font-medium text-gray-900">Status</p>
        <StatusBadge status={seller.status} />
        {seller.flag_reason && (
          <p className="text-xs text-orange-700 bg-orange-50 rounded p-2">
            <span className="font-medium">Flag reason:</span> {seller.flag_reason}
          </p>
        )}
        {seller.ban_reason && (
          <p className="text-xs text-red-700 bg-red-50 rounded p-2">
            <span className="font-medium">Ban reason:</span> {seller.ban_reason}
          </p>
        )}
        {seller.status_updated_at && (
          <p className="text-xs text-gray-400">
            Updated {new Date(seller.status_updated_at).toLocaleDateString()}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {seller.status === 'pending' && (
            <button
              onClick={() => action.mutate({ id: seller.id, action: 'approve' })}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Approve
            </button>
          )}
          {(seller.status === 'active' || seller.status === 'pending') && (
            <button
              onClick={() => setModal('flag')}
              className="px-3 py-1.5 text-xs font-medium bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg transition-colors"
            >
              Flag
            </button>
          )}
          {seller.status === 'flagged' && (
            <button
              onClick={() => action.mutate({ id: seller.id, action: 'unflag' })}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Unflag
            </button>
          )}
          {seller.status !== 'banned' && (
            <button
              onClick={() => setModal('ban')}
              className="px-3 py-1.5 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
            >
              Ban
            </button>
          )}
          {seller.status === 'banned' && (
            <button
              onClick={() => setModal('unban')}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Unban
            </button>
          )}
        </div>
      </div>

      {modal === 'flag' && (
        <ActionModal
          title="Flag seller"
          description="Internal note only. The seller remains fully active — this is for your tracking."
          confirmLabel="Flag seller"
          confirmClass="bg-orange-500 hover:bg-orange-600 text-white"
          requireReason
          reasonPlaceholder="Reason for flagging (admin-internal only)..."
          onConfirm={(reason) => handleAction('flag', reason)}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'ban' && (
        <ActionModal
          title="Ban seller"
          description="This will permanently hide all their listings and block their account."
          confirmLabel="Ban seller"
          requireReason
          reasonPlaceholder="Reason for ban..."
          onConfirm={(reason) => handleAction('ban', reason)}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'unban' && (
        <ActionModal
          title="Unban seller"
          description="This restores their account and makes their listings visible again."
          confirmLabel="Unban seller"
          confirmClass="bg-green-600 hover:bg-green-700 text-white"
          onConfirm={() => handleAction('unban', '')}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add perfume-mvp/components/admin/SellerDetailPanel.tsx
git commit -m "feat: add SellerDetailPanel with contact indicator and action modals"
```

---

### Task 9: Sellers Page

**Files:**
- Create: `perfume-mvp/app/(admin)/superadmin/sellers/page.tsx`

- [ ] **Step 1: Create sellers page**

Create `perfume-mvp/app/(admin)/superadmin/sellers/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useAdminSellers, useAdminListings } from '@/lib/queries/admin'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { SellerDetailPanel } from '@/components/admin/SellerDetailPanel'

type Filter = 'all' | 'pending' | 'active' | 'flagged' | 'banned'
const FILTERS: Filter[] = ['all', 'pending', 'active', 'flagged', 'banned']

export default function SellersPage() {
  const { data: sellers = [], isLoading } = useAdminSellers()
  const { data: listings = [] } = useAdminListings()
  const [filter, setFilter] = useState<Filter>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const pendingCount = sellers.filter((s) => s.status === 'pending').length
  const filtered = filter === 'all' ? sellers : sellers.filter((s) => s.status === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sellers</h1>
        <span className="text-sm text-gray-500">{sellers.length} total</span>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f}
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-center py-20 text-gray-400">Loading...</div>}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">No sellers in this category.</div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_60px_100px_32px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span>Seller</span>
            <span>Contact</span>
            <span>Signed up</span>
            <span>Listings</span>
            <span>Status</span>
            <span />
          </div>

          {filtered.map((seller) => (
            <div key={seller.id}>
              <button
                onClick={() => setExpandedId(expandedId === seller.id ? null : seller.id)}
                className="w-full grid grid-cols-[1.5fr_1fr_1fr_60px_100px_32px] gap-4 px-6 py-4 items-center border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm">{seller.display_name ?? '—'}</p>
                  <p className="text-xs text-gray-400">@{seller.username ?? '—'}</p>
                </div>
                <div className="text-sm text-gray-600">
                  <p className="text-xs">{seller.contact_number ?? '—'}</p>
                  <p className="text-xs text-gray-400">
                    {seller.whatsapp_number ? 'WhatsApp' : seller.facebook_link ? 'Facebook' : 'No secondary'}
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(seller.created_at).toLocaleDateString()}
                </span>
                <span className="text-sm font-medium text-gray-900 tabular-nums">
                  {seller.listing_count}
                </span>
                <StatusBadge status={seller.status} />
                <span className="text-gray-400">
                  {expandedId === seller.id
                    ? <ChevronDown className="w-4 h-4" />
                    : <ChevronRight className="w-4 h-4" />}
                </span>
              </button>

              {expandedId === seller.id && (
                <SellerDetailPanel seller={seller} listings={listings} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:3000/superadmin/sellers. Check:
- Pending tab is default and shows pending sellers
- Clicking a row expands the detail panel
- Approve / Flag / Ban buttons appear correctly per status
- Contact completeness indicator shows green or amber

- [ ] **Step 3: Commit**

```bash
git add "perfume-mvp/app/(admin)/superadmin/sellers/page.tsx"
git commit -m "feat: add superadmin sellers page with filter tabs and inline expand"
```

---

### Task 10: Listings Page

**Files:**
- Create: `perfume-mvp/app/(admin)/superadmin/listings/page.tsx`

- [ ] **Step 1: Create listings page**

Create `perfume-mvp/app/(admin)/superadmin/listings/page.tsx`:

```typescript
'use client'

import { useMemo, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { useAdminListings, useListingAction, useDeleteListing, AdminListing } from '@/lib/queries/admin'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ActionModal } from '@/components/admin/ActionModal'

type StatusFilter = 'all' | 'active' | 'flagged' | 'hidden'
type TypeFilter   = 'all' | 'intact' | 'full' | 'partial' | 'decant'

function listingStatus(l: AdminListing): string {
  if (l.is_hidden)  return 'hidden'
  if (l.is_flagged) return 'flagged'
  return 'active'
}

export default function ListingsPage() {
  const { data: listings = [], isLoading } = useAdminListings()
  const flagAction   = useListingAction()
  const deleteAction = useDeleteListing()

  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>('all')
  const [flagModal, setFlagModal]       = useState<string | null>(null)
  const [removeModal, setRemoveModal]   = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return listings.filter((l) => {
      if (q && !(
        l.perfume_name?.toLowerCase().includes(q) ||
        l.brand?.toLowerCase().includes(q) ||
        l.profiles?.display_name?.toLowerCase().includes(q) ||
        l.profiles?.username?.toLowerCase().includes(q)
      )) return false
      if (statusFilter !== 'all' && listingStatus(l) !== statusFilter) return false
      if (typeFilter !== 'all' && l.type !== typeFilter) return false
      return true
    })
  }, [listings, search, statusFilter, typeFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
        <span className="text-sm text-gray-500">{listings.length} total</span>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search perfume, brand, or seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="flagged">Flagged</option>
          <option value="hidden">Hidden</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
        >
          <option value="all">All types</option>
          <option value="intact">Intact</option>
          <option value="full">Full</option>
          <option value="partial">Partial</option>
          <option value="decant">Decant</option>
        </select>
      </div>

      {isLoading && <div className="text-center py-20 text-gray-400">Loading...</div>}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">No listings match your filters.</div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_80px_80px_90px_140px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span>Perfume</span>
            <span>Seller</span>
            <span>Price</span>
            <span>Type</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {filtered.map((listing) => (
            <div
              key={listing.id}
              className="grid grid-cols-[2fr_1fr_80px_80px_90px_140px] gap-4 px-6 py-4 items-center border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div>
                <a
                  href={`/perfumes/${listing.profiles?.username}/${listing.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-gray-900 hover:text-[#d4af37] flex items-center gap-1"
                >
                  {listing.perfume_name ?? '—'}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
                <p className="text-xs text-gray-400">{listing.brand ?? '—'}</p>
              </div>

              <div className="text-xs text-gray-600">
                <p>{listing.profiles?.display_name ?? '—'}</p>
                <p className="text-gray-400">@{listing.profiles?.username ?? '—'}</p>
              </div>

              <span className="text-sm font-medium text-gray-900">৳{listing.price ?? '—'}</span>

              <span className="text-xs text-gray-500 capitalize">{listing.type ?? '—'}</span>

              <StatusBadge status={listingStatus(listing)} />

              <div className="flex items-center gap-2">
                {!listing.is_flagged ? (
                  <button
                    onClick={() => setFlagModal(listing.id)}
                    className="px-2.5 py-1 text-xs font-medium bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg transition-colors"
                  >
                    Flag
                  </button>
                ) : (
                  <button
                    onClick={() => flagAction.mutate({ id: listing.id, action: 'unflag' })}
                    className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Unflag
                  </button>
                )}
                <button
                  onClick={() => setRemoveModal(listing.id)}
                  className="px-2.5 py-1 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {flagModal && (
        <ActionModal
          title="Flag listing"
          description="The seller will see this comment on their dashboard so they know what to fix."
          confirmLabel="Flag listing"
          confirmClass="bg-orange-500 hover:bg-orange-600 text-white"
          requireReason
          reasonPlaceholder="Reason visible to seller..."
          onConfirm={(reason) => { flagAction.mutate({ id: flagModal, action: 'flag', reason }); setFlagModal(null) }}
          onClose={() => setFlagModal(null)}
        />
      )}

      {removeModal && (
        <ActionModal
          title="Remove listing"
          description="This permanently deletes the listing. This cannot be undone."
          confirmLabel="Remove listing"
          onConfirm={() => { deleteAction.mutate(removeModal); setRemoveModal(null) }}
          onClose={() => setRemoveModal(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:3000/superadmin/listings. Check:
- Search filters across perfume name, brand, seller name
- Status and type dropdowns work
- Flag opens a modal with a required reason textarea
- Unflag clears immediately
- Remove opens a confirm modal and deletes the row on confirm

- [ ] **Step 3: Commit**

```bash
git add "perfume-mvp/app/(admin)/superadmin/listings/page.tsx"
git commit -m "feat: add superadmin listings page with search, filters, and moderation"
```

---

### Task 11: Pending-Approval Banner in Seller Dashboard

**Files:**
- Modify: `perfume-mvp/app/dashboard/layout.tsx`

When a seller's status is `pending`, show a top banner in their dashboard so they know their account is awaiting approval and can't list yet.

- [ ] **Step 1: Read the current dashboard layout**

Open `perfume-mvp/app/dashboard/layout.tsx`. Identify where the profile is fetched (server-side via `createServerSupabase`). The layout already fetches the user's profile.

- [ ] **Step 2: Add the pending banner**

Add this immediately inside the layout's content area, before the main `<children>` render. Insert it after the profile fetch. The exact insertion point depends on the layout structure — wrap the existing content:

```typescript
// After fetching `profile` server-side:
const isPending = (profile as { status?: string })?.status === 'pending'

// In JSX, above {children}:
{isPending && (
  <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-sm text-amber-800 flex items-center gap-2">
    <span className="font-semibold">Your account is pending approval.</span>
    <span>You'll be able to create listings once an admin reviews your profile. Make sure your phone number and a WhatsApp or Facebook contact are filled in.</span>
  </div>
)}
```

- [ ] **Step 3: Verify**

Log in as a seller whose profile has `status = 'pending'` (a new signup after the migration). Navigate to `/dashboard`. The amber banner should appear at the top. Approve them via the admin panel and refresh — banner should disappear.

- [ ] **Step 4: Commit**

```bash
git add perfume-mvp/app/dashboard/layout.tsx
git commit -m "feat: show pending-approval banner in seller dashboard"
```

---

## Self-Review Checklist

- [x] DB columns for `profiles.status`, `flag_reason`, `ban_reason`, `status_updated_at` — Task 1
- [x] DB columns for `listings.is_flagged`, `flag_reason`, `flagged_at`, `is_hidden` — Task 1
- [x] Public listings filter `is_hidden = false` — Task 1
- [x] Service-role client, never imported in client code — Task 2
- [x] Admin query keys — Task 2
- [x] GET /api/admin/sellers with listing count — Task 3
- [x] PATCH /api/admin/sellers/[id] — approve/flag/ban/unflag/unban + ban cascade — Task 3
- [x] GET /api/admin/listings with seller profile — Task 4
- [x] PATCH /api/admin/listings/[id] — flag/unflag — Task 4
- [x] DELETE /api/admin/listings/[id] — Task 4
- [x] TypeScript types `AdminSeller`, `AdminListing` — Task 5
- [x] React Query hooks for all mutations — Task 5
- [x] `StatusBadge` for pending/active/flagged/banned/hidden — Task 6
- [x] `ActionModal` with optional required-reason textarea — Task 6
- [x] Admin sidebar with pending count badge — Task 7
- [x] Admin layout + redirect — Task 7
- [x] `SellerDetailPanel` — contact completeness, listings mini-list, status history, action buttons — Task 8
- [x] Sellers page — filter tabs, table, inline expand — Task 9
- [x] Listings page — search, status/type filters, flag modal, remove confirm — Task 10
- [x] Pending-approval banner in seller dashboard — Task 11

---

## Next: Plan 2 — Blog CMS

After this plan ships, the next spec is the blog CMS: TipTap editor, hero image upload, embedded product cards, related listings section, draft/scheduled/published states.
