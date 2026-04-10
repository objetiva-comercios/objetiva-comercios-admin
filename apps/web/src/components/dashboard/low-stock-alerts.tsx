import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import type { LowStockItem } from '@/types/dashboard'

interface LowStockAlertsProps {
  items: LowStockItem[]
}

export function LowStockAlerts({ items }: LowStockAlertsProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertas de stock bajo</CardTitle>
          <CardDescription>Articulos que requieren atencion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">Sin articulos con stock bajo</p>
            <p className="text-xs text-muted-foreground">Todos los niveles de stock estan bien</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas de stock bajo</CardTitle>
        <CardDescription>Articulos que requieren atencion</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.slice(0, 5).map(item => (
            <div
              key={item.articuloCodigo}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{item.articuloNombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.articuloCodigo} — Cantidad: {item.totalCantidad}
                  </p>
                </div>
              </div>
              <Badge variant={item.totalCantidad === 0 ? 'destructive' : 'secondary'}>
                {item.totalCantidad === 0 ? 'Sin stock' : 'Stock bajo'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
