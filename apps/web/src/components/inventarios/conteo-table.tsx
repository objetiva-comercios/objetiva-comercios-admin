'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2Icon, Trash2Icon } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InlineEditCell } from '@/components/existencias/inline-edit-cell'
import { ArticuloSearch } from '@/components/inventarios/articulo-search'
import { useToast } from '@/hooks/use-toast'
import {
  fetchInventarioArticulosClient,
  updateInventarioArticulo,
  removeInventarioArticulo,
} from '@/lib/api.client'
import type { InventarioArticuloWithDiscrepancy, Inventario } from '@/types/inventario'

interface ConteoTableProps {
  inventarioId: number
  estado: Inventario['estado']
}

export function ConteoTable({ inventarioId, estado }: ConteoTableProps) {
  const [articulos, setArticulos] = useState<InventarioArticuloWithDiscrepancy[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnlyDiscrepancies, setShowOnlyDiscrepancies] = useState(false)
  const { toast } = useToast()

  const isReadOnly = estado === 'finalizado' || estado === 'cancelado'

  const loadArticulos = useCallback(async () => {
    try {
      const data = await fetchInventarioArticulosClient(inventarioId)
      setArticulos(data)
    } catch (error) {
      toast({
        title: 'Error al cargar articulos',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [inventarioId, toast])

  useEffect(() => {
    loadArticulos()
  }, [loadArticulos])

  const filteredArticulos = useMemo(() => {
    if (!showOnlyDiscrepancies) return articulos
    return articulos.filter(a => a.diferencia !== 0)
  }, [articulos, showOnlyDiscrepancies])

  const existingCodigos = useMemo(() => new Set(articulos.map(a => a.articuloCodigo)), [articulos])

  const totalDiscrepancies = useMemo(
    () => articulos.filter(a => a.diferencia !== 0).length,
    [articulos]
  )

  const handleUpdateCantidad = async (articuloId: number, newValue: number) => {
    await updateInventarioArticulo(inventarioId, articuloId, { cantidadContada: newValue })
    await loadArticulos()
  }

  const handleRemove = async (articuloId: number) => {
    try {
      await removeInventarioArticulo(inventarioId, articuloId)
      toast({ title: 'Articulo eliminado del conteo' })
      await loadArticulos()
    } catch (error) {
      toast({
        title: 'Error al eliminar',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search — only when editable */}
      {!isReadOnly && (
        <ArticuloSearch
          inventarioId={inventarioId}
          existingCodigos={existingCodigos}
          onArticuloAdded={loadArticulos}
        />
      )}

      {/* Summary stats and filter */}
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{articulos.length}</span> articulos contados
          {totalDiscrepancies > 0 && (
            <>
              {' '}
              &mdash; <span className="font-medium text-red-600">{totalDiscrepancies}</span> con
              discrepancias
            </>
          )}
        </p>

        {articulos.length > 0 && (
          <div className="flex items-center gap-2">
            <Switch
              id="discrepancy-filter"
              checked={showOnlyDiscrepancies}
              onCheckedChange={setShowOnlyDiscrepancies}
            />
            <Label htmlFor="discrepancy-filter" className="text-sm">
              Mostrar solo discrepancias
            </Label>
          </div>
        )}
      </div>

      {/* Table or empty state */}
      {articulos.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No hay articulos en este conteo. Usa el buscador para agregar articulos.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Articulo</TableHead>
                <TableHead className="w-[15%] text-right">Cantidad Contada</TableHead>
                <TableHead className="w-[15%] text-right">Stock Sistema</TableHead>
                <TableHead className="w-[15%] text-right">Diferencia</TableHead>
                {!isReadOnly && <TableHead className="w-[15%]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArticulos.map(articulo => (
                <TableRow key={articulo.id}>
                  <TableCell>
                    <div>
                      <span className="text-xs text-muted-foreground">
                        {articulo.articuloCodigo}
                      </span>
                      <p className="text-sm font-medium leading-tight">{articulo.articuloNombre}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {isReadOnly ? (
                      <span className="tabular-nums">{articulo.cantidadContada}</span>
                    ) : (
                      <div className="flex justify-end">
                        <InlineEditCell
                          value={articulo.cantidadContada}
                          onSave={newVal => handleUpdateCantidad(articulo.id, newVal)}
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{articulo.stockSistema}</TableCell>
                  <TableCell className="text-right">
                    <DiscrepancyBadge diferencia={articulo.diferencia} />
                  </TableCell>
                  {!isReadOnly && (
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Trash2Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar articulo del conteo</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminara {articulo.articuloNombre} ({articulo.articuloCodigo}) de
                              este conteo. Esta accion no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemove(articulo.id)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredArticulos.length === 0 && showOnlyDiscrepancies && (
                <TableRow>
                  <TableCell
                    colSpan={isReadOnly ? 4 : 5}
                    className="text-center text-sm text-muted-foreground py-6"
                  >
                    No hay discrepancias en este conteo.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function DiscrepancyBadge({ diferencia }: { diferencia: number }) {
  if (diferencia === 0) {
    return <span className="tabular-nums text-green-600">0</span>
  }
  if (diferencia < 0) {
    return <span className="tabular-nums font-medium text-red-600">{diferencia}</span>
  }
  return <span className="tabular-nums font-medium text-amber-600">+{diferencia}</span>
}
