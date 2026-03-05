'use client'

import { AlertTriangleIcon, PackageIcon, XCircleIcon } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ExistenciasKpi, StockStatus } from '@/types/existencia'

interface ExistenciasKpiCardsProps {
  kpi: ExistenciasKpi | null
  activeFilter: StockStatus | null
  onFilterChange: (status: StockStatus | null) => void
  isLoading?: boolean
}

const cards: {
  key: keyof ExistenciasKpi
  status: StockStatus | 'normal'
  label: string
  icon: typeof PackageIcon
  activeClass: string
  iconClass: string
}[] = [
  {
    key: 'totalConStock',
    status: 'normal',
    label: 'Total con Stock',
    icon: PackageIcon,
    activeClass: 'ring-2 ring-primary border-primary',
    iconClass: 'text-muted-foreground',
  },
  {
    key: 'stockBajo',
    status: 'bajo',
    label: 'Stock Bajo',
    icon: AlertTriangleIcon,
    activeClass: 'ring-2 ring-yellow-400 border-yellow-200',
    iconClass: 'text-yellow-600',
  },
  {
    key: 'sinStock',
    status: 'sin_stock',
    label: 'Sin Stock',
    icon: XCircleIcon,
    activeClass: 'ring-2 ring-red-400 border-red-200',
    iconClass: 'text-red-600',
  },
]

export function ExistenciasKpiCards({
  kpi,
  activeFilter,
  onFilterChange,
  isLoading,
}: ExistenciasKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map(card => {
        const Icon = card.icon
        const isActive = activeFilter === card.status
        return (
          <Card
            key={card.key}
            onClick={() => onFilterChange(isActive ? null : (card.status as StockStatus))}
            className={cn(
              'cursor-pointer p-3 transition-all hover:shadow-md',
              isActive && card.activeClass
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                {isLoading || !kpi ? (
                  <Skeleton className="mt-1 h-7 w-12" />
                ) : (
                  <p className={cn('text-2xl font-bold', isActive && card.iconClass)}>
                    {kpi[card.key]}
                  </p>
                )}
              </div>
              <Icon className={cn('h-5 w-5', card.iconClass)} />
            </div>
          </Card>
        )
      })}
    </div>
  )
}
