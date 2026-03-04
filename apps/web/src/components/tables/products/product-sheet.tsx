'use client'

import { format } from 'date-fns'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@objetiva/utils'
import type { Product } from '@/types/product'

interface ProductSheetProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusVariants = {
  active: 'default',
  inactive: 'secondary',
  discontinued: 'destructive',
} as const

export function ProductSheet({ product, open, onOpenChange }: ProductSheetProps) {
  if (!product) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{product.name}</SheetTitle>
          <SheetDescription>Detalle del artículo — SKU: {product.sku}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          <div>
            <h3 className="text-sm font-medium mb-2">Estado</h3>
            <Badge variant={statusVariants[product.status]}>
              {(
                { active: 'Activo', inactive: 'Inactivo', discontinued: 'Descontinuado' } as Record<
                  string,
                  string
                >
              )[product.status] ?? product.status}
            </Badge>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium mb-2">Descripción</h3>
            <p className="text-sm text-muted-foreground">{product.description}</p>
          </div>

          <Separator />

          {/* Category */}
          <div>
            <h3 className="text-sm font-medium mb-2">Categoría</h3>
            <p className="text-sm">{product.category}</p>
          </div>

          <Separator />

          {/* Pricing */}
          <div>
            <h3 className="text-sm font-medium mb-3">Precios</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Precio</span>
                <span className="text-sm font-medium">{formatCurrency(product.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Costo</span>
                <span className="text-sm font-medium">{formatCurrency(product.cost)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Margen</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(product.price - product.cost)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div>
            <h3 className="text-sm font-medium mb-3">Información</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground block">Creado</span>
                <span className="text-sm">
                  {product.createdAt
                    ? format(new Date(product.createdAt), "MMM d, yyyy 'at' h:mm a")
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block">Actualizado</span>
                <span className="text-sm">
                  {product.updatedAt
                    ? format(new Date(product.updatedAt), "MMM d, yyyy 'at' h:mm a")
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
