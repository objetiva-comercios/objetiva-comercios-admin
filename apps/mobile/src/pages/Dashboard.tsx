import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Package, ClipboardList, DollarSign, TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import { fetchWithAuth } from '../lib/api'
import type { DashboardResponse } from '../types'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const STOCK_STATUS_COLORS: Record<string, string> = {
  out_of_stock: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  low_stock: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_stock: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-lg p-4 border border-border">
      <div className="bg-muted animate-pulse rounded h-5 w-5 mb-3" />
      <div className="bg-muted animate-pulse rounded h-3 w-24 mb-2" />
      <div className="bg-muted animate-pulse rounded h-7 w-16" />
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3">
          <div className="bg-muted animate-pulse rounded h-4 flex-1" />
          <div className="bg-muted animate-pulse rounded h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetchWithAuth<DashboardResponse>('/dashboard'),
  })

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        {/* Weekly row skeleton */}
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="bg-muted animate-pulse rounded h-4 w-32 mb-3" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-1">
                <div className="bg-muted animate-pulse rounded h-5 w-full" />
                <div className="bg-muted animate-pulse rounded h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
        {/* List skeletons */}
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="bg-muted animate-pulse rounded h-4 w-36 mb-4" />
          <SkeletonList />
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="bg-muted animate-pulse rounded h-4 w-36 mb-4" />
          <SkeletonList />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[60vh] gap-4">
        <p className="text-destructive text-center">
          {error instanceof Error ? error.message : 'Failed to load dashboard data'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
        >
          Retry
        </button>
      </div>
    )
  }

  const { stats, purchases, lowStockItems, recentOrders } = data

  return (
    <div className="p-4 space-y-6">
      {/* Stats grid — 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-lg p-4 border border-border">
          <Package size={20} className="text-primary mb-2" />
          <p className="text-xs text-muted-foreground mb-1">Total Products</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalProducts}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <ClipboardList size={20} className="text-primary mb-2" />
          <p className="text-xs text-muted-foreground mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <DollarSign size={20} className="text-primary mb-2" />
          <p className="text-xs text-muted-foreground mb-1">Today&apos;s Revenue</p>
          <p className="text-2xl font-bold text-foreground">
            {currency.format(stats.todayRevenue)}
          </p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <TrendingUp size={20} className="text-primary mb-2" />
          <p className="text-xs text-muted-foreground mb-1">Today&apos;s Sales</p>
          <p className="text-2xl font-bold text-foreground">{stats.todaySales}</p>
        </div>
      </div>

      {/* Pending Purchases */}
      <div className="bg-card rounded-lg p-4 border border-border flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Pending Purchases</p>
          <p className="text-2xl font-bold text-foreground">{purchases.pendingOrders}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">Pending Value</p>
          <p className="text-lg font-semibold text-foreground">
            {currency.format(purchases.pendingValue)}
          </p>
        </div>
      </div>

      {/* Weekly summary */}
      <div className="bg-card rounded-lg p-4 border border-border">
        <p className="text-sm font-semibold text-foreground mb-3">Weekly Summary</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-sm font-bold text-foreground">{stats.weekSales}</p>
            <p className="text-xs text-muted-foreground leading-tight">Week Sales</p>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {currency.format(stats.weekRevenue)}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">Week Rev.</p>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{stats.pendingOrders}</p>
            <p className="text-xs text-muted-foreground leading-tight">Pending</p>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{stats.lowStockCount}</p>
            <p className="text-xs text-muted-foreground leading-tight">Low Stock</p>
          </div>
        </div>
      </div>

      {/* Low stock alerts */}
      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} className="text-yellow-500" />
          <p className="text-sm font-semibold text-foreground">Low Stock Alerts</p>
        </div>
        {lowStockItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No low stock items</p>
        ) : (
          <ul className="space-y-2">
            {lowStockItems.slice(0, 5).map(item => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <span className="text-sm text-foreground truncate flex-1">{item.productName}</span>
                <span className="text-xs text-muted-foreground mr-2">{item.quantity} left</span>
                <span
                  className={[
                    'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                    STOCK_STATUS_COLORS[item.status] ?? '',
                  ].join(' ')}
                >
                  {item.status.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => navigate('/inventory')}
          className="mt-3 text-xs text-primary font-medium"
        >
          View Inventory &rarr;
        </button>
      </div>

      {/* Recent orders */}
      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={18} className="text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Recent Orders</p>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent orders</p>
        ) : (
          <ul className="space-y-3">
            {recentOrders.slice(0, 5).map(order => (
              <li key={order.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{order.orderNumber}</span>
                  <span
                    className={[
                      'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                      ORDER_STATUS_COLORS[order.status] ?? '',
                    ].join(' ')}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground truncate">
                    {order.customerName}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {currency.format(order.total)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(order.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => navigate('/orders')}
          className="mt-3 text-xs text-primary font-medium"
        >
          View All Orders &rarr;
        </button>
      </div>
    </div>
  )
}
