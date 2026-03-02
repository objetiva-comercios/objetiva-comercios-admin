import { cn } from '@objetiva/ui'

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

const STATUS_COLOR_MAP: Record<string, BadgeVariant> = {
  // Green — success / in-stock
  active: 'green',
  completed: 'green',
  delivered: 'green',
  in_stock: 'green',
  received: 'green',
  // Yellow — pending / in progress
  pending: 'yellow',
  processing: 'yellow',
  ordered: 'yellow',
  low_stock: 'yellow',
  // Red — error / cancelled / out of stock
  cancelled: 'red',
  refunded: 'red',
  out_of_stock: 'red',
  discontinued: 'red',
  // Blue — in transit
  shipped: 'blue',
  partial_refund: 'blue',
  // Gray — inactive / draft
  draft: 'gray',
  inactive: 'gray',
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

interface StatusBadgeProps {
  status: string
  variant?: BadgeVariant
  className?: string
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const resolvedVariant = variant ?? STATUS_COLOR_MAP[status] ?? 'gray'
  const displayText = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        VARIANT_CLASSES[resolvedVariant],
        className
      )}
    >
      {displayText}
    </span>
  )
}
