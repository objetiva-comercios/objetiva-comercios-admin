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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{product.name}</SheetTitle>
          <SheetDescription>SKU: {product.sku}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          <div>
            <h3 className="text-sm font-medium mb-2">Status</h3>
            <Badge variant={statusVariants[product.status]}>
              {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
            </Badge>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium mb-2">Description</h3>
            <p className="text-sm text-muted-foreground">{product.description}</p>
          </div>

          <Separator />

          {/* Category */}
          <div>
            <h3 className="text-sm font-medium mb-2">Category</h3>
            <p className="text-sm">{product.category}</p>
          </div>

          <Separator />

          {/* Pricing */}
          <div>
            <h3 className="text-sm font-medium mb-3">Pricing</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="text-sm font-medium">{formatCurrency(product.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cost</span>
                <span className="text-sm font-medium">{formatCurrency(product.cost)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Margin</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(product.price - product.cost)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div>
            <h3 className="text-sm font-medium mb-3">Metadata</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground block">Created</span>
                <span className="text-sm">
                  {format(new Date(product.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block">Last Updated</span>
                <span className="text-sm">
                  {format(new Date(product.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
