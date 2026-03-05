'use client'

import { cn } from '@/lib/utils'

export type StatusFilterValue = 'active' | 'inactive' | 'all'

interface ArticuloStatusFilterProps {
  value: StatusFilterValue
  onChange: (value: StatusFilterValue) => void
}

const options: { label: string; value: StatusFilterValue }[] = [
  { label: 'Activos', value: 'active' },
  { label: 'Inactivos', value: 'inactive' },
  { label: 'Todos', value: 'all' },
]

export function ArticuloStatusFilter({ value, onChange }: ArticuloStatusFilterProps) {
  return (
    <div className="inline-flex items-center rounded-sm border bg-background p-0.5">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex items-center justify-center rounded-sm px-3 py-1 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            value === option.value
              ? 'bg-muted text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
