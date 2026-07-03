# Blog CMS Design

**Date:** 2026-05-02
**Status:** Approved

## Overview

A blog system for cloudperfumebd.com where the superadmin publishes articles and sellers can submit drafts for review. Posts support rich text with inline images. Blog content is surfaced in three places: a dedicated `/blog` section, a homepage "Latest Articles" section, and a "Related Reading" section on fragrance pages.

---

## Database Schema

### `blog_posts`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text unique | URL-safe, e.g. `9pm-vs-9pm-elixir` |
| `title` | text | |
| `content` | jsonb | Tiptap JSON |
| `excerpt` | text | Short summary shown on cards |
| `cover_image_url` | text | Hero image at top of post |
| `status` | enum | `draft`, `pending_review`, `published`, `rejected` |
| `author_id` | uuid FK → profiles | Seller or superadmin |
| `rejection_note` | text nullable | Superadmin note on rejection |
| `published_at` | timestamptz nullable | Set when status → published |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `blog_categories`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `name` | text unique |
| `slug` | text unique |

### `blog_tags`
| Column | Type |
|---|---|
| `id` | uuid PK |
| `name` | text unique |
| `slug` | text unique |

### `blog_post_categories` (join)
| Column | Type |
|---|---|
| `post_id` | uuid FK → blog_posts |
| `category_id` | uuid FK → blog_categories |

### `blog_post_tags` (join)
| Column | Type |
|---|---|
| `post_id` | uuid FK → blog_posts |
| `tag_id` | uuid FK → blog_tags |

### Supabase Storage
- Bucket: `blog-images` (public)
- Inline images: `blog-images/{post-id}/{filename}`
- Cover images: `blog-images/covers/{post-id}/{filename}`
- Max file size: 5MB, accepted types: PNG, JPG, WebP

---

## Routes

### Public
| Route | Description |
|---|---|
| `/blog` | Blog index — all published posts, filterable by category/tag |
| `/blog/[slug]` | Individual article |
| `/blog/category/[slug]` | Posts filtered by category |
| `/blog/tag/[slug]` | Posts filtered by tag |

### Superadmin (`/superadmin/blog`)
| Route | Description |
|---|---|
| `/superadmin/blog` | All posts (published + pending + drafts) with status badges |
| `/superadmin/blog/new` | Create new post (can publish directly) |
| `/superadmin/blog/[id]/edit` | Edit any post, approve or reject pending ones |
| `/superadmin/blog/categories` | Manage categories |
| `/superadmin/blog/tags` | Manage tags |

The superadmin sidebar shows a "Blog" link with a badge count for `pending_review` posts.

### Seller Dashboard (`/dashboard/blog`)
| Route | Description |
|---|---|
| `/dashboard/blog` | Seller's own posts only |
| `/dashboard/blog/new` | Write new post (saves as `draft`) |
| `/dashboard/blog/[id]/edit` | Edit own `draft` or `rejected` post only |

---

## Editor (Tiptap)

A shared `<BlogEditor />` component used in both superadmin and seller dashboard.

### Supported formatting
- Headings: H1, H2, H3
- Bold, italic, underline
- Blockquote
- Bullet list, numbered list
- Links
- Inline images (uploaded to Supabase Storage)

### Toolbar
Icon buttons above the editor for each action. Styled to match the existing site design system.

### Inline image upload flow
1. User clicks image button in toolbar
2. Native file picker opens (PNG/JPG/WebP, max 5MB)
3. File uploads to `blog-images/{post-id}/{filename}` in Supabase Storage
4. Public URL is inserted at cursor position in the editor

### Cover image
Separate upload field above the editor (not inside it). Uploads to `blog-images/covers/{post-id}/{filename}`.

### Content storage
Stored as Tiptap JSON in `blog_posts.content`. Rendered to HTML on public `/blog/[slug]` using Tiptap's `generateHTML` utility (server-side, no client JS needed for reading).

---

## Open Graph / Social Sharing

Each `/blog/[slug]` page uses Next.js `generateMetadata` to produce:
- `og:title` → post title
- `og:description` → post excerpt
- `og:image` → cover image URL
- `twitter:card` → `summary_large_image`

Same pattern as the existing `/fragrance/[slug]` pages.

---

## Blog Placement on the Site

### 1. Main navigation
"Blog" link added to the top navbar alongside "Perfumes".

### 2. Homepage — "Latest Articles" section
Below the hero/perfume grid. Shows the 3 most recently published posts as cards:
- Cover image
- Category badge
- Title
- Excerpt (truncated to 2 lines)
- Estimated read time
- "Read More" link

Fetched server-side (SSG with ISR revalidation every hour).

### 3. Fragrance pages — "Related Reading"
On `/fragrance/[slug]`, a "Related Reading" section at the bottom shows up to 2 published blog posts whose tags or categories match the fragrance name or brand (case-insensitive substring match on tag/category slugs). Section is hidden if no matches exist.

---

## Permissions & Workflow

### Seller flow
1. Creates post → saved as `draft` (not visible to anyone)
2. Clicks "Submit for Review" → status becomes `pending_review`
3. Cannot edit while `pending_review`
4. Superadmin approves → `published` | rejects with optional note → status becomes `rejected`
5. Seller can edit their `rejected` post and resubmit (resubmit sets status back to `pending_review`)

### Superadmin flow
- Creates posts directly as `published` (no review step)
- Can edit any post regardless of author
- Sees pending count badge on Blog sidebar link

### Supabase RLS
| Role | Permission |
|---|---|
| Authenticated (seller) | Read/write own posts only; cannot write `published` status |
| Superadmin | Full read/write on all posts |
| Public (anon) | Read `published` posts only |

---

## Out of Scope (for now)
- Perfume listing embeds inside post content
- External image CDN (Cloudinary etc.) — Supabase Storage for now
- Seller-facing analytics on post views
- Comments on blog posts
- Newsletter integration
