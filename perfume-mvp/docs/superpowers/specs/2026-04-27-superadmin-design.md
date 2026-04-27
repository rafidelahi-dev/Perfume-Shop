# Superadmin Panel — Design Spec

**Date:** 2026-04-27  
**Scope:** Seller & listing management + Blog CMS  
**Route:** `/(admin)/superadmin/...`  
**Auth:** None for now — to be added later via middleware guard on API routes

---

## 1. Architecture & Route Structure

```
app/
  (admin)/
    superadmin/
      layout.tsx              # Sidebar + header, shared across all admin pages
      page.tsx                # Redirects to /superadmin/sellers
      sellers/
        page.tsx              # Seller list with filters & actions
      listings/
        page.tsx              # All listings, search/filter, flag/remove
      blog/
        page.tsx              # Blog post list (draft/scheduled/published)
        new/
          page.tsx            # Create new post
        [id]/
          page.tsx            # Edit existing post

  api/
    admin/
      sellers/
        route.ts              # GET all sellers
        [id]/
          route.ts            # PATCH (approve/flag/ban)
      listings/
        route.ts              # GET all listings
        [id]/
          route.ts            # PATCH (flag + reason), DELETE
      blog/
        route.ts              # GET all posts, POST new post
        [id]/
          route.ts            # GET, PATCH, DELETE
```

**Data access pattern:** All admin API routes use the Supabase **service role key**, bypassing RLS entirely. No existing RLS policies need to change. Auth can be added later by guarding these routes in one place.

**Admin sidebar navigation:** three items — Sellers (with pending count badge), Listings, Blog. Same visual pattern as the existing `/dashboard` sidebar (gold accent, cream background).

---

## 2. Database Changes

### `profiles` table — new columns

```sql
status             text        DEFAULT 'pending'   -- pending | active | flagged | banned
flag_reason        text                            -- admin note when flagging
ban_reason         text                            -- admin note when banning
status_updated_at  timestamptz                     -- when status last changed
```

**Seller contact requirement:** phone (`contact_number`) is mandatory; at least one of `whatsapp_number` or `facebook_link` is required before approval. This is a policy enforced at approval time in the admin UI (warning indicator), not a DB constraint.

### `listings` table — new columns

```sql
is_flagged   boolean      DEFAULT false
flag_reason  text                        -- admin comment shown to seller on their dashboard
flagged_at   timestamptz
is_hidden    boolean      DEFAULT false  -- set true when seller is banned
```

**Ban cascade:** when a seller's status is set to `banned`, all their listings have `is_hidden` set to `true` via a single update. Public listing queries already filter on `is_hidden = false` (added as part of this work).

### New `blog_posts` table

```sql
id               uuid         PRIMARY KEY DEFAULT gen_random_uuid()
title            text         NOT NULL
slug             text         UNIQUE NOT NULL   -- auto-generated from title, editable
meta_description text
hero_image_url   text
body             jsonb                          -- TipTap JSON document
status           text         DEFAULT 'draft'  -- draft | scheduled | published
scheduled_at     timestamptz                   -- null unless status = scheduled
published_at     timestamptz                   -- set when first published
related_listing_ids  uuid[]                    -- IDs for "Sellers offering this" section
created_at       timestamptz  DEFAULT now()
updated_at       timestamptz  DEFAULT now()
```

**RLS on `blog_posts`:** public can SELECT published posts; all writes go through admin API routes using service role only.

**New storage bucket:** `blog-images` — for hero images and inline body images uploaded via the CMS.

---

## 3. Seller Management UI (`/superadmin/sellers`)

### Seller list table

| Column | Source |
|--------|--------|
| Name | `display_name` + `@username` |
| Phone | `contact_number` |
| Secondary contact | WhatsApp or Facebook icon (whichever is filled) |
| Signed up | `created_at` |
| Listings | count of their listings |
| Status | badge: pending / active / flagged / banned |
| Actions | context-sensitive buttons |

- **Default view:** Pending tab — new signups are front and centre
- **Filter bar:** All / Pending / Active / Flagged / Banned
- **Pending count badge** on the sidebar link

### Per-seller actions

| Action | When shown | Behaviour |
|--------|-----------|-----------|
| Approve | status = pending | Sets `status → active`, updates `status_updated_at` |
| Flag | status = active | Opens modal with reason text area. Sets `status → flagged`, saves `flag_reason`. Seller remains fully active — flagging is admin-internal only. |
| Ban | any non-banned | Opens confirm modal with reason field. Sets `status → banned`, saves `ban_reason`, auto-sets `is_hidden = true` on all their listings. |
| Unflag | status = flagged | Restores `status → active`, clears `flag_reason` |
| Unban | status = banned | Restores `status → active`, clears `ban_reason`, restores `is_hidden = false` on all their listings |

### Seller detail (inline expand)

Clicking a seller's name expands an inline panel below their row showing:
- Full profile info (bio, location, all contact fields)
- **Contact completeness indicator:** green if phone + at least one secondary contact filled; amber warning if only phone. The Approve button remains enabled regardless — the indicator is advisory only, the call is yours.
- All their listings as a mini-list (name, price, status)
- Status history: current flag/ban reason + `status_updated_at`

---

## 4. Listing Management UI (`/superadmin/listings`)

### Listing list table

| Column | Source |
|--------|--------|
| Perfume | `perfume_name` |
| Brand | `brand` |
| Seller | `display_name` (links to seller inline detail) |
| Price | `price` |
| Type | intact / full / partial / decant |
| Listed | `created_at` |
| Status | active / flagged / hidden |
| Actions | Flag, Unflag, Remove |

- **Default view:** all active listings, newest first
- **Search bar:** searches across perfume name, brand, and seller name simultaneously
- **Filter bar:** by type, by status, by seller

### Per-listing actions

| Action | Behaviour |
|--------|-----------|
| Flag | Modal with text area for reason/comment. Sets `is_flagged = true`, saves `flag_reason`. Seller sees this comment on their dashboard so they know what to fix. |
| Unflag | Clears `is_flagged` and `flag_reason` |
| Remove | Confirm modal ("This cannot be undone"). Hard deletes the listing. |

No inline expand — clicking the listing name opens the existing public listing page in a new tab.

---

## 5. Blog CMS UI (`/superadmin/blog`)

### Blog list page

Table: Title, Status (draft / scheduled / published), Published/Scheduled date, Edit button, Delete button. "New Post" button top-right.

### Post editor (`/superadmin/blog/new` and `/superadmin/blog/[id]`)

Two-column layout: editor (left, wider) + publish controls (right sidebar, narrower).

#### Editor (left)

1. **Title** — large plain text input at the top
2. **Hero image** — upload button below title; uploads to `blog-images` Supabase bucket
3. **Body** — TipTap rich text editor with toolbar supporting:
   - H2, H3, Bold, Italic, Link, Paragraph
   - Inline image upload (uploads to `blog-images` bucket, inserted at cursor)
   - **Embedded product card** — custom TipTap node. Inserted via toolbar button; admin searches for a listing by perfume name or pastes a listing URL. Card renders inline with `perfume_name`, `brand`, `price`, and first image. Stored in TipTap JSON as a custom node containing only the listing `id` — data is fetched fresh on public blog page render so price/image stay current.
4. **"Related perfumes / Sellers offering this" section** — structured field below the TipTap editor (not inside it). Admin searches and attaches listing IDs. Stored as `related_listing_ids uuid[]` on the post. Rendered as a product grid at the bottom of the published article.

#### Publish controls (right sidebar)

- Status toggle: Draft / Scheduled / Published
- Date/time picker — appears only when Scheduled is selected
- Meta description textarea with character count (150-char target for SEO)
- Slug field — auto-generated from title on creation, editable
- **Save** button — saves with current status
- **Publish Now** button — forces `status → published` immediately regardless of toggle

---

## 6. Out of Scope (future specs)

The following were identified but deferred:

- Platform analytics dashboard
- Seller verification badges
- Featured listings / promotion management
- Platform-wide announcements
- Buyer report system (report button → admin ticket)
- Superadmin authentication / middleware guard
