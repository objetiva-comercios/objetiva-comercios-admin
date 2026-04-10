'use client'

import { AlertTriangleIcon, ArchiveIcon, BoxesIcon, PackageIcon, XCircleIcon } from 'lucide-react'

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

interface KpiCard {
  key: keyof ExistenciasKpi
  status: StockStatus | 'normal' | null
  label: string
  icon: typeof PackageIcon
  activeClass: string
  iconClass: string
  format?: (value: number, kpi: ExistenciasKpi) => string
}

const cards: KpiCard[] = [
  {
    key: 'totalArticulos',
    status: null,
    label: 'Total articulos',
    icon: ArchiveIcon,
    activeClass: '',
    iconClass: 'text-muted-foreground',
  },
  {
    key: 'totalUnidades',
    status: null,
    label: 'Total unidades',
    icon: BoxesIcon,
    activeClass: '',
    iconClass: 'text-muted-foreground',
  },
  {
    key: 'totalConStock',
    status: 'normal',
    label: 'Con unidades',
    icon: PackageIcon,
    activeClass: 'ring-2 ring-primary border-primary',
    iconClass: 'text-muted-foreground',
  },
  {
    key: 'stockBajo',
    status: 'bajo',
    label: 'Bajo minimo',
    icon: AlertTriangleIcon,
    activeClass: 'ring-2 ring-yellow-400 border-yellow-200',
    iconClass: 'text-yellow-600',
  },
  {
    key: 'sinStock',
    status: 'sin_stock',
    label: 'Sin unidades',
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
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map(card => {
        const Icon = card.icon
        const isFilterable = card.status !== null
        const isActive = isFilterable && activeFilter === card.status
        return (
          <Card
            key={card.key}
            onClick={isFilterable ? () => onFilterChange(isActive ? null : (card.status as StockStatus)) : undefined}
            className={cn(
              'p-3 transition-all',
              isFilterable && 'cursor-pointer hover:shadow-md',
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
                    {card.format ? card.format(kpi[card.key], kpi) : kpi[card.key].toLocaleString()}
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
