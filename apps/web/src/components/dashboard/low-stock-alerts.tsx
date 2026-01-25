import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { LowStockItem } from '@/types/dashboard'

interface LowStockAlertsProps {
  items: LowStockItem[]
}

export function LowStockAlerts({ items }: LowStockAlertsProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Alerts</CardTitle>
          <CardDescription>Items needing attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No low stock items</p>
            <p className="text-xs text-muted-foreground">All inventory levels are healthy</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Stock Alerts</CardTitle>
        <CardDescription>Items needing attention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.slice(0, 5).map(item => (
            <Link
              key={item.id}
              href={`/inventory/${item.id}`}
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">Quantity: {item.quantity}</p>
                </div>
              </div>
              <Badge variant={item.status === 'out_of_stock' ? 'destructive' : 'secondary'}>
                {item.status === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
