import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { qk } from './key'

export type BlogPostStatus = 'draft' | 'pending_review' | 'published' | 'rejected'

export type BlogCategory = {
  id: string
  name: string
  slug: string
}

export type BlogTag = {
  id: string
  name: string
  slug: string
}

export type BlogPost = {
  id: string
  slug: string
  title: string
  content: Record<string, unknown>
  excerpt: string
  cover_image_url: string | null
  status: BlogPostStatus
  author_id: string
  rejection_note: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  profiles?: { display_name: string | null; username: string | null } | null
  blog_post_categories?: { blog_categories: BlogCategory }[]
  blog_post_tags?: { blog_tags: BlogTag }[]
}

export type BlogPostInput = {
  title: string
  slug: string
  excerpt: string
  content: Record<string, unknown>
  cover_image_url?: string | null
  category_ids?: string[]
  tag_ids?: string[]
  status?: BlogPostStatus
}

// ─── Admin hooks ──────────────────────────────────────────────────────────────

async function fetchAdminBlogPosts(): Promise<BlogPost[]> {
  const res = await fetch('/api/admin/blog/posts')
  if (!res.ok) throw new Error('Failed to fetch blog posts')
  return res.json()
}

export function useAdminBlogPosts() {
  return useQuery({ queryKey: qk.adminBlogPosts(), queryFn: fetchAdminBlogPosts })
}

async function fetchAdminBlogCategories(): Promise<BlogCategory[]> {
  const res = await fetch('/api/admin/blog/categories')
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

export function useAdminBlogCategories() {
  return useQuery({ queryKey: qk.adminBlogCategories(), queryFn: fetchAdminBlogCategories })
}

async function fetchAdminBlogTags(): Promise<BlogTag[]> {
  const res = await fetch('/api/admin/blog/tags')
  if (!res.ok) throw new Error('Failed to fetch tags')
  return res.json()
}

export function useAdminBlogTags() {
  return useQuery({ queryKey: qk.adminBlogTags(), queryFn: fetchAdminBlogTags })
}

export function useAdminCreateBlogPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BlogPostInput) =>
      fetch('/api/admin/blog/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
        return r.json() as Promise<BlogPost>
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminBlogPosts() }),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useAdminUpdateBlogPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<BlogPostInput> & { id: string }) =>
      fetch(`/api/admin/blog/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
        return r.json() as Promise<BlogPost>
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminBlogPosts() }),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useAdminDeleteBlogPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/blog/posts/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error('Failed')
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminBlogPosts() }),
    onError: () => toast.error('Failed to delete post'),
  })
}

export function useAdminCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; slug: string }) =>
      fetch('/api/admin/blog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
        return r.json()
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminBlogCategories() }),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useAdminDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/blog/categories/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error('Failed')
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminBlogCategories() }),
    onError: () => toast.error('Failed to delete category'),
  })
}

export function useAdminCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; slug: string }) =>
      fetch('/api/admin/blog/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
        return r.json()
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminBlogTags() }),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useAdminDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/blog/tags/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error('Failed')
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminBlogTags() }),
    onError: () => toast.error('Failed to delete tag'),
  })
}

// ─── Dashboard (seller) hooks ─────────────────────────────────────────────────

async function fetchDashboardBlogPosts(): Promise<BlogPost[]> {
  const res = await fetch('/api/dashboard/blog')
  if (!res.ok) throw new Error('Failed to fetch posts')
  return res.json()
}

export function useDashboardBlogPosts() {
  return useQuery({ queryKey: qk.dashboardBlogPosts(), queryFn: fetchDashboardBlogPosts })
}

export function useDashboardCreateBlogPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BlogPostInput) =>
      fetch('/api/dashboard/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
        return r.json() as Promise<BlogPost>
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dashboardBlogPosts() }),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDashboardUpdateBlogPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<BlogPostInput> & { id: string; action?: string }) =>
      fetch(`/api/dashboard/blog/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
        return r.json() as Promise<BlogPost>
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dashboardBlogPosts() }),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDashboardDeleteBlogPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/dashboard/blog/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) throw new Error('Failed')
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dashboardBlogPosts() }),
    onError: () => toast.error('Failed to delete post'),
  })
}
