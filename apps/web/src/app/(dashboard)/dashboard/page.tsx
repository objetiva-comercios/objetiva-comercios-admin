import { fetchDashboard } from '@/lib/api'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { SalesChart } from '@/components/dashboard/sales-chart'
import { LowStockAlerts } from '@/components/dashboard/low-stock-alerts'
import { RecentOrders } from '@/components/dashboard/recent-orders'

export default async function DashboardPage() {
  // Fetch dashboard data from backend
  const data = await fetchDashboard()

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your business metrics and key performance indicators
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={data.stats} purchases={data.purchases} />

      {/* Charts and Alerts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Sales Chart */}
        <div className="col-span-4">
          <SalesChart stats={data.stats} />
        </div>

        {/* Low Stock Alerts */}
        <div className="col-span-3">
          <LowStockAlerts items={data.lowStockItems} />
        </div>
      </div>

      {/* Recent Orders */}
      <RecentOrders orders={data.recentOrders} />
    </div>
  )
}
