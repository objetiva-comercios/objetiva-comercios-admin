import { cn } from '@objetiva/ui'

interface FilterOption {
  label: string
  value: string
}

interface FilterChipsProps {
  filters: FilterOption[]
  selected: string | null
  onSelect: (value: string | null) => void
  className?: string
}

export function FilterChips({ filters, selected, onSelect, className }: FilterChipsProps) {
  function handleSelect(value: string | null) {
    // Tapping an already-selected chip deselects it
    if (value === selected) {
      onSelect(null)
    } else {
      onSelect(value)
    }
  }

  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-2 px-4 -mx-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        className
      )}
    >
      {/* "All" chip — always first */}
      <button
        onClick={() => handleSelect(null)}
        className={cn(
          'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
          selected === null
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground'
        )}
      >
        All
      </button>

      {filters.map(filter => (
        <button
          key={filter.value}
          onClick={() => handleSelect(filter.value)}
          className={cn(
            'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            selected === filter.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
