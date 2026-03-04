'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DashboardStats } from '@/types/dashboard'

interface SalesChartProps {
  stats: DashboardStats
}

export function SalesChart({ stats }: SalesChartProps) {
  const data = generateSampleData(stats)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de ventas</CardTitle>
        <CardDescription>Tendencia de ventas en los últimos 7 días</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" stroke="hsl(var(--muted-foreground))" />
            <YAxis
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={value => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number | undefined) => {
                if (value === undefined) return ['$0,00', 'Ingresos']
                return [`$${value.toFixed(2)}`, 'Ingresos']
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function generateSampleData(stats: DashboardStats) {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const avgDailyRevenue = stats.weekRevenue / 7

  return days.map(day => ({
    date: day,
    revenue: avgDailyRevenue * (0.8 + Math.random() * 0.4),
  }))
}
