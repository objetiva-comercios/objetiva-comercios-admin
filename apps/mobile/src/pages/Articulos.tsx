import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { formatCurrency, formatDate } from '@objetiva/utils'
import { Card } from '../components/ui/Card'
import { FilterChips } from '../components/ui/FilterChips'
import { BottomSheet } from '../components/ui/BottomSheet'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useInfiniteList } from '../hooks/useInfiniteList'
import type { Articulo } from '../types'

const STATUS_FILTERS = [
  { label: 'Activo', value: 'true' },
  { label: 'Inactivo', value: 'false' },
]

export function Articulos() {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedArticulo, setSelectedArticulo] = useState<Articulo | null>(null)

  const params: Record<string, string> = {}
  if (selectedStatus) params['activo'] = selectedStatus
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteList<Articulo>('/articulos', params)

  const articulos = data?.pages.flatMap(p => p.data) ?? []

  const { ref: sentinelRef, inView } = useInView()

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const profitMargin = (articulo: Articulo) => {
    const precio = parseFloat(articulo.precio ?? '0')
    const costo = parseFloat(articulo.costo ?? '0')
    if (precio === 0) return 0
    return (((precio - costo) / precio) * 100).toFixed(1)
  }

  return (
    <div className="flex flex-col gap-0 overflow-y-auto">
      {/* Filter chips */}
      <div className="sticky top-0 bg-background px-4 pt-4 pb-2 z-10">
        <FilterChips
          filters={STATUS_FILTERS}
          selected={selectedStatus}
          onSelect={setSelectedStatus}
        />
      </div>

      {/* Card list */}
      <div className="flex flex-col gap-3 p-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
        ) : articulos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">No se encontraron articulos</p>
          </div>
        ) : (
          articulos.map(articulo => (
            <Card key={articulo.codigo} onClick={() => setSelectedArticulo(articulo)}>
              <div className="flex items-start justify-between mb-1">
                <span className="font-medium text-foreground leading-snug flex-1 mr-2">
                  {articulo.nombre}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${articulo.activo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}
                >
                  {articulo.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {articulo.sku ?? articulo.codigo}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  {formatCurrency(parseFloat(articulo.precio ?? '0'))}
                </span>
                {articulo.marca && (
                  <span className="text-xs text-muted-foreground">{articulo.marca}</span>
                )}
              </div>
            </Card>
          ))
        )}

        {/* Infinite scroll — loading more */}
        {isFetchingNextPage && <CardSkeleton />}

        {/* Invisible sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1" />
      </div>

      {/* Articulo detail bottom sheet */}
      <BottomSheet
        open={selectedArticulo !== null}
        onClose={() => setSelectedArticulo(null)}
        title={selectedArticulo?.nombre ?? ''}
      >
        {selectedArticulo && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Codigo</p>
                <p className="text-sm font-medium text-foreground">{selectedArticulo.codigo}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedArticulo.activo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}
                >
                  {selectedArticulo.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              {selectedArticulo.sku && (
                <div>
                  <p className="text-xs text-muted-foreground">SKU</p>
                  <p className="text-sm font-medium text-foreground">{selectedArticulo.sku}</p>
                </div>
              )}
              {selectedArticulo.marca && (
                <div>
                  <p className="text-xs text-muted-foreground">Marca</p>
                  <p className="text-sm font-medium text-foreground">{selectedArticulo.marca}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Precio</p>
                <p className="text-sm font-medium text-foreground">
                  {formatCurrency(parseFloat(selectedArticulo.precio ?? '0'))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Costo</p>
                <p className="text-sm font-medium text-foreground">
                  {formatCurrency(parseFloat(selectedArticulo.costo ?? '0'))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margen</p>
                <p className="text-sm font-medium text-foreground">
                  {profitMargin(selectedArticulo)}%
                </p>
              </div>
            </div>

            {selectedArticulo.observaciones && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Observaciones</p>
                <p className="text-sm text-foreground">{selectedArticulo.observaciones}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Creado</p>
                <p className="text-sm text-foreground">{formatDate(selectedArticulo.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actualizado</p>
                <p className="text-sm text-foreground">{formatDate(selectedArticulo.updatedAt)}</p>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
