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
