import type { BlogPostStatus } from '@/lib/queries/blog'

const MAP: Record<BlogPostStatus, { label: string; cls: string }> = {
  draft:          { label: 'Draft',          cls: 'bg-gray-100 text-gray-600' },
  pending_review: { label: 'Pending Review', cls: 'bg-amber-100 text-amber-700' },
  published:      { label: 'Published',      cls: 'bg-green-100 text-green-700' },
  rejected:       { label: 'Rejected',       cls: 'bg-red-100 text-red-700' },
}

export default function BlogStatusBadge({ status }: { status: BlogPostStatus }) {
  const { label, cls } = MAP[status] ?? MAP.draft
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}
