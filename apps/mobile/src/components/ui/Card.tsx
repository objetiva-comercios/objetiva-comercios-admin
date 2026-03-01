import { cn } from '@objetiva/ui'

interface CardProps {
  onClick?: () => void
  className?: string
  children: React.ReactNode
}

export function Card({ onClick, className, children }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card rounded-lg border border-border p-4 transition-colors',
        onClick && 'cursor-pointer active:bg-accent/50',
        className
      )}
    >
      {children}
    </div>
  )
}
