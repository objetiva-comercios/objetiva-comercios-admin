import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, ShoppingCart, Package, TrendingUp, Truck } from 'lucide-react'
import { formatCurrency } from '@objetiva/utils'
import type { DashboardStats } from '@/types/dashboard'

interface StatsCardsProps {
  stats: DashboardStats
  purchases: { pendingOrders: number; pendingValue: number }
}

export function StatsCards({ stats, purchases }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      description: `$${formatNumber(stats.todayRevenue)} today`,
      iconColor: 'text-green-600',
    },
    {
      title: 'Total Orders',
      value: formatNumber(stats.totalOrders),
      icon: ShoppingCart,
      description: `${stats.pendingOrders} pending`,
      iconColor: 'text-blue-600',
    },
    {
      title: 'Total Products',
      value: formatNumber(stats.totalProducts),
      icon: Package,
      description: `${stats.lowStockCount} low stock`,
      iconColor: 'text-purple-600',
    },
    {
      title: 'Total Sales',
      value: formatNumber(stats.totalSales),
      icon: TrendingUp,
      description: `${stats.todaySales} today`,
      iconColor: 'text-orange-600',
    },
    {
      title: 'Pending Purchases',
      value: formatNumber(purchases.pendingOrders),
      icon: Truck,
      description: `${formatCurrency(purchases.pendingValue)} pending value`,
      iconColor: 'text-amber-600',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map(card => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.iconColor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}
